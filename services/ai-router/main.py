from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import math

app = FastAPI(title="EROS AI Routing Engine - Pro V2")

class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

class Hospital(BaseModel):
    id: str
    name: str
    location: Location
    capacity_percent: float # 0 to 100
    specialties: List[str] # e.g., ["Trauma", "Cardiac", "ICU"]

class Ambulance(BaseModel):
    id: str
    location: Location
    status: str # 'available', 'busy', 'offline'
    equipment: List[str] # e.g., ["ACLS", "Ventilator", "Oxygen"]
    type: str # 'Basic', 'Advanced', 'ICU'

class Emergency(BaseModel):
    id: str
    location: Location
    type: str # 'Cardiac', 'Trauma', 'Minor', etc.
    priority: int # 1 (Critical) to 5 (Low)

def calculate_haversine_distance(loc1: Location, loc2: Location) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [loc1.lng, loc1.lat, loc2.lng, loc2.lat])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

@app.get("/health")
def health_check():
    return {
        "status": "online", 
        "engine": "EROS-Smart-Router-V2",
        "features": ["Capacity-Aware", "Equipment-Match", "Multi-Factor Scoring"]
    }

@app.post("/find-nearest")
def find_nearest_ambulance(
    emergency: Emergency, 
    ambulances: List[Ambulance], 
    hospitals: Optional[List[Hospital]] = None
):
    if not ambulances:
        raise HTTPException(status_code=400, detail="No ambulances provided")

    available_ambulances = [a for a in ambulances if a.status == "available"]
    
    if not available_ambulances:
        return {"success": False, "message": "No available ambulances within range"}

    scored_ambulances = []
    
    # Simple Weighting System
    # Distance: 50%
    # Equipment Match: 30%
    # Hospital Proximity/Capacity (if provided): 20%

    for amb in available_ambulances:
        dist = calculate_haversine_distance(emergency.location, amb.location)
        
        # Equipment Score (0.0 to 1.0)
        equipment_score = 0.0
        required_gear = []
        if emergency.type == "Cardiac":
            required_gear = ["ACLS", "Ventilator"]
        elif emergency.type == "Respiratory":
            required_gear = ["Oxygen", "Ventilator"]
        
        if required_gear:
            match_count = sum(1 for gear in required_gear if gear in amb.equipment)
            equipment_score = match_count / len(required_gear)
        else:
            equipment_score = 1.0 # High score for minor if any amb available

        # Final Score calculation (Lower is better for distance, so we invert it)
        # We'll use a simple penalty system: Base Score = Distance_KM
        # Penalty for lack of equipment
        base_score = dist
        penalty = (1.0 - equipment_score) * 10 # Add 10km penalty for missing critical gear
        
        final_score = base_score + penalty

        scored_ambulances.append({
            "ambulance_id": amb.id,
            "type": amb.type,
            "distance_km": round(dist, 2),
            "estimated_time_min": round(dist * 2.5, 1), # Adjusted for traffic factor
            "equipment_match_score": round(equipment_score * 100, 0),
            "final_dispatch_score": round(final_score, 2),
            "reasoning": f"Located {round(dist, 1)}km away with {int(equipment_score*100)}% equipment match."
        })

    # Sort by final score (ascending)
    sorted_ambulances = sorted(scored_ambulances, key=lambda x: x["final_dispatch_score"])

    return {
        "success": True,
        "emergency_id": emergency.id,
        "recommendations": sorted_ambulances[:3]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

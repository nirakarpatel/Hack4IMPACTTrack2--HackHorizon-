import React, { useEffect, useState } from 'react';
import { Ambulance, Activity, Home, Zap, Timer, BarChart3 } from 'lucide-react';
import { socket } from '../lib/socket';

export default function DashboardStats() {
    const [statsData, setStatsData] = useState({
        activeUnits: 0,
        incidents: 0,
        beds: 0,
        avgResponse: '4.2m',
        trafficLoad: 'NORMAL'
    });

    useEffect(() => {
        const handleConnect = () => {
            socket.emit('request_initial_state');
        };

        const handleHospitals = (data: any[]) => {
            const totalBeds = data.reduce((acc, h) => acc + h.beds, 0);
            setStatsData(prev => ({ ...prev, beds: totalBeds }));
        };

        const handleAmbulances = (data: any[]) => {
            const busyCount = data.filter(a => a.status !== 'available').length;
            setStatsData(prev => ({ ...prev, activeUnits: busyCount }));
        };

        const handlePending = (data: any[]) => {
            setStatsData(prev => ({ ...prev, incidents: data.length }));
        };

        const handleTraffic = (data: { factor: number }) => {
            let status = 'NORMAL';
            if (data.factor < 0.7) status = 'HEAVY';
            if (data.factor > 1.3) status = 'CLEAR';
            setStatsData(prev => ({ ...prev, trafficLoad: status }));
        };

        const handleHistory = (data: any[]) => {
            if (data.length > 0) {
                const avg = data.reduce((acc, h) => acc + (h.responseTimeMs || 0), 0) / data.length;
                const mins = (avg / 60000).toFixed(1);
                setStatsData(prev => ({ ...prev, avgResponse: `${mins}m` }));
            }
        };

        if (socket.connected) {
            socket.emit('request_initial_state');
        }

        socket.on('connect', handleConnect);
        socket.on('hospitals_update', handleHospitals);
        socket.on('all_ambulances_update', handleAmbulances);
        socket.on('pending_incidents_update', handlePending);
        socket.on('traffic_update', handleTraffic);
        socket.on('history_update', handleHistory);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('hospitals_update', handleHospitals);
            socket.off('all_ambulances_update', handleAmbulances);
            socket.off('pending_incidents_update', handlePending);
            socket.off('traffic_update', handleTraffic);
            socket.off('history_update', handleHistory);
        };
    }, []);

    const stats = [
        { label: 'Units Active', value: statsData.activeUnits.toString().padStart(2, '0'), icon: Ambulance, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Avg Response', value: statsData.avgResponse, icon: Timer, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Traffic Load', value: statsData.trafficLoad, icon: BarChart3, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        { label: 'Available Beds', value: statsData.beds.toString(), icon: Home, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
                <div key={stat.label} className="group bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-7 rounded-[2rem] hover:border-white/10 transition-all duration-500 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={28} className={stat.color} />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                    
                    <div className="relative z-10">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter tabular-nums">{stat.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { X, TrendingUp, Ambulance, Activity, BarChart3, Clock } from 'lucide-react';
import { socket } from '../lib/socket';

interface ChartDataPoint {
    time: string;
    value: number;
}

interface HospitalData {
    name: string;
    beds: number;
}

export default function StatisticalInsights({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [responseTimeHistory, setResponseTimeHistory] = useState<ChartDataPoint[]>([]);
    const [fleetHistory, setFleetHistory] = useState<ChartDataPoint[]>([]);
    const [hospitalBeds, setHospitalBeds] = useState<HospitalData[]>([]);
    const [trafficData, setTrafficData] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const handleHospitals = (data: any[]) => {
            setHospitalBeds(data.map(h => ({ name: h.name.split(' ')[0], beds: h.beds })));
        };

        const handleAmbulances = (data: any[]) => {
            const busyCount = data.filter(a => a.status !== 'available').length;
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setFleetHistory(prev => {
                const updated = [...prev, { time: now, value: busyCount }];
                return updated.slice(-15);
            });
        };

        const handleHistory = (data: any[]) => {
            if (data.length > 0) {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const avg = data.reduce((acc, h) => acc + (h.responseTimeMs || 0), 0) / data.length;
                const mins = parseFloat((avg / 60000).toFixed(1));
                setResponseTimeHistory(prev => {
                    const updated = [...prev, { time: now, value: mins }];
                    return updated.slice(-15);
                });
            }
        };

        const handleTraffic = (data: { factor: number }) => {
           const label = data.factor < 0.7 ? 'Heavy' : data.factor > 1.3 ? 'Clear' : 'Normal';
           setTrafficData([{ name: 'Density', value: data.factor * 100, label }]);
        };

        socket.on('hospitals_update', handleHospitals);
        socket.on('all_ambulances_update', handleAmbulances);
        socket.on('history_update', handleHistory);
        socket.on('traffic_update', handleTraffic);

        return () => {
            socket.off('hospitals_update', handleHospitals);
            socket.off('all_ambulances_update', handleAmbulances);
            socket.off('history_update', handleHistory);
            socket.off('traffic_update', handleTraffic);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose}></div>
            
            {/* Main Panel */}
            <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-slate-900/50 border border-slate-800 rounded-[3rem] shadow-[0_0_100px_rgba(30,41,59,0.5)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                            <BarChart3 size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase">Operational Analytics</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Live Fleet Performance & Resource Distribution</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-all border border-slate-700/50">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Avg Response Time Chart */}
                        <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 group hover:border-blue-500/30 transition-colors">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} className="text-blue-500" /> Response Time Trend
                                </h3>
                                <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full uppercase">Real-time</span>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={responseTimeHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} unit="m" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                                        />
                                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} dot={false} animationDuration={1000} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Fleet Utilization Chart */}
                        <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 group hover:border-purple-500/30 transition-colors">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Ambulance size={14} className="text-purple-500" /> Fleet Deployment
                                </h3>
                                <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full uppercase">Active Units</span>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={fleetHistory}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            labelStyle={{ color: '#94a3b8' }}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bed Availability Bar Chart */}
                        <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 group hover:border-emerald-500/30 transition-colors">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={14} className="text-emerald-500" /> Bed Hospital Capacity
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hospitalBeds}>
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} hide />
                                        <Tooltip 
                                            cursor={{fill: '#1e293b', opacity: 0.4}}
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                        />
                                        <Bar dataKey="beds" radius={[10, 10, 0, 0]}>
                                            {hospitalBeds.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Resource Efficiency Summary */}
                        <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-center space-y-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-center justify-center">
                                <TrendingUp size={14} className="text-orange-500" /> Operational Efficiency
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">System Load</p>
                                    <p className="text-2xl font-black text-orange-400">{trafficData[0]?.label || 'Normal'}</p>
                                </div>
                                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fleet Load</p>
                                    <p className="text-2xl font-black text-blue-400">{fleetHistory[fleetHistory.length-1]?.value || 0} U</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center leading-loose">
                                Metrics are processed through EROS Neural Engine.<br/>
                                Data latency { "<" } 50ms per packet.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 text-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">Integrated Intelligence • Authorized View Only</p>
                </div>
            </div>
        </div>
    );
}

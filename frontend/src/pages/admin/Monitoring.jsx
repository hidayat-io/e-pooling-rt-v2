import { useEffect, useState, useRef } from 'react';
import { adminService } from '../../services/adminService';
import StatCard from '../../components/admin/StatCard';
import Loader from '../../components/common/Loader';
import { Users, Activity, Pause, Play } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime } from '../../utils/formatters';

export default function AdminMonitoring() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paused, setPaused] = useState(false);
    const intervalRef = useRef(null);

    const fetchData = async () => {
        try {
            const res = await adminService.getMonitoring();
            setData(res.data);
        } catch { }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(() => {
            if (!paused) fetchData();
        }, 5000);
        return () => clearInterval(intervalRef.current);
    }, [paused]);

    if (loading) return <Loader text="Memuat monitoring..." />;
    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monitoring Live</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${paused ? 'bg-gray-400' : 'bg-emerald-500 animate-pulse'}`} />
                        <span className="text-sm text-gray-500">{paused ? 'Di-pause' : 'Auto-refresh 5 detik'}</span>
                    </div>
                </div>
                <button
                    onClick={() => setPaused(!paused)}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${paused ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}
                >
                    {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {paused ? 'Resume' : 'Pause'}
                </button>
            </div>

            {/* Big Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-elevated text-center py-6">
                    <p className="text-5xl font-bold text-primary-600">{data.partisipasi.persentase}%</p>
                    <p className="text-gray-500 text-sm mt-1">Partisipasi</p>
                </div>
                <StatCard title="Sudah Memilih" value={data.partisipasi.total_voted} icon={Users} color="success" />
                <StatCard title="Total DPT" value={data.partisipasi.total_dpt} icon={Activity} color="primary" />
            </div>

            {/* Timeline Chart */}
            <div className="card">
                <h3 className="font-bold text-gray-900 mb-4">Vote per Jam (24 Jam Terakhir)</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={data.votes_per_hour}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.split(' ')[1] || v} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#2563EB" fill="#DBEAFE" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Live Feed */}
            <div className="card">
                <h3 className="font-bold text-gray-900 mb-3">Live Feed</h3>
                {data.live_feed.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada vote masuk</p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {data.live_feed.map((v, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 animate-fadeIn">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    <span className="text-sm text-gray-700">RT {v.rt} / RW {v.rw}</span>
                                </div>
                                <span className="text-xs text-gray-400">{formatTime(v.voted_at)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import StatCard from '../../components/admin/StatCard';
import Loader from '../../components/common/Loader';
import { Users, CheckCircle, XCircle, MessageSquare, Send, FileDown, Upload } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatDateTime, formatFileTimestamp } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        adminService.getDashboard()
            .then((res) => setData(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader text="Memuat dashboard..." />;
    if (!data) return null;

    const { stats, per_candidate, recent_votes, recent_failed_wa } = data;

    // Aggregate setuju / tidak setuju dari semua kandidat
    const totalSetuju = per_candidate.reduce((s, r) => s + (r.total_setuju || 0), 0);
    const totalTidakSetuju = per_candidate.reduce((s, r) => s + (r.total_tidak_setuju || 0), 0);
    const totalSuara = totalSetuju + totalTidakSetuju;
    const hasilData = [
        { name: 'Setuju', value: totalSetuju },
        { name: 'Tidak Setuju', value: totalTidakSetuju },
    ];

    const pieData = [
        { name: 'Sudah Memilih', value: stats.total_voted },
        { name: 'Belum Memilih', value: stats.total_not_voted },
    ];

    const handleQuickExport = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const blobData = await adminService.exportVoterChoicesReport({ choice: 'all' });
            const blob = blobData instanceof Blob ? blobData : new Blob([blobData]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `laporan-pemilih-${formatFileTimestamp()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(error?.message || 'Gagal export laporan');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm">Ringkasan pemilihan</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total DPT" value={stats.total_dpt} icon={Users} color="primary" />
                <StatCard title="Sudah Memilih" value={stats.total_voted} subtitle={`${stats.partisipasi}%`} icon={CheckCircle} color="success" />
                <StatCard title="Belum Memilih" value={stats.total_not_voted} icon={XCircle} color="danger" />
                <StatCard title="WA Terkirim" value={stats.wa_sent} subtitle={`${stats.wa_delivery_rate}% delivered`} icon={MessageSquare} color="purple" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hasil Sementara: Setuju vs Tidak Setuju */}
                <div className="card">
                    <h3 className="font-bold text-gray-900 mb-1">Hasil Sementara</h3>
                    <p className="text-xs text-gray-400 mb-5">Total suara masuk: {totalSuara}</p>

                    {/* Big numbers */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <p className="text-3xl font-bold text-emerald-600">{totalSetuju}</p>
                            <p className="text-sm font-medium text-emerald-700 mt-1">✅ Setuju</p>
                            <p className="text-xs text-emerald-500 mt-0.5">
                                {totalSuara > 0 ? ((totalSetuju / totalSuara) * 100).toFixed(1) : '0.0'}%
                            </p>
                        </div>
                        <div className="rounded-2xl bg-red-50 p-4 text-center">
                            <p className="text-3xl font-bold text-red-500">{totalTidakSetuju}</p>
                            <p className="text-sm font-medium text-red-600 mt-1">❌ Tidak Setuju</p>
                            <p className="text-xs text-red-400 mt-0.5">
                                {totalSuara > 0 ? ((totalTidakSetuju / totalSuara) * 100).toFixed(1) : '0.0'}%
                            </p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {totalSuara > 0 && (
                        <div>
                            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                                <div
                                    className="bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${(totalSetuju / totalSuara) * 100}%` }}
                                />
                                <div
                                    className="bg-red-400 transition-all duration-500"
                                    style={{ width: `${(totalTidakSetuju / totalSuara) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                                <span>Setuju {((totalSetuju / totalSuara) * 100).toFixed(1)}%</span>
                                <span>{((totalTidakSetuju / totalSuara) * 100).toFixed(1)}% Tidak Setuju</span>
                            </div>
                        </div>
                    )}

                    {/* Recharts bar untuk visual tambahan */}
                    <ResponsiveContainer width="100%" height={120} className="mt-4">
                        <BarChart data={hasilData} barCategoryGap="40%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip formatter={(v, n) => [v, n]} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {hasilData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={index === 0 ? '#10B981' : '#EF4444'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="card">
                    <h3 className="font-bold text-gray-900 mb-4">Partisipasi Pemilih</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={index} fill={COLORS[index]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary-600" />
                            <span className="text-xs text-gray-600">Sudah ({stats.total_voted})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-xs text-gray-600">Belum ({stats.total_not_voted})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Votes */}
                <div className="card">
                    <h3 className="font-bold text-gray-900 mb-3">Vote Terakhir Masuk</h3>
                    {recent_votes.length === 0 ? (
                        <p className="text-sm text-gray-500">Belum ada vote</p>
                    ) : (
                        <div className="space-y-2">
                            {recent_votes.map((v, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <span className="text-sm text-gray-700">{v.nama || `RT ${v.rt} / RW ${v.rw}`}</span>
                                    <span className="text-xs text-gray-400">{formatDateTime(v.voted_at)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="font-bold text-gray-900 mb-3">Aksi Cepat</h3>
                    <div className="space-y-2">
                        <button onClick={() => navigate('/admin/broadcast')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><Send className="w-4 h-4 text-blue-600" /></div>
                            <div><p className="text-sm font-medium text-gray-900">Broadcast WA</p><p className="text-xs text-gray-500">Kirim link pooling ke pemilih</p></div>
                        </button>
                        <button onClick={() => navigate('/admin/voters')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"><Upload className="w-4 h-4 text-green-600" /></div>
                            <div><p className="text-sm font-medium text-gray-900">Import DPT</p><p className="text-xs text-gray-500">Upload data pemilih dari Excel</p></div>
                        </button>
                        <button
                            onClick={handleQuickExport}
                            disabled={exporting}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center"><FileDown className="w-4 h-4 text-purple-600" /></div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Export Laporan</p>
                                <p className="text-xs text-gray-500">{exporting ? 'Menyiapkan file Excel...' : 'Download hasil pemilihan'}</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

const statusOptions = ['', 'pending', 'sent', 'delivered', 'read', 'failed'];

export default function AdminWaHistory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialVoterId = searchParams.get('voter_id') || '';

    const [logs, setLogs] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [voterId, setVoterId] = useState(initialVoterId);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 25 };
            if (status) params.status = status;
            if (voterId) params.voter_id = voterId;
            const res = await adminService.getWaLogs(params);
            setLogs(res.data || []);
            setMeta(res.meta);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, status, voterId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const applyFilter = () => {
        setPage(1);
        const nextParams = {};
        if (voterId) nextParams.voter_id = voterId;
        if (status) nextParams.status = status;
        setSearchParams(nextParams);
        fetchLogs();
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">History WhatsApp</h1>
                <p className="text-gray-500 text-sm">Riwayat semua pengiriman WA beserta hasil/status balikannya</p>
            </div>

            <div className="card flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Filter Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="input-field"
                    >
                        {statusOptions.map((s) => (
                            <option key={s || 'all'} value={s}>
                                {s ? s.toUpperCase() : 'SEMUA STATUS'}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Filter Voter ID (opsional)</label>
                    <input
                        value={voterId}
                        onChange={(e) => setVoterId(e.target.value.replace(/\D/g, ''))}
                        className="input-field"
                        placeholder="Contoh: 12"
                    />
                </div>
                <div className="md:w-40 flex items-end">
                    <button
                        onClick={applyFilter}
                        className="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Terapkan
                    </button>
                </div>
            </div>

            <div className="card overflow-x-auto">
                {loading ? (
                    <Loader text="Memuat history WA..." />
                ) : (
                    <table className="w-full min-w-[920px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Waktu</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Voter</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">No.WA</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">WA Message ID</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Result/Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((l) => (
                                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50 align-top">
                                    <td className="py-3 px-3 text-xs text-gray-500">{formatDateTime(l.created_at)}</td>
                                    <td className="py-3 px-3">
                                        <p className="font-medium text-gray-900">{l.nama || '-'}</p>
                                        <p className="text-xs text-gray-500">ID: {l.voter_id || '-'}</p>
                                    </td>
                                    <td className="py-3 px-3 text-xs font-mono text-gray-600">{l.phone}</td>
                                    <td className="py-3 px-3">
                                        <span className={`badge text-[10px] ${l.status === 'sent' || l.status === 'delivered' || l.status === 'read'
                                                ? 'badge-success'
                                                : l.status === 'failed'
                                                    ? 'badge-danger'
                                                    : l.status === 'pending'
                                                        ? 'badge-warning'
                                                        : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {l.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 text-xs font-mono text-gray-500">{l.wa_message_id || '-'}</td>
                                    <td className="py-3 px-3 text-xs text-gray-600 max-w-xs">
                                        {l.error_msg ? (
                                            <span className="text-red-600">{l.error_msg}</span>
                                        ) : (
                                            <span className="text-emerald-700">OK</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {meta && meta.totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">Hal {meta.page} dari {meta.totalPages}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                            disabled={page === meta.totalPages}
                            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import StatCard from '../../components/admin/StatCard';
import Loader from '../../components/common/Loader';
import {
    Activity, Globe, Clock, AlertTriangle, XCircle,
    Users, Filter, RotateCcw, ChevronLeft, ChevronRight,
    RefreshCw,
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

// ─── Helpers ────────────────────────────────────────────────────────────────

const METHOD_STYLES = {
    GET:    'bg-blue-100 text-blue-700',
    POST:   'bg-emerald-100 text-emerald-700',
    PUT:    'bg-amber-100 text-amber-700',
    PATCH:  'bg-purple-100 text-purple-700',
    DELETE: 'bg-red-100 text-red-700',
};

function methodBadge(method) {
    const cls = METHOD_STYLES[method] || 'bg-gray-100 text-gray-600';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${cls}`}>
            {method}
        </span>
    );
}

function statusBadge(code) {
    if (!code) return <span className="text-gray-400">-</span>;
    let cls = 'bg-gray-100 text-gray-600';
    if (code >= 200 && code < 300) cls = 'bg-emerald-100 text-emerald-700';
    else if (code >= 300 && code < 400) cls = 'bg-blue-100 text-blue-700';
    else if (code >= 400 && code < 500) cls = 'bg-amber-100 text-amber-700';
    else if (code >= 500) cls = 'bg-red-100 text-red-700';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${cls}`}>
            {code}
        </span>
    );
}

function userTypeBadge(type) {
    const map = {
        voter:     'bg-primary-50 text-primary-700',
        admin:     'bg-purple-50 text-purple-700',
        anonymous: 'bg-gray-100 text-gray-500',
    };
    const cls = map[type] || 'bg-gray-100 text-gray-500';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cls}`}>
            {type || 'anonymous'}
        </span>
    );
}

function responseTimeBadge(ms) {
    if (ms === null || ms === undefined) return <span className="text-gray-400">-</span>;
    let cls = 'text-emerald-600';
    if (ms > 1000) cls = 'text-red-600 font-semibold';
    else if (ms > 300) cls = 'text-amber-600';
    return <span className={`text-xs font-mono ${cls}`}>{ms} ms</span>;
}

const EMPTY_FILTERS = {
    method: '',
    status_code: '',
    path: '',
    user_type: '',
    ip: '',
    date_from: '',
    date_to: '',
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AdminTrafficLogs() {
    const [logs, setLogs]       = useState([]);
    const [stats, setStats]     = useState(null);
    const [meta, setMeta]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage]       = useState(1);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [applied, setApplied] = useState(EMPTY_FILTERS);

    const fetchLogs = useCallback(async (currentPage, activeFilters) => {
        setLoading(true);
        try {
            const params = { page: currentPage, limit: 50 };
            Object.entries(activeFilters).forEach(([k, v]) => {
                if (v) params[k] = v;
            });
            const res = await adminService.getTrafficLogs(params);
            setLogs(res.data?.logs || []);
            setStats(res.data?.stats || null);
            setMeta(res.meta);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs(page, applied);
    }, [fetchLogs, page, applied]);

    const applyFilter = () => {
        setPage(1);
        setApplied({ ...filters });
    };

    const resetFilter = () => {
        setFilters(EMPTY_FILTERS);
        setPage(1);
        setApplied(EMPTY_FILTERS);
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const refresh = () => fetchLogs(page, applied);

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Traffic Logs</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Log setiap HTTP request yang masuk ke server</p>
                </div>
                <button
                    onClick={refresh}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Stat Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard
                        title="Total Request"
                        value={stats.total_requests.toLocaleString()}
                        icon={Activity}
                        color="primary"
                    />
                    <StatCard
                        title="Unique IP"
                        value={stats.unique_ips.toLocaleString()}
                        icon={Globe}
                        color="purple"
                    />
                    <StatCard
                        title="Avg Response"
                        value={`${stats.avg_response_ms} ms`}
                        icon={Clock}
                        color="warning"
                    />
                    <StatCard
                        title="Error 4xx"
                        value={stats.total_4xx.toLocaleString()}
                        icon={AlertTriangle}
                        color="warning"
                    />
                    <StatCard
                        title="Error 5xx"
                        value={stats.total_5xx.toLocaleString()}
                        icon={XCircle}
                        color="danger"
                    />
                    <StatCard
                        title="Voter / Admin"
                        value={`${stats.total_voter} / ${stats.total_admin}`}
                        subtitle={`${stats.total_anonymous} anonymous`}
                        icon={Users}
                        color="success"
                    />
                </div>
            )}

            {/* Filter Bar */}
            <div className="card space-y-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filter
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Method */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Method</label>
                        <select
                            value={filters.method}
                            onChange={(e) => handleFilterChange('method', e.target.value)}
                            className="input-field"
                        >
                            <option value="">Semua</option>
                            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Code */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status Code</label>
                        <input
                            type="number"
                            value={filters.status_code}
                            onChange={(e) => handleFilterChange('status_code', e.target.value)}
                            placeholder="cth: 404"
                            className="input-field"
                        />
                    </div>

                    {/* Path */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Path</label>
                        <input
                            type="text"
                            value={filters.path}
                            onChange={(e) => handleFilterChange('path', e.target.value)}
                            placeholder="cth: /votes"
                            className="input-field"
                        />
                    </div>

                    {/* User Type */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">User Type</label>
                        <select
                            value={filters.user_type}
                            onChange={(e) => handleFilterChange('user_type', e.target.value)}
                            className="input-field"
                        >
                            <option value="">Semua</option>
                            <option value="anonymous">Anonymous</option>
                            <option value="voter">Voter</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
                        <input
                            type="datetime-local"
                            value={filters.date_from}
                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            className="input-field"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
                        <input
                            type="datetime-local"
                            value={filters.date_to}
                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            className="input-field"
                        />
                    </div>
                </div>

                {/* IP Filter + Buttons */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">IP Address</label>
                        <input
                            type="text"
                            value={filters.ip}
                            onChange={(e) => handleFilterChange('ip', e.target.value)}
                            placeholder="cth: 192.168"
                            className="input-field"
                        />
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                        <button
                            onClick={applyFilter}
                            className="h-11 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            Terapkan
                        </button>
                        <button
                            onClick={resetFilter}
                            className="h-11 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto p-0">
                {loading ? (
                    <div className="p-6">
                        <Loader text="Memuat traffic logs..." />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-sm">
                        Tidak ada data dengan filter ini.
                    </div>
                ) : (
                    <table className="w-full min-w-[980px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Waktu</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Path</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Resp. Time</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">User Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="border-b border-gray-50 hover:bg-gray-50/60 align-middle transition-colors"
                                >
                                    <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                                        {formatDateTime(log.created_at)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        {methodBadge(log.method)}
                                    </td>
                                    <td className="py-2.5 px-3 max-w-xs">
                                        <span className="text-xs font-mono text-gray-700 break-all">{log.path}</span>
                                        {log.query_string && (
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[200px]" title={log.query_string}>
                                                ?{(() => {
                                                    try {
                                                        return Object.entries(JSON.parse(log.query_string))
                                                            .map(([k, v]) => `${k}=${v}`)
                                                            .join('&');
                                                    } catch {
                                                        return log.query_string;
                                                    }
                                                })()}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        {statusBadge(log.status_code)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        {responseTimeBadge(log.response_time_ms)}
                                    </td>
                                    <td className="py-2.5 px-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                                        {log.ip_address || '-'}
                                    </td>
                                    <td className="py-2.5 px-3">
                                        {userTypeBadge(log.user_type)}
                                        {log.user_id && (
                                            <p className="text-[10px] text-gray-400 mt-0.5">ID: {log.user_id}</p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                        Hal {meta.page} dari {meta.totalPages}
                        <span className="ml-2 text-gray-400">({meta.total?.toLocaleString()} total)</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

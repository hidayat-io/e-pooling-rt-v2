import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { Search, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import { formatDateTime, formatFileTimestamp } from '../../utils/formatters';

export default function AdminReports() {
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [choice, setChoice] = useState('all');
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getVoterChoicesReport({
                page,
                limit: 25,
                search,
                choice,
            });
            setRows(res.data?.rows || []);
            setSummary(res.data?.summary || null);
            setMeta(res.meta || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, search, choice]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const filters = [
        { key: 'all', label: 'Semua' },
        { key: 'setuju', label: 'Setuju' },
        { key: 'tidak_setuju', label: 'Tidak Setuju' },
        { key: 'belum', label: 'Belum Memilih' },
    ];

    const handleExport = async () => {
        setExporting(true);
        try {
            const blobData = await adminService.exportVoterChoicesReport({ search, choice });
            const blob = blobData instanceof Blob ? blobData : new Blob([blobData]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const stamp = formatFileTimestamp();
            link.href = url;
            link.download = `laporan-pemilih-${stamp}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err?.message || 'Gagal export laporan');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Laporan Pilihan Pemilih</h1>
                    <p className="text-gray-500 text-sm">Lihat siapa memilih setuju / tidak setuju</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 mr-2">
                        <FileText className="w-4 h-4" />
                        Admin Report
                    </div>
                    <Button size="sm" icon={Download} loading={exporting} onClick={handleExport}>
                        Export Excel
                    </Button>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="card">
                        <p className="text-xs text-gray-500">Total DPT</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_voters}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-gray-500">Setuju</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.total_setuju}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-gray-500">Tidak Setuju</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{summary.total_tidak_setuju}</p>
                    </div>
                    <div className="card">
                        <p className="text-xs text-gray-500">Belum Memilih</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{summary.total_belum}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Cari nama, no. rumah, no. hp..."
                        className="input-field pl-10"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => {
                                setChoice(f.key);
                                setPage(1);
                            }}
                            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${choice === f.key
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card overflow-x-auto">
                {loading ? (
                    <Loader text="Memuat laporan..." />
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">No. Rumah</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">No. HP</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Pilihan</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Waktu Pilih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">Data tidak ditemukan</td>
                                </tr>
                            ) : rows.map((row) => (
                                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-3 px-3 font-mono text-xs font-semibold text-gray-700">{row.no_rumah || '-'}</td>
                                    <td className="py-3 px-3 font-medium">{row.nama}</td>
                                    <td className="py-3 px-3 text-gray-500 font-mono text-xs">{row.phone || '-'}</td>
                                    <td className="py-3 px-3">
                                        {row.pilihan === 'setuju' && <span className="badge-success text-[10px]">Setuju</span>}
                                        {row.pilihan === 'tidak_setuju' && <span className="badge-danger text-[10px]">Tidak Setuju</span>}
                                        {row.pilihan === 'belum' && <span className="badge-warning text-[10px]">Belum Memilih</span>}
                                    </td>
                                    <td className="py-3 px-3 text-xs text-gray-500">{formatDateTime(row.voted_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between">
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

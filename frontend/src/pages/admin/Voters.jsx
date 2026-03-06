import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { Search, Upload, Key, Trash2, ChevronLeft, ChevronRight, Pencil, Send, Link2, History, Plus, CheckCircle2, MessageCircle } from 'lucide-react';

export default function AdminVoters() {
    const navigate = useNavigate();
    const [voters, setVoters] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);

    // Import
    const [importModal, setImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // Edit
    const [editModal, setEditModal] = useState(false);
    const [editVoter, setEditVoter] = useState(null);
    const [editForm, setEditForm] = useState({ no_rumah: '', nama: '', phone: '' });
    const [editLoading, setEditLoading] = useState(false);

    const [generating, setGenerating] = useState(false);
    const [addModal, setAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ no_rumah: '', nama: '', phone: '' });
    const [adding, setAdding] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [impersonatingId, setImpersonatingId] = useState(null);
    const [manualWaLinkId, setManualWaLinkId] = useState(null);
    const [markingManualSentId, setMarkingManualSentId] = useState(null);

    const fetchVoters = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getVoters({ page, limit: 25, search, filter });
            setVoters(res.data || []);
            setMeta(res.meta);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [page, search, filter]);

    useEffect(() => { fetchVoters(); }, [fetchVoters]);

    const handleImport = async () => {
        if (!importFile) return;
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            const res = await adminService.importVoters(formData);
            setImportResult(res.data);
            fetchVoters();
        } catch (err) {
            setImportResult({ error: err.message || 'Import gagal' });
        }
        setImporting(false);
    };

    const handleGenerateTokens = async () => {
        setGenerating(true);
        try {
            const res = await adminService.generateTokens();
            alert(`${res.data.generated} kode akses baru dibuat, ${res.data.backfilled_codes || 0} kode aktif dilengkapi`);
        } catch (err) { alert(err.message); }
        setGenerating(false);
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Yakin hapus pemilih "${nama}"?`)) return;
        try {
            await adminService.deleteVoter(id);
            fetchVoters();
        } catch (err) { alert(err.message); }
    };

    const openEdit = (voter) => {
        setEditVoter(voter);
        setEditForm({ no_rumah: voter.no_rumah || voter.nik || '', nama: voter.nama, phone: voter.phone });
        setEditModal(true);
    };

    const handleSendSingleWa = async (voter) => {
        setSendingId(voter.id);
        try {
            const res = await adminService.sendSingleWa(voter.id);
            alert(`WA ke ${voter.nama}: ${res.data.status}${res.data.error ? ` (${res.data.error})` : ''}`);
            fetchVoters();
        } catch (err) {
            alert(err.message || 'Gagal kirim WA');
        } finally {
            setSendingId(null);
        }
    };

    const handleImpersonate = async (voter) => {
        setImpersonatingId(voter.id);
        try {
            const res = await adminService.getImpersonateLink(voter.id);
            const link = res.data?.link;
            if (!link) throw new Error('Link tidak tersedia');
            window.open(link, '_blank', 'noopener,noreferrer');
        } catch (err) {
            alert(err.message || 'Gagal membuat link impersonate');
        } finally {
            setImpersonatingId(null);
        }
    };

    const handleOpenManualWaLink = async (voter) => {
        setManualWaLinkId(voter.id);
        try {
            const res = await adminService.getManualWaLink(voter.id);
            const waLink = res.data?.wa_link;
            if (!waLink) throw new Error('Link wa.me tidak tersedia');
            window.open(waLink, '_blank', 'noopener,noreferrer');
        } catch (err) {
            alert(err.message || 'Gagal membuat link wa.me');
        } finally {
            setManualWaLinkId(null);
        }
    };

    const handleMarkManualWaSent = async (voter) => {
        const ok = confirm(`Tandai WA ke "${voter.nama}" sebagai sudah terkirim manual?`);
        if (!ok) return;

        setMarkingManualSentId(voter.id);
        try {
            await adminService.markManualWaSent(voter.id);
            fetchVoters();
        } catch (err) {
            alert(err.message || 'Gagal tandai WA manual');
        } finally {
            setMarkingManualSentId(null);
        }
    };

    const handleEditSubmit = async () => {
        setEditLoading(true);
        try {
            await adminService.updateVoter(editVoter.id, editForm);
            setEditModal(false);
            fetchVoters();
        } catch (err) { alert(err.message); }
        setEditLoading(false);
    };

    const handleAddSubmit = async () => {
        setAdding(true);
        try {
            await adminService.createVoter(addForm);
            setAddModal(false);
            setAddForm({ no_rumah: '', nama: '', phone: '' });
            fetchVoters();
        } catch (err) {
            alert(err.message || 'Gagal menambah data pemilih');
        } finally {
            setAdding(false);
        }
    };

    const filters = [
        { key: 'all', label: 'Semua' },
        { key: 'voted', label: 'Sudah Vote' },
        { key: 'not_voted', label: 'Belum Vote' },
        { key: 'wa_sent', label: 'WA Terkirim' },
        { key: 'wa_failed', label: 'WA Gagal' },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Data Pemilih (DPT)</h1>
                    <p className="text-gray-500 text-sm">{meta?.total || 0} pemilih terdaftar</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={Plus} onClick={() => setAddModal(true)}>Tambah Data</Button>
                    <Button size="sm" variant="outline" icon={Upload} onClick={() => setImportModal(true)}>Import Excel</Button>
                    <Button size="sm" icon={Key} loading={generating} onClick={handleGenerateTokens}>Generate Kode</Button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Cari nama atau no. rumah..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="input-field pl-10"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {filters.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => { setFilter(key); setPage(1); }}
                            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${filter === key ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
                {loading ? (
                    <Loader text="Memuat data..." />
                ) : (
                    <table className="w-full min-w-[980px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">No.Rumah</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">No.WA</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Kode Unik</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Vote</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">WA</th>
                                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {voters.map((v) => (
                                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-3 px-3 font-mono text-xs font-semibold text-gray-700">{v.no_rumah}</td>
                                    <td className="py-3 px-3 font-medium">{v.nama}</td>
                                    <td className="py-3 px-3 text-gray-500 font-mono text-xs">{v.phone}</td>
                                    <td className="py-3 px-3">
                                        <span className={`font-mono text-xs ${v.kode_unik ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
                                            {v.kode_unik || '-'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        {v.has_voted ? (
                                            <span className="badge-success text-[10px]">Sudah</span>
                                        ) : (
                                            <span className="badge-warning text-[10px]">Belum</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className={`badge text-[10px] ${v.last_wa_status === 'sent' || v.last_wa_status === 'delivered' || v.last_wa_status === 'read' ? 'badge-success' :
                                                v.last_wa_status === 'failed' ? 'badge-danger' :
                                                    v.last_wa_status === 'pending' ? 'badge-warning' :
                                                        'bg-gray-100 text-gray-500'
                                            }`}>
                                            {v.last_wa_status || '-'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <div className="flex gap-1 flex-wrap">
                                            <button
                                                onClick={() => handleSendSingleWa(v)}
                                                disabled={sendingId === v.id}
                                                className="text-emerald-500 hover:text-emerald-700 p-1 disabled:opacity-50"
                                                title="Kirim WA per orang"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenManualWaLink(v)}
                                                disabled={manualWaLinkId === v.id}
                                                className="text-cyan-500 hover:text-cyan-700 p-1 disabled:opacity-50"
                                                title="Buka link wa.me dengan isi pesan"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleMarkManualWaSent(v)}
                                                disabled={markingManualSentId === v.id}
                                                className="text-lime-600 hover:text-lime-700 p-1 disabled:opacity-50"
                                                title="Tandai WA sudah terkirim manual"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleImpersonate(v)}
                                                disabled={impersonatingId === v.id}
                                                className="text-violet-500 hover:text-violet-700 p-1 disabled:opacity-50"
                                                title="Impersonate sebagai voter ini"
                                            >
                                                <Link2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/admin/wa-history?voter_id=${v.id}`)}
                                                className="text-amber-500 hover:text-amber-700 p-1"
                                                title="Lihat history WA voter ini"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => openEdit(v)} className="text-blue-400 hover:text-blue-600 p-1" title="Edit">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(v.id, v.nama)} className="text-red-400 hover:text-red-600 p-1" title="Hapus">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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
                    <p className="text-sm text-gray-500">Hal {meta.page} dari {meta.totalPages}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page === meta.totalPages} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            <Modal isOpen={importModal} onClose={() => { setImportModal(false); setImportResult(null); setImportFile(null); }} title="Import Data Pemilih" size="md">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Upload file Excel (.xlsx) atau CSV. Kolom yang diharapkan: <strong>No.Rumah, Nama, No.WA</strong>.</p>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files[0])} className="hidden" id="import-file" />
                        <label htmlFor="import-file" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">{importFile ? importFile.name : 'Pilih file atau drag & drop'}</p>
                        </label>
                    </div>
                    {importResult && !importResult.error && (
                        <div className="bg-emerald-50 rounded-xl p-4 text-sm">
                            <p className="font-semibold text-emerald-800">Import berhasil!</p>
                            <p className="text-emerald-700">Terimport: {importResult.imported} | Dilewati: {importResult.skipped} | Error: {importResult.parse_errors?.length || 0}</p>
                        </div>
                    )}
                    {importResult?.error && (
                        <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700">{importResult.error}</div>
                    )}
                    <Button fullWidth loading={importing} disabled={!importFile} onClick={handleImport}>Upload & Import</Button>
                </div>
            </Modal>

            {/* Add Modal */}
            <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Tambah Data Pemilih" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No.Rumah</label>
                        <input
                            type="text"
                            value={addForm.no_rumah}
                            onChange={(e) => setAddForm({ ...addForm, no_rumah: e.target.value })}
                            className="input-field"
                            placeholder="Contoh: A1 No.03"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                        <input
                            type="text"
                            value={addForm.nama}
                            onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
                            className="input-field"
                            placeholder="Nama lengkap"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No.WA</label>
                        <input
                            type="text"
                            value={addForm.phone}
                            onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                            className="input-field"
                            placeholder="Contoh: 08123456789"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" fullWidth onClick={() => setAddModal(false)}>Batal</Button>
                        <Button
                            fullWidth
                            loading={adding}
                            onClick={handleAddSubmit}
                            disabled={!addForm.no_rumah || !addForm.nama || !addForm.phone}
                        >
                            Simpan
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Data Pemilih" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No.Rumah</label>
                        <input
                            type="text"
                            value={editForm.no_rumah}
                            onChange={(e) => setEditForm({ ...editForm, no_rumah: e.target.value })}
                            className="input-field"
                            placeholder="Contoh: 01"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                        <input
                            type="text"
                            value={editForm.nama}
                            onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                            className="input-field"
                            placeholder="Nama lengkap"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No.WA</label>
                        <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="input-field"
                            placeholder="Contoh: 08123456789"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" fullWidth onClick={() => setEditModal(false)}>Batal</Button>
                        <Button fullWidth loading={editLoading} onClick={handleEditSubmit}>Simpan</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

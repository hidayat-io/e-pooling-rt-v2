import { useEffect, useState } from 'react';
import { candidateService } from '../../services/candidateService';
import { adminService } from '../../services/adminService';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { Plus, Edit, Trash2, Upload, User } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/constants';

export default function AdminCandidates() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formModal, setFormModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        nomor_urut: '', nama: '', tagline: '', visi: '', misi: '',
        no_rumah: '', is_petahana: 0,
    });
    const [saving, setSaving] = useState(false);
    const [brokenImages, setBrokenImages] = useState({});

    const fetchCandidates = async () => {
        try {
            const res = await candidateService.getAll();
            setCandidates(res.data || []);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchCandidates(); }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm({ nomor_urut: '', nama: '', tagline: '', visi: '', misi: '', no_rumah: '', is_petahana: 0 });
        setFormModal(true);
    };

    const openEdit = (c) => {
        setEditingId(c.id);
        const bio = getBiodata(c.biodata);
        setForm({
            nomor_urut: c.nomor_urut,
            nama: c.nama,
            tagline: c.tagline || '',
            visi: c.visi || '',
            misi: c.misi || '',
            no_rumah: bio.no_rumah || '',
            is_petahana: c.is_petahana || 0,
        });
        setFormModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { no_rumah, ...rest } = form;
            const data = { ...rest, nomor_urut: parseInt(form.nomor_urut), is_petahana: form.is_petahana ? 1 : 0, biodata: JSON.stringify({ no_rumah }) };
            if (editingId) {
                await adminService.updateCandidate(editingId, data);
            } else {
                await adminService.createCandidate(data);
            }
            setFormModal(false);
            fetchCandidates();
        } catch (err) { alert(err.message || 'Gagal menyimpan'); }
        setSaving(false);
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Yakin hapus kandidat "${nama}"?`)) return;
        try {
            await adminService.deleteCandidate(id);
            fetchCandidates();
        } catch (err) { alert(err.message); }
    };

    const handlePhotoUpload = async (id, file) => {
        const formData = new FormData();
        formData.append('photo', file);
        try {
            await adminService.uploadPhoto(id, formData);
            fetchCandidates();
        } catch (err) { alert(err.message); }
    };

    const getBiodata = (str) => { try { return JSON.parse(str); } catch { return {}; } };

    if (loading) return <Loader text="Memuat data kandidat..." />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Kandidat</h1>
                    <p className="text-gray-500 text-sm">{candidates.length} kandidat terdaftar</p>
                </div>
                <Button icon={Plus} onClick={openCreate}>Tambah Kandidat</Button>
            </div>

            {/* Candidate Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((c) => {
                    const bio = getBiodata(c.biodata);
                    return (
                        <div key={c.id} className="card animate-fadeIn">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                                        {c.photo_url && !brokenImages[c.id] ? (
                                            <img
                                                src={resolveAssetUrl(c.photo_url)}
                                                alt={c.nama}
                                                className="w-full h-full object-cover"
                                                onError={() => setBrokenImages((prev) => ({ ...prev, [c.id]: true }))}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-gray-400" /></div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-sm">{c.nama}</h3>
                                    {c.is_petahana ? <span className="badge-warning text-[10px]">Petahana</span> : null}
                                    {bio.no_rumah && <p className="text-xs text-gray-500 mt-0.5">No. {bio.no_rumah}</p>}
                                </div>
                            </div>
                            {c.tagline && <p className="text-xs text-gray-500 italic mb-3">"{c.tagline}"</p>}
                            <div className="flex gap-2">
                                <label className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                    <Upload className="w-3 h-3" /> Upload Foto
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handlePhotoUpload(c.id, e.target.files[0])} />
                                </label>
                                <button onClick={() => openEdit(c)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><Edit className="w-4 h-4 text-gray-500" /></button>
                                <button onClick={() => handleDelete(c.id, c.nama)} className="p-2 rounded-lg border border-gray-200 hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Form Modal */}
            <Modal isOpen={formModal} onClose={() => setFormModal(false)} title={editingId ? 'Edit Kandidat' : 'Tambah Kandidat'} size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Nomor Urut</label>
                            <input type="number" value={form.nomor_urut} onChange={(e) => setForm({ ...form, nomor_urut: e.target.value })} className="input-field" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Nama Lengkap</label>
                            <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="input-field" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">No. Rumah</label>
                        <input type="text" value={form.no_rumah} onChange={(e) => setForm({ ...form, no_rumah: e.target.value })} className="input-field" placeholder="cth: 15A" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Tagline</label>
                        <input type="text" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="input-field" placeholder="Quote singkat" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Visi</label>
                        <textarea value={form.visi} onChange={(e) => setForm({ ...form, visi: e.target.value })} className="input-field min-h-[80px]" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Misi (pisahkan dengan enter)</label>
                        <textarea value={form.misi} onChange={(e) => setForm({ ...form, misi: e.target.value })} className="input-field min-h-[100px]" placeholder="Misi 1&#10;Misi 2&#10;Misi 3" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={!!form.is_petahana} onChange={(e) => setForm({ ...form, is_petahana: e.target.checked ? 1 : 0 })} className="rounded" id="petahana" />
                        <label htmlFor="petahana" className="text-sm text-gray-700">Petahana</label>
                    </div>
                    <Button fullWidth loading={saving} onClick={handleSave}>
                        {editingId ? 'Simpan Perubahan' : 'Tambah Kandidat'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

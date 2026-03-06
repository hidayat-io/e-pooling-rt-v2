import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import Button from '../../components/common/Button';
import { Send, Users, AlertTriangle, XCircle, MessageSquare, Pencil, Save, X } from 'lucide-react';
import { formatDateTimeLong } from '../../utils/formatters';

const SAMPLE = {
    nama: 'Budi Santoso',
    link: 'cias.web.id',
    kode_unik: '1234',
    batas_pooling: 'Jumat, 31 Januari 2025, 23.59',
    kontak_panitia: '628123456789',
};

function renderPreview(template, settings) {
    if (!template) return '';
    const batasPooling = settings?.pooling_end
        ? formatDateTimeLong(settings.pooling_end)
        : SAMPLE.batas_pooling;

    return template
        .replace(/{nama}/g, SAMPLE.nama)
        .replace(/{election_name}/g, settings?.election_name || '')
        .replace(/{election_period}/g, settings?.election_period || '')
        .replace(/{link}/g, SAMPLE.link)
        .replace(/{kode_unik}/g, SAMPLE.kode_unik)
        .replace(/{batas_pooling}/g, batasPooling)
        .replace(/{batas_voting}/g, batasPooling)
        .replace(/{kontak_panitia}/g, SAMPLE.kontak_panitia);
}

export default function AdminBroadcast() {
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const [template, setTemplate] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editDraft, setEditDraft] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [templateSettings, setTemplateSettings] = useState(null);
    const [templateLoading, setTemplateLoading] = useState(true);

    useEffect(() => {
        adminService.getWaTemplate().then((res) => {
            setTemplate(res.data.template);
            setTemplateSettings(res.data.settings);
        }).finally(() => setTemplateLoading(false));
    }, []);

    const handleSaveTemplate = async () => {
        setSavingTemplate(true);
        try {
            await adminService.updateWaTemplate(editDraft);
            setTemplate(editDraft);
            setEditMode(false);
        } catch (err) { alert(err.message); }
        setSavingTemplate(false);
    };

    const filters = [
        { key: 'all', label: 'Semua Belum Vote', icon: Users, desc: 'Kirim ke semua pemilih yang belum memberikan suara' },
        { key: 'no_wa', label: 'Belum Dapat WA', icon: MessageSquare, desc: 'Kirim ke pemilih yang belum pernah menerima WA' },
        { key: 'wa_failed', label: 'WA Gagal', icon: XCircle, desc: 'Kirim ulang ke pemilih yang WA-nya gagal terkirim' },
        { key: 'not_voted', label: 'Belum Vote', icon: AlertTriangle, desc: 'Reminder ke semua pemilih yang belum vote' },
    ];

    const handleBroadcast = async () => {
        if (!confirm(`Yakin ingin broadcast WA ke target "${filters.find(f => f.key === filter)?.label}"?`)) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await adminService.broadcast(filter);
            setResult(res.data);
        } catch (err) { setResult({ error: err.message }); }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Broadcast WhatsApp</h1>
                <p className="text-gray-500 text-sm">Kirim website pooling + kode unik ke pemilih via WhatsApp</p>
            </div>

            {/* Template */}
            <div className="card space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-bold text-gray-900">Template Pesan</h3>
                    {!editMode ? (
                        <button
                            onClick={() => { setEditDraft(template); setEditMode(true); }}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit Template
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={() => setEditMode(false)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                                <X className="w-3.5 h-3.5" /> Batal
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={savingTemplate}
                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" /> {savingTemplate ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    )}
                </div>

                {editMode ? (
                    <div className="space-y-2">
                        <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={14}
                            className="w-full font-mono text-xs border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                        />
                        <p className="text-xs text-gray-400">
                            Placeholder yang tersedia:{' '}
                            {['{nama}', '{election_name}', '{election_period}', '{link}', '{kode_unik}', '{batas_pooling}', '{kontak_panitia}'].map((p) => (
                                <span key={p} className="font-mono bg-gray-100 px-1 rounded mr-1">{p}</span>
                            ))}
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-gray-400 mb-1.5">Template mentah</p>
                            <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 whitespace-pre-line border border-gray-100 h-64 overflow-auto">
                                {templateLoading ? 'Memuat...' : template}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1.5">Preview (data contoh)</p>
                            <div className="bg-green-50 rounded-xl p-4 font-mono text-xs text-gray-700 whitespace-pre-line border border-green-100 h-64 overflow-auto">
                                {templateLoading ? 'Memuat...' : renderPreview(template, templateSettings)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Target */}
            <div>
                <h3 className="font-bold text-gray-900 mb-3">Pilih Target</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filters.map(({ key, label, icon: Icon, desc }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`text-left p-4 rounded-xl border-2 transition-all ${filter === key ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-5 h-5 ${filter === key ? 'text-primary-600' : 'text-gray-400'}`} />
                                <div>
                                    <p className="font-semibold text-sm text-gray-900">{label}</p>
                                    <p className="text-xs text-gray-500">{desc}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {result && !result.error && (
                <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="font-semibold text-emerald-800">Broadcast berhasil di-queue!</p>
                    <p className="text-sm text-emerald-700 mt-1">{result.queued} pesan dalam antrian.</p>
                    <p className="text-xs text-emerald-600 mt-1">Estimasi waktu: ~{result.estimated_time_seconds} detik</p>
                </div>
            )}
            {result?.error && (
                <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700">{result.error}</div>
            )}

            <Button icon={Send} loading={loading} onClick={handleBroadcast} className="!px-8">
                Mulai Broadcast
            </Button>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { Save, AlertTriangle } from 'lucide-react';
import { isoToJakartaDateTimeLocalInput, jakartaDateTimeLocalInputToIso } from '../../utils/formatters';

export default function AdminSettings() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [modified, setModified] = useState({});
    const defaultValues = {
        wa_message_delay_ms: '20000',
        wa_rate_limit: '20',
    };

    useEffect(() => {
        adminService.getSettings()
            .then((res) => setSettings(res.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (key, value) => {
        setModified({ ...modified, [key]: value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(modified).map(([key, value]) => ({ key, value: String(value) }));
            if (updates.length === 0) { alert('Tidak ada perubahan'); setSaving(false); return; }
            await adminService.updateSettings(updates);
            // Refresh
            const res = await adminService.getSettings();
            setSettings(res.data || []);
            setModified({});
            alert('Pengaturan berhasil disimpan!');
        } catch (err) { alert(err.message); }
        setSaving(false);
    };

    const handleResetPooling = async () => {
        const ok1 = window.confirm('Reset semua hasil pooling? Aksi ini akan menghapus seluruh suara yang sudah masuk.');
        if (!ok1) return;
        const ok2 = window.confirm('Konfirmasi terakhir: data DPT tetap aman, tetapi semua hasil pooling akan direset. Lanjutkan?');
        if (!ok2) return;

        setResetting(true);
        try {
            const res = await adminService.resetPooling();
            const info = res.data || {};
            alert(
                `Reset berhasil.\n` +
                `- Suara dihapus: ${info.votes_deleted || 0}\n` +
                `- Pemilih direset: ${info.voters_reset || 0}\n` +
                `- Token direset: ${info.tokens_reset || 0}`
            );
        } catch (err) {
            alert(err.message || 'Gagal reset hasil pooling');
        } finally {
            setResetting(false);
        }
    };

    if (loading) return <Loader text="Memuat pengaturan..." />;

    const getValue = (key) => modified[key] !== undefined
        ? modified[key]
        : settings.find((s) => s.key === key)?.value || defaultValues[key] || '';

    const fields = [
        { key: 'election_name', label: 'Nama Pemilihan', type: 'text' },
        { key: 'election_period', label: 'Periode Jabatan', type: 'text' },
        { key: 'rt', label: 'RT', type: 'text' },
        { key: 'rw', label: 'RW', type: 'text' },
        { key: 'pooling_start', label: 'Tanggal Mulai', type: 'datetime-local' },
        { key: 'pooling_end', label: 'Tanggal Selesai', type: 'datetime-local' },
        { key: 'pooling_status', label: 'Status Pooling', type: 'select', options: ['active', 'paused', 'closed'] },
        { key: 'show_realtime', label: 'Tampilkan Hasil Real-time', type: 'select', options: ['1', '0'] },
        { key: 'token_expiry_days', label: 'Masa Berlaku Token (hari)', type: 'number', min: 1 },
        { key: 'wa_message_delay_ms', label: 'Interval WA per Pesan (detik)', type: 'seconds-ms' },
        {
            key: 'wa_rate_limit',
            label: 'Jumlah WA per Batch (orang)',
            type: 'number',
            min: 1,
            note: 'Rekomendasi aman: 5-10 orang per batch.',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Pengaturan Pemilihan</h1>
                <p className="text-gray-500 text-sm">Konfigurasi parameter pemilihan</p>
            </div>

            <div className="card">
                <div className="space-y-4">
                    {fields.map(({ key, label, type, options, min, note }) => (
                        <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                            <label className="text-sm font-medium text-gray-700">{label}</label>
                            <div className="md:col-span-2">
                                {type === 'select' ? (
                                    <select value={getValue(key)} onChange={(e) => handleChange(key, e.target.value)} className="input-field">
                                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : type === 'datetime-local' ? (
                                    <input
                                        type="datetime-local"
                                        value={isoToJakartaDateTimeLocalInput(getValue(key))}
                                        onChange={(e) => handleChange(key, jakartaDateTimeLocalInputToIso(e.target.value))}
                                        className="input-field"
                                    />
                                ) : type === 'seconds-ms' ? (
                                    <input
                                        type="number"
                                        min="1"
                                        value={Math.max(1, Math.round((Number(getValue(key)) || 20000) / 1000))}
                                        onChange={(e) => handleChange(key, String(Math.max(1, Number(e.target.value || 1)) * 1000))}
                                        className="input-field"
                                    />
                                ) : (
                                    <input
                                        type={type}
                                        min={min}
                                        value={getValue(key)}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                        className="input-field"
                                    />
                                )}
                                {note ? (
                                    <p className="text-xs text-gray-500 mt-1">{note}</p>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                    <Button icon={Save} loading={saving} onClick={handleSave}>Simpan Pengaturan</Button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="border-2 border-red-200 rounded-xl p-6">
                <h3 className="font-bold text-red-600 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" /> Zona Berbahaya
                </h3>
                <p className="text-sm text-gray-600 mb-4">Aksi di bawah ini tidak dapat dibatalkan.</p>
                <div className="flex gap-3">
                    <Button variant="danger" size="sm" loading={resetting} onClick={handleResetPooling}>
                        Reset Semua Pooling
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                        try {
                            const res = await adminService.exportReport();
                            console.log('Report:', res.data);
                            alert('Laporan berhasil di-generate! Cek console untuk data.');
                        } catch (err) { alert(err.message); }
                    }}>
                        Export Full Backup
                    </Button>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { candidateService } from '../../services/candidateService';
import { voteService } from '../../services/voteService';
import useVoterStore from '../../stores/voterStore';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { ArrowLeft, Lock, User, CheckSquare, XCircle, AlertTriangle } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/constants';

export default function VoteConfirm() {
    const [searchParams] = useSearchParams();
    const candidateId = searchParams.get('candidate');
    const choice = searchParams.get('choice') || 'setuju';
    const navigate = useNavigate();
    const { voter, setHasVoted } = useVoterStore();

    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!candidateId) {
            navigate('/candidates');
            return;
        }
        candidateService.getById(candidateId)
            .then((res) => setCandidate(res.data))
            .catch(() => navigate('/candidates'))
            .finally(() => setLoading(false));
    }, [candidateId]);

    const handleSubmit = async () => {
        if (!confirmed || submitting) return;
        setSubmitting(true);
        setError(null);

        try {
            await voteService.submit(parseInt(candidateId), choice);
            setHasVoted();
            navigate('/success', { replace: true });
        } catch (err) {
            setError(err.message || 'Gagal mengirim suara. Silakan coba lagi.');
            setSubmitting(false);
        }
    };

    if (loading) return <Loader fullScreen />;
    if (!candidate) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-4 flex items-center sticky top-0 z-30">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2 border border-transparent hover:border-gray-200">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="ml-2 font-bold text-gray-900">Konfirmasi Pilihan</h1>
            </div>

            <div className="px-4 py-6 max-w-md mx-auto">
                <div className="text-center mb-6 animate-fadeIn">
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Konfirmasi Pilihan</h2>
                    <p className="text-sm text-gray-600 mt-1">Periksa kembali sebelum suara dikirim.</p>
                </div>

                {/* Choice Card */}
                <div className={`rounded-3xl p-6 mb-6 text-center animate-slideUp border-2 shadow-sm
                    ${choice === 'setuju'
                        ? 'bg-gradient-to-b from-green-50 to-white border-green-200'
                        : 'bg-gradient-to-b from-red-50 to-white border-red-200'
                    }`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3
                        ${choice === 'setuju' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {choice === 'setuju' ? <CheckSquare className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                    </div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Pilihan Anda</p>
                    <h3 className={`text-2xl font-black mt-1
                        ${choice === 'setuju' ? 'text-green-700' : 'text-red-700'}`}>
                        {choice === 'setuju' ? 'SETUJU' : 'TIDAK SETUJU'}
                    </h3>
                </div>

                {/* Candidate Card (Mini) */}
                <div className="card-elevated flex items-center gap-4 mb-6 animate-fadeIn rounded-2xl border-gray-200 shadow-sm">
                    <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border-2 border-primary-100">
                            {candidate.photo_url ? (
                                <img src={resolveAssetUrl(candidate.photo_url)} alt={candidate.nama} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                    <User className="w-6 h-6 text-gray-400" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 leading-tight truncate">{candidate.nama}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">Calon Ketua RT</p>
                    </div>
                </div>

                {/* Warning Box */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-6 animate-fadeIn">
                    <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-amber-800 text-sm">Penting Diketahui</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                Pilihan Anda bersifat rahasia dan tidak dapat diubah setelah dikirim.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Checkbox */}
                <label className="flex items-start gap-3 mb-6 cursor-pointer select-none group bg-white rounded-2xl border border-gray-200 p-4">
                    <div className="relative mt-0.5">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={() => setConfirmed(!confirmed)}
                            className="sr-only peer"
                        />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-all
                          flex items-center justify-center">
                            {confirmed && <CheckSquare className="w-4 h-4 text-white" />}
                        </div>
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-relaxed">
                        Saya sudah yakin dengan pilihan ini
                    </span>
                </label>

                {/* Submit Button */}
                <Button
                    fullWidth
                    disabled={!confirmed}
                    loading={submitting}
                    className="!py-4 shadow-lg rounded-2xl"
                    onClick={handleSubmit}
                >
                    Ya, Konfirmasi Pilihan
                </Button>

                <button
                    onClick={() => navigate('/candidates')}
                    className="w-full text-center text-sm text-gray-500 hover:text-primary-600 mt-4 py-2 transition-colors font-medium"
                >
                    Ubah Pilihan
                </button>
            </div>
        </div>
    );
}

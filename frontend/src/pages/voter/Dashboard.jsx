import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVoterAuth from '../../hooks/useVoterAuth';
import useElectionStore from '../../stores/electionStore';
import useResults from '../../hooks/useResults';
import { candidateService } from '../../services/candidateService';
import CandidateCard from '../../components/voter/CandidateCard';
import ResultCard from '../../components/voter/ResultCard';
import ProgressBar from '../../components/common/ProgressBar';
import Loader from '../../components/common/Loader';
import { CheckCircle2, Home, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function Dashboard() {
    const { voter } = useVoterAuth();
    const { settings, fetchSettings } = useElectionStore();
    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(true);
    const navigate = useNavigate();

    const { results, stats, loading: loadingResults } = useResults(10000);

    useEffect(() => {
        fetchSettings();
        candidateService.getAll()
            .then((res) => setCandidates(res.data || []))
            .catch(() => { })
            .finally(() => setLoadingCandidates(false));
    }, []);

    if (!voter || loadingCandidates) return <Loader fullScreen text="Memuat..." />;

    const maxVotes = results?.results
        ? Math.max(...results.results.map((r) => r.total_suara || r.total || 0), 0)
        : 0;

    return (
        <div className="page-container">
            <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-cyan-600 text-white px-4 pt-5 pb-10 rounded-b-3xl shadow-lg">
                <div className="mb-4">
                    <p className="text-primary-100/90 text-sm">Selamat datang,</p>
                    <h1 className="text-2xl font-extrabold tracking-tight">{voter.nama}</h1>
                </div>
                <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-3.5 flex items-center gap-3 border border-white/15">
                    <Home className="w-5 h-5 text-primary-100 flex-shrink-0" />
                    <div>
                        <p className="text-xs text-primary-100/90">No. Rumah</p>
                        <p className="font-semibold">{voter.no_rumah || '-'}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4 pb-24">
                {voter.has_voted ? (
                    <>
                        <div className="card-elevated text-center py-6 animate-slideUp rounded-2xl border-gray-200 shadow-sm">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Terima Kasih!</h2>
                            <p className="text-sm text-gray-500 mt-1">Suara Anda sudah berhasil dicatat</p>
                        </div>

                        {loadingResults ? (
                            <Loader text="Memuat hasil..." />
                        ) : results?.show ? (
                            <>
                                {stats && (
                                    <div className="card animate-fadeIn rounded-2xl border-gray-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Total Partisipasi Pemilih</h3>
                                            <span className="text-2xl font-bold text-primary-600">{stats.partisipasi}%</span>
                                        </div>
                                        <ProgressBar value={stats.total_voted} max={stats.total_dpt} />
                                        <p className="text-xs text-gray-500 mt-2">{stats.total_voted} dari {stats.total_dpt} pemilih</p>
                                    </div>
                                )}
                                {results.results && (
                                    <div className="space-y-3">
                                        <h3 className="section-title">Hasil Sementara</h3>
                                        {results.is_single_candidate ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                {results.results.map((res, i) => (
                                                    <div key={i} className="card-elevated animate-fadeIn rounded-2xl border-gray-200 shadow-sm p-3">
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <span className={`font-bold text-lg leading-tight ${res.label === 'Setuju' ? 'text-green-600' : 'text-red-600'}`}>
                                                                {res.label}
                                                            </span>
                                                            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                                                                {res.total} Suara
                                                            </span>
                                                        </div>
                                                        <ProgressBar
                                                            value={parseFloat(res.persentase)}
                                                            max={100}
                                                            color={res.label === 'Setuju' ? 'success' : 'danger'}
                                                        />
                                                        <div className="text-right mt-1">
                                                            <span className="text-xs font-bold text-gray-500">{res.persentase}%</span>
                                                            <p className="text-[11px] text-gray-400">dari total suara masuk</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            results.results.map((candidate) => (
                                                <ResultCard
                                                    key={candidate.id}
                                                    candidate={candidate}
                                                    totalVotes={results.total_suara}
                                                    isLeading={candidate.total_suara === maxVotes && maxVotes > 0}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                {results?.message || 'Hasil akan ditampilkan setelah pemilihan selesai'}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm">
                            <p className="text-sm text-gray-700 font-medium">Berikan pendapat Anda untuk kandidat berikut:</p>
                        </div>
                        {candidates.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 bg-white border border-dashed border-gray-200 rounded-2xl">
                                <p>Belum ada kandidat tersedia</p>
                            </div>
                        ) : (
                            candidates.map((candidate) => (
                                <div key={candidate.id} className="space-y-3">
                                    <CandidateCard candidate={candidate} />
                                    <div className="flex gap-3">
                                        <button
                                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 active:scale-95 transition-all shadow-sm"
                                            onClick={() => navigate(`/confirm?candidate=${candidate.id}&choice=setuju`)}
                                        >
                                            <ThumbsUp className="w-4 h-4" /> Setuju
                                        </button>
                                        <button
                                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 active:scale-95 transition-all"
                                            onClick={() => navigate(`/confirm?candidate=${candidate.id}&choice=tidak_setuju`)}
                                        >
                                            <ThumbsDown className="w-4 h-4" /> Tidak Setuju
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { candidateService } from '../../services/candidateService';
import useVoterStore from '../../stores/voterStore';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { parseBiodata, parseMisi } from '../../utils/formatters';
import { ArrowLeft, User, Home, Eye, Target, CheckSquare, XCircle, Award } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/constants';

export default function CandidateDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imgError, setImgError] = useState(false);
    const { voter } = useVoterStore();

    useEffect(() => {
        candidateService.getById(id)
            .then((res) => setCandidate(res.data))
            .catch(() => navigate('/candidates'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Loader fullScreen />;
    if (!candidate) return null;

    const biodata = parseBiodata(candidate.biodata);
    const misiList = parseMisi(candidate.misi);
    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Hero */}
            <div className="relative z-0 bg-gradient-to-br from-primary-700 via-primary-600 to-cyan-600 text-white pb-20 shadow-lg">
                <div className="px-4 pt-4 flex items-center">
                    <button onClick={handleBack} className="p-2 rounded-xl hover:bg-white/15 transition-colors border border-white/20">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="ml-2 font-semibold tracking-wide">Detail Kandidat</h1>
                </div>
            </div>

            {/* Profile Card */}
            <div className="px-4 -mt-10 relative z-20">
                <div className="card-elevated text-center animate-slideUp rounded-2xl shadow-xl border-0 pt-12">
                    <div className="relative inline-block -mt-16 mb-2">
                        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 border-4 border-white shadow-md mx-auto">
                            {candidate.photo_url && !imgError ? (
                                <img
                                    src={resolveAssetUrl(candidate.photo_url)}
                                    alt={candidate.nama}
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                    <User className="w-12 h-12 text-gray-400" />
                                </div>
                            )}
                        </div>
                    </div>

                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{candidate.nama}</h2>
                    <p className="text-sm text-gray-500 uppercase tracking-wider mt-1">
                        Calon Ketua RT
                        {candidate.is_petahana ? (
                            <span className="ml-2 badge-warning text-xs inline-flex items-center gap-1">
                                <Award className="w-3 h-3" /> Petahana
                            </span>
                        ) : null}
                    </p>

                    {candidate.tagline && (
                        <p className="text-gray-600 italic mt-3 text-sm px-4 leading-relaxed">"{candidate.tagline}"</p>
                    )}

                    {/* No Rumah */}
                    {biodata?.no_rumah && (
                        <div className="flex justify-center mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Home className="w-4 h-4 text-primary-500" />
                                <span className="text-sm">No. Rumah <span className="font-semibold">{biodata.no_rumah}</span></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 mt-4 space-y-4 max-w-2xl mx-auto">
                {/* Visi */}
                {candidate.visi && (
                    <div className="card animate-fadeIn rounded-2xl border-gray-200/90 shadow-sm">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-primary-600" /> Visi
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed">{candidate.visi}</p>
                    </div>
                )}

                {/* Misi */}
                {misiList.length > 0 && (
                    <div className="card animate-fadeIn rounded-2xl border-gray-200/90 shadow-sm">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-primary-600" /> Misi
                        </h3>
                        <ol className="space-y-2.5">
                            {misiList.map((misi, i) => (
                                <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                                    <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                    </span>
                                    {misi}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Vote Buttons */}
                {voter && !voter.has_voted && (
                    <div className="sticky bottom-20 z-30">
                        <div className="grid grid-cols-2 gap-3 bg-white/90 backdrop-blur-sm rounded-2xl p-2 border border-gray-100 shadow-md">
                            <Button
                                icon={CheckSquare}
                                className="!py-3 shadow-sm bg-green-600 hover:bg-green-700 rounded-xl"
                                onClick={() => navigate(`/confirm?candidate=${candidate.id}&choice=setuju`)}
                            >
                                Setuju
                            </Button>
                            <Button
                                icon={XCircle}
                                variant="outline"
                                className="!py-3 shadow-sm border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                                onClick={() => navigate(`/confirm?candidate=${candidate.id}&choice=tidak_setuju`)}
                            >
                                Tidak Setuju
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

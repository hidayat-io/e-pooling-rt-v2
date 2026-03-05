import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronRight, User } from 'lucide-react';
import { resolveAssetUrl } from '../../utils/constants';

export default function CandidateCard({ candidate, showVoteButton = false }) {
    const navigate = useNavigate();
    const [imgError, setImgError] = useState(false);
    const biodata = candidate.biodata ? JSON.parse(candidate.biodata) : null;

    return (
        <div
            className="card cursor-pointer animate-fadeIn group border-gray-200/80 hover:border-primary-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            onClick={() => navigate(`/candidates/${candidate.id}`)}
        >
            <div className="flex gap-4">
                {/* Photo */}
                <div className="relative flex-shrink-0">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-200 group-hover:border-primary-300 transition-colors shadow-sm">
                        {candidate.photo_url && !imgError ? (
                            <img
                                src={resolveAssetUrl(candidate.photo_url)}
                                alt={candidate.nama}
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                <User className="w-10 h-10 text-gray-400" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 leading-tight text-[15px]">{candidate.nama}</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
                                Calon Ketua RT
                                {candidate.is_petahana ? (
                                    <span className="ml-1.5 badge-warning text-[10px]">Petahana</span>
                                ) : null}
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 group-hover:text-primary-500 transition-colors mt-0.5" />
                    </div>

                    {candidate.tagline && (
                        <p className="text-sm text-gray-600 italic mt-2 line-clamp-2 leading-relaxed">
                            "{candidate.tagline}"
                        </p>
                    )}

                    <button
                        className="text-xs text-primary-700 font-semibold mt-2.5 hover:text-primary-800 flex items-center gap-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/candidates/${candidate.id}`);
                        }}
                    >
                        Lihat Visi & Misi
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}

import { User } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';
import { resolveAssetUrl } from '../../utils/constants';

export default function ResultCard({ candidate, totalVotes, isLeading = false }) {
    const percentage = parseFloat(candidate.persentase) || 0;

    return (
        <div className={`card animate-fadeIn ${isLeading ? 'ring-2 ring-primary-200 bg-primary-50/30' : ''}`}>
            <div className="flex items-center gap-3">
                {/* Photo */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex-shrink-0">
                    {candidate.photo_url ? (
                        <img src={resolveAssetUrl(candidate.photo_url)} alt={candidate.nama} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-900 text-sm truncate">{candidate.nama}</h4>
                            <p className="text-xs text-gray-500">No. Urut {candidate.nomor_urut}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                            <p className={`text-xl font-bold ${isLeading ? 'text-primary-600' : 'text-gray-700'}`}>
                                {candidate.total_suara}
                            </p>
                            <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                    </div>
                    <ProgressBar
                        value={candidate.total_suara}
                        max={totalVotes || 1}
                        color={isLeading ? 'primary' : 'primary'}
                        height="h-2"
                        className="mt-2"
                    />
                </div>
            </div>
        </div>
    );
}

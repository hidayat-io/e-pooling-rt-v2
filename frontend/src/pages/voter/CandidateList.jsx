import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { candidateService } from '../../services/candidateService';
import useElectionStore from '../../stores/electionStore';
import CandidateCard from '../../components/voter/CandidateCard';
import Loader from '../../components/common/Loader';

export default function CandidateList() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const { settings, fetchSettings } = useElectionStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchSettings();
        candidateService.getAll()
            .then((res) => {
                const candidateData = res.data || [];
                setCandidates(candidateData);
                if (candidateData.length === 1) {
                    navigate(`/candidates/${candidateData[0].id}`, { replace: true });
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [navigate]);

    if (loading) return <Loader fullScreen text="Memuat daftar calon..." />;

    return (
        <div className="page-container">
            <div className="sticky top-0 z-30 px-4 py-4 border-b border-primary-100 bg-gradient-to-r from-white via-blue-50/50 to-white backdrop-blur supports-[backdrop-filter]:bg-white/85">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                    {settings?.election_name || 'Pemilihan Ketua RT/RW'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Periode {settings?.election_period || '-'} • {candidates.length} kandidat
                </p>
            </div>

            <div className="px-4 py-4 space-y-3 pb-20">
                <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm">
                    <p className="text-sm text-gray-700 font-medium">Pilih kandidat untuk melihat detail visi, misi, dan profil.</p>
                </div>
                {candidates.length === 0 ? (
                    <div className="text-center py-14 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">
                        <p>Belum ada kandidat tersedia</p>
                    </div>
                ) : (
                    candidates.map((candidate) => (
                        <CandidateCard key={candidate.id} candidate={candidate} />
                    ))
                )}
            </div>
        </div>
    );
}

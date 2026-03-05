import { useState } from 'react';
import useResults from '../../hooks/useResults';
import useVoterStore from '../../stores/voterStore';
import ResultCard from '../../components/voter/ResultCard';
import ProgressBar from '../../components/common/ProgressBar';
import Loader from '../../components/common/Loader';
import { RefreshCw, Bell, Users } from 'lucide-react';

export default function Results() {
    const { results, stats, loading, refresh } = useResults(10000);
    const { voter } = useVoterStore();
    const [refreshing, setRefreshing] = useState(false);
    const displayRt = stats?.rt || voter?.rt || '05';
    const displayRw = stats?.rw || voter?.rw || '02';

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setTimeout(() => setRefreshing(false), 500);
    };

    if (loading) return <Loader fullScreen text="Memuat hasil..." />;

    // Jika hasil belum boleh ditampilkan
    if (results && !results.show) {
        return (
            <div className="page-container flex items-center justify-center">
                <div className="text-center px-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Hasil Belum Tersedia</h2>
                    <p className="text-gray-500">{results.message}</p>
                </div>
            </div>
        );
    }

    const maxVotes = results?.results ? Math.max(...results.results.map((r) => r.total_suara), 0) : 0;

    return (
        <div className="page-container">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-30">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">
                        RT {displayRt} / RW {displayRw}
                    </h1>
                    <p className="text-xs text-gray-500">Hasil Pemilihan</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Bell className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* Participation Card */}
                {stats && (
                    <div className="card-elevated animate-fadeIn">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">Partisipasi Pemilih</h3>
                            <span className="badge-primary text-xs">{stats.pooling_status === 'active' ? 'Berlangsung' : 'Selesai'}</span>
                        </div>
                        <div className="flex items-end gap-4 mb-3">
                            <span className="text-4xl font-bold text-primary-600">{stats.partisipasi}%</span>
                            <span className="text-sm text-gray-500 pb-1">{stats.total_voted} dari {stats.total_dpt} pemilih</span>
                        </div>
                        <ProgressBar value={stats.total_voted} max={stats.total_dpt} />
                        <p className="text-xs text-gray-500 mt-2">
                            {stats.total_not_voted} pemilih belum memberikan suara
                        </p>
                    </div>
                )}

                {/* Results */}
                {results?.results && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="section-title !mb-0">
                                {results.is_single_candidate ? 'Hasil Persetujuan' : 'Total Suara Masuk'}
                            </h3>
                            <span className="text-lg font-bold text-primary-600">{results.total_suara}</span>
                        </div>

                        <div className="space-y-3">
                            {results.is_single_candidate ? (
                                results.results.map((res, i) => (
                                    <div key={i} className="card-elevated animate-fadeIn">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={`font-bold ${res.label === 'Setuju' ? 'text-green-600' : 'text-red-600'}`}>
                                                {res.label}
                                            </span>
                                            <span className="text-sm font-bold">{res.total} Suara</span>
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
                                ))
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
                    </div>
                )}

                <p className="text-xs text-gray-400 text-center pt-2">
                    Hasil diperbarui otomatis setiap 10 detik
                </p>
            </div>

            {/* FAB Refresh */}
            <button
                onClick={handleRefresh}
                className={`fixed bottom-24 right-4 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all z-30 ${refreshing ? 'animate-spin' : ''}`}
            >
                <RefreshCw className="w-5 h-5" />
            </button>
        </div>
    );
}

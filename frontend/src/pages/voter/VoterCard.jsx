import useVoterAuth from '../../hooks/useVoterAuth';
import Card from '../../components/common/Card';
import { Shield, CheckCircle, XCircle } from 'lucide-react';

export default function VoterCard() {
    const { voter } = useVoterAuth();
    if (!voter) return null;

    return (
        <div className="page-container">
            <div className="bg-white border-b border-gray-100 px-4 py-4">
                <h1 className="text-lg font-bold text-gray-900">Kartu Pemilih Digital</h1>
                <p className="text-sm text-gray-500">Bukti terdaftar sebagai pemilih</p>
            </div>

            <div className="px-4 py-6">
                <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-xl shadow-primary-200 animate-slideUp">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-primary-200 text-xs uppercase tracking-wider">Kartu Pemilih</p>
                            <p className="font-bold text-sm">Pemilihan Ketua RT/RW</p>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Shield className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="text-primary-200 text-xs">Nama</p>
                            <p className="font-bold text-lg">{voter.nama}</p>
                        </div>
                        <div className="flex gap-6">
                            <div>
                                <p className="text-primary-200 text-xs">No. Rumah</p>
                                <p className="font-semibold">{voter.no_rumah || '-'}</p>
                            </div>
                            <div>
                                <p className="text-primary-200 text-xs">No. HP</p>
                                <p className="font-semibold">{voter.phone || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {voter.has_voted ? (
                                <>
                                    <CheckCircle className="w-5 h-5 text-emerald-300" />
                                    <span className="text-sm font-medium text-emerald-200">SUDAH MEMILIH</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-5 h-5 text-amber-300" />
                                    <span className="text-sm font-medium text-amber-200">TERDAFTAR</span>
                                </>
                            )}
                        </div>
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <div className="w-10 h-10 bg-gray-100 rounded grid grid-cols-4 grid-rows-4 gap-px p-0.5">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div key={i} className={`${Math.random() > 0.5 ? 'bg-gray-800' : 'bg-white'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

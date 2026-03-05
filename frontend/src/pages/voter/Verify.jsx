import { useNavigate } from 'react-router-dom';
import useVoterStore from '../../stores/voterStore';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { Shield, User, House, Phone, CheckCircle } from 'lucide-react';
import { CONTACT_WA } from '../../utils/constants';

export default function Verify() {
    const { voter } = useVoterStore();
    const navigate = useNavigate();

    if (!voter) {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white p-4">
            <div className="max-w-md w-full animate-slideUp">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-8 h-8 text-primary-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Konfirmasi Identitas</h1>
                    <p className="text-gray-500 mt-1">Pastikan data di bawah ini adalah data Anda</p>
                </div>

                {/* Data Card */}
                <Card elevated className="mb-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <User className="w-5 h-5 text-primary-600" />
                            <div>
                                <p className="text-xs text-gray-500">Nama Lengkap</p>
                                <p className="font-bold text-gray-900">{voter.nama}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <House className="w-5 h-5 text-primary-600" />
                            <div>
                                <p className="text-xs text-gray-500">No. Rumah</p>
                                <p className="font-bold text-gray-900">{voter.no_rumah || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Phone className="w-5 h-5 text-primary-600" />
                            <div>
                                <p className="text-xs text-gray-500">No. HP</p>
                                <p className="font-bold text-gray-900">{voter.phone || '-'}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Actions */}
                <div className="space-y-3">
                    <Button
                        fullWidth
                        icon={CheckCircle}
                        onClick={() => navigate('/dashboard', { replace: true })}
                    >
                        Ya, Ini Data Saya
                    </Button>

                    <div className="text-center">
                        <a
                            href={`https://wa.me/${CONTACT_WA}?text=Halo%20Panitia,%20saya%20mendapat%20link%20voting%20tapi%20data%20yang%20tampil%20bukan%20milik%20saya.`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-gray-500 hover:text-primary-600 underline transition-colors"
                        >
                            Bukan data saya? Hubungi panitia
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

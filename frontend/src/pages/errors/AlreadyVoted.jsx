import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Button from '../../components/common/Button';

export default function AlreadyVoted() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-3xl text-center animate-fadeIn flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Anda Sudah Memberikan Suara</h2>
                <p className="text-gray-500 mb-6 max-w-2xl">Link pooling ini sudah tidak bisa digunakan karena Anda telah memberikan suara sebelumnya.</p>
                <Button className="!inline-flex mx-auto px-12" onClick={() => navigate('/public/results')}>
                    Lihat Hasil Pooling
                </Button>
            </div>
        </div>
    );
}

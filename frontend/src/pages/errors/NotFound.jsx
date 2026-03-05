import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full text-center animate-fadeIn">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileQuestion className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-4xl font-bold text-gray-300 mb-2">404</h2>
                <p className="text-gray-500 mb-6">Halaman yang Anda cari tidak ditemukan.</p>
                <Button variant="outline" onClick={() => navigate('/')}>Kembali ke Beranda</Button>
            </div>
        </div>
    );
}

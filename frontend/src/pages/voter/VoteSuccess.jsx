import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { CheckCircle, BarChart3 } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

const CONFETTI_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function VoteSuccess() {
    const navigate = useNavigate();
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
            {/* Confetti */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <div
                            key={i}
                            className="confetti-piece"
                            style={{
                                left: `${Math.random() * 100}%`,
                                backgroundColor: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                                width: `${6 + Math.random() * 8}px`,
                                height: `${6 + Math.random() * 8}px`,
                                transform: `rotate(${Math.random() * 360}deg)`,
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="max-w-md w-full text-center animate-slideUp">
                {/* Checkmark */}
                <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto animate-checkmark">
                        <CheckCircle className="w-14 h-14 text-emerald-500" />
                    </div>
                    <div className="absolute inset-0 w-24 h-24 bg-emerald-200 rounded-full mx-auto animate-ping opacity-30" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Suara Anda Berhasil Dicatat!
                </h1>
                <p className="text-gray-600 mb-2">
                    Terima kasih telah berpartisipasi dalam demokrasi lingkungan kita.
                </p>
                <p className="text-sm text-gray-500 mb-8">
                    Waktu pooling: {formatDateTime(new Date().toISOString())}
                </p>

                <div className="space-y-3">
                    <Button
                        fullWidth
                        icon={BarChart3}
                        onClick={() => navigate('/results', { replace: true })}
                    >
                        Lihat Hasil Sementara
                    </Button>

                    <Button
                        variant="outline"
                        fullWidth
                        onClick={() => navigate('/dashboard', { replace: true })}
                    >
                        Kembali ke Beranda
                    </Button>
                </div>

                <p className="text-xs text-gray-400 mt-6">
                    Link pooling Anda tidak bisa digunakan lagi
                </p>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import useVoterStore from '../../stores/voterStore';
import Loader from '../../components/common/Loader';
import { CONTACT_WA } from '../../utils/constants';

export default function AutoLogin() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { setToken, setVoter } = useVoterStore();
    const [error, setError] = useState(null);
    const [errorType, setErrorType] = useState(null);

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        authService.verifyToken(token)
            .then((res) => {
                const payload = res?.data || res;
                if (!payload?.token || !payload?.voter) {
                    throw new Error('Respons verifikasi link tidak valid');
                }
                setToken(payload.token);
                setVoter(payload.voter);
                navigate('/verify', { replace: true });
            })
            .catch((err) => {
                setError(err.message || 'Link pooling tidak valid');
                setErrorType(err.error || 'UNKNOWN');

                // Redirect ke halaman error yang sesuai
                if (err.error === 'ALREADY_VOTED') {
                    navigate('/already-voted', { replace: true });
                } else {
                    setError(err.message);
                }
            });
    }, [token]);

    if (error && errorType !== 'ALREADY_VOTED') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="card max-w-md w-full text-center animate-fadeIn p-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Link Tidak Valid</h2>
                    <p className="text-gray-600 mb-1">{error}</p>
                    <p className="text-sm text-gray-500 mt-4">
                        {errorType === 'TOKEN_EXPIRED' && 'Link pooling Anda sudah kadaluarsa. Hubungi panitia untuk mendapatkan link baru.'}
                        {errorType === 'TOKEN_USED' && 'Link pooling ini sudah pernah digunakan.'}
                        {errorType === 'TOKEN_INVALID' && 'Link pooling tidak ditemukan. Pastikan Anda menggunakan link yang benar.'}
                    </p>
                    <div className="mt-6">
                        <a
                            href={`https://wa.me/${CONTACT_WA}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline text-sm inline-flex"
                        >
                            Hubungi Panitia
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return <Loader fullScreen text="Memverifikasi link pooling Anda..." />;
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import useVoterStore from '../../stores/voterStore';

export default function CodeLogin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setToken, setVoter, clearVoter } = useVoterStore();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const queryCode = useMemo(() => (searchParams.get('code') || '').replace(/\D/g, '').slice(0, 4), [searchParams]);

    const submitCode = async (value) => {
        setLoading(true);
        setError('');
        try {
            const res = await authService.verifyCode(value);
            const payload = res?.data || res;
            if (!payload?.token || !payload?.voter) {
                throw new Error('Respons verifikasi kode tidak valid');
            }
            setToken(payload.token);
            setVoter(payload.voter);
            navigate('/verify', { replace: true });
        } catch (err) {
            if (['ALREADY_VOTED', 'TOKEN_USED', 'TOKEN_EXPIRED'].includes(err.error)) {
                navigate('/public/results', { replace: true });
                return;
            }
            setError(err.message || 'Kode unik tidak valid');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        clearVoter();
        if (queryCode.length === 4) {
            setCode(queryCode);
            submitCode(queryCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryCode]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (code.length !== 4) {
            setError('Masukkan 4 digit kode unik');
            return;
        }
        await submitCode(code);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl animate-fadeIn">
                <h1 className="text-2xl font-bold text-gray-900">Masuk E-Pooling</h1>
                <p className="text-sm text-gray-500 mt-1">Masukkan kode unik 4 digit yang dikirim lewat WhatsApp</p>

                <form onSubmit={onSubmit} className="mt-6 space-y-3">
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                            setError('');
                        }}
                        className="w-full text-center tracking-[0.5em] text-3xl font-bold border border-gray-200 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder="1234"
                        autoFocus
                    />

                    {error ? (
                        <p className="text-sm text-red-600">{error}</p>
                    ) : (
                        <p className="text-xs text-gray-500">Contoh: 1234</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Memverifikasi...' : 'Lanjut'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => navigate('/public/results')}
                    className="w-full mt-3 btn-outline"
                >
                    Lihat Hasil Pooling
                </button>

                <div className="mt-5 text-center">
                    <a href="/admin" className="text-xs text-gray-500 hover:text-gray-700 underline">
                        Login Admin
                    </a>
                </div>
            </div>
        </div>
    );
}

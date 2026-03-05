import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import useAdminStore from '../../stores/adminStore';
import Button from '../../components/common/Button';
import { Vote, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setAdmin } = useAdminStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) return;
        setLoading(true);
        setError('');

        try {
            const res = await authService.adminLogin(username, password);
            const payload = res?.data || res;
            if (!payload?.admin || !payload?.token) {
                throw new Error('Respons login admin tidak valid');
            }
            setAdmin(payload.admin, payload.token);
            navigate('/admin/dashboard', { replace: true });
        } catch (err) {
            setError(err.message || 'Login gagal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <div className="max-w-sm w-full animate-slideUp">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-600/30">
                        <Vote className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-gray-400 text-sm mt-1">E-Pooling RT/RW</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 animate-fadeIn">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field"
                            placeholder="Masukkan username"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pr-12"
                                placeholder="Masukkan password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" fullWidth loading={loading} className="!mt-6">
                        Masuk
                    </Button>
                </form>
            </div>
        </div>
    );
}

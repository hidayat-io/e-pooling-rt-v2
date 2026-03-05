import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — tambahkan token jika ada
api.interceptors.request.use((config) => {
    const voterToken = localStorage.getItem('voter_token');
    const adminToken = localStorage.getItem('admin_token');

    if (config.url?.includes('/admin') && adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (voterToken) {
        config.headers.Authorization = `Bearer ${voterToken}`;
    }

    return config;
});

// Response interceptor — handle errors
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const data = error.response?.data;

        // Token expired — redirect ke login
        if (error.response?.status === 401) {
            const isAdmin = error.config?.url?.includes('/admin');
            if (isAdmin) {
                localStorage.removeItem('admin_token');
                if (window.location.pathname.startsWith('/admin')) {
                    window.location.href = '/admin';
                }
            } else {
                localStorage.removeItem('voter_token');
            }
        }

        return Promise.reject(data || { message: 'Terjadi kesalahan jaringan', error: 'NETWORK_ERROR' });
    }
);

export default api;

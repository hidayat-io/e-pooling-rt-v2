import api from './api';

export const authService = {
    // Admin login
    adminLogin: (username, password) =>
        api.post('/auth/admin/login', { username, password }),

    // Admin logout
    adminLogout: () => api.post('/auth/admin/logout'),

    // Verify magic link token
    verifyToken: (token) => api.get(`/auth/verify-token/${token}`),
    verifyCode: (code) => api.post('/auth/verify-code', { code }),

    // Get voter profile
    getVoterProfile: () => api.get('/auth/voter/me'),
};

import api from './api';

export const adminService = {
    // Dashboard
    getDashboard: () => api.get('/admin/dashboard'),
    getMonitoring: () => api.get('/admin/monitoring'),
    getDetailedResults: () => api.get('/admin/results/detailed'),

    // Voters
    getVoters: (params) => api.get('/admin/voters', { params }),
    getVoter: (id) => api.get(`/admin/voters/${id}`),
    createVoter: (data) => api.post('/admin/voters', data),
    updateVoter: (id, data) => api.put(`/admin/voters/${id}`, data),
    deleteVoter: (id) => api.delete(`/admin/voters/${id}`),
    importVoters: (formData) => api.post('/admin/voters/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    generateTokens: () => api.post('/admin/voters/generate-tokens'),
    getImpersonateLink: (id) => api.post(`/admin/voters/${id}/impersonate-link`),

    // Candidates
    createCandidate: (data) => api.post('/admin/candidates', data),
    updateCandidate: (id, data) => api.put(`/admin/candidates/${id}`, data),
    deleteCandidate: (id) => api.delete(`/admin/candidates/${id}`),
    uploadPhoto: (id, formData) => api.post(`/admin/candidates/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),

    // WhatsApp
    broadcast: (filter) => api.post('/admin/whatsapp/broadcast', { filter }),
    sendSingleWa: (voterId) => api.post('/admin/whatsapp/send-single', { voter_id: Number(voterId) }),
    getWaLogs: (params) => api.get('/admin/whatsapp/logs', { params }),
    getWaStatus: () => api.get('/admin/whatsapp/status'),
    getWaTemplate: () => api.get('/admin/whatsapp/template'),
    updateWaTemplate: (template) => api.put('/admin/whatsapp/template', { template }),

    // Settings
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (settings) => api.put('/admin/settings', { settings }),
    resetPooling: () => api.post('/admin/settings/reset-pooling'),

    // Reports
    exportReport: () => api.post('/admin/reports/export'),
    getVoterChoicesReport: (params) => api.get('/admin/reports/voters', { params }),
    exportVoterChoicesReport: (params) => api.get('/admin/reports/voters/export', { params, responseType: 'blob' }),
    getAuditLogs: (params) => api.get('/admin/logs/audit', { params }),
    getTrafficLogs: (params) => api.get('/admin/logs/traffic', { params }),

    // Public data
    getAnnouncements: () => api.get('/announcements'),
    getPublicSettings: () => api.get('/settings/public'),
};

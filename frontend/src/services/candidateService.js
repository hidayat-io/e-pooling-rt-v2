import api from './api';

export const candidateService = {
    getAll: () => api.get('/candidates'),
    getById: (id) => api.get(`/candidates/${id}`),
};

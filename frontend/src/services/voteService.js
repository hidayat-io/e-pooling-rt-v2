import api from './api';

export const voteService = {
    submit: (candidateId, choice) => api.post('/votes', { candidate_id: candidateId, choice }),
    checkStatus: () => api.get('/votes/my-status'),
    getResults: () => api.get('/results'),
    getPublicStats: () => api.get('/stats/public'),
};

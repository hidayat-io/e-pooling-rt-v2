import { create } from 'zustand';

const useVoterStore = create((set) => ({
    voter: null,
    token: localStorage.getItem('voter_token') || null,
    isAuthenticated: !!localStorage.getItem('voter_token'),

    setVoter: (voter) => set({ voter, isAuthenticated: true }),

    setToken: (token) => {
        localStorage.setItem('voter_token', token);
        set({ token, isAuthenticated: true });
    },

    logout: () => {
        localStorage.removeItem('voter_token');
        set({ voter: null, token: null, isAuthenticated: false });
    },

    clearVoter: () => {
        localStorage.removeItem('voter_token');
        set({ voter: null, token: null, isAuthenticated: false });
    },

    setHasVoted: () => {
        set((state) => ({
            voter: state.voter ? { ...state.voter, has_voted: true, voted_at: new Date().toISOString() } : null,
        }));
    },
}));

export default useVoterStore;

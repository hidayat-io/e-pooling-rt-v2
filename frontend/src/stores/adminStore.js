import { create } from 'zustand';

const useAdminStore = create((set) => ({
    admin: null,
    token: localStorage.getItem('admin_token') || null,
    isAuthenticated: !!localStorage.getItem('admin_token'),

    setAdmin: (admin, token) => {
        localStorage.setItem('admin_token', token);
        set({ admin, token, isAuthenticated: true });
    },

    logout: () => {
        localStorage.removeItem('admin_token');
        set({ admin: null, token: null, isAuthenticated: false });
    },
}));

export default useAdminStore;

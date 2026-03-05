import { create } from 'zustand';
import { adminService } from '../services/adminService';

const SETTINGS_CACHE_TTL = 60 * 1000;

const useElectionStore = create((set, get) => ({
    settings: null,
    settingsLoadedAt: 0,
    loading: false,

    fetchSettings: async (force = false) => {
        const { settings, settingsLoadedAt } = get();
        const isFresh = settings && (Date.now() - settingsLoadedAt < SETTINGS_CACHE_TTL);
        if (!force && isFresh) return settings;

        set({ loading: true });
        try {
            const res = await adminService.getPublicSettings();
            set({ settings: res.data, settingsLoadedAt: Date.now(), loading: false });
            return res.data;
        } catch {
            set({ loading: false });
            return null;
        }
    },
}));

export default useElectionStore;

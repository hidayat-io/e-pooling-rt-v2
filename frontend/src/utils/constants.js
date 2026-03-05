export const APP_NAME = import.meta.env.VITE_APP_NAME || 'E-Pooling RT';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const _apiUrl = API_BASE_URL;
export const STATIC_BASE_URL = _apiUrl.startsWith('http') ? _apiUrl.replace('/api/v1', '') : '';
export const CONTACT_WA = import.meta.env.VITE_APP_CONTACT_WA || '628128324040';

export function resolveAssetUrl(assetPath) {
    if (!assetPath) return '';
    if (/^https?:\/\//i.test(assetPath)) return assetPath;
    if (assetPath.startsWith('//')) return `https:${assetPath}`;

    const base = STATIC_BASE_URL.replace(/\/+$/, '');
    const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    return `${base}${path}`;
}

export const VOTE_STATUS = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    CLOSED: 'closed',
};

export const WA_STATUS = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
};

export const ANNOUNCEMENT_TYPES = {
    info: { label: 'Informasi', color: 'blue' },
    kegiatan: { label: 'Kegiatan', color: 'green' },
    penting: { label: 'Penting', color: 'red' },
};

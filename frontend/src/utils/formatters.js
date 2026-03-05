export const INDONESIA_LOCALE = 'id-ID';
export const JAKARTA_TIMEZONE = 'Asia/Jakarta';

function asDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

/**
 * Format tanggal ke format Indonesia
 */
export function formatDate(dateStr) {
    const date = asDate(dateStr);
    if (!date) return '-';
    return date.toLocaleDateString(INDONESIA_LOCALE, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: JAKARTA_TIMEZONE,
    });
}

export function formatDateTime(dateStr) {
    const date = asDate(dateStr);
    if (!date) return '-';
    return date.toLocaleString(INDONESIA_LOCALE, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: JAKARTA_TIMEZONE,
    });
}

export function formatTime(dateStr) {
    const date = asDate(dateStr);
    if (!date) return '-';
    return date.toLocaleTimeString(INDONESIA_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: JAKARTA_TIMEZONE,
    });
}

export function formatDateTimeLong(dateStr) {
    const date = asDate(dateStr);
    if (!date) return '-';
    return date.toLocaleString(INDONESIA_LOCALE, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: JAKARTA_TIMEZONE,
    });
}

export function formatFileTimestamp(dateInput = new Date()) {
    const date = asDate(dateInput);
    if (!date) return '';

    const parts = new Intl.DateTimeFormat(INDONESIA_LOCALE, {
        timeZone: JAKARTA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || '';
    return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

export function getNowIso() {
    return new Date().toISOString();
}

export function formatNowJakartaDateTime() {
    return formatDateTime(getNowIso());
}

export function formatNowJakartaDateTimeLong() {
    return formatDateTimeLong(getNowIso());
}

export function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString(INDONESIA_LOCALE);
}

export function parseBiodata(biodataStr) {
    try {
        return JSON.parse(biodataStr);
    } catch {
        return null;
    }
}

export function parseMisi(misiStr) {
    if (!misiStr) return [];
    return misiStr.split('\n').filter((m) => m.trim());
}

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function maskNik(nik) {
    if (!nik || nik.length < 8) return 'xxxx';
    return nik.slice(0, 4) + 'xxxx' + nik.slice(-4);
}

export function maskPhone(phone) {
    if (!phone || phone.length < 7) return 'xxxxx';
    return phone.slice(0, 4) + 'xxxxx' + phone.slice(-3);
}

export function formatDateWithTimezoneName(dateStr) {
    const date = asDate(dateStr);
    if (!date) return '-';
    return date.toLocaleString(INDONESIA_LOCALE, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: JAKARTA_TIMEZONE,
        timeZoneName: 'short',
    });
}

export function isoToJakartaDateTimeLocalInput(dateStr) {
    const date = asDate(dateStr);
    if (!date) return '';

    const parts = new Intl.DateTimeFormat(INDONESIA_LOCALE, {
        timeZone: JAKARTA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function jakartaDateTimeLocalInputToIso(value) {
    if (!value) return '';
    const normalized = value.length === 16 ? `${value}:00` : value;
    const date = new Date(`${normalized}+07:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
}

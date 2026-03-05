const INDONESIA_LOCALE = 'id-ID';
const JAKARTA_TIMEZONE = 'Asia/Jakarta';

function asDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function formatJakartaDateTime(value, options = {}) {
    const date = asDate(value);
    if (!date) return '-';

    return date.toLocaleString(INDONESIA_LOCALE, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: JAKARTA_TIMEZONE,
        ...options,
    });
}

function formatJakartaLongDateTime(value) {
    return formatJakartaDateTime(value, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatJakartaFileTimestamp(value = new Date()) {
    const date = asDate(value);
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
    return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}${get('second')}`;
}

module.exports = {
    INDONESIA_LOCALE,
    JAKARTA_TIMEZONE,
    formatJakartaDateTime,
    formatJakartaLongDateTime,
    formatJakartaFileTimestamp,
};

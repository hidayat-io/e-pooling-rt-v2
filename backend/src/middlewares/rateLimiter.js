const rateLimit = require('express-rate-limit');

/**
 * Rate limiter untuk auth endpoints (lebih ketat)
 * Max 10 request per menit per IP
 */
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 menit
    max: 10,
    message: {
        success: false,
        message: 'Terlalu banyak percobaan, silakan coba lagi nanti',
        error: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter untuk voting endpoint (mencegah brute force)
 * Max 5 request per menit per IP
 */
const voteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Terlalu banyak percobaan voting, silakan coba lagi nanti',
        error: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter umum untuk API
 * Max 100 request per menit per IP
 */
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Terlalu banyak request, silakan coba lagi nanti',
        error: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, voteLimiter, generalLimiter };

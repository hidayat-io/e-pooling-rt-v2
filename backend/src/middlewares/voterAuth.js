const { verifyToken } = require('../config/jwt');

/**
 * Middleware: Verifikasi voter JWT token
 * Token didapat saat voter klik magic link dan berhasil diverifikasi
 */
function voterAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.error('Anda perlu login terlebih dahulu', 'AUTH_REQUIRED', 401);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.error('Sesi Anda sudah berakhir, silakan gunakan link pooling Anda kembali', 'TOKEN_EXPIRED', 401);
    }

    // Pastikan ini token voter (ada voter_id)
    if (!decoded.voter_id) {
        return res.error('Akses ditolak', 'FORBIDDEN', 403);
    }

    req.voter = {
        voter_id: decoded.voter_id,
        nik: decoded.nik,
        nama: decoded.nama,
        rt: decoded.rt,
        rw: decoded.rw,
        token_id: decoded.token_id,
    };

    next();
}

/**
 * Ekstrak token dari header atau cookie
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    if (req.cookies && req.cookies.voter_token) {
        return req.cookies.voter_token;
    }
    return null;
}

module.exports = voterAuth;

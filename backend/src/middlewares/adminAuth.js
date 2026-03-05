const { verifyToken } = require('../config/jwt');
const { query } = require('../config/pgPool');

/**
 * Middleware: Verifikasi admin JWT token
 * Cek token dari Authorization header atau cookie
 */
async function adminAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.error('Token autentikasi diperlukan', 'AUTH_REQUIRED', 401);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.error('Token tidak valid atau sudah kadaluarsa', 'INVALID_TOKEN', 401);
    }

    // Pastikan ini token admin (ada field admin_id dan role)
    if (!decoded.admin_id || !decoded.role) {
        return res.error('Akses ditolak', 'FORBIDDEN', 403);
    }

    try {
        // Verifikasi admin masih aktif di database
        const adminResult = await query(
            'SELECT id, username, nama, role, is_active FROM admin_users WHERE id = $1 LIMIT 1',
            [decoded.admin_id],
        );
        const admin = adminResult.rows?.[0];

        if (!admin || !admin.is_active) {
            return res.error('Akun admin tidak aktif', 'ADMIN_INACTIVE', 403);
        }

        req.admin = {
            id: admin.id,
            username: admin.username,
            nama: admin.nama,
            role: admin.role,
        };

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Ekstrak token dari header atau cookie
 */
function extractToken(req) {
    // Dari Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    // Dari cookie
    if (req.cookies && req.cookies.admin_token) {
        return req.cookies.admin_token;
    }
    return null;
}

module.exports = adminAuth;

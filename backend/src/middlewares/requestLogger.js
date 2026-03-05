const { pool } = require('../config/pgPool');
const logger = require('../config/logger');

/**
 * Paths yang tidak perlu di-log (noise-only endpoints)
 */
const EXCLUDE_PATHS = ['/healthz'];

/**
 * Middleware: catat setiap HTTP request ke tabel request_logs.
 *
 * Menggunakan pola fire-and-forget (setImmediate) sehingga DB write
 * tidak memblokir response ke klien.
 */
function requestLogger(req, res, next) {
    // Skip path yang dikecualikan
    if (EXCLUDE_PATHS.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
        return next();
    }

    const startTime = Date.now();

    res.on('finish', () => {
        const responseTime = Date.now() - startTime;

        // Tentukan tipe & ID user — middleware ini dipasang sebelum auth,
        // tapi req.voter / req.admin di-set oleh auth middleware di handler.
        // Menggunakan nilai saat event finish (sudah ter-set).
        let userType = 'anonymous';
        let userId = null;

        if (req.voter && req.voter.voter_id) {
            userType = 'voter';
            userId = req.voter.voter_id;
        } else if (req.admin && req.admin.id) {
            userType = 'admin';
            userId = req.admin.id;
        }

        // Sanitasi query string — hapus field sensitif
        const SENSITIVE_KEYS = ['token', 'password', 'secret', 'key', 'code'];
        let queryString = null;
        if (req.query && Object.keys(req.query).length > 0) {
            const safe = {};
            for (const [k, v] of Object.entries(req.query)) {
                safe[k] = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)) ? '[REDACTED]' : v;
            }
            queryString = JSON.stringify(safe);
        }

        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
        const ua = (req.headers['user-agent'] || '').slice(0, 500) || null;
        const referer = req.headers['referer'] || req.headers['referrer'] || null;

        // Fire-and-forget: tulis ke DB tanpa await agar tidak memperlambat response
        setImmediate(() => {
            pool.query(
                `INSERT INTO request_logs
                   (method, path, status_code, response_time_ms, ip_address, user_agent, referer, user_type, user_id, query_string)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    req.method,
                    req.path,
                    res.statusCode,
                    responseTime,
                    ip,
                    ua,
                    referer,
                    userType,
                    userId,
                    queryString,
                ],
            ).catch((err) => {
                // Jangan sampai logging error crash server
                logger.warn('requestLogger: gagal simpan log', { error: err.message });
            });
        });
    });

    next();
}

module.exports = requestLogger;

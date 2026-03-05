const bcrypt = require('bcryptjs');
const { query } = require('../config/pgPool');
const { signAdminToken, signVoterToken } = require('../config/jwt');
const { AppError } = require('../utils/response');
const { maskNik } = require('../utils/maskData');
const logger = require('../config/logger');

/**
 * Controller: Auth (Admin login + Voter magic link)
 */
const authController = {
    /**
     * POST /api/v1/auth/admin/login
     */
    async adminLogin(req, res, next) {
        try {
            const { username, password } = req.body;
            const adminResult = await query(
                'SELECT id, username, nama, password, role, is_active FROM admin_users WHERE username = $1 LIMIT 1',
                [username],
            );
            const admin = adminResult.rows?.[0];

            if (!admin) {
                return res.error('Username atau password salah', 'INVALID_CREDENTIALS', 401);
            }

            if (!admin.is_active) {
                return res.error('Akun Anda dinonaktifkan', 'ADMIN_INACTIVE', 403);
            }

            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                return res.error('Username atau password salah', 'INVALID_CREDENTIALS', 401);
            }

            // Update last login
            await query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

            const token = signAdminToken({
                admin_id: admin.id,
                username: admin.username,
                nama: admin.nama,
                role: admin.role,
            });

            logger.info(`Admin login: ${admin.username}`);

            return res.success({
                token,
                admin: {
                    id: admin.id,
                    username: admin.username,
                    nama: admin.nama,
                    role: admin.role,
                },
            }, 'Login berhasil');
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/auth/admin/logout
     */
    async adminLogout(req, res, next) {
        try {
            // Untuk JWT, cukup clear dari client side
            // Di production bisa tambah token blacklist
            res.clearCookie('admin_token');
            return res.success(null, 'Logout berhasil');
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/auth/verify-token/:token
     * Verifikasi magic link voter
     */
    async verifyVoterToken(req, res, next) {
        try {
            const { token } = req.params;
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';
            const tokenResult = await query(`
              SELECT vt.id, vt.voter_id, vt.is_used, vt.expired_at, vt.access_count,
                     v.nik, v.nama, v.phone, v.rt, v.rw, v.has_voted
              FROM voter_tokens vt
              JOIN voters v ON v.id = vt.voter_id
              WHERE vt.token = $1
              LIMIT 1
            `, [token]);
            const tokenRecord = tokenResult.rows?.[0];
            if (!tokenRecord) {
                throw new AppError('TOKEN_INVALID', 'Link pooling tidak valid', 404);
            }

            await query(
                'UPDATE voter_tokens SET access_count = access_count + 1, last_ip = $1, last_ua = $2 WHERE id = $3',
                [ip, userAgent, tokenRecord.id],
            );

            if (Number(tokenRecord.has_voted) === 1) {
                throw new AppError('ALREADY_VOTED', 'Anda sudah memberikan suara sebelumnya', 409);
            }
            if (Number(tokenRecord.is_used) === 1) {
                throw new AppError('TOKEN_USED', 'Link pooling sudah digunakan', 410);
            }
            if (new Date(tokenRecord.expired_at) < new Date()) {
                throw new AppError('TOKEN_EXPIRED', 'Link pooling sudah kadaluarsa', 410);
            }

            const jwt = signVoterToken({
                voter_id: tokenRecord.voter_id,
                nik: maskNik(tokenRecord.nik),
                nama: tokenRecord.nama,
                rt: tokenRecord.rt,
                rw: tokenRecord.rw,
                token_id: tokenRecord.id,
            });
            logger.info(`Token verified for voter ${tokenRecord.voter_id}`);

            const result = {
                token: jwt,
                voter: {
                    nama: tokenRecord.nama,
                    no_rumah: tokenRecord.nik,
                    phone: tokenRecord.phone,
                    nik_masked: maskNik(tokenRecord.nik),
                    rt: tokenRecord.rt,
                    rw: tokenRecord.rw,
                    has_voted: Number(tokenRecord.has_voted) === 1,
                },
            };

            return res.success(result, 'Token valid');
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/auth/verify-code
     * Verifikasi kode unik 4 digit voter
     */
    async verifyVoterCode(req, res, next) {
        try {
            const { code } = req.body;
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';
            const tokenResult = await query(`
              SELECT vt.id, vt.voter_id, vt.is_used, vt.expired_at, vt.access_count,
                     v.nik, v.nama, v.phone, v.rt, v.rw, v.has_voted
              FROM voter_tokens vt
              JOIN voters v ON v.id = vt.voter_id
              WHERE vt.login_code = $1 AND vt.is_used = 0 AND vt.expired_at > NOW()
              ORDER BY vt.created_at DESC
              LIMIT 1
            `, [code]);
            const tokenRecord = tokenResult.rows?.[0];
            if (!tokenRecord) {
                throw new AppError('CODE_INVALID', 'Kode unik tidak valid atau sudah kadaluarsa', 404);
            }

            await query(
                'UPDATE voter_tokens SET access_count = access_count + 1, last_ip = $1, last_ua = $2 WHERE id = $3',
                [ip, userAgent, tokenRecord.id],
            );

            if (Number(tokenRecord.has_voted) === 1) {
                throw new AppError('ALREADY_VOTED', 'Anda sudah memberikan suara sebelumnya', 409);
            }

            const jwt = signVoterToken({
                voter_id: tokenRecord.voter_id,
                nik: maskNik(tokenRecord.nik),
                nama: tokenRecord.nama,
                rt: tokenRecord.rt,
                rw: tokenRecord.rw,
                token_id: tokenRecord.id,
            });
            logger.info(`Code verified for voter ${tokenRecord.voter_id}`);

            const result = {
                token: jwt,
                voter: {
                    nama: tokenRecord.nama,
                    no_rumah: tokenRecord.nik,
                    phone: tokenRecord.phone,
                    nik_masked: maskNik(tokenRecord.nik),
                    rt: tokenRecord.rt,
                    rw: tokenRecord.rw,
                    has_voted: Number(tokenRecord.has_voted) === 1,
                },
            };

            return res.success(result, 'Kode valid');
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/auth/voter/me
     * Ambil profil voter dari JWT
     */
    async getVoterProfile(req, res, next) {
        try {
            const voterResult = await query(
                'SELECT id, nik, nama, phone, rt, rw, has_voted, voted_at FROM voters WHERE id = $1 LIMIT 1',
                [req.voter.voter_id],
            );
            const voter = voterResult.rows?.[0];

            if (!voter) {
                return res.error('Data pemilih tidak ditemukan', 'VOTER_NOT_FOUND', 404);
            }

            return res.success({
                id: voter.id,
                nama: voter.nama,
                no_rumah: voter.nik,
                phone: voter.phone,
                nik_masked: req.voter.nik,
                rt: voter.rt,
                rw: voter.rw,
                has_voted: Number(voter.has_voted) === 1,
                voted_at: voter.voted_at,
            });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = authController;

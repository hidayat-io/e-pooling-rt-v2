const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/pgPool');
const { AppError } = require('../utils/response');
const { maskNik } = require('../utils/maskData');
const { signVoterToken } = require('../config/jwt');
const logger = require('../config/logger');

/**
 * Service untuk manajemen magic link tokens
 */
class TokenService {
    runQuery(client, sql, params = []) {
        if (client) return client.query(sql, params);
        return query(sql, params);
    }

    generateLoginCode() {
        return String(Math.floor(1000 + Math.random() * 9000));
    }

    async isCodeExists(code, excludeTokenId = null, client = null) {
        let sql = `
          SELECT id
          FROM voter_tokens
          WHERE login_code = $1
        `;
        const params = [code];
        if (excludeTokenId) {
            sql += ' AND id <> $2';
            params.push(excludeTokenId);
        }
        sql += ' LIMIT 1';
        const result = await this.runQuery(client, sql, params);
        const existing = result.rows?.[0];
        return !!existing;
    }

    async generateUniqueLoginCode(excludeTokenId = null, client = null) {
        let attempts = 0;
        while (attempts < 100) {
            const code = this.generateLoginCode();
            if (!await this.isCodeExists(code, excludeTokenId, client)) return code;
            attempts += 1;
        }
        throw new AppError('CODE_GENERATION_FAILED', 'Gagal membuat kode unik, silakan coba lagi', 500);
    }

    async ensureLoginCodeForToken(tokenId, client = null) {
        const tokenResult = await this.runQuery(
            client,
            `SELECT id, login_code, is_used, expired_at
             FROM voter_tokens
             WHERE id = $1
             LIMIT 1`,
            [tokenId],
        );
        const token = tokenResult.rows?.[0];
        if (!token) return null;

        if (token.login_code && !await this.isCodeExists(token.login_code, token.id, client)) {
            return token.login_code;
        }
        if (Number(token.is_used) === 1 || new Date(token.expired_at) < new Date()) return null;

        let attempts = 0;
        while (attempts < 100) {
            const loginCode = this.generateLoginCode();
            try {
                await this.runQuery(
                    client,
                    'UPDATE voter_tokens SET login_code = $1 WHERE id = $2',
                    [loginCode, tokenId],
                );
                return loginCode;
            } catch (error) {
                if (error?.code === '23505') {
                    attempts += 1;
                    continue;
                }
                throw error;
            }
        }

        throw new AppError('CODE_GENERATION_FAILED', 'Gagal membuat kode unik, silakan coba lagi', 500);
    }

    /**
     * Generate token untuk satu voter
     */
    async generateForVoter(voterId, client = null) {
        const voterResult = await this.runQuery(
            client,
            'SELECT id, nik, nama, rt, rw, has_voted FROM voters WHERE id = $1 LIMIT 1',
            [voterId],
        );
        const voter = voterResult.rows?.[0];
        if (!voter) throw new AppError('VOTER_NOT_FOUND', 'Pemilih tidak ditemukan', 404);

        // Jangan generate token jika sudah vote
        if (Number(voter.has_voted) === 1) {
            return { skipped: true, reason: 'Sudah memberikan suara' };
        }

        // Cek apakah sudah ada token valid yang belum dipakai
        const existingTokenResult = await this.runQuery(
            client,
            `
              SELECT id, token, login_code, expired_at
              FROM voter_tokens
              WHERE voter_id = $1 AND is_used = 0 AND expired_at > NOW()
              ORDER BY created_at DESC
              LIMIT 1
            `,
            [voterId],
        );
        const existingToken = existingTokenResult.rows?.[0];

        if (existingToken) {
            const loginCode = existingToken.login_code || await this.ensureLoginCodeForToken(existingToken.id, client);
            return {
                skipped: false,
                token: existingToken.token,
                login_code: loginCode,
                existing: true,
                expired_at: existingToken.expired_at,
            };
        }

        // Buat token baru
        const expiryDays = parseInt(process.env.TOKEN_EXPIRY_DAYS || '7');
        const expiredAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

        let attempts = 0;
        let token = null;
        let loginCode = null;
        while (attempts < 100) {
            token = uuidv4();
            loginCode = this.generateLoginCode();
            try {
                await this.runQuery(
                    client,
                    `
                      INSERT INTO voter_tokens (voter_id, token, login_code, expired_at)
                      VALUES ($1, $2, $3, $4)
                    `,
                    [voterId, token, loginCode, expiredAt],
                );
                break;
            } catch (error) {
                if (error?.code === '23505') {
                    attempts += 1;
                    continue;
                }
                throw error;
            }
        }

        if (!loginCode || attempts >= 100) {
            throw new AppError('CODE_GENERATION_FAILED', 'Gagal membuat kode unik, silakan coba lagi', 500);
        }

        logger.info(`Token generated for voter ${voterId}`);
        return { skipped: false, token, login_code: loginCode, existing: false, expired_at: expiredAt };
    }

    /**
     * Generate tokens untuk semua voter yang belum punya token aktif
     */
    async generateBatch() {
        const activeTokensNeedRefreshResult = await query(`
          SELECT vt.id
          FROM voter_tokens vt
          WHERE vt.is_used = 0
            AND vt.expired_at > NOW()
            AND (
              vt.login_code IS NULL
              OR vt.login_code = ''
            )
        `);
        const activeTokensNeedRefresh = activeTokensNeedRefreshResult.rows || [];

        let backfilledCodes = 0;
        for (const row of activeTokensNeedRefresh) {
            const code = await this.ensureLoginCodeForToken(row.id);
            if (code) backfilledCodes += 1;
        }

        const votersResult = await query(`
          SELECT v.id
          FROM voters v
          WHERE v.has_voted = 0
            AND NOT EXISTS (
              SELECT 1
              FROM voter_tokens vt
              WHERE vt.voter_id = v.id
                AND vt.is_used = 0
                AND vt.expired_at > NOW()
            )
        `);
        const voters = votersResult.rows || [];

        let generated = 0;
        for (const voter of voters) {
            const result = await this.generateForVoter(voter.id);
            if (!result.skipped && !result.existing) generated += 1;
        }

        logger.info(`Batch token generation: ${generated} tokens created, ${backfilledCodes} codes refreshed`);
        return { generated, backfilled_codes: backfilledCodes, total_voters: voters.length };
    }

    /**
     * Verifikasi magic link token
     * Return JWT jika valid
     */
    async verifyToken(token, ip, userAgent) {
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

        // Update access count dan info
        await query(
            'UPDATE voter_tokens SET access_count = access_count + 1, last_ip = $1, last_ua = $2 WHERE id = $3',
            [ip, userAgent, tokenRecord.id],
        );

        // Cek sudah vote
        if (Number(tokenRecord.has_voted) === 1) {
            throw new AppError('ALREADY_VOTED', 'Anda sudah memberikan suara sebelumnya', 409);
        }

        // Cek sudah digunakan
        if (Number(tokenRecord.is_used) === 1) {
            throw new AppError('TOKEN_USED', 'Link pooling sudah digunakan', 410);
        }

        // Cek expired
        if (new Date(tokenRecord.expired_at) < new Date()) {
            throw new AppError('TOKEN_EXPIRED', 'Link pooling sudah kadaluarsa', 410);
        }

        // Buat JWT untuk voter session
        const jwt = signVoterToken({
            voter_id: tokenRecord.voter_id,
            nik: maskNik(tokenRecord.nik),
            nama: tokenRecord.nama,
            rt: tokenRecord.rt,
            rw: tokenRecord.rw,
            token_id: tokenRecord.id,
        });

        logger.info(`Token verified for voter ${tokenRecord.voter_id}`);

        return {
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
    }

    async verifyLoginCode(code, ip, userAgent) {
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

        return {
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
    }

    /**
     * Ambil token aktif untuk voter (untuk keperluan broadcast WA)
     */
    async getActiveTokenForVoter(voterId) {
        const result = await query(`
          SELECT id, token, login_code, expired_at
          FROM voter_tokens
          WHERE voter_id = $1 AND is_used = 0 AND expired_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1
        `, [voterId]);
        const tokenData = result.rows?.[0];

        if (!tokenData) return null;
        if (!tokenData.login_code) {
            tokenData.login_code = await this.ensureLoginCodeForToken(tokenData.id);
        }
        return tokenData;
    }
}

module.exports = new TokenService();

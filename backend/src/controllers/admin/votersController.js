const tokenService = require('../../services/tokenService');
const { parseExcelDPT } = require('../../utils/excelParser');
const reportService = require('../../services/reportService');
const { query, pool } = require('../../config/pgPool');
const { normalizePhone } = require('../../utils/excelParser');
const { maskNik, maskPhone } = require('../../utils/maskData');
const { AppError } = require('../../utils/response');
const whatsappService = require('../../services/whatsappService');
const fs = require('fs');

/**
 * Controller: Admin Voter Management
 */
const adminVotersController = {
    /**
     * POST /api/v1/admin/voters
     */
    async create(req, res, next) {
        try {
            const nikValue = req.body.no_rumah || req.body.nik;
            const phone = normalizePhone(req.body.phone);

            const existsResult = await query(
                'SELECT id FROM voters WHERE nik = $1 LIMIT 1',
                [nikValue],
            );
            if (existsResult.rows?.[0]) {
                throw new AppError('DUPLICATE_NO_RUMAH', 'No.Rumah sudah terdaftar', 409);
            }

            const insertResult = await query(
                `INSERT INTO voters (nik, nama, phone, rt, rw, alamat)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [nikValue, req.body.nama, phone, '05', '02', null],
            );
            const voterId = insertResult.rows?.[0]?.id;

            const countResult = await query('SELECT COUNT(*)::int AS count FROM voters');
            await query(
                "UPDATE election_settings SET value = $1, updated_at = NOW() WHERE key = 'total_dpt'",
                [String(countResult.rows?.[0]?.count || 0)],
            );

            reportService.logAudit(req.admin.id, 'CREATE_VOTER', 'voter', voterId, req.body, req.ip);
            return res.success({ id: voterId }, 'Data pemilih berhasil ditambahkan');
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/voters
     */
    async list(req, res, next) {
        try {
            const { page = 1, limit = 25, search = '', filter = 'all', rt = '', rw = '' } = req.query;
            const currentPage = parseInt(page, 10) || 1;
            const pageSize = parseInt(limit, 10) || 25;
            const offset = (currentPage - 1) * pageSize;

            const where = ['1=1'];
            const params = [];

            if (search) {
                where.push('(v.nama ILIKE $1 OR v.nik ILIKE $1 OR v.phone ILIKE $1)');
                params.push(`%${search}%`);
            }
            if (filter === 'voted') {
                where.push('v.has_voted = 1');
            } else if (filter === 'not_voted') {
                where.push('v.has_voted = 0');
            } else if (filter === 'wa_sent') {
                where.push("EXISTS (SELECT 1 FROM whatsapp_logs wl WHERE wl.voter_id = v.id AND wl.status IN ('sent', 'delivered', 'read'))");
            } else if (filter === 'wa_failed') {
                where.push("EXISTS (SELECT 1 FROM whatsapp_logs wl WHERE wl.voter_id = v.id AND wl.status = 'failed')");
            }
            if (rt) {
                params.push(rt);
                where.push(`v.rt = $${params.length}`);
            }
            if (rw) {
                params.push(rw);
                where.push(`v.rw = $${params.length}`);
            }

            const whereClause = `WHERE ${where.join(' AND ')}`;

            const countSql = `SELECT COUNT(*)::int AS total FROM voters v ${whereClause}`;
            const countResult = await query(countSql, params);
            const total = Number(countResult.rows?.[0]?.total || 0);

            const limitParam = params.length + 1;
            const offsetParam = params.length + 2;
            const dataSql = `
              SELECT v.id, v.nik, v.nama, v.phone, v.rt, v.rw, v.alamat,
                     v.has_voted, v.voted_at, v.created_at,
                     (SELECT COUNT(*)::int FROM voter_tokens vt WHERE vt.voter_id = v.id) as token_count,
                     (
                       SELECT vt.login_code
                       FROM voter_tokens vt
                       WHERE vt.voter_id = v.id AND vt.is_used = 0 AND vt.expired_at > NOW()
                       ORDER BY vt.created_at DESC
                       LIMIT 1
                     ) as kode_unik,
                     (
                       SELECT wl.status
                       FROM whatsapp_logs wl
                       WHERE wl.voter_id = v.id
                       ORDER BY wl.created_at DESC
                       LIMIT 1
                     ) as last_wa_status
              FROM voters v
              ${whereClause}
              ORDER BY v.id DESC
              LIMIT $${limitParam} OFFSET $${offsetParam}
            `;
            const dataResult = await query(dataSql, [...params, pageSize, offset]);
            const rows = (dataResult.rows || []).map((v) => ({
                ...v,
                no_rumah: v.nik,
                nik_masked: maskNik(v.nik),
                phone_masked: maskPhone(v.phone),
                has_voted: Number(v.has_voted) === 1,
            }));

            return res.success(rows, 'Berhasil', {
                page: currentPage,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/voters/:id
     */
    async detail(req, res, next) {
        try {
            const voterId = parseInt(req.params.id, 10);
            const result = await query(`
              SELECT id, nik, nama, phone, rt, rw, alamat, has_voted, voted_at, created_at, updated_at
              FROM voters
              WHERE id = $1
              LIMIT 1
            `, [voterId]);
            const voter = result.rows?.[0];
            if (!voter) throw new AppError('NOT_FOUND', 'Pemilih tidak ditemukan', 404);
            return res.success(voter);
        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /api/v1/admin/voters/:id
     */
    async update(req, res, next) {
        try {
            const voterId = parseInt(req.params.id, 10);
            const existsResult = await query('SELECT id FROM voters WHERE id = $1 LIMIT 1', [voterId]);
            if (!existsResult.rows?.[0]) throw new AppError('NOT_FOUND', 'Pemilih tidak ditemukan', 404);

            const fields = [];
            const values = [];
            if (req.body.no_rumah !== undefined) {
                values.push(req.body.no_rumah);
                fields.push(`nik = $${values.length}`);
            }
            if (req.body.nama !== undefined) {
                values.push(req.body.nama);
                fields.push(`nama = $${values.length}`);
            }
            if (req.body.phone !== undefined) {
                values.push(normalizePhone(req.body.phone));
                fields.push(`phone = $${values.length}`);
            }

            if (fields.length === 0) throw new AppError('NO_CHANGES', 'Tidak ada data yang diubah', 400);

            values.push(voterId);
            await query(
                `UPDATE voters
                 SET ${fields.join(', ')}, updated_at = NOW()
                 WHERE id = $${values.length}`,
                values,
            );

            const updatedResult = await query(`
              SELECT id, nik, nama, phone, rt, rw, alamat, has_voted, voted_at, created_at, updated_at
              FROM voters
              WHERE id = $1
              LIMIT 1
            `, [voterId]);
            const voter = updatedResult.rows?.[0];

            reportService.logAudit(req.admin.id, 'UPDATE_VOTER', 'voter', voterId, req.body, req.ip);
            return res.success(voter, 'Data pemilih berhasil diperbarui');
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/v1/admin/voters/:id
     */
    async delete(req, res, next) {
        let client;
        try {
            const voterId = parseInt(req.params.id, 10);
            client = await pool.connect();
            await client.query('BEGIN');

            const voterResult = await client.query(
                'SELECT id, has_voted FROM voters WHERE id = $1 LIMIT 1',
                [voterId],
            );
            const voter = voterResult.rows?.[0];
            if (!voter) throw new AppError('NOT_FOUND', 'Pemilih tidak ditemukan', 404);
            if (Number(voter.has_voted) === 1) {
                throw new AppError('ALREADY_VOTED', 'Tidak dapat menghapus pemilih yang sudah memberikan suara', 400);
            }

            await client.query('DELETE FROM voters WHERE id = $1', [voterId]);
            const countResult = await client.query('SELECT COUNT(*)::int AS count FROM voters');
            await client.query(
                "UPDATE election_settings SET value = $1, updated_at = NOW() WHERE key = 'total_dpt'",
                [String(countResult.rows?.[0]?.count || 0)],
            );

            await client.query('COMMIT');

            const result = { deleted: true };
            reportService.logAudit(req.admin.id, 'DELETE_VOTER', 'voter', voterId, {}, req.ip);
            return res.success(result, 'Pemilih berhasil dihapus');
        } catch (error) {
            if (client) {
                try { await client.query('ROLLBACK'); } catch { }
            }
            next(error);
        } finally {
            if (client) client.release();
        }
    },

    /**
     * POST /api/v1/admin/voters/import
     * Upload Excel/CSV DPT
     */
    async importDPT(req, res, next) {
        try {
            if (!req.file) {
                return res.error('File tidak ditemukan', 'NO_FILE', 400);
            }

            const filePath = req.file.path;

            // Parse file Excel
            const { data, errors, total } = parseExcelDPT(filePath);

            if (data.length === 0) {
                // Hapus file upload
                fs.unlinkSync(filePath);
                return res.error('Tidak ada data valid dalam file', 'EMPTY_DATA', 400, { errors });
            }

            // Import batch ke database
            const insertSql = `
              INSERT INTO voters (nik, nama, phone, rt, rw, alamat)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (nik) DO NOTHING
            `;
            let imported = 0;
            let skipped = 0;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                for (const v of data) {
                    const r = await client.query(insertSql, [v.nik, v.nama, v.phone, v.rt, v.rw, v.alamat]);
                    if (r.rowCount > 0) imported += 1;
                    else skipped += 1;
                }
                const countResult = await client.query('SELECT COUNT(*)::int AS count FROM voters');
                await client.query(
                    "UPDATE election_settings SET value = $1, updated_at = NOW() WHERE key = 'total_dpt'",
                    [String(countResult.rows?.[0]?.count || 0)],
                );
                await client.query('COMMIT');
            } catch (err) {
                try { await client.query('ROLLBACK'); } catch { }
                throw err;
            } finally {
                client.release();
            }

            // Hapus file upload setelah selesai
            fs.unlinkSync(filePath);

            reportService.logAudit(req.admin.id, 'IMPORT_DPT', 'voter', null, {
                total,
                imported,
                skipped,
                errors: errors.length,
            }, req.ip);

            return res.success({
                total_rows: total,
                imported,
                skipped,
                parse_errors: errors,
            }, `Berhasil import ${imported} data pemilih`);
        } catch (error) {
            // Cleanup file jika error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            next(error);
        }
    },

    /**
     * POST /api/v1/admin/voters/generate-tokens
     * Generate tokens untuk semua voter yang belum punya
     */
    async generateTokens(req, res, next) {
        try {
            const result = await tokenService.generateBatch();
            reportService.logAudit(req.admin.id, 'GENERATE_TOKENS', 'token', null, result, req.ip);
            return res.success(result, `${result.generated} token berhasil dibuat`);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/admin/voters/:id/impersonate-link
     * Ambil/generate link pooling aktif untuk 1 voter
     */
    async getImpersonateLink(req, res, next) {
        try {
            const voterId = parseInt(req.params.id);
            const voterResult = await query(
                'SELECT id, nama FROM voters WHERE id = $1 LIMIT 1',
                [voterId],
            );
            const voter = voterResult.rows?.[0];
            if (!voter) throw new AppError('NOT_FOUND', 'Pemilih tidak ditemukan', 404);

            let tokenData = await tokenService.getActiveTokenForVoter(voterId);
            if (!tokenData) {
                const gen = await tokenService.generateForVoter(voterId);
                if (gen.skipped) {
                    return res.error(gen.reason || 'Tidak bisa generate token', 'TOKEN_NOT_AVAILABLE', 400);
                }
                tokenData = await tokenService.getActiveTokenForVoter(voterId);
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const link = `${frontendUrl}/?code=${tokenData.login_code}`;

            return res.success({
                voter_id: voterId,
                voter_name: voter.nama,
                token: tokenData.token,
                login_code: tokenData.login_code,
                expired_at: tokenData.expired_at,
                link,
            }, 'Link impersonate berhasil dibuat');
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/admin/voters/:id/wa-link
     * Generate link wa.me berisi pesan personal untuk kirim manual
     */
    async getManualWaLink(req, res, next) {
        try {
            const voterId = parseInt(req.params.id, 10);
            const voterResult = await query(
                'SELECT id, nama, phone, rt, rw FROM voters WHERE id = $1 LIMIT 1',
                [voterId],
            );
            const voter = voterResult.rows?.[0];
            if (!voter) throw new AppError('NOT_FOUND', 'Pemilih tidak ditemukan', 404);

            let tokenData = await tokenService.getActiveTokenForVoter(voterId);
            if (!tokenData) {
                const gen = await tokenService.generateForVoter(voterId);
                if (gen.skipped) {
                    throw new AppError('TOKEN_NOT_AVAILABLE', gen.reason || 'Token tidak tersedia', 400);
                }
                tokenData = await tokenService.getActiveTokenForVoter(voterId);
            }
            if (!tokenData) throw new AppError('TOKEN_NOT_AVAILABLE', 'Token aktif tidak ditemukan', 400);

            const loginCode = tokenData.login_code || await tokenService.ensureLoginCodeForToken(tokenData.id);
            const settings = await whatsappService.getSettings();
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const message = whatsappService.buildMessage(voter, frontendUrl, loginCode, tokenData.expired_at, settings);
            const waNumber = normalizePhone(voter.phone);
            const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

            return res.success({
                voter_id: voter.id,
                voter_name: voter.nama,
                phone: waNumber,
                wa_link: waLink,
                message,
            }, 'Link WA manual berhasil dibuat');
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/admin/voters/:id/mark-wa-sent
     * Manual flag status WA sent (untuk pengiriman di luar sistem)
     */
    async markManualWaSent(req, res, next) {
        try {
            const voterId = parseInt(req.params.id, 10);
            const voterResult = await query(
                'SELECT id, nama, phone FROM voters WHERE id = $1 LIMIT 1',
                [voterId],
            );
            const voter = voterResult.rows?.[0];
            if (!voter) throw new AppError('NOT_FOUND', 'Pemilih tidak ditemukan', 404);

            const insertResult = await query(
                `
                  INSERT INTO whatsapp_logs (voter_id, phone, status, error_msg, sent_at)
                  VALUES ($1, $2, 'sent', 'Manual send by admin', NOW())
                  RETURNING id, status, sent_at
                `,
                [voter.id, normalizePhone(voter.phone)],
            );
            const log = insertResult.rows?.[0];

            reportService.logAudit(
                req.admin.id,
                'MARK_MANUAL_WA_SENT',
                'whatsapp',
                log?.id || null,
                { voter_id: voter.id, voter_name: voter.nama, source: 'manual' },
                req.ip,
            );

            return res.success({
                id: log?.id,
                voter_id: voter.id,
                status: log?.status || 'sent',
                sent_at: log?.sent_at || new Date().toISOString(),
                source: 'manual',
            }, 'Status WA ditandai sebagai sent');
        } catch (error) {
            next(error);
        }
    },
};

module.exports = adminVotersController;

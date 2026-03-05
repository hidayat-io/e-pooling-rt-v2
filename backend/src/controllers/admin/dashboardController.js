const reportService = require('../../services/reportService');
const { query, pool } = require('../../config/pgPool');
const XLSX = require('xlsx');
const { formatJakartaDateTime, formatJakartaFileTimestamp } = require('../../utils/dateTime');

/**
 * Controller: Admin Dashboard, Monitoring & Reports
 */
const adminDashboardController = {
    /**
     * GET /api/v1/admin/dashboard
     */
    async getDashboard(req, res, next) {
        try {
            const [
                totalDptResult,
                totalVotedResult,
                totalCandidatesResult,
                waSentResult,
                waFailedResult,
                waPendingResult,
                waDeliveredResult,
                perCandidateResult,
                recentVotesResult,
                recentFailedWaResult,
            ] = await Promise.all([
                query('SELECT COUNT(*)::int AS count FROM voters'),
                query('SELECT COUNT(*)::int AS count FROM voters WHERE has_voted = 1'),
                query('SELECT COUNT(*)::int AS count FROM candidates WHERE is_active = 1'),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status IN ('sent', 'delivered', 'read')"),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status = 'failed'"),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status = 'pending'"),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status IN ('delivered', 'read')"),
                query(`
                  SELECT c.id, c.nomor_urut, c.nama, c.photo_url,
                         COUNT(v.id)::int AS total_suara,
                         COUNT(v.id) FILTER (WHERE v.choice = 'setuju')::int       AS total_setuju,
                         COUNT(v.id) FILTER (WHERE v.choice = 'tidak_setuju')::int AS total_tidak_setuju
                  FROM candidates c
                  LEFT JOIN votes v ON v.candidate_id = c.id
                  WHERE c.is_active = 1
                  GROUP BY c.id
                  ORDER BY c.nomor_urut ASC
                `),
                query(`
                  SELECT v.rt, v.rw, v.voted_at, vo.nama
                  FROM votes v
                  LEFT JOIN voters vo ON vo.id = v.voter_id
                  ORDER BY v.voted_at DESC
                  LIMIT 10
                `),
                query(`
                  SELECT wl.phone, wl.error_msg, wl.created_at, vo.nama
                  FROM whatsapp_logs wl
                  LEFT JOIN voters vo ON vo.id = wl.voter_id
                  WHERE wl.status = 'failed'
                  ORDER BY wl.created_at DESC
                  LIMIT 5
                `),
            ]);

            const totalDpt = Number(totalDptResult.rows?.[0]?.count || 0);
            const totalVoted = Number(totalVotedResult.rows?.[0]?.count || 0);
            const totalCandidates = Number(totalCandidatesResult.rows?.[0]?.count || 0);
            const waSent = Number(waSentResult.rows?.[0]?.count || 0);
            const waFailed = Number(waFailedResult.rows?.[0]?.count || 0);
            const waPending = Number(waPendingResult.rows?.[0]?.count || 0);
            const waDelivered = Number(waDeliveredResult.rows?.[0]?.count || 0);
            const perCandidate = perCandidateResult.rows || [];
            const totalVotes = perCandidate.reduce((sum, r) => sum + Number(r.total_suara || 0), 0);

            return res.success({
                stats: {
                    total_dpt: totalDpt,
                    total_voted: totalVoted,
                    total_not_voted: totalDpt - totalVoted,
                    total_candidates: totalCandidates,
                    partisipasi: totalDpt > 0 ? ((totalVoted / totalDpt) * 100).toFixed(1) : '0.0',
                    wa_sent: waSent,
                    wa_failed: waFailed,
                    wa_pending: waPending,
                    wa_delivery_rate: waSent > 0 ? ((waDelivered / waSent) * 100).toFixed(1) : '0.0',
                },
                per_candidate: perCandidate.map((r) => ({
                    ...r,
                    total_setuju: Number(r.total_setuju || 0),
                    total_tidak_setuju: Number(r.total_tidak_setuju || 0),
                    persentase: totalVotes > 0 ? ((Number(r.total_suara || 0) / totalVotes) * 100).toFixed(1) : '0.0',
                })),
                recent_votes: recentVotesResult.rows || [],
                recent_failed_wa: recentFailedWaResult.rows || [],
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/monitoring
     */
    async getMonitoring(req, res, next) {
        try {
            const [
                totalDptResult,
                totalVotedResult,
                votesPerHourResult,
                liveFeedResult,
                waSentResult,
                waDeliveredResult,
                waFailedResult,
                waPendingResult,
            ] = await Promise.all([
                query('SELECT COUNT(*)::int AS count FROM voters'),
                query('SELECT COUNT(*)::int AS count FROM voters WHERE has_voted = 1'),
                query(`
                  SELECT TO_CHAR(DATE_TRUNC('hour', voted_at AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD HH24:00') as hour, COUNT(*)::int as count
                  FROM votes
                  WHERE voted_at >= NOW() - INTERVAL '24 hours'
                  GROUP BY DATE_TRUNC('hour', voted_at AT TIME ZONE 'Asia/Jakarta')
                  ORDER BY DATE_TRUNC('hour', voted_at AT TIME ZONE 'Asia/Jakarta') ASC
                `),
                query(`
                  SELECT v.rt, v.rw, v.voted_at
                  FROM votes v
                  ORDER BY v.voted_at DESC
                  LIMIT 20
                `),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status IN ('sent', 'delivered', 'read')"),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status IN ('delivered', 'read')"),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status = 'failed'"),
                query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status = 'pending'"),
            ]);

            const totalDpt = Number(totalDptResult.rows?.[0]?.count || 0);
            const totalVoted = Number(totalVotedResult.rows?.[0]?.count || 0);
            const waSent = Number(waSentResult.rows?.[0]?.count || 0);
            const waDelivered = Number(waDeliveredResult.rows?.[0]?.count || 0);
            const waFailed = Number(waFailedResult.rows?.[0]?.count || 0);
            const waPending = Number(waPendingResult.rows?.[0]?.count || 0);

            return res.success({
                partisipasi: {
                    total_dpt: totalDpt,
                    total_voted: totalVoted,
                    persentase: totalDpt > 0 ? ((totalVoted / totalDpt) * 100).toFixed(1) : '0.0',
                },
                votes_per_hour: votesPerHourResult.rows || [],
                live_feed: liveFeedResult.rows || [],
                wa_status: {
                    sent: waSent,
                    delivered: waDelivered,
                    failed: waFailed,
                    pending: waPending,
                    delivery_rate: waSent > 0 ? ((waDelivered / waSent) * 100).toFixed(1) : '0.0',
                },
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/results/detailed
     */
    async getDetailedResults(req, res, next) {
        try {
            const [perCandidateResult, perRtResult, partisipasiResult] = await Promise.all([
                query(`
                  SELECT c.id, c.nomor_urut, c.nama, c.photo_url,
                         COUNT(v.id)::int AS total_suara
                  FROM candidates c
                  LEFT JOIN votes v ON v.candidate_id = c.id
                  WHERE c.is_active = 1
                  GROUP BY c.id
                  ORDER BY c.nomor_urut ASC
                `),
                query(`
                  SELECT v.rt, v.rw, c.nomor_urut, c.nama, COUNT(*)::int as jumlah
                  FROM votes v
                  JOIN candidates c ON c.id = v.candidate_id
                  GROUP BY v.rt, v.rw, c.id
                  ORDER BY v.rt, v.rw, c.nomor_urut
                `),
                query(`
                  SELECT rt, rw,
                         COUNT(*)::int as total_dpt,
                         SUM(has_voted)::int as sudah_memilih
                  FROM voters
                  GROUP BY rt, rw
                  ORDER BY rt, rw
                `),
            ]);

            const perCandidate = perCandidateResult.rows || [];
            const totalVotes = perCandidate.reduce((sum, r) => sum + Number(r.total_suara || 0), 0);
            return res.success({
                per_candidate: perCandidate.map((r) => ({
                    ...r,
                    persentase: totalVotes > 0 ? ((Number(r.total_suara || 0) / totalVotes) * 100).toFixed(1) : '0.0',
                })),
                per_rt: perRtResult.rows || [],
                partisipasi_per_rt: partisipasiResult.rows || [],
                total_suara: totalVotes,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/admin/reports/export
     */
    async exportReport(req, res, next) {
        try {
            const data = await reportService.generateReport();
            reportService.logAudit(req.admin.id, 'EXPORT_REPORT', 'report', null, {}, req.ip);
            return res.success(data, 'Laporan berhasil di-generate');
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/reports/voters
     */
    async getVoterChoicesReport(req, res, next) {
        try {
            const { page = 1, limit = 25, search = '', choice = 'all' } = req.query;
            const currentPage = parseInt(page, 10) || 1;
            const pageSize = parseInt(limit, 10) || 25;
            const offset = (currentPage - 1) * pageSize;

            const where = [];
            const params = [];

            if (search) {
                params.push(`%${search}%`);
                where.push('(v.nama ILIKE $1 OR v.nik ILIKE $1 OR v.phone ILIKE $1)');
            }
            if (choice === 'setuju' || choice === 'tidak_setuju') {
                params.push(choice);
                where.push(`vo.choice = $${params.length}`);
            } else if (choice === 'belum') {
                where.push('vo.id IS NULL');
            }

            const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
            const countResult = await query(
                `SELECT COUNT(*)::int AS total FROM voters v LEFT JOIN votes vo ON vo.voter_id = v.id ${whereClause}`,
                params,
            );
            const total = Number(countResult.rows?.[0]?.total || 0);

            const rowsResult = await query(
                `
                SELECT v.id, v.nik as no_rumah, v.nama, v.phone, v.rt, v.rw, v.voted_at,
                       CASE WHEN vo.id IS NULL THEN 'belum' ELSE vo.choice END as pilihan
                FROM voters v
                LEFT JOIN votes vo ON vo.voter_id = v.id
                ${whereClause}
                ORDER BY v.nama ASC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
                `,
                [...params, pageSize, offset],
            );

            const summaryResult = await query(`
              SELECT
                COUNT(*)::int as total_voters,
                SUM(CASE WHEN vo.choice = 'setuju' THEN 1 ELSE 0 END)::int as total_setuju,
                SUM(CASE WHEN vo.choice = 'tidak_setuju' THEN 1 ELSE 0 END)::int as total_tidak_setuju,
                SUM(CASE WHEN vo.id IS NULL THEN 1 ELSE 0 END)::int as total_belum
              FROM voters v
              LEFT JOIN votes vo ON vo.voter_id = v.id
            `);

            const summary = summaryResult.rows?.[0] || {};
            return res.success({
                rows: rowsResult.rows || [],
                summary: {
                    total_voters: Number(summary.total_voters || 0),
                    total_setuju: Number(summary.total_setuju || 0),
                    total_tidak_setuju: Number(summary.total_tidak_setuju || 0),
                    total_belum: Number(summary.total_belum || 0),
                },
            }, 'Berhasil', {
                page: currentPage,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize) || 1,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/reports/voters/export
     */
    async exportVoterChoicesReport(req, res, next) {
        try {
            const { search = '', choice = 'all' } = req.query;
            const where = [];
            const params = [];
            if (search) {
                params.push(`%${search}%`);
                where.push('(v.nama ILIKE $1 OR v.nik ILIKE $1 OR v.phone ILIKE $1)');
            }
            if (choice === 'setuju' || choice === 'tidak_setuju') {
                params.push(choice);
                where.push(`vo.choice = $${params.length}`);
            } else if (choice === 'belum') {
                where.push('vo.id IS NULL');
            }
            const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
            const rowsResult = await query(
                `
                SELECT v.id, v.nik as no_rumah, v.nama, v.phone, v.voted_at,
                       CASE WHEN vo.id IS NULL THEN 'belum' ELSE vo.choice END as pilihan
                FROM voters v
                LEFT JOIN votes vo ON vo.voter_id = v.id
                ${whereClause}
                ORDER BY v.nama ASC
                `,
                params,
            );
            const rows = rowsResult.rows || [];

            const choiceLabel = {
                all: 'Semua',
                setuju: 'Setuju',
                tidak_setuju: 'Tidak Setuju',
                belum: 'Belum Memilih',
            };

            const mappedRows = rows.map((row, idx) => ([
                idx + 1,
                row.no_rumah || '-',
                row.nama || '-',
                row.phone || '-',
                row.pilihan === 'setuju'
                    ? 'Setuju'
                    : row.pilihan === 'tidak_setuju'
                        ? 'Tidak Setuju'
                        : 'Belum Memilih',
                row.voted_at
                    ? formatJakartaDateTime(row.voted_at)
                    : '-',
            ]));

            const sheetData = [
                ['Laporan Pilihan Pemilih'],
                ['Waktu Export', formatJakartaDateTime(new Date())],
                ['Filter Pilihan', choiceLabel[choice] || 'Semua'],
                ['Filter Pencarian', search || '-'],
                ['Total Data', rows.length],
                [],
                ['No', 'No. Rumah', 'Nama', 'No. HP', 'Pilihan', 'Waktu Pilih'],
                ...mappedRows,
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            worksheet['!cols'] = [
                { wch: 6 },
                { wch: 16 },
                { wch: 30 },
                { wch: 18 },
                { wch: 16 },
                { wch: 24 },
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Pemilih');
            const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

            const stamp = formatJakartaFileTimestamp();
            const fileName = `laporan-pemilih-${stamp}.xlsx`;

            reportService.logAudit(
                req.admin.id,
                'EXPORT_VOTER_CHOICES_REPORT',
                'report',
                null,
                { choice, search, total_rows: rows.length },
                req.ip,
            );

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.status(200).send(buffer);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/settings
     */
    async getSettings(req, res, next) {
        try {
            const result = await query(
                'SELECT key, value, description, updated_at FROM election_settings ORDER BY key ASC',
            );
            const settings = result.rows || [];
            return res.success(settings);
        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /api/v1/admin/settings
     */
    async updateSettings(req, res, next) {
        let client;
        try {
            const { settings } = req.body;
            client = await pool.connect();
            await client.query('BEGIN');
            for (const { key, value } of settings) {
                await client.query(
                    'UPDATE election_settings SET value = $1, updated_at = NOW() WHERE key = $2',
                    [value, key],
                );
            }
            await client.query('COMMIT');

            reportService.logAudit(req.admin.id, 'UPDATE_SETTINGS', 'settings', null, { settings }, req.ip);

            const updatedResult = await query(
                'SELECT key, value, description, updated_at FROM election_settings ORDER BY key ASC',
            );
            const updatedSettings = updatedResult.rows || [];
            return res.success(updatedSettings, 'Pengaturan berhasil diperbarui');
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
     * POST /api/v1/admin/settings/reset-pooling
     * Reset hasil pooling tanpa menghapus data DPT/kandidat/settings
     */
    async resetPooling(req, res, next) {
        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');

            const beforeVotesResult = await client.query('SELECT COUNT(*)::int as count FROM votes');
            const beforeVotedResult = await client.query('SELECT COUNT(*)::int as count FROM voters WHERE has_voted = 1');
            const beforeVotes = Number(beforeVotesResult.rows?.[0]?.count || 0);
            const beforeVoted = Number(beforeVotedResult.rows?.[0]?.count || 0);

            let voteDeleteChanges = 0;
            let voterResetChanges = 0;
            let tokenResetChanges = 0;

            const voteDelete = await client.query('DELETE FROM votes');
            const voterReset = await client.query(`
              UPDATE voters
              SET has_voted = 0, voted_at = NULL, updated_at = NOW()
              WHERE has_voted = 1
            `);
            const tokenReset = await client.query(`
              UPDATE voter_tokens
              SET is_used = 0, access_count = 0, last_ip = NULL, last_ua = NULL
            `);

            voteDeleteChanges = voteDelete.rowCount || 0;
            voterResetChanges = voterReset.rowCount || 0;
            tokenResetChanges = tokenReset.rowCount || 0;

            await client.query('COMMIT');

            const summary = {
                votes_before: beforeVotes,
                voters_voted_before: beforeVoted,
                votes_deleted: voteDeleteChanges,
                voters_reset: voterResetChanges,
                tokens_reset: tokenResetChanges,
                reset_at: new Date().toISOString(),
            };

            reportService.logAudit(req.admin.id, 'RESET_POOLING_RESULTS', 'pooling', null, summary, req.ip);

            return res.success(summary, 'Hasil pooling berhasil direset');
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
     * GET /api/v1/admin/logs/audit
     */
    async getAuditLogs(req, res, next) {
        try {
            const { page = 1, limit = 25 } = req.query;
            const currentPage = parseInt(page, 10) || 1;
            const pageSize = parseInt(limit, 10) || 25;
            const offset = (currentPage - 1) * pageSize;

            const [countResult, logsResult] = await Promise.all([
                query('SELECT COUNT(*)::int as total FROM audit_logs'),
                query(`
                  SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at,
                         au.username, au.nama
                  FROM audit_logs al
                  LEFT JOIN admin_users au ON au.id = al.admin_id
                  ORDER BY al.created_at DESC
                  LIMIT $1 OFFSET $2
                `, [pageSize, offset]),
            ]);
            const total = Number(countResult.rows?.[0]?.total || 0);
            return res.success(logsResult.rows || [], 'Berhasil', {
                page: currentPage,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize) || 1,
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/logs/traffic
     * Lihat traffic log per request dengan filter & statistik ringkas.
     *
     * Query params:
     *   page, limit      – pagination (default 1 / 50)
     *   method           – filter HTTP method (GET, POST, …)
     *   status_code      – filter kode HTTP (200, 404, 500, …)
     *   path             – filter path (substring, case-insensitive)
     *   user_type        – filter tipe user (anonymous, voter, admin)
     *   ip               – filter IP address (substring)
     *   date_from        – filter dari tanggal (ISO 8601)
     *   date_to          – filter sampai tanggal (ISO 8601)
     */
    async getTrafficLogs(req, res, next) {
        try {
            const {
                page = 1,
                limit = 50,
                method,
                status_code,
                path: pathFilter,
                user_type,
                ip,
                date_from,
                date_to,
            } = req.query;

            const currentPage = parseInt(page, 10) || 1;
            const pageSize = Math.min(parseInt(limit, 10) || 50, 200); // max 200
            const offset = (currentPage - 1) * pageSize;

            const where = [];
            const params = [];

            if (method) {
                params.push(method.toUpperCase());
                where.push(`method = $${params.length}`);
            }
            if (status_code) {
                params.push(parseInt(status_code, 10));
                where.push(`status_code = $${params.length}`);
            }
            if (pathFilter) {
                params.push(`%${pathFilter}%`);
                where.push(`path ILIKE $${params.length}`);
            }
            if (user_type) {
                params.push(user_type);
                where.push(`user_type = $${params.length}`);
            }
            if (ip) {
                params.push(`%${ip}%`);
                where.push(`ip_address ILIKE $${params.length}`);
            }
            if (date_from) {
                params.push(date_from);
                where.push(`created_at >= $${params.length}`);
            }
            if (date_to) {
                params.push(date_to);
                where.push(`created_at <= $${params.length}`);
            }

            const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

            const [countResult, logsResult, statsResult] = await Promise.all([
                // Total baris
                query(`SELECT COUNT(*)::int AS total FROM request_logs ${whereClause}`, params),

                // Baris per halaman
                query(
                    `SELECT id, method, path, status_code, response_time_ms,
                            ip_address, user_agent, user_type, user_id, query_string, created_at
                     FROM request_logs
                     ${whereClause}
                     ORDER BY created_at DESC
                     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
                    [...params, pageSize, offset],
                ),

                // Statistik ringkas (tidak dipengaruhi pagination, tapi ikut filter)
                query(
                    `SELECT
                       COUNT(*)::int                                          AS total_requests,
                       COUNT(DISTINCT ip_address)::int                       AS unique_ips,
                       ROUND(AVG(response_time_ms))::int                     AS avg_response_ms,
                       COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::int AS total_4xx,
                       COUNT(*) FILTER (WHERE status_code >= 500)::int       AS total_5xx,
                       COUNT(*) FILTER (WHERE user_type = 'voter')::int      AS total_voter,
                       COUNT(*) FILTER (WHERE user_type = 'admin')::int      AS total_admin,
                       COUNT(*) FILTER (WHERE user_type = 'anonymous')::int  AS total_anonymous
                     FROM request_logs ${whereClause}`,
                    params,
                ),
            ]);

            const total = Number(countResult.rows?.[0]?.total || 0);
            const stats = statsResult.rows?.[0] || {};

            return res.success(
                {
                    stats: {
                        total_requests: Number(stats.total_requests || 0),
                        unique_ips: Number(stats.unique_ips || 0),
                        avg_response_ms: Number(stats.avg_response_ms || 0),
                        total_4xx: Number(stats.total_4xx || 0),
                        total_5xx: Number(stats.total_5xx || 0),
                        total_voter: Number(stats.total_voter || 0),
                        total_admin: Number(stats.total_admin || 0),
                        total_anonymous: Number(stats.total_anonymous || 0),
                    },
                    logs: logsResult.rows || [],
                },
                'Berhasil',
                {
                    page: currentPage,
                    limit: pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize) || 1,
                },
            );
        } catch (error) {
            next(error);
        }
    },
};

module.exports = adminDashboardController;

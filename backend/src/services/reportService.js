const { query } = require('../config/pgPool');
const logger = require('../config/logger');

/**
 * Service untuk export laporan
 */
class ReportService {
    /**
     * Generate data untuk export laporan
     */
    async generateReport() {
        const [
            totalDptResult,
            totalVotedResult,
            perCandidateResult,
            partisipasiResult,
            timelineResult,
            settingsResult,
        ] = await Promise.all([
            query('SELECT COUNT(*)::int AS count FROM voters'),
            query('SELECT COUNT(*)::int AS count FROM voters WHERE has_voted = 1'),
            query(`
              SELECT c.nomor_urut, c.nama, c.is_petahana, COUNT(v.id)::int as total_suara
              FROM candidates c
              LEFT JOIN votes v ON v.candidate_id = c.id
              WHERE c.is_active = 1
              GROUP BY c.id
              ORDER BY total_suara DESC
            `),
            query(`
              SELECT rt, rw,
                     COUNT(*)::int as total_dpt,
                     SUM(has_voted)::int as sudah_memilih
              FROM voters
              GROUP BY rt, rw
              ORDER BY rt, rw
            `),
            query(`
              SELECT TO_CHAR(DATE_TRUNC('hour', voted_at AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD HH24:00') as waktu,
                     COUNT(*)::int as jumlah
              FROM votes
              GROUP BY DATE_TRUNC('hour', voted_at AT TIME ZONE 'Asia/Jakarta')
              ORDER BY DATE_TRUNC('hour', voted_at AT TIME ZONE 'Asia/Jakarta') ASC
            `),
            query('SELECT key, value FROM election_settings'),
        ]);

        const totalDpt = Number(totalDptResult.rows?.[0]?.count || 0);
        const totalVoted = Number(totalVotedResult.rows?.[0]?.count || 0);
        const perCandidate = perCandidateResult.rows || [];
        const totalVotes = perCandidate.reduce((sum, row) => sum + Number(row.total_suara || 0), 0);

        const settings = {};
        (settingsResult.rows || []).forEach((row) => {
            settings[row.key] = row.value;
        });

        return {
            settings,
            ringkasan: {
                total_dpt: totalDpt,
                total_voted: totalVoted,
                total_not_voted: totalDpt - totalVoted,
                partisipasi: totalDpt > 0 ? ((totalVoted / totalDpt) * 100).toFixed(1) : '0.0',
            },
            hasil: perCandidate.map((row) => ({
                ...row,
                persentase: totalVotes > 0 ? ((Number(row.total_suara || 0) / totalVotes) * 100).toFixed(1) : '0.0',
            })),
            partisipasi_per_rt: partisipasiResult.rows || [],
            timeline: timelineResult.rows || [],
            generated_at: new Date().toISOString(),
        };
    }

    /**
     * Laporan pilihan per pemilih (admin)
     */
    async getVoterChoices({ page = 1, limit = 25, search = '', choice = 'all' } = {}) {
        const currentPage = Number(page) > 0 ? Number(page) : 1;
        const pageSize = Number(limit) > 0 ? Number(limit) : 25;
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
        const totalResult = await query(
            `SELECT COUNT(*)::int as total FROM voters v LEFT JOIN votes vo ON vo.voter_id = v.id ${whereClause}`,
            params,
        );
        const total = Number(totalResult.rows?.[0]?.total || 0);

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

        return {
            rows: rowsResult.rows || [],
            summary: {
                total_voters: Number(summary.total_voters || 0),
                total_setuju: Number(summary.total_setuju || 0),
                total_tidak_setuju: Number(summary.total_tidak_setuju || 0),
                total_belum: Number(summary.total_belum || 0),
            },
            meta: {
                page: currentPage,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize) || 1,
            },
        };
    }

    /**
     * Export semua data voter + pilihan untuk laporan admin
     */
    async getVoterChoicesExport({ search = '', choice = 'all' } = {}) {
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

        return rowsResult.rows || [];
    }

    /**
     * Audit log: catat aksi admin
     */
    logAudit(adminId, action, entityType, entityId, details, ip) {
        query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [adminId, action, entityType, entityId, JSON.stringify(details), ip],
        ).catch((err) => {
            logger.warn(`Gagal simpan audit log: ${err.message}`);
        });
    }

    /**
     * Ambil audit log
     */
    async getAuditLogs({ page = 1, limit = 25 } = {}) {
        const currentPage = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 25;
        const offset = (currentPage - 1) * pageSize;

        const [countResult, logsResult] = await Promise.all([
            query('SELECT COUNT(*)::int AS total FROM audit_logs'),
            query(
                `
                  SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at,
                         au.username, au.nama
                  FROM audit_logs al
                  LEFT JOIN admin_users au ON au.id = al.admin_id
                  ORDER BY al.created_at DESC
                  LIMIT $1 OFFSET $2
                `,
                [pageSize, offset],
            ),
        ]);
        const total = Number(countResult.rows?.[0]?.total || 0);

        return {
            data: logsResult.rows || [],
            meta: {
                page: currentPage,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize) || 1,
            },
        };
    }
}

module.exports = new ReportService();

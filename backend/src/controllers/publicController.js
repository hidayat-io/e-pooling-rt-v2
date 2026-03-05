const { query } = require('../config/pgPool');
const { AppError } = require('../utils/response');

/**
 * Controller: Public endpoints (no auth required)
 * Jalur ini memakai pg.Pool langsung untuk menekan latency Neon.
 */
const publicController = {
  /**
   * GET /api/v1/candidates
   */
  async getCandidates(req, res, next) {
    try {
      const result = await query(`
        SELECT id, nomor_urut, nama, photo_url, tagline, visi, misi, biodata, is_petahana
        FROM candidates
        WHERE is_active = 1
        ORDER BY nomor_urut ASC
      `);
      return res.success(result.rows || []);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/candidates/:id
   */
  async getCandidateById(req, res, next) {
    try {
      const candidateId = parseInt(req.params.id, 10);
      const result = await query(`
        SELECT id, nomor_urut, nama, photo_url, tagline, visi, misi, biodata, is_petahana, is_active, created_at
        FROM candidates
        WHERE id = $1
      `, [candidateId]);

      const candidate = result.rows?.[0];
      if (!candidate) {
        throw new AppError('NOT_FOUND', 'Kandidat tidak ditemukan', 404);
      }

      return res.success(candidate);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/results
   */
  async getResults(req, res, next) {
    try {
      const showRealtimeResult = await query(
        `SELECT value FROM election_settings WHERE key = 'show_realtime' LIMIT 1`,
      );
      const showRealtime = showRealtimeResult.rows?.[0]?.value;

      if (showRealtime !== '1') {
        return res.success({ show: false, message: 'Hasil akan ditampilkan setelah voting selesai' });
      }

      const candidatesResult = await query(`
        SELECT id, nomor_urut, nama, photo_url, tagline
        FROM candidates
        WHERE is_active = 1
        ORDER BY nomor_urut ASC
      `);
      const candidates = candidatesResult.rows || [];

      if (candidates.length === 1) {
        const candidate = candidates[0];
        const countsResult = await query(`
          SELECT choice, COUNT(*)::int AS total
          FROM votes
          WHERE candidate_id = $1
          GROUP BY choice
        `, [candidate.id]);

        const counts = countsResult.rows || [];
        const setuju = Number(counts.find((c) => c.choice === 'setuju')?.total || 0);
        const tidakSetuju = Number(counts.find((c) => c.choice === 'tidak_setuju')?.total || 0);
        const total = setuju + tidakSetuju;

        return res.success({
          show: true,
          is_single_candidate: true,
          candidate,
          results: [
            { label: 'Setuju', total: setuju, persentase: total > 0 ? ((setuju / total) * 100).toFixed(1) : '0.0' },
            { label: 'Tidak Setuju', total: tidakSetuju, persentase: total > 0 ? ((tidakSetuju / total) * 100).toFixed(1) : '0.0' },
          ],
          total_suara: total,
        });
      }

      const resultRows = await query(`
        SELECT c.id, c.nomor_urut, c.nama, c.photo_url, c.tagline,
               COUNT(v.id)::int AS total_suara
        FROM candidates c
        LEFT JOIN votes v ON v.candidate_id = c.id
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.nomor_urut ASC
      `);

      const rows = resultRows.rows || [];
      const totalVotes = rows.reduce((sum, r) => sum + Number(r.total_suara || 0), 0);

      return res.success({
        show: true,
        is_single_candidate: false,
        results: rows.map((r) => ({
          ...r,
          persentase: totalVotes > 0 ? ((Number(r.total_suara || 0) / totalVotes) * 100).toFixed(1) : '0.0',
        })),
        total_suara: totalVotes,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/stats/public
   */
  async getPublicStats(req, res, next) {
    try {
      const [dptResult, votedResult, settingsResult] = await Promise.all([
        query('SELECT COUNT(*)::int AS count FROM voters'),
        query('SELECT COUNT(*)::int AS count FROM voters WHERE has_voted = 1'),
        query(`
          SELECT key, value
          FROM election_settings
          WHERE key IN ('election_name', 'election_period', 'pooling_status', 'voting_status', 'rt', 'rw')
        `),
      ]);

      const totalDpt = Number(dptResult.rows?.[0]?.count || 0);
      const totalVoted = Number(votedResult.rows?.[0]?.count || 0);
      const settings = {};
      for (const row of settingsResult.rows || []) {
        settings[row.key] = row.value;
      }

      return res.success({
        total_dpt: totalDpt,
        total_voted: totalVoted,
        total_not_voted: totalDpt - totalVoted,
        partisipasi: totalDpt > 0 ? ((totalVoted / totalDpt) * 100).toFixed(1) : '0.0',
        election_name: settings.election_name,
        election_period: settings.election_period,
        pooling_status: settings.pooling_status || settings.voting_status,
        rt: settings.rt,
        rw: settings.rw,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/announcements
   */
  async getAnnouncements(req, res, next) {
    try {
      const result = await query(`
        SELECT id, type, title, content, icon_url, expires_at, created_at
        FROM announcements
        WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
      `);
      return res.success(result.rows || []);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/settings/public
   */
  async getPublicSettings(req, res, next) {
    try {
      const publicKeys = [
        'election_name',
        'election_period',
        'pooling_status',
        'pooling_start',
        'pooling_end',
        'rt',
        'rw',
        'show_realtime',
      ];

      const result = await query(
        'SELECT key, value FROM election_settings WHERE key = ANY($1::text[])',
        [publicKeys],
      );

      const settings = {};
      for (const row of result.rows || []) {
        settings[row.key] = row.value;
      }

      return res.success(settings);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = publicController;

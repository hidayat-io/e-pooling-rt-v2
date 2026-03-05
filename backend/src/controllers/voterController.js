const { pool, query } = require('../config/pgPool');
const { AppError } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Controller: Voter actions (requires voterAuth)
 */
const voterController = {
    /**
     * POST /api/v1/votes
     * Submit vote
     */
    async submitVote(req, res, next) {
        let client;
        try {
            const { candidate_id, choice = 'setuju' } = req.body;
            const voter = {
                ...req.voter,
                ip: req.ip || req.connection.remoteAddress,
            };
            const candidateId = parseInt(candidate_id, 10);
            if (!candidateId) {
                throw new AppError('CANDIDATE_NOT_FOUND', 'Kandidat tidak ditemukan atau tidak aktif', 404);
            }

            client = await pool.connect();
            await client.query('BEGIN');

            const settingsResult = await client.query(
                `SELECT key, value
                 FROM election_settings
                 WHERE key = ANY($1::text[])`,
                [['pooling_status', 'voting_status', 'pooling_start', 'voting_start', 'pooling_end', 'voting_end']],
            );
            const settings = {};
            for (const row of settingsResult.rows || []) settings[row.key] = row.value;

            const poolingStatus = settings.pooling_status || settings.voting_status;
            if (poolingStatus !== 'active') {
                throw new AppError('VOTING_CLOSED', 'Pemilihan belum dimulai atau sudah ditutup', 403);
            }

            const now = new Date();
            const poolingStart = settings.pooling_start || settings.voting_start;
            const poolingEnd = settings.pooling_end || settings.voting_end;
            if (poolingStart && new Date(poolingStart) > now) {
                throw new AppError('VOTING_NOT_STARTED', 'Pemilihan belum dimulai', 403);
            }
            if (poolingEnd && new Date(poolingEnd) < now) {
                throw new AppError('VOTING_ENDED', 'Waktu pemilihan sudah berakhir', 403);
            }

            const voterResult = await client.query(
                'SELECT id, has_voted FROM voters WHERE id = $1 LIMIT 1',
                [voter.voter_id],
            );
            const voterData = voterResult.rows?.[0];
            if (!voterData) throw new AppError('VOTER_NOT_FOUND', 'Data pemilih tidak ditemukan', 404);
            if (Number(voterData.has_voted) === 1) throw new AppError('ALREADY_VOTED', 'Anda sudah memberikan suara sebelumnya', 409);

            const candidateResult = await client.query(
                'SELECT id FROM candidates WHERE id = $1 AND is_active = 1 LIMIT 1',
                [candidateId],
            );
            if (!candidateResult.rows?.[0]) {
                throw new AppError('CANDIDATE_NOT_FOUND', 'Kandidat tidak ditemukan atau tidak aktif', 404);
            }

            await client.query(
                `INSERT INTO votes (voter_id, candidate_id, choice, rt, rw, ip_address)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [voter.voter_id, candidateId, choice, voter.rt, voter.rw, voter.ip || null],
            );
            await client.query(
                `UPDATE voters
                 SET has_voted = 1, voted_at = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                [voter.voter_id],
            );
            if (voter.token_id) {
                await client.query('UPDATE voter_tokens SET is_used = 1 WHERE id = $1', [voter.token_id]);
            }

            await client.query('COMMIT');
            logger.info(`Vote recorded: RT ${voter.rt}/RW ${voter.rw}`, { voter_id: voter.voter_id });

            const result = {
                message: 'Suara Anda berhasil dicatat',
                voted_at: new Date().toISOString(),
            };
            return res.successWithCode(201, result, 'Suara Anda berhasil dicatat!');
        } catch (error) {
            if (client) {
                try { await client.query('ROLLBACK'); } catch { }
            }
            if (
                error.code === '23505'
                || error.message?.includes('UNIQUE constraint failed: votes.voter_id')
                || error.message?.includes('duplicate key value violates unique constraint')
                || error.message?.includes('votes_voter_id_key')
            ) {
                return next(new AppError('ALREADY_VOTED', 'Anda sudah memberikan suara sebelumnya', 409));
            }
            next(error);
        } finally {
            if (client) client.release();
        }
    },

    /**
     * GET /api/v1/votes/my-status
     * Check voting status
     */
    async myStatus(req, res, next) {
        try {
            const voterResult = await query(
                'SELECT has_voted, voted_at FROM voters WHERE id = $1 LIMIT 1',
                [req.voter.voter_id],
            );
            const voter = voterResult.rows?.[0];
            if (!voter) throw new AppError('VOTER_NOT_FOUND', 'Data pemilih tidak ditemukan', 404);
            const status = {
                has_voted: Number(voter.has_voted) === 1,
                voted_at: voter.voted_at,
            };
            return res.success(status);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = voterController;

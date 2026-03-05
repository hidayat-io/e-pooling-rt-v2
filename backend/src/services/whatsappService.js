const whatsapp = require('../config/whatsapp');
const tokenService = require('./tokenService');
const { query } = require('../config/pgPool');
const { AppError } = require('../utils/response');
const logger = require('../config/logger');
const { formatJakartaLongDateTime } = require('../utils/dateTime');

/**
 * Service untuk manajemen WhatsApp messages
 */
class WhatsAppService {
    /**
     * Kirim WA ke satu voter
     */
    async sendToVoter(voterId) {
        const voterResult = await query(
            'SELECT id, nama, phone, rt, rw FROM voters WHERE id = $1 LIMIT 1',
            [voterId],
        );
        const voter = voterResult.rows?.[0];
        if (!voter) throw new AppError('VOTER_NOT_FOUND', 'Pemilih tidak ditemukan', 404);

        let tokenData = await tokenService.getActiveTokenForVoter(voterId);
        if (!tokenData) {
            const genResult = await tokenService.generateForVoter(voterId);
            if (genResult.skipped) throw new AppError('ALREADY_VOTED', 'Pemilih sudah memberikan suara', 400);
            tokenData = await tokenService.getActiveTokenForVoter(voterId);
        }
        if (!tokenData) {
            throw new AppError('TOKEN_NOT_AVAILABLE', 'Token aktif tidak ditemukan', 500);
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const settings = await this.getSettings();
        const message = this.buildMessage(voter, frontendUrl, tokenData.login_code, tokenData.expired_at, settings);

        const logInsertResult = await query(
            `
              INSERT INTO whatsapp_logs (voter_id, token_id, phone, status)
              VALUES ($1, $2, $3, 'pending')
              RETURNING id
            `,
            [voterId, tokenData.id || null, voter.phone],
        );
        const logId = logInsertResult.rows?.[0]?.id;

        const result = await whatsapp.sendMessage(voter.phone, message);

        if (result.success) {
            await query(
                `
                  UPDATE whatsapp_logs
                  SET status = 'sent', wa_message_id = $1, sent_at = NOW()
                  WHERE id = $2
                `,
                [result.messageId || null, logId],
            );
        } else {
            await query(
                `
                  UPDATE whatsapp_logs
                  SET status = 'failed', error_msg = $1
                  WHERE id = $2
                `,
                [result.error || 'Unknown WA error', logId],
            );
        }

        return {
            success: result.success,
            phone: voter.phone,
            status: result.success ? 'sent' : 'failed',
            error: result.error || null,
        };
    }

    /**
     * Ambil voters untuk broadcast berdasarkan filter
     */
    async getBroadcastTargets(filter = 'all') {
        let sql = '';
        switch (filter) {
            case 'no_wa':
                sql = `
                  SELECT v.id, v.nama, v.phone, v.rt, v.rw
                  FROM voters v
                  WHERE v.has_voted = 0
                    AND NOT EXISTS (
                      SELECT 1
                      FROM whatsapp_logs wl
                      WHERE wl.voter_id = v.id
                        AND wl.status IN ('sent', 'delivered', 'read')
                    )
                `;
                break;
            case 'wa_failed':
                sql = `
                  SELECT v.id, v.nama, v.phone, v.rt, v.rw
                  FROM voters v
                  WHERE v.has_voted = 0
                    AND EXISTS (
                      SELECT 1
                      FROM whatsapp_logs wl
                      WHERE wl.voter_id = v.id
                        AND wl.status = 'failed'
                    )
                    AND NOT EXISTS (
                      SELECT 1
                      FROM whatsapp_logs wl
                      WHERE wl.voter_id = v.id
                        AND wl.status IN ('sent', 'delivered', 'read')
                    )
                `;
                break;
            case 'not_voted':
            default:
                sql = `
                  SELECT v.id, v.nama, v.phone, v.rt, v.rw
                  FROM voters v
                  WHERE v.has_voted = 0
                `;
                break;
        }

        const result = await query(sql);
        return result.rows || [];
    }

    /**
     * Queue broadcast messages (tidak kirim langsung, via queue)
     */
    async queueBroadcast(filter = 'all') {
        const targets = await this.getBroadcastTargets(filter);
        if (targets.length === 0) {
            return { queued: 0, message: 'Tidak ada target yang perlu dikirim' };
        }

        await tokenService.generateBatch();

        const voterIds = targets.map((target) => Number(target.id));
        const phones = targets.map((target) => target.phone);

        await query(
            `
              INSERT INTO whatsapp_logs (voter_id, phone, status)
              SELECT t.voter_id, t.phone, 'pending'
              FROM UNNEST($1::bigint[], $2::text[]) AS t(voter_id, phone)
            `,
            [voterIds, phones],
        );

        logger.info(`Broadcast queued: ${targets.length} messages`);

        return {
            queued: targets.length,
            estimated_time_seconds: Math.ceil(targets.length / (parseInt(process.env.WA_RATE_LIMIT, 10) || 20)),
        };
    }

    /**
     * Build pesan WA dari template
     */
    buildMessage(voter, entryUrl, loginCode, expiredAt, settings = {}) {
        const poolingEndRaw = settings.pooling_end || settings.voting_end;
        const poolingEnd = poolingEndRaw
            ? formatJakartaLongDateTime(poolingEndRaw)
            : formatJakartaLongDateTime(expiredAt);

        const template = settings.wa_message_template || '';
        let message = template
            .replace(/{nama}/g, voter.nama)
            .replace(/{election_name}/g, settings.election_name || '')
            .replace(/{election_period}/g, settings.election_period || '')
            .replace(/{link}/g, entryUrl)
            .replace(/{kode_unik}/g, loginCode || '----')
            .replace(/{batas_pooling}/g, poolingEnd)
            .replace(/{batas_voting}/g, poolingEnd)
            .replace(/{kontak_panitia}/g, process.env.WA_CONTACT || '628123456789');

        if (!template.includes('{kode_unik}') && loginCode) {
            message += `\n\nKode unik Anda: *${loginCode}*`;
        }
        if (!template.includes('{link}') && entryUrl) {
            message += `\nWebsite voting: ${entryUrl}`;
        }

        return message;
    }

    /**
     * Ambil settings dari DB
     */
    async getSettings() {
        const result = await query('SELECT key, value FROM election_settings');
        const settings = {};
        (result.rows || []).forEach((row) => {
            settings[row.key] = row.value;
        });
        return settings;
    }

    /**
     * Ambil log WA dengan filter dan pagination
     */
    async getLogs({ page = 1, limit = 25, status = '', voter_id = null } = {}) {
        const currentPage = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 25;
        const offset = (currentPage - 1) * pageSize;

        const where = ['1=1'];
        const params = [];
        if (status) {
            params.push(status);
            where.push(`wl.status = $${params.length}`);
        }
        if (voter_id) {
            params.push(Number(voter_id));
            where.push(`wl.voter_id = $${params.length}`);
        }
        const whereClause = `WHERE ${where.join(' AND ')}`;

        const countResult = await query(
            `SELECT COUNT(*)::int AS total FROM whatsapp_logs wl ${whereClause}`,
            params,
        );
        const total = Number(countResult.rows?.[0]?.total || 0);

        const logsResult = await query(
            `
              SELECT wl.id, wl.voter_id, wl.phone, wl.status, wl.error_msg, wl.wa_message_id,
                     wl.sent_at, wl.delivered_at, wl.read_at, wl.created_at, v.nama
              FROM whatsapp_logs wl
              LEFT JOIN voters v ON v.id = wl.voter_id
              ${whereClause}
              ORDER BY wl.created_at DESC
              LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `,
            [...params, pageSize, offset],
        );

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

    /**
     * Update status dari webhook
     */
    async updateFromWebhook(messageId, status, timestamp) {
        const existingResult = await query(
            'SELECT id FROM whatsapp_logs WHERE wa_message_id = $1 LIMIT 1',
            [messageId],
        );
        if (!existingResult.rows?.[0]) return false;

        const fields = ['status = $1'];
        const values = [status];

        if (status === 'delivered') {
            fields.push(`delivered_at = $${values.length + 1}`);
            values.push(timestamp);
        } else if (status === 'read') {
            fields.push(`read_at = $${values.length + 1}`);
            values.push(timestamp);
        }

        values.push(messageId);
        await query(
            `UPDATE whatsapp_logs SET ${fields.join(', ')} WHERE wa_message_id = $${values.length}`,
            values,
        );
        return true;
    }
}

module.exports = new WhatsAppService();

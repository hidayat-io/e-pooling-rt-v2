const whatsappService = require('../../services/whatsappService');
const whatsapp = require('../../config/whatsapp');
const reportService = require('../../services/reportService');
const { query } = require('../../config/pgPool');

/**
 * Controller: Admin WhatsApp Broadcast
 */
const adminWhatsappController = {
    /**
     * POST /api/v1/admin/whatsapp/broadcast
     */
    async broadcast(req, res, next) {
        try {
            const { filter = 'all' } = req.body;
            const result = await whatsappService.queueBroadcast(filter);
            reportService.logAudit(req.admin.id, 'BROADCAST_WA', 'whatsapp', null, { filter, ...result }, req.ip);
            return res.success(result, `${result.queued} pesan antri untuk dikirim`);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/admin/whatsapp/send-single
     */
    async sendSingle(req, res, next) {
        try {
            const { voter_id } = req.body;
            const result = await whatsappService.sendToVoter(voter_id);
            return res.success(result, result.success ? 'Pesan berhasil dikirim' : 'Pesan gagal dikirim');
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/whatsapp/logs
     */
    async getLogs(req, res, next) {
        try {
            const { page = 1, limit = 25, status = '', voter_id = null } = req.query;
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
                params.push(parseInt(voter_id, 10));
                where.push(`wl.voter_id = $${params.length}`);
            }
            const whereClause = `WHERE ${where.join(' AND ')}`;
            const countResult = await query(
                `SELECT COUNT(*)::int as total FROM whatsapp_logs wl ${whereClause}`,
                params,
            );
            const total = Number(countResult.rows?.[0]?.total || 0);
            const logsResult = await query(
                `
                SELECT wl.id, wl.voter_id, wl.phone, wl.status, wl.error_msg, wl.wa_message_id,
                       wl.sent_at, wl.delivered_at, wl.read_at, wl.created_at,
                       v.nama
                FROM whatsapp_logs wl
                LEFT JOIN voters v ON v.id = wl.voter_id
                ${whereClause}
                ORDER BY wl.created_at DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
                `,
                [...params, pageSize, offset],
            );
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
     * GET /api/v1/admin/whatsapp/status
     */
    async checkStatus(req, res, next) {
        try {
            const result = await whatsapp.checkStatus();
            return res.success(result);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/admin/whatsapp/template
     */
    async getTemplate(req, res, next) {
        try {
            const [tplResult, settingsResult] = await Promise.all([
                query("SELECT value FROM election_settings WHERE key = 'wa_message_template' LIMIT 1"),
                query(`
                  SELECT key, value
                  FROM election_settings
                  WHERE key IN ('election_name', 'election_period', 'pooling_end', 'voting_end')
                `),
            ]);
            const row = tplResult.rows?.[0];
            const settings = {};
            (settingsResult.rows || []).forEach((s) => { settings[s.key] = s.value; });
            return res.success({
                template: row?.value || '',
                placeholders: ['{nama}', '{election_name}', '{election_period}', '{link}', '{kode_unik}', '{batas_pooling}', '{kontak_panitia}'],
                settings: {
                    election_name: settings.election_name,
                    election_period: settings.election_period,
                    pooling_end: settings.pooling_end || settings.voting_end,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /api/v1/admin/whatsapp/template
     */
    async updateTemplate(req, res, next) {
        try {
            const { template } = req.body;
            if (!template) return res.error('Template tidak boleh kosong', 'INVALID', 400);
            await query(
                "UPDATE election_settings SET value = $1, updated_at = NOW() WHERE key = 'wa_message_template'",
                [template],
            );
            reportService.logAudit(req.admin.id, 'UPDATE_WA_TEMPLATE', 'settings', null, {}, req.ip);
            return res.success({ template }, 'Template berhasil disimpan');
        } catch (error) {
            next(error);
        }
    },
};

module.exports = adminWhatsappController;

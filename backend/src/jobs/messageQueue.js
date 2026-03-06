const cron = require('node-cron');
const { query } = require('../config/pgPool');
const whatsapp = require('../config/whatsapp');
const logger = require('../config/logger');
const tokenService = require('../services/tokenService');
const whatsappService = require('../services/whatsappService');
const { getWaQueueConfig, getRandomMessageDelayMs } = require('../utils/waQueueConfig');

let isProcessing = false;

/**
 * Proses max WA rate-limit pending WhatsApp messages.
 * Aman dipanggil dari cron lokal maupun HTTP trigger (Cloud Scheduler).
 */
async function processPendingMessages() {
    if (isProcessing) {
        return {
            processed: 0,
            skipped: true,
            reason: 'already_processing',
        };
    }

    isProcessing = true;
    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
        const settings = await whatsappService.getSettings();
        const queueConfig = getWaQueueConfig(settings);

        const pendingResult = await query(
            `
              SELECT wl.id, wl.voter_id, wl.phone, v.nama, v.rt, v.rw
              FROM whatsapp_logs wl
              LEFT JOIN voters v ON v.id = wl.voter_id
              WHERE wl.status = 'pending'
              ORDER BY wl.created_at ASC
              LIMIT $1
            `,
            [queueConfig.rateLimit],
        );
        const pendingMessages = pendingResult.rows || [];

        if (pendingMessages.length === 0) {
            return {
                processed: 0,
                sent: 0,
                failed: 0,
                pending: 0,
            };
        }

        logger.info(
            `Processing ${pendingMessages.length} pending WA messages (rate_limit=${queueConfig.rateLimit}, delay_ms=${queueConfig.messageDelayMs}, jitter_ms=${queueConfig.messageJitterMs})`,
        );
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        for (let index = 0; index < pendingMessages.length; index += 1) {
            const msg = pendingMessages[index];
            try {
                let tokenData = await tokenService.getActiveTokenForVoter(msg.voter_id);
                if (!tokenData) {
                    const gen = await tokenService.generateForVoter(msg.voter_id);
                    if (!gen.skipped) {
                        tokenData = await tokenService.getActiveTokenForVoter(msg.voter_id);
                    }
                }

                if (!tokenData) {
                    await query(
                        `UPDATE whatsapp_logs SET status = 'failed', error_msg = 'No active token' WHERE id = $1`,
                        [msg.id],
                    );
                    failed += 1;
                    processed += 1;
                    continue;
                }

                const loginCode = tokenData.login_code || await tokenService.ensureLoginCodeForToken(tokenData.id);
                const message = whatsappService.buildMessage(msg, frontendUrl, loginCode, tokenData.expired_at, settings);

                const result = await whatsapp.sendMessage(msg.phone, message);

                if (result.success) {
                    await query(
                        `
                          UPDATE whatsapp_logs
                          SET status = 'sent', wa_message_id = $1, sent_at = NOW()
                          WHERE id = $2
                        `,
                        [result.messageId || null, msg.id],
                    );
                    sent += 1;
                } else {
                    await query(
                        `
                          UPDATE whatsapp_logs
                          SET status = 'failed', error_msg = $1
                          WHERE id = $2
                        `,
                        [result.error || 'Unknown WA error', msg.id],
                    );
                    failed += 1;
                }

                processed += 1;
            } catch (msgError) {
                logger.error(`Failed to process message ${msg.id}:`, msgError);
                await query(
                    'UPDATE whatsapp_logs SET status = $1, error_msg = $2 WHERE id = $3',
                    ['failed', msgError.message || 'Unknown queue error', msg.id],
                );
                failed += 1;
                processed += 1;
            }

            // Beri jeda antar pesan agar tidak terdeteksi spam oleh provider/WA.
            if (index < pendingMessages.length - 1) {
                const delayMs = getRandomMessageDelayMs(queueConfig);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        const remainingResult = await query("SELECT COUNT(*)::int AS count FROM whatsapp_logs WHERE status = 'pending'");
        const pending = Number(remainingResult.rows?.[0]?.count || 0);

        return { processed, sent, failed, pending };
    } catch (error) {
        logger.error('Message queue error:', error);
        throw error;
    } finally {
        isProcessing = false;
    }
}

/**
 * Message Queue lokal (development): proses setiap 5 detik
 */
function startMessageQueue() {
    cron.schedule('*/5 * * * * *', async () => {
        try {
            await processPendingMessages();
        } catch (error) {
            logger.error('Message queue scheduled run failed:', error);
        }
    });
    logger.info('📤 Message queue started (every 5 seconds)');
}

module.exports = { startMessageQueue, processPendingMessages };

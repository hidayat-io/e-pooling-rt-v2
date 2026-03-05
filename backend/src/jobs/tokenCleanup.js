const cron = require('node-cron');
const { query } = require('../config/pgPool');
const logger = require('../config/logger');

/**
 * Token Cleanup Job
 * Hapus expired tokens yang sudah tidak terpakai
 * Berjalan setiap hari jam 2 pagi
 */
async function runTokenCleanup() {
    try {
        // Hapus tokens yang expired DAN sudah used
        const result = await query(`
          DELETE FROM voter_tokens
          WHERE is_used = 1
            AND expired_at < NOW() - INTERVAL '7 days'
        `);
        logger.info(`Token cleanup: ${result.rowCount || 0} expired tokens removed`);
        return { deleted: result.rowCount || 0 };
    } catch (error) {
        logger.error('Token cleanup error:', error);
        throw error;
    }
}

function startTokenCleanup() {
    cron.schedule('0 2 * * *', async () => {
        try {
            await runTokenCleanup();
        } catch (error) {
            logger.error('Token cleanup scheduled run failed:', error);
        }
    });
    logger.info('🧹 Token cleanup scheduled (daily at 02:00)');
}

module.exports = { startTokenCleanup, runTokenCleanup };

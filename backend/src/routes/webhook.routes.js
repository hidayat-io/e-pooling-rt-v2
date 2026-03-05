const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const logger = require('../config/logger');

/**
 * POST /api/v1/whatsapp/webhook
 * Menerima delivery status dari WhatsApp gateway (Fonnte)
 * Tidak memerlukan auth, tapi verifikasi signature
 */
router.post('/', async (req, res) => {
    try {
        const { id, status, timestamp } = req.body;

        // Verifikasi webhook secret (basic)
        const webhookSecret = process.env.WA_WEBHOOK_SECRET;
        if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
            logger.warn('Webhook request dengan secret tidak valid');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!id || !status) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const updated = await whatsappService.updateFromWebhook(id, status, timestamp || new Date().toISOString());

        if (updated) {
            logger.info(`Webhook: message ${id} status → ${status}`);
        }

        return res.json({ success: true });
    } catch (error) {
        logger.error('Webhook error:', error);
        return res.status(500).json({ message: 'Internal error' });
    }
});

module.exports = router;

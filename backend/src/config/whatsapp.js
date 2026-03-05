const axios = require('axios');
const logger = require('./logger');

/**
 * Kirim pesan WhatsApp via WA.IO Gateway
 * Env vars dibaca dinamis setiap call agar perubahan .env langsung berlaku
 */
async function sendMessage(phone, message) {
    const apiUrl = process.env.WA_API_URL || 'https://wa.indoomega.my.id/api/v1';
    const apiKey = process.env.WA_API_KEY || '';

    try {
        if (!apiKey) {
            logger.warn('WA_API_KEY belum dikonfigurasi, pesan tidak terkirim');
            return { success: false, error: 'API key not configured' };
        }

        const response = await axios.post(
            `${apiUrl}/messages/send`,
            { to: phone, message },
            {
                headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        logger.info(`WA terkirim ke ${phone.slice(0, 6)}xxx`, {
            status: response.data.status,
            messageId: response.data.message_id,
        });

        return {
            success: response.data.success === true,
            messageId: response.data.message_id || null,
            detail: response.data,
        };
    } catch (error) {
        logger.error(`Gagal kirim WA ke ${phone.slice(0, 6)}xxx`, { error: error.message });
        return { success: false, error: error.message };
    }
}

/**
 * Cek status koneksi WhatsApp gateway
 */
async function checkStatus() {
    const apiUrl = process.env.WA_API_URL || 'https://wa.indoomega.my.id/api/v1';
    const apiKey = process.env.WA_API_KEY || '';

    try {
        if (!apiKey) return { connected: false, reason: 'API key not configured' };

        const response = await axios.get(`${apiUrl}/devices`, {
            headers: { 'X-API-Key': apiKey },
            timeout: 10000,
        });

        const devices = response.data?.devices || response.data || [];
        const connected = Array.isArray(devices) ? devices.some((d) => d.status === 'connected') : false;

        return { connected, detail: response.data };
    } catch (error) {
        return { connected: false, reason: error.message };
    }
}

module.exports = { sendMessage, checkStatus };

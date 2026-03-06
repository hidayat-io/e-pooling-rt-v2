function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readConfigValue(overrides, settingKey, envKey) {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, settingKey)) {
        return overrides[settingKey];
    }
    return process.env[envKey];
}

function getWaQueueConfig(overrides = null) {
    const defaultQueueRunEverySeconds = process.env.ENABLE_LOCAL_CRON === 'true' ? 5 : 60;

    return {
        rateLimit: parsePositiveInt(readConfigValue(overrides, 'wa_rate_limit', 'WA_RATE_LIMIT'), 20),
        messageDelayMs: parsePositiveInt(readConfigValue(overrides, 'wa_message_delay_ms', 'WA_MESSAGE_DELAY_MS'), 20000),
        messageJitterMs: parseNonNegativeInt(readConfigValue(overrides, 'wa_message_jitter_ms', 'WA_MESSAGE_JITTER_MS'), 0),
        // Cloud Scheduler biasanya jalan tiap 60 detik.
        queueRunEverySeconds: parsePositiveInt(
            readConfigValue(overrides, 'wa_queue_run_every_seconds', 'WA_QUEUE_RUN_EVERY_SECONDS'),
            defaultQueueRunEverySeconds,
        ),
    };
}

function getRandomMessageDelayMs(config = getWaQueueConfig()) {
    if (config.messageJitterMs <= 0) return config.messageDelayMs;
    const minDelay = Math.max(1, config.messageDelayMs - config.messageJitterMs);
    const maxDelay = config.messageDelayMs + config.messageJitterMs;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
}

function estimateBroadcastSeconds(totalMessages, config = getWaQueueConfig()) {
    if (!Number.isFinite(totalMessages) || totalMessages <= 0) return 0;

    const byBatch = config.rateLimit / config.queueRunEverySeconds; // msg / detik
    const byDelay = 1000 / config.messageDelayMs; // msg / detik
    const throughput = Math.min(byBatch, byDelay);

    if (!Number.isFinite(throughput) || throughput <= 0) return 0;
    return Math.ceil(totalMessages / throughput);
}

module.exports = {
    getWaQueueConfig,
    getRandomMessageDelayMs,
    estimateBroadcastSeconds,
};

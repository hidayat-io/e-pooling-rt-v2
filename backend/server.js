require('dotenv').config();
const app = require('./src/app');
const { initDatabase, closeDb } = require('./src/config/database');
const { startMessageQueue } = require('./src/jobs/messageQueue');
const { startTokenCleanup } = require('./src/jobs/tokenCleanup');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3000;
const ENABLE_LOCAL_CRON = process.env.ENABLE_LOCAL_CRON === 'true';

// Inisialisasi database
initDatabase();

// Start background jobs only for local/dev mode.
if (ENABLE_LOCAL_CRON) {
    startMessageQueue();
    startTokenCleanup();
} else {
    logger.info('⏸️ Local cron disabled (use Cloud Scheduler trigger in production)');
}

// Start server
const server = app.listen(PORT, () => {
    logger.info(`🚀 E-Pooling RT Backend berjalan di port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        closeDb();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down...');
    server.close(() => {
        closeDb();
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    closeDb();
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
});

const winston = require('winston');
const path = require('path');
require('dotenv').config();

const LOG_DIR = process.env.LOG_DIR || './logs';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'e-pooling-rt' },
    transports: [
        // Error logs ke file terpisah
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Semua logs ke combined file
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
});

// Di development, tambahkan console output yang readable
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 1
                        ? ` ${JSON.stringify(meta)}`
                        : '';
                    return `${timestamp} [${level}]: ${message}${metaStr}`;
                })
            ),
        })
    );
}

module.exports = logger;

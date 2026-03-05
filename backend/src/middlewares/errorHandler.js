const logger = require('../config/logger');
const { AppError } = require('../utils/response');

/**
 * Global Error Handler Middleware
 * Tangani semua error yang tidak di-catch di controller
 */
function errorHandler(err, req, res, next) {
    // Log error
    logger.error(err.message, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });

    // AppError — error yang kita definisikan sendiri
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            error: err.errorCode,
            details: err.details || undefined,
        });
    }

    // Zod validation error
    if (err.name === 'ZodError') {
        const details = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        return res.status(400).json({
            success: false,
            message: 'Data yang dikirim tidak valid',
            error: 'VALIDATION_ERROR',
            details,
        });
    }

    // Multer error (file upload)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: `Ukuran file terlalu besar (maks ${process.env.MAX_FILE_SIZE_MB || 2}MB)`,
            error: 'FILE_TOO_LARGE',
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Field upload tidak sesuai',
            error: 'INVALID_UPLOAD',
        });
    }

    // DB unique violation (SQLite/PostgreSQL)
    if (
        err.message
        && (
            err.message.includes('UNIQUE constraint failed')
            || err.message.includes('duplicate key value violates unique constraint')
        )
    ) {
        return res.status(409).json({
            success: false,
            message: 'Data sudah ada atau duplikat',
            error: 'DUPLICATE_ENTRY',
        });
    }

    // Default: Internal Server Error
    // JANGAN kirim stack trace di production
    const isProduction = process.env.NODE_ENV === 'production';
    return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: 'INTERNAL_ERROR',
        ...(isProduction ? {} : { details: err.message }),
    });
}

module.exports = errorHandler;

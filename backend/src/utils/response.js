/**
 * Standard API Response Helper
 * Semua endpoint WAJIB menggunakan format ini
 */

/**
 * Extend Express response dengan helper methods
 */
function setupResponseHelpers(req, res, next) {
    // Response sukses
    res.success = (data = null, message = 'Berhasil', meta = null) => {
        const response = {
            success: true,
            message,
            data,
        };
        if (meta) response.meta = meta;
        return res.json(response);
    };

    // Response sukses dengan status code custom
    res.successWithCode = (statusCode, data = null, message = 'Berhasil', meta = null) => {
        const response = {
            success: true,
            message,
            data,
        };
        if (meta) response.meta = meta;
        return res.status(statusCode).json(response);
    };

    // Response error
    res.error = (message = 'Terjadi kesalahan', errorCode = 'UNKNOWN_ERROR', statusCode = 400, details = null) => {
        const response = {
            success: false,
            message,
            error: errorCode,
        };
        if (details) response.details = details;
        return res.status(statusCode).json(response);
    };

    next();
}

/**
 * Custom AppError class untuk error handling yang lebih baik
 */
class AppError extends Error {
    constructor(errorCode, message, statusCode = 400, details = null) {
        super(message);
        this.name = 'AppError';
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.details = details;
    }
}

module.exports = { setupResponseHelpers, AppError };

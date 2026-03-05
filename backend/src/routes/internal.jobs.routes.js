const express = require('express');
const { processPendingMessages } = require('../jobs/messageQueue');
const { runTokenCleanup } = require('../jobs/tokenCleanup');

const router = express.Router();

function verifyJobSecret(req, res, next) {
    const configuredSecret = process.env.INTERNAL_JOB_SECRET;
    if (!configuredSecret) {
        return res.status(503).json({
            success: false,
            message: 'INTERNAL_JOB_SECRET belum dikonfigurasi',
            error: 'JOB_SECRET_NOT_CONFIGURED',
        });
    }

    const providedSecret = req.header('x-job-secret');
    if (!providedSecret || providedSecret !== configuredSecret) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized internal job trigger',
            error: 'UNAUTHORIZED_JOB_TRIGGER',
        });
    }

    return next();
}

router.post('/wa-queue', verifyJobSecret, async (req, res, next) => {
    try {
        const result = await processPendingMessages();
        return res.json({
            success: true,
            message: 'WA queue batch processed',
            data: result,
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/token-cleanup', verifyJobSecret, async (req, res, next) => {
    try {
        const result = await runTokenCleanup();
        return res.json({
            success: true,
            message: 'Token cleanup done',
            data: result,
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;

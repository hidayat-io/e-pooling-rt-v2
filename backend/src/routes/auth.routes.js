const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const voterAuth = require('../middlewares/voterAuth');
const { authLimiter } = require('../middlewares/rateLimiter');
const { validate, schemas } = require('../middlewares/validator');

// Admin login
router.post('/admin/login', authLimiter, validate(schemas.adminLogin), authController.adminLogin);
router.post('/admin/logout', authController.adminLogout);

// Voter magic link verification
router.get('/verify-token/:token', authLimiter, authController.verifyVoterToken);
router.post('/verify-code', authLimiter, validate(schemas.voterCode), authController.verifyVoterCode);

// Voter profile (requires voter JWT)
router.get('/voter/me', voterAuth, authController.getVoterProfile);

module.exports = router;

const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const voterAuth = require('../middlewares/voterAuth');
const { voteLimiter } = require('../middlewares/rateLimiter');
const { validate, schemas } = require('../middlewares/validator');

// Submit vote
router.post('/votes', voterAuth, voteLimiter, validate(schemas.vote), voterController.submitVote);

// Check voting status
router.get('/votes/my-status', voterAuth, voterController.myStatus);

module.exports = router;

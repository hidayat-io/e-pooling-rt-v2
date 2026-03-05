const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { cacheResponse } = require('../middlewares/responseCache');

// Kandidat
router.get('/candidates', cacheResponse(60), publicController.getCandidates);
router.get('/candidates/:id', cacheResponse(120), publicController.getCandidateById);

// Hasil voting
router.get('/results', cacheResponse(5), publicController.getResults);

// Statistik publik
router.get('/stats/public', cacheResponse(5), publicController.getPublicStats);

// Pengumuman
router.get('/announcements', cacheResponse(60), publicController.getAnnouncements);

// Settings publik
router.get('/settings/public', cacheResponse(60), publicController.getPublicSettings);

module.exports = router;

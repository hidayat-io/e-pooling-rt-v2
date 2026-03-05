const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const { validate, schemas } = require('../../middlewares/validator');

// Dashboard
router.get('/dashboard', dashboardController.getDashboard);

// Monitoring
router.get('/monitoring', dashboardController.getMonitoring);

// Detailed results
router.get('/results/detailed', dashboardController.getDetailedResults);

// Export report
router.post('/reports/export', dashboardController.exportReport);
router.get('/reports/voters', dashboardController.getVoterChoicesReport);
router.get('/reports/voters/export', dashboardController.exportVoterChoicesReport);

// Settings
router.get('/settings', dashboardController.getSettings);
router.put('/settings', validate(schemas.settingsUpdate), dashboardController.updateSettings);
router.post('/settings/reset-pooling', dashboardController.resetPooling);

// Audit logs
router.get('/logs/audit', dashboardController.getAuditLogs);

// Traffic logs
router.get('/logs/traffic', dashboardController.getTrafficLogs);

module.exports = router;

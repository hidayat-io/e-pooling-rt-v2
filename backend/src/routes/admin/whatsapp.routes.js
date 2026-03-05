const express = require('express');
const router = express.Router();
const whatsappController = require('../../controllers/admin/whatsappController');
const { validate, schemas } = require('../../middlewares/validator');

// Broadcast
router.post('/broadcast', validate(schemas.broadcast), whatsappController.broadcast);

// Send single
router.post('/send-single', validate(schemas.singleWa), whatsappController.sendSingle);

// Logs
router.get('/logs', whatsappController.getLogs);

// Status
router.get('/status', whatsappController.checkStatus);

// Template
router.get('/template', whatsappController.getTemplate);
router.put('/template', whatsappController.updateTemplate);

module.exports = router;

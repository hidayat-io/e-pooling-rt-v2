const express = require('express');
const router = express.Router();
const candidatesController = require('../../controllers/admin/candidatesController');
const { validate, schemas } = require('../../middlewares/validator');

// Create candidate
router.post('/', validate(schemas.candidate), candidatesController.create);

// Update candidate
router.put('/:id', validate(schemas.candidateUpdate), candidatesController.update);

// Delete candidate
router.delete('/:id', candidatesController.delete);

// Upload photo
router.post('/:id/photo', candidatesController.upload, candidatesController.uploadPhoto);

module.exports = router;

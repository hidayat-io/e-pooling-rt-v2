const express = require('express');
const router = express.Router();
const votersController = require('../../controllers/admin/votersController');
const { validate, schemas } = require('../../middlewares/validator');
const multer = require('multer');
const path = require('path');

// Multer untuk import Excel
const importUpload = multer({
    dest: path.join(process.env.UPLOAD_DIR || './uploads', 'temp'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB untuk Excel
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'text/csv',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipe file tidak didukung. Gunakan Excel (.xlsx, .xls) atau CSV.'), false);
        }
    },
});

// Import DPT
router.post('/import', importUpload.single('file'), votersController.importDPT);

// List voters
router.get('/', votersController.list);
router.post('/', validate(schemas.voterCreateAdmin), votersController.create);

// Impersonate link
router.post('/:id/impersonate-link', votersController.getImpersonateLink);

// Detail voter
router.get('/:id', votersController.detail);

// Update voter
router.put('/:id', validate(schemas.voterUpdate), votersController.update);

// Delete voter
router.delete('/:id', votersController.delete);

// Generate tokens
router.post('/generate-tokens', votersController.generateTokens);

module.exports = router;

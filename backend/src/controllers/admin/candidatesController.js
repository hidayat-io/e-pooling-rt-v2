const candidateService = require('../../services/candidateService');
const reportService = require('../../services/reportService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { hasCloudStorage, uploadCandidatePhoto } = require('../../config/storage');
const { invalidateCache } = require('../../middlewares/responseCache');

// Multer setup untuk foto kandidat
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipe file tidak didukung. Gunakan JPEG, PNG, atau WebP.'), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 2) * 1024 * 1024 },
});

/**
 * Controller: Admin Candidate Management
 */
const adminCandidatesController = {
    upload: upload.single('photo'),

    /**
     * POST /api/v1/admin/candidates
     */
    async create(req, res, next) {
        try {
            const candidate = await candidateService.create(req.body);
            reportService.logAudit(req.admin.id, 'CREATE_CANDIDATE', 'candidate', candidate.id, req.body, req.ip);
            invalidateCache(['/api/v1/candidates', '/api/v1/results', '/api/v1/stats/public']);
            return res.successWithCode(201, candidate, 'Kandidat berhasil ditambahkan');
        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /api/v1/admin/candidates/:id
     */
    async update(req, res, next) {
        try {
            const candidate = await candidateService.update(parseInt(req.params.id), req.body);
            reportService.logAudit(req.admin.id, 'UPDATE_CANDIDATE', 'candidate', parseInt(req.params.id), req.body, req.ip);
            invalidateCache(['/api/v1/candidates', '/api/v1/results', '/api/v1/stats/public']);
            return res.success(candidate, 'Kandidat berhasil diperbarui');
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/v1/admin/candidates/:id
     */
    async delete(req, res, next) {
        try {
            const result = await candidateService.delete(parseInt(req.params.id));
            reportService.logAudit(req.admin.id, 'DELETE_CANDIDATE', 'candidate', parseInt(req.params.id), result, req.ip);
            invalidateCache(['/api/v1/candidates', '/api/v1/results', '/api/v1/stats/public']);
            return res.success(result, result.deactivated ? 'Kandidat dinonaktifkan' : 'Kandidat berhasil dihapus');
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/admin/candidates/:id/photo
     */
    async uploadPhoto(req, res, next) {
        try {
            if (!req.file) {
                return res.error('File foto tidak ditemukan', 'NO_FILE', 400);
            }
            if (!req.file.buffer || req.file.buffer.length === 0 || Number(req.file.size || 0) === 0) {
                return res.error('File foto kosong atau gagal terbaca', 'EMPTY_FILE', 400);
            }

            let photoUrl = '';
            if (hasCloudStorage()) {
                const uploaded = await uploadCandidatePhoto(req.file, parseInt(req.params.id, 10));
                photoUrl = uploaded.publicUrl;
            } else {
                const ext = path.extname(req.file.originalname || '') || '.jpg';
                const filename = `candidate-${req.params.id}-${Date.now()}${ext}`;
                fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
                photoUrl = `/uploads/${filename}`;
            }

            const candidate = await candidateService.updatePhoto(parseInt(req.params.id), photoUrl);
            reportService.logAudit(req.admin.id, 'UPLOAD_PHOTO', 'candidate', parseInt(req.params.id), { photoUrl }, req.ip);
            invalidateCache(['/api/v1/candidates', '/api/v1/results', '/api/v1/stats/public']);

            return res.success(candidate, 'Foto kandidat berhasil diupload');
        } catch (error) {
            next(error);
        }
    },
};

module.exports = adminCandidatesController;

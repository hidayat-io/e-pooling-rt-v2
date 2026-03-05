const path = require('path');
const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

function getBucketName() {
    return (process.env.GCS_BUCKET_NAME || '').trim();
}

function hasCloudStorage() {
    return Boolean(getBucketName());
}

function getSafeExtension(originalName, mimeType) {
    const ext = (path.extname(originalName || '') || '').toLowerCase();
    if (ext && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;

    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    return '.jpg';
}

function encodeObjectPath(objectPath) {
    return String(objectPath)
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

function buildPublicUrl(bucketName, objectPath) {
    const customBase = (process.env.GCS_PUBLIC_BASE_URL || '').trim();
    const encodedPath = encodeObjectPath(objectPath);
    if (customBase) {
        return `${customBase.replace(/\/+$/, '')}/${encodedPath}`;
    }
    return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
}

async function uploadCandidatePhoto(file, candidateId) {
    const bucketName = getBucketName();
    if (!bucketName) {
        throw new Error('GCS_BUCKET_NAME belum dikonfigurasi');
    }

    const ext = getSafeExtension(file.originalname, file.mimetype);
    const random = crypto.randomBytes(6).toString('hex');
    const objectPath = `candidate-photos/${candidateId}/candidate-${candidateId}-${Date.now()}-${random}${ext}`;
    const bucket = storage.bucket(bucketName);
    const gcsFile = bucket.file(objectPath);

    await new Promise((resolve, reject) => {
        const stream = gcsFile.createWriteStream({
            resumable: false,
            metadata: {
                contentType: file.mimetype,
                cacheControl: 'public, max-age=31536000, immutable',
            },
        });
        stream.on('finish', resolve);
        stream.on('error', reject);
        stream.end(file.buffer);
    });

    return {
        bucketName,
        objectPath,
        publicUrl: buildPublicUrl(bucketName, objectPath),
    };
}

module.exports = {
    hasCloudStorage,
    uploadCandidatePhoto,
};

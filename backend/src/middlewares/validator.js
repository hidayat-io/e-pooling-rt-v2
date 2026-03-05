const { z } = require('zod');

/**
 * Middleware factory: Validasi request body menggunakan Zod schema
 * @param {z.ZodSchema} schema - Zod schema untuk validasi
 * @param {string} source - Sumber data: 'body' | 'query' | 'params'
 */
function validate(schema, source = 'body') {
    return (req, res, next) => {
        try {
            const data = schema.parse(req[source]);
            req[source] = data; // Replace dengan data yang sudah di-parse/transform
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const details = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                return res.status(400).json({
                    success: false,
                    message: 'Data yang dikirim tidak valid',
                    error: 'VALIDATION_ERROR',
                    details,
                });
            }
            next(error);
        }
    };
}

// ============================================
// Zod Schemas
// ============================================

const adminLoginSchema = z.object({
    username: z.string().min(3, 'Username minimal 3 karakter'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
});

const voterCodeSchema = z.object({
    code: z.string().regex(/^\d{4}$/, 'Kode harus 4 digit angka'),
});

const voteSchema = z.object({
    candidate_id: z.number().int().positive('candidate_id harus angka positif'),
    choice: z.enum(['setuju', 'tidak_setuju']).default('setuju'),
});

const voterSchema = z.object({
    nik: z.string().length(16, 'NIK harus 16 digit'),
    nama: z.string().min(2, 'Nama minimal 2 karakter'),
    phone: z.string().min(10, 'Nomor HP minimal 10 digit'),
    rt: z.string().min(1).max(3).default('05'),
    rw: z.string().min(1).max(3).default('02'),
    alamat: z.string().optional().nullable(),
});

const voterUpdateSchema = z.object({
    nik: z.string().length(16, 'NIK harus 16 digit').optional(),
    nama: z.string().min(2, 'Nama minimal 2 karakter').optional(),
    phone: z.string().min(10, 'Nomor HP minimal 10 digit').optional(),
    rt: z.string().min(1).max(3).optional(),
    rw: z.string().min(1).max(3).optional(),
    alamat: z.string().optional().nullable(),
});

const voterCreateAdminSchema = z.object({
    no_rumah: z.string().min(1, 'No.Rumah wajib diisi'),
    nama: z.string().min(2, 'Nama minimal 2 karakter'),
    phone: z.string().min(10, 'Nomor HP minimal 10 digit'),
});

const candidateSchema = z.object({
    nomor_urut: z.number().int().positive('Nomor urut harus angka positif'),
    nama: z.string().min(2, 'Nama minimal 2 karakter'),
    tagline: z.string().optional().nullable(),
    visi: z.string().optional().nullable(),
    misi: z.string().optional().nullable(),
    biodata: z.string().optional().nullable(),
    is_petahana: z.number().int().min(0).max(1).default(0),
});

const candidateUpdateSchema = z.object({
    nomor_urut: z.number().int().positive('Nomor urut harus angka positif').optional(),
    nama: z.string().min(2, 'Nama minimal 2 karakter').optional(),
    tagline: z.string().optional().nullable(),
    visi: z.string().optional().nullable(),
    misi: z.string().optional().nullable(),
    biodata: z.string().optional().nullable(),
    is_petahana: z.number().int().min(0).max(1).optional(),
    is_active: z.number().int().min(0).max(1).optional(),
});

const settingsUpdateSchema = z.object({
    settings: z.array(
        z.object({
            key: z.string(),
            value: z.string(),
        })
    ),
});

const broadcastSchema = z.object({
    filter: z.enum(['all', 'no_wa', 'wa_failed', 'not_voted']).default('all'),
    message_template: z.string().optional(),
});

const singleWaSchema = z.object({
    voter_id: z.coerce.number().int().positive(),
});

const announcementSchema = z.object({
    type: z.enum(['info', 'kegiatan', 'penting']).default('info'),
    title: z.string().min(2, 'Judul minimal 2 karakter'),
    content: z.string().optional().nullable(),
    icon_url: z.string().optional().nullable(),
    expires_at: z.string().optional().nullable(),
    is_active: z.number().int().min(0).max(1).default(1),
});

module.exports = {
    validate,
    schemas: {
        adminLogin: adminLoginSchema,
        voterCode: voterCodeSchema,
        vote: voteSchema,
        voter: voterSchema,
        voterUpdate: voterUpdateSchema,
        voterCreateAdmin: voterCreateAdminSchema,
        candidate: candidateSchema,
        candidateUpdate: candidateUpdateSchema,
        settingsUpdate: settingsUpdateSchema,
        broadcast: broadcastSchema,
        singleWa: singleWaSchema,
        announcement: announcementSchema,
    },
};

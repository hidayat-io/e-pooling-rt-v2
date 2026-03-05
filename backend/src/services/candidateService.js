const { query } = require('../config/pgPool');
const { AppError } = require('../utils/response');

/**
 * Service untuk manajemen kandidat
 */
class CandidateService {
    async findAllActive() {
        const result = await query(`
          SELECT id, nomor_urut, nama, photo_url, tagline, visi, misi, biodata, is_petahana
          FROM candidates
          WHERE is_active = 1
          ORDER BY nomor_urut ASC
        `);
        return result.rows || [];
    }

    async findAll() {
        const result = await query(`
          SELECT id, nomor_urut, nama, photo_url, tagline, visi, misi, biodata, is_petahana, is_active, created_at
          FROM candidates
          ORDER BY nomor_urut ASC
        `);
        return result.rows || [];
    }

    async findById(id) {
        const result = await query(`
          SELECT id, nomor_urut, nama, photo_url, tagline, visi, misi, biodata, is_petahana, is_active, created_at
          FROM candidates
          WHERE id = $1
          LIMIT 1
        `, [id]);

        const candidate = result.rows?.[0];
        if (!candidate) throw new AppError('NOT_FOUND', 'Kandidat tidak ditemukan', 404);
        return candidate;
    }

    async create(data) {
        const existing = await query(
            'SELECT id FROM candidates WHERE nomor_urut = $1 LIMIT 1',
            [data.nomor_urut],
        );
        if (existing.rows?.[0]) {
            throw new AppError('DUPLICATE_NOMOR_URUT', 'Nomor urut sudah digunakan', 409);
        }

        const insertResult = await query(`
          INSERT INTO candidates (nomor_urut, nama, tagline, visi, misi, biodata, is_petahana)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
            data.nomor_urut,
            data.nama,
            data.tagline || null,
            data.visi || null,
            data.misi || null,
            data.biodata || null,
            data.is_petahana || 0,
        ]);

        return this.findById(insertResult.rows[0].id);
    }

    async update(id, data) {
        await this.findById(id);

        const fields = [];
        const values = [];

        if (data.nomor_urut !== undefined) {
            const existing = await query(
                'SELECT id FROM candidates WHERE nomor_urut = $1 AND id != $2 LIMIT 1',
                [data.nomor_urut, id],
            );
            if (existing.rows?.[0]) {
                throw new AppError('DUPLICATE_NOMOR_URUT', 'Nomor urut sudah digunakan', 409);
            }
            values.push(data.nomor_urut);
            fields.push(`nomor_urut = $${values.length}`);
        }
        if (data.nama !== undefined) { values.push(data.nama); fields.push(`nama = $${values.length}`); }
        if (data.tagline !== undefined) { values.push(data.tagline); fields.push(`tagline = $${values.length}`); }
        if (data.visi !== undefined) { values.push(data.visi); fields.push(`visi = $${values.length}`); }
        if (data.misi !== undefined) { values.push(data.misi); fields.push(`misi = $${values.length}`); }
        if (data.biodata !== undefined) { values.push(data.biodata); fields.push(`biodata = $${values.length}`); }
        if (data.is_petahana !== undefined) { values.push(data.is_petahana); fields.push(`is_petahana = $${values.length}`); }
        if (data.is_active !== undefined) { values.push(data.is_active); fields.push(`is_active = $${values.length}`); }

        if (fields.length === 0) {
            throw new AppError('NO_CHANGES', 'Tidak ada data yang diubah', 400);
        }

        values.push(id);
        await query(
            `UPDATE candidates SET ${fields.join(', ')} WHERE id = $${values.length}`,
            values,
        );

        return this.findById(id);
    }

    async updatePhoto(id, photoUrl) {
        await this.findById(id);
        await query('UPDATE candidates SET photo_url = $1 WHERE id = $2', [photoUrl, id]);
        return this.findById(id);
    }

    async delete(id) {
        await this.findById(id);

        const voteResult = await query(
            'SELECT COUNT(*)::int AS count FROM votes WHERE candidate_id = $1',
            [id],
        );
        const hasVotes = Number(voteResult.rows?.[0]?.count || 0);
        if (hasVotes > 0) {
            await query('UPDATE candidates SET is_active = 0 WHERE id = $1', [id]);
            return { deleted: false, deactivated: true, message: 'Kandidat dinonaktifkan karena sudah memiliki suara' };
        }

        await query('DELETE FROM candidates WHERE id = $1', [id]);
        return { deleted: true, deactivated: false };
    }

    async getNextNomorUrut() {
        const result = await query('SELECT COALESCE(MAX(nomor_urut), 0)::int as max_nomor FROM candidates');
        return Number(result.rows?.[0]?.max_nomor || 0) + 1;
    }
}

module.exports = new CandidateService();

const XLSX = require('xlsx');
const logger = require('../config/logger');

/**
 * Parse file Excel/CSV DPT menjadi array data voter
 * Format kolom yang diharapkan: No.Rumah, Nama, No.WA
 *
 * @param {string} filePath - Path ke file Excel/CSV
 * @returns {{ data: Array, errors: Array, total: number }}
 */
function parseExcelDPT(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const data = [];
    const errors = [];

    rawData.forEach((row, index) => {
        const rowNum = index + 2; // +2 karena header di baris 1

        // Cari kolom yang sesuai (case-insensitive, flexible naming)
        const no_rumah = findValue(row, ['no.rumah', 'no rumah', 'no_rumah', 'nomor_rumah', 'nomor rumah', 'rumah']);
        const nama = findValue(row, ['nama', 'nama_lengkap', 'nama lengkap', 'name']);
        const phone = normalizePhone(findValue(row, ['no.wa', 'no wa', 'no_wa', 'whatsapp', 'phone', 'no_hp', 'no hp', 'telepon', 'hp']));

        // Validasi baris
        const rowErrors = [];
        if (!no_rumah) rowErrors.push('No.Rumah kosong');
        if (!nama) rowErrors.push('Nama kosong');
        if (!phone) rowErrors.push('No.WA kosong');
        else if (phone.length < 10) rowErrors.push('No.WA terlalu pendek');

        if (rowErrors.length > 0) {
            errors.push({ row: rowNum, nama: nama || '-', errors: rowErrors });
        } else {
            data.push({
                nik: String(no_rumah).trim(),
                nama: String(nama).trim(),
                phone: String(phone).trim(),
                rt: '05',
                rw: '02',
                alamat: null,
            });
        }
    });

    logger.info(`Excel parsed: ${data.length} valid, ${errors.length} errors dari ${rawData.length} baris`);

    return { data, errors, total: rawData.length };
}

/**
 * Cari value dari row berdasarkan kemungkinan nama kolom
 */
function findValue(row, possibleKeys) {
    for (const key of possibleKeys) {
        // Cek exact match (case-insensitive)
        for (const rowKey of Object.keys(row)) {
            if (rowKey.toLowerCase().trim() === key.toLowerCase()) {
                return row[rowKey];
            }
        }
    }
    return '';
}

/**
 * Normalisasi nomor telepon ke format 628xxx
 */
function normalizePhone(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[\s\-\(\)\+]/g, '');

    // Hapus prefix 0 dan ganti dengan 62
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    }
    // Jika belum ada prefix 62
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }

    return cleaned;
}

module.exports = { parseExcelDPT, normalizePhone };

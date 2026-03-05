/**
 * Utility untuk masking data sensitif
 * NIK dan phone number di-mask sebelum dikirim ke frontend
 */

/**
 * Mask NIK: tampilkan 4 karakter pertama dan 4 terakhir
 * Contoh: 3201xxxx5678 → 3201xxxx5678
 */
function maskNik(nik) {
    if (!nik || nik.length < 8) return 'xxxx';
    return nik.slice(0, 4) + 'xxxx' + nik.slice(-4);
}

/**
 * Mask nomor telepon: tampilkan 4 digit pertama dan 3 terakhir
 * Contoh: 628123456789 → 6281xxxxx789
 */
function maskPhone(phone) {
    if (!phone || phone.length < 7) return 'xxxxx';
    return phone.slice(0, 4) + 'xxxxx' + phone.slice(-3);
}

/**
 * Mask nama: tampilkan huruf pertama tiap kata + ***
 * Hanya digunakan di log, BUKAN di halaman voter
 */
function maskNama(nama) {
    if (!nama) return '***';
    return nama
        .split(' ')
        .map((word) => word[0] + '***')
        .join(' ');
}

module.exports = { maskNik, maskPhone, maskNama };

const bcrypt = require('bcryptjs');
const { initDatabase, getDb, closeDb } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

/**
 * Seed Script
 * Jalankan: npm run seed
 * Membuat admin default + kandidat sample + pengumuman
 */
async function seed() {
    console.log('🌱 Memulai seeding database...\n');

    const db = initDatabase();

    // ============================================
    // 1. Seed Admin Default
    // ============================================
    console.log('👤 Membuat admin default...');
    const adminPassword = await bcrypt.hash('admin123', 12);

    const insertAdmin = db.prepare(`
    INSERT OR IGNORE INTO admin_users (username, password, nama, role)
    VALUES (?, ?, ?, ?)
  `);

    insertAdmin.run('admin', adminPassword, 'Administrator', 'superadmin');
    insertAdmin.run('panitia', await bcrypt.hash('panitia123', 12), 'Panitia Pemilihan', 'admin');

    console.log('  ✅ Admin: admin / admin123');
    console.log('  ✅ Admin: panitia / panitia123\n');

    // ============================================
    // 2. Seed Kandidat Sample
    // ============================================
    console.log('🏛️ Membuat kandidat sample...');
    const insertCandidate = db.prepare(`
    INSERT OR IGNORE INTO candidates (nomor_urut, nama, tagline, visi, misi, biodata, is_petahana)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    const candidates = [
        {
            nomor_urut: 1,
            nama: 'Bpk. Budi Santoso, S.T',
            tagline: 'Bersama mewujudkan lingkungan yang aman, bersih, dan guyub rukun.',
            visi: 'Menjadikan RT 05 sebagai kawasan hunian yang aman, asri, dan penuh kekeluargaan.',
            misi: 'Meningkatkan sistem keamanan lingkungan\nMemperindah taman dan fasilitas umum\nMembuat program sosial untuk warga kurang mampu\nDigitalisasi administrasi RT',
            biodata: JSON.stringify({ no_rumah: '15A' }),
            is_petahana: 1,
        },
    ];

    for (const c of candidates) {
        insertCandidate.run(c.nomor_urut, c.nama, c.tagline, c.visi, c.misi, c.biodata, c.is_petahana);
        console.log(`  ✅ Kandidat #${c.nomor_urut}: ${c.nama}`);
    }
    console.log('');

    // ============================================
    // 3. Seed Voter Sample
    // ============================================
    console.log('🗳️ Membuat voter sample...');
    const insertVoter = db.prepare(`
    INSERT OR IGNORE INTO voters (nik, nama, phone, rt, rw, alamat)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const voters = [
        { no_rumah: '01', nama: 'Ahmad Ridwan', phone: '6281234567001' },
        { no_rumah: '02', nama: 'Siti Nurhaliza', phone: '6281234567002' },
        { no_rumah: '03', nama: 'Bambang Wijaya', phone: '6281234567003' },
        { no_rumah: '04', nama: 'Dewi Sartika', phone: '6281234567004' },
        { no_rumah: '05', nama: 'Eko Prasetyo', phone: '6281234567005' },
        { no_rumah: '06', nama: 'Fitri Handayani', phone: '6281234567006' },
        { no_rumah: '07', nama: 'Gunawan Hadi', phone: '6281234567007' },
        { no_rumah: '08', nama: 'Hesti Permatasari', phone: '6281234567008' },
        { no_rumah: '09', nama: 'Irfan Maulana', phone: '6281234567009' },
        { no_rumah: '10', nama: 'Jannah Ayu', phone: '6281234567010' },
    ];

    for (const v of voters) {
        insertVoter.run(v.no_rumah, v.nama, v.phone, '05', '02', null);
    }
    console.log(`  ✅ ${voters.length} voter sample ditambahkan\n`);

    // Update total DPT
    const { count } = db.prepare('SELECT COUNT(*) as count FROM voters').get();
    db.prepare("UPDATE election_settings SET value = ? WHERE key = 'total_dpt'").run(String(count));

    // ============================================
    // 4. Seed Pengumuman Sample
    // ============================================
    console.log('📢 Membuat pengumuman sample...');
    const insertAnnouncement = db.prepare(`
    INSERT OR IGNORE INTO announcements (type, title, content)
    VALUES (?, ?, ?)
  `);

    insertAnnouncement.run('penting', 'Jadwal Pemilihan', 'Pemilihan Ketua RT 05 akan dilaksanakan mulai tanggal 1 Januari 2025 hingga 31 Januari 2025. Pastikan Anda sudah terdaftar sebagai pemilih.');
    insertAnnouncement.run('info', 'Debat Kandidat', 'Debat calon Ketua RT 05 akan diadakan pada tanggal 28 Desember 2024 pukul 19:00 WIB di Balai Warga.');
    insertAnnouncement.run('kegiatan', 'Sosialisasi E-Pooling', 'Sosialisasi penggunaan sistem E-Pooling akan dilaksanakan tanggal 25 Desember 2024. Diharapkan kehadiran seluruh warga.');

    console.log('  ✅ 3 pengumuman sample ditambahkan\n');

    // ============================================
    // Done
    // ============================================
    console.log('✨ Seeding selesai!\n');
    console.log('Login admin:');
    console.log('  Username: admin');
    console.log('  Password: admin123\n');

    closeDb();
}

seed().catch((err) => {
    console.error('❌ Seeding gagal:', err);
    closeDb();
    process.exit(1);
});

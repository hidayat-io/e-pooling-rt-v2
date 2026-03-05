# Firestore Migration Plan (Agar Full Free-Tier Stabil)

Tujuan: mengganti SQLite lokal ke Firestore supaya backend Cloud Run tetap stateless dan data persisten.

## Koleksi yang disarankan

- `admin_users`
- `voters`
- `candidates`
- `votes`
- `voter_tokens`
- `whatsapp_logs`
- `election_settings` (lebih baik 1 dokumen `current`)
- `audit_logs`
- `announcements`

## Langkah migrasi bertahap

1. Buat repository layer (`src/repositories/*`) agar service tidak akses SQL langsung.
2. Implementasi adapter SQLite (sementara) dan Firestore (baru) di repository layer.
3. Tambah feature flag: `DATA_PROVIDER=sqlite|firestore`.
4. Jalankan dual-write untuk entitas non-kritis (misal `whatsapp_logs`) sampai valid.
5. Migrasi read path satu per satu ke Firestore.
6. Cutover penuh ke `DATA_PROVIDER=firestore`.
7. Hapus dependency `better-sqlite3` dan schema SQL.

## Prioritas entitas

1. `election_settings`, `candidates`, `announcements` (read-heavy, relatif mudah)
2. `voters`, `voter_tokens` (auth flow)
3. `votes` (kritikal, butuh transaksi/guard anti double vote)
4. `whatsapp_logs`, `audit_logs` (append-heavy)

## Catatan teknis penting

- Voting harus pakai transaksi Firestore (`runTransaction`) untuk mencegah double vote.
- Gunakan index komposit untuk query dashboard/report.
- Simpan timestamp dengan `FieldValue.serverTimestamp()`.
- Hindari query penuh tanpa limit/pagination untuk hemat kuota free tier.

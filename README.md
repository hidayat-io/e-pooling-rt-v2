# E-Pooling RT/RW

Aplikasi E-Pooling berbasis web untuk pemilihan/penjaringan warga RT/RW.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database: PostgreSQL (Neon)
- Hosting:
  - Frontend: Firebase Hosting
  - Backend API: Google Cloud Run

## Fitur Utama

- Login pemilih menggunakan kode unik 4 digit
- Alur pooling setuju / tidak setuju
- Panel admin (`/admin`) untuk:
  - kelola kandidat
  - kelola DPT
  - broadcast WhatsApp + history pengiriman
  - monitoring, laporan, export Excel
  - pengaturan pooling

## Struktur Project

- `frontend/` aplikasi web voter + admin
- `backend/` REST API + job internal
- `scripts/` helper script deployment/scheduler

## Jalankan di Local

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Default:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Deploy

Panduan lengkap ada di:

- [DEPLOY_GCP_FREE_TIER.md](./DEPLOY_GCP_FREE_TIER.md)
- [AI_AGENT_DEPLOY_RUNBOOK.md](./AI_AGENT_DEPLOY_RUNBOOK.md)
- [GITHUB_LOCAL_CLOUD_DEPLOY.md](./GITHUB_LOCAL_CLOUD_DEPLOY.md)

## Catatan Keamanan

- Jangan commit file `.env`, API key, service account key, atau secret lainnya.
- Cek `.gitignore` sebelum commit.

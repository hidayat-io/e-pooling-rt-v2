# AI Agent Deploy Runbook (Current State)

Dokumen ini adalah handover operasional untuk agent berikutnya.

## 1) Arsitektur yang aktif

- Frontend: Firebase Hosting
- Backend API: Cloud Run (`evoting-backend`, region `us-central1`)
- Database: Neon PostgreSQL (`DATABASE_URL`)
- Scheduler:
  - `evoting-wa-queue` (tiap 1 menit)
  - `evoting-token-cleanup` (harian 02:00 UTC)

## 2) Resource live saat dokumen ini dibuat

- Firebase URL: `https://iosoft-tech.web.app`
- Cloud Run URL: `https://evoting-backend-dy6cx3zinq-uc.a.run.app`
- GCP Project ID: `iosoft-tech`
- Cloud Run Service: `evoting-backend`

## 3) Konfigurasi backend penting

Wajib ada di Cloud Run env:
- `DATABASE_URL` (Neon)
- `PGSSLMODE=require`
- `ENABLE_LOCAL_CRON=false`
- `INTERNAL_JOB_SECRET`
- `FRONTEND_URL=https://iosoft-tech.web.app`
- `ALLOWED_ORIGINS=https://iosoft-tech.web.app`

Catatan:
- `app.set('trust proxy', 1)` sudah diset untuk Cloud Run.
- Endpoint internal scheduler:
  - `POST /api/v1/internal/jobs/wa-queue`
  - `POST /api/v1/internal/jobs/token-cleanup`
  - Header: `x-job-secret`

## 4) Command operasi cepat

Set project:

```bash
gcloud config set project iosoft-tech
```

Build & deploy backend:

```bash
gcloud builds submit --tag gcr.io/iosoft-tech/evoting-backend ./backend

gcloud run deploy evoting-backend \
  --image gcr.io/iosoft-tech/evoting-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1
```

Build & deploy frontend:

```bash
cd frontend
VITE_API_BASE_URL=https://evoting-backend-dy6cx3zinq-uc.a.run.app/api/v1 npm run build
cd ..
firebase deploy --only hosting --project iosoft-tech
```

Setup/update scheduler (manual karena helper script tidak tersedia):

```bash
gcloud scheduler jobs create http evoting-wa-queue \
  --location us-central1 \
  --schedule "*/1 * * * *" \
  --uri "https://evoting-backend-dy6cx3zinq-uc.a.run.app/api/v1/internal/jobs/wa-queue" \
  --http-method POST \
  --headers "x-job-secret=<INTERNAL_JOB_SECRET>" \
  || gcloud scheduler jobs update http evoting-wa-queue \
    --location us-central1 \
    --schedule "*/1 * * * *" \
    --uri "https://evoting-backend-dy6cx3zinq-uc.a.run.app/api/v1/internal/jobs/wa-queue" \
    --http-method POST \
    --update-headers "x-job-secret=<INTERNAL_JOB_SECRET>"

gcloud scheduler jobs create http evoting-token-cleanup \
  --location us-central1 \
  --schedule "0 2 * * *" \
  --uri "https://evoting-backend-dy6cx3zinq-uc.a.run.app/api/v1/internal/jobs/token-cleanup" \
  --http-method POST \
  --headers "x-job-secret=<INTERNAL_JOB_SECRET>" \
  || gcloud scheduler jobs update http evoting-token-cleanup \
    --location us-central1 \
    --schedule "0 2 * * *" \
    --uri "https://evoting-backend-dy6cx3zinq-uc.a.run.app/api/v1/internal/jobs/token-cleanup" \
    --http-method POST \
    --update-headers "x-job-secret=<INTERNAL_JOB_SECRET>"
```

## 5) Verifikasi pasca deploy

```bash
gcloud run services describe evoting-backend \
  --region us-central1 \
  --project iosoft-tech \
  --format='value(status.url)'

gcloud scheduler jobs list \
  --location us-central1 \
  --project iosoft-tech \
  --format='table(name,schedule,state,httpTarget.uri)'

curl -sS -X POST \
  "https://evoting-backend-dy6cx3zinq-uc.a.run.app/api/v1/internal/jobs/token-cleanup" \
  -H "x-job-secret: <INTERNAL_JOB_SECRET>"
```

## 6) Data dan migrasi

- SQLite lokal aktif sudah tidak dipakai runtime.
- Source schema aktif: `backend/src/database/schema.postgres.sql`
- Data operasional sudah dipindah ke Neon.

## 7) Technical debt yang tersisa

- `DATABASE_URL`, `WA_API_KEY`, `JWT_SECRET`, `INTERNAL_JOB_SECRET` masih plain env; belum Secret Manager.
- Adapter PostgreSQL saat ini fokus kompatibilitas MVP, belum optimasi pooling/query async native.


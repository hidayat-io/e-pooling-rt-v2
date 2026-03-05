# Deploy GCP Free Tier (Recommended)

Dokumen ini menyiapkan struktur project agar cocok untuk model free-tier:
- Frontend di Firebase Hosting (gratis/Spark)
- Backend API di Cloud Run (scale to zero)
- Scheduler via Cloud Scheduler (3 jobs gratis per billing account)

Untuk handover operasional terbaru, lihat juga:
- `AI_AGENT_DEPLOY_RUNBOOK.md`
- `GITHUB_LOCAL_CLOUD_DEPLOY.md` (panduan dari clone GitHub sampai deploy cloud)

## 1) Perubahan struktur yang sudah diterapkan

- Cron lokal dipisah dari web API:
  - `backend/src/jobs/messageQueue.js` sekarang punya `processPendingMessages()`
  - `backend/src/jobs/tokenCleanup.js` sekarang punya `runTokenCleanup()`
- API tidak menjalankan cron default di production:
  - `backend/server.js` memakai `ENABLE_LOCAL_CRON` (default `false` di Docker image)
- Trigger job disiapkan via endpoint internal:
  - `POST /api/v1/internal/jobs/wa-queue`
  - `POST /api/v1/internal/jobs/token-cleanup`
  - Header wajib: `x-job-secret: <INTERNAL_JOB_SECRET>`
- Health check endpoint:
  - `GET /healthz`
- Worker one-off untuk Cloud Run Job/manual run:
  - `backend/worker.js`
- Dockerfile:
  - `backend/Dockerfile`
  - `frontend/Dockerfile` (opsional bila frontend ingin tetap di Cloud Run)
- Firebase hosting config:
  - `firebase.json`

## 2) Batasan penting saat ini

Backend sudah menggunakan PostgreSQL (Neon) via `DATABASE_URL`.
Catatan MVP:
- adapter database masih fokus kompatibilitas cepat (bukan optimasi performa),
- hardening (pooling, secret manager, migrasi query async native) bisa dilakukan tahap berikutnya.

## 3) Deploy Backend ke Cloud Run

Contoh dari folder repo root:

```bash
gcloud builds submit --tag gcr.io/<PROJECT_ID>/evoting-backend ./backend

gcloud run deploy evoting-backend \
  --image gcr.io/<PROJECT_ID>/evoting-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --set-env-vars NODE_ENV=production,ENABLE_LOCAL_CRON=false,DATABASE_URL=<NEON_DATABASE_URL>,PGSSLMODE=require,INTERNAL_JOB_SECRET=<SECRET>,FRONTEND_URL=<FRONTEND_URL>,ALLOWED_ORIGINS=<FRONTEND_URL>
```

## 4) Setup Cloud Scheduler (ganti cron internal)

Queue WhatsApp (misal tiap 1 menit):

```bash
gcloud scheduler jobs create http evoting-wa-queue \
  --location us-central1 \
  --schedule "*/1 * * * *" \
  --uri "https://<CLOUD_RUN_URL>/api/v1/internal/jobs/wa-queue" \
  --http-method POST \
  --headers "x-job-secret=<SECRET>"
```

Cleanup token (harian jam 02:00):

```bash
gcloud scheduler jobs create http evoting-token-cleanup \
  --location us-central1 \
  --schedule "0 2 * * *" \
  --uri "https://<CLOUD_RUN_URL>/api/v1/internal/jobs/token-cleanup" \
  --http-method POST \
  --headers "x-job-secret=<SECRET>"
```

## 5) Deploy Frontend ke Firebase Hosting

```bash
cd frontend
npm run build
cd ..

# buat .firebaserc dari template
cp .firebaserc.example .firebaserc
# edit project id

firebase deploy --only hosting
```

Set `VITE_API_BASE_URL` ke URL backend Cloud Run (`https://.../api/v1`) sebelum build frontend production.

## 6) Env vars baru

Tambahan env penting di backend:
- `ENABLE_LOCAL_CRON` (local dev: `true`, cloud: `false`)
- `INTERNAL_JOB_SECRET` (wajib untuk trigger internal jobs)
- `DATABASE_URL` (Neon PostgreSQL connection string)
- `PGSSLMODE=require`
- `GCS_BUCKET_NAME` (bucket Cloud Storage untuk foto kandidat, agar tidak hilang saat deploy)

## 7) Persisten Foto Kandidat (Wajib di Cloud Run)

Karena filesystem Cloud Run bersifat ephemeral, upload foto kandidat harus ke Cloud Storage.

Contoh setup:

```bash
gcloud storage buckets create gs://<BUCKET_NAME> \
  --project <PROJECT_ID> \
  --location US \
  --uniform-bucket-level-access

gcloud storage buckets add-iam-policy-binding gs://<BUCKET_NAME> \
  --member=allUsers \
  --role=roles/storage.objectViewer

gcloud storage buckets add-iam-policy-binding gs://<BUCKET_NAME> \
  --member=serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com \
  --role=roles/storage.objectAdmin

gcloud run services update evoting-backend \
  --project <PROJECT_ID> \
  --region us-central1 \
  --update-env-vars GCS_BUCKET_NAME=<BUCKET_NAME>
```

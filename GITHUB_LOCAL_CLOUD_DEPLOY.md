# Panduan GitHub -> Local -> Cloud (Step by Step)

Dokumen ini menjelaskan alur paling aman dan paling mudah:
1. Ambil project dari GitHub ke laptop (local)
2. Jalankan project di local
3. Push perubahan ke GitHub
4. Deploy ke cloud (GCP Cloud Run + Firebase Hosting)

Target project saat ini:
- GitHub repo: `https://github.com/hidayat-io/e-pooling-rt-v2`
- GCP Project ID: `iosoft-tech`
- Backend service Cloud Run: `evoting-backend`

## 0) Prasyarat di laptop (sekali saja)

Pastikan sudah terinstall:
- `git`
- `node` (disarankan v20+)
- `npm`
- `gcloud` CLI
- `firebase` CLI (`npm i -g firebase-tools`)

Login akun:

```bash
gcloud auth login
gcloud auth application-default login
firebase login
```

Set project GCP aktif:

```bash
gcloud config set project iosoft-tech
```

## 1) Clone dari GitHub ke local

```bash
git clone https://github.com/hidayat-io/e-pooling-rt-v2.git
cd e-pooling-rt-v2
```

## 2) Setup environment local

### 2.1 Backend

```bash
cd backend
cp .env.example .env
npm install
```

Edit file `backend/.env`, minimal isi:
- `DATABASE_URL` (Neon PostgreSQL)
- `JWT_SECRET`
- `WA_API_KEY` (jika fitur WA dipakai)
- `INTERNAL_JOB_SECRET`
- `ALLOWED_ORIGINS=http://localhost:5173`

### 2.2 Frontend

```bash
cd ../frontend
npm install
```

Buat `frontend/.env`:

```bash
cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=E-Pooling RT/RW
EOF
```

## 3) Jalankan di local

Buka 2 terminal:

Terminal 1 (backend):
```bash
cd e-pooling-rt-v2/backend
npm run dev
```

Terminal 2 (frontend):
```bash
cd e-pooling-rt-v2/frontend
npm run dev
```

Akses:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/healthz`

## 4) Simpan perubahan ke GitHub

```bash
cd e-pooling-rt-v2
git status
git add .
git commit -m "feat: deskripsi perubahan"
git push origin main
```

Catatan:
- File rahasia (`.env`, key, credential) sudah di-ignore oleh `.gitignore`.
- Jangan commit token/API key ke GitHub.

## 5) Deploy ke Cloud (Production)

## 5.1 Deploy backend ke Cloud Run

Dari root project:

```bash
cd e-pooling-rt-v2
gcloud builds submit --tag gcr.io/iosoft-tech/evoting-backend ./backend

gcloud run deploy evoting-backend \
  --image gcr.io/iosoft-tech/evoting-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0
```

Jika perlu update environment variable backend:

```bash
gcloud run services update evoting-backend \
  --region us-central1 \
  --update-env-vars NODE_ENV=production,ENABLE_LOCAL_CRON=false,PGSSLMODE=require,DATABASE_URL=<ISI_DATABASE_URL>,INTERNAL_JOB_SECRET=<ISI_SECRET>,FRONTEND_URL=https://cias.web.id,ALLOWED_ORIGINS=https://cias.web.id
```

## 5.2 Deploy frontend ke Firebase Hosting

Pastikan `.firebaserc` menunjuk ke project yang benar:

```bash
cp .firebaserc.example .firebaserc
```

Lalu edit `.firebaserc`:

```json
{
  "projects": {
    "default": "iosoft-tech"
  }
}
```

Build frontend production:

```bash
cd frontend
VITE_API_BASE_URL=https://evoting-backend-781701738601.us-central1.run.app/api/v1 npm run build
cd ..
```

Deploy hosting:

```bash
firebase deploy --only hosting --project iosoft-tech
```

## 5.3 (Opsional tapi disarankan) Setup scheduler job

Jalankan script helper:

```bash
./scripts/gcp_scheduler_setup.sh iosoft-tech us-central1 https://evoting-backend-781701738601.us-central1.run.app <INTERNAL_JOB_SECRET>
```

## 6) Verifikasi setelah deploy

```bash
gcloud run services describe evoting-backend \
  --region us-central1 \
  --format='value(status.url,status.latestReadyRevisionName)'

curl -sS https://evoting-backend-781701738601.us-central1.run.app/healthz
```

Cek URL frontend:
- `https://cias.web.id`

## 7) Alur cepat setiap ada update

1. `git pull origin main`
2. coding + test local
3. `git add . && git commit && git push`
4. deploy backend (`gcloud builds submit` + `gcloud run deploy`)
5. deploy frontend (`npm run build` + `firebase deploy`)
6. smoke test di production

## 8) Troubleshooting singkat

- Build frontend sukses tapi UI lama:
  - hard refresh browser
  - cek apakah deploy hosting sukses
- API tidak update:
  - cek revision Cloud Run terbaru
  - cek env vars service
- CORS error:
  - pastikan `ALLOWED_ORIGINS` backend berisi domain frontend production

CREATE TABLE IF NOT EXISTS voters (
  id          BIGSERIAL PRIMARY KEY,
  nik         TEXT    NOT NULL UNIQUE,
  nama        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  rt          TEXT    NOT NULL DEFAULT '05',
  rw          TEXT    NOT NULL DEFAULT '02',
  alamat      TEXT,
  has_voted   INTEGER NOT NULL DEFAULT 0,
  voted_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_voters_nik ON voters(nik);
CREATE INDEX IF NOT EXISTS idx_voters_phone ON voters(phone);
CREATE INDEX IF NOT EXISTS idx_voters_has_voted ON voters(has_voted);

CREATE TABLE IF NOT EXISTS voter_tokens (
  id            BIGSERIAL PRIMARY KEY,
  voter_id      BIGINT NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  token         TEXT    NOT NULL UNIQUE,
  login_code    TEXT,
  is_used       INTEGER NOT NULL DEFAULT 0,
  expired_at    TIMESTAMPTZ NOT NULL,
  access_count  INTEGER NOT NULL DEFAULT 0,
  last_ip       TEXT,
  last_ua       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE voter_tokens ADD COLUMN IF NOT EXISTS login_code TEXT;
CREATE INDEX IF NOT EXISTS idx_tokens_token ON voter_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_voter_id ON voter_tokens(voter_id);
CREATE INDEX IF NOT EXISTS idx_tokens_login_code ON voter_tokens(login_code);
CREATE INDEX IF NOT EXISTS idx_tokens_active_by_voter
ON voter_tokens(voter_id, created_at DESC)
WHERE is_used = 0;
CREATE INDEX IF NOT EXISTS idx_tokens_active_login_code
ON voter_tokens(login_code, created_at DESC)
WHERE is_used = 0 AND login_code IS NOT NULL AND login_code <> '';
WITH ranked_codes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY login_code ORDER BY created_at ASC, id ASC) AS rn
  FROM voter_tokens
  WHERE login_code IS NOT NULL AND login_code <> ''
)
UPDATE voter_tokens vt
SET login_code = NULL
FROM ranked_codes rc
WHERE vt.id = rc.id AND rc.rn > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tokens_login_code_not_null
ON voter_tokens(login_code)
WHERE login_code IS NOT NULL AND login_code <> '';

CREATE TABLE IF NOT EXISTS candidates (
  id          BIGSERIAL PRIMARY KEY,
  nomor_urut  INTEGER NOT NULL UNIQUE,
  nama        TEXT    NOT NULL,
  photo_url   TEXT,
  tagline     TEXT,
  visi        TEXT,
  misi        TEXT,
  biodata     TEXT,
  is_petahana INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  id            BIGSERIAL PRIMARY KEY,
  voter_id      BIGINT NOT NULL UNIQUE REFERENCES voters(id),
  candidate_id  BIGINT NOT NULL REFERENCES candidates(id),
  choice        TEXT NOT NULL DEFAULT 'setuju' CHECK (choice IN ('setuju', 'tidak_setuju')),
  rt            TEXT NOT NULL,
  rw            TEXT NOT NULL,
  ip_address    TEXT,
  voted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_votes_candidate_id ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON votes(voted_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id            BIGSERIAL PRIMARY KEY,
  voter_id      BIGINT REFERENCES voters(id),
  token_id      BIGINT REFERENCES voter_tokens(id),
  wa_message_id TEXT,
  phone         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  error_msg     TEXT,
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status_created_at
ON whatsapp_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_voter_created_at
ON whatsapp_logs(voter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_message_id
ON whatsapp_logs(wa_message_id);

CREATE TABLE IF NOT EXISTS election_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO election_settings (key, value, description) VALUES
  ('election_name', 'Pemilihan Ketua RT 05 / RW 02', 'Nama pemilihan'),
  ('election_period', '2024-2029', 'Periode jabatan'),
  ('rt', '05', 'Nomor RT'),
  ('rw', '02', 'Nomor RW'),
  ('pooling_start', '2025-01-01T00:00:00Z', 'Waktu mulai pooling'),
  ('pooling_end', '2025-01-31T23:59:59Z', 'Waktu selesai pooling'),
  ('token_expiry_days', '7', 'Masa berlaku token (hari)'),
  ('pooling_status', 'active', 'Status: active/closed/paused'),
  ('show_realtime', '1', 'Tampilkan hasil real-time'),
  ('total_dpt', '0', 'Total DPT terdaftar'),
  ('wa_message_delay_ms', '20000', 'Interval pengiriman WA per pesan (milidetik)'),
  ('wa_message_jitter_ms', '0', 'Variasi acak interval pengiriman WA (milidetik)'),
  ('wa_rate_limit', '20', 'Maksimal jumlah pesan WA yang diproses per batch queue'),
  ('wa_queue_run_every_seconds', '60', 'Interval trigger queue WA (detik)'),
  ('wa_message_template', 'YTH *{nama}*,
Kami mengundang Anda dalam partisipasi E-Pooling {election_name}
Periode {election_period}

🔐 KODE UNIK ANDA : *{kode_unik}*

1. Buka Web : {link}
2. Masukkan kode di atas untuk masuk dan memberikan suara

Batas pooling: *{batas_pooling}*
Ketua Panitia: Carlo Nainggolan ({kontak_panitia})', 'Template pesan broadcast WA')
ON CONFLICT (key) DO NOTHING;

INSERT INTO election_settings (key, value, description)
SELECT 'pooling_start', value, 'Waktu mulai pooling'
FROM election_settings
WHERE key = 'voting_start'
ON CONFLICT (key) DO NOTHING;

INSERT INTO election_settings (key, value, description)
SELECT 'pooling_end', value, 'Waktu selesai pooling'
FROM election_settings
WHERE key = 'voting_end'
ON CONFLICT (key) DO NOTHING;

INSERT INTO election_settings (key, value, description)
SELECT 'pooling_status', value, 'Status: active/closed/paused'
FROM election_settings
WHERE key = 'voting_status'
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS announcements (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  content     TEXT,
  icon_url    TEXT,
  expires_at  TIMESTAMPTZ,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  nama        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'admin',
  last_login  TIMESTAMPTZ,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    BIGINT REFERENCES admin_users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   BIGINT,
  details     TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traffic / request logging
CREATE TABLE IF NOT EXISTS request_logs (
  id                BIGSERIAL PRIMARY KEY,
  method            TEXT NOT NULL,
  path              TEXT NOT NULL,
  status_code       INTEGER,
  response_time_ms  INTEGER,
  ip_address        TEXT,
  user_agent        TEXT,
  referer           TEXT,
  user_type         TEXT NOT NULL DEFAULT 'anonymous',
  user_id           BIGINT,
  query_string      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at   ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_path         ON request_logs(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_status_code  ON request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_request_logs_ip           ON request_logs(ip_address);

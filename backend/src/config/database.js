const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const runnerPath = path.join(__dirname, 'pgRunner.js');
const schemaPath = path.join(__dirname, '..', 'database', 'schema.postgres.sql');

let db;

function toPgPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => {
    idx += 1;
    return `$${idx}`;
  });
}

function normalizeSql(sql) {
  let s = sql.trim();

  // SQLite -> PostgreSQL compatibility rewrites
  s = s.replace(/datetime\('now',\s*'-7 days'\)/gi, "NOW() - INTERVAL '7 days'");
  s = s.replace(/datetime\('now',\s*'-24 hours'\)/gi, "NOW() - INTERVAL '24 hours'");
  s = s.replace(/datetime\('now'\)/gi, 'NOW()');

  s = s.replace(
    /strftime\('%Y-%m-%d %H:00',\s*voted_at\)/gi,
    "TO_CHAR(DATE_TRUNC('hour', voted_at), 'YYYY-MM-DD HH24:00')",
  );

  if (/insert\s+or\s+ignore\s+into/i.test(s)) {
    s = s.replace(/insert\s+or\s+ignore\s+into/gi, 'INSERT INTO');
    if (!/on\s+conflict/i.test(s)) {
      s = `${s} ON CONFLICT DO NOTHING`;
    }
  }

  // Some legacy queries used double quotes for string literals.
  s = s.replace(/"([a-z_]+)"/g, "'$1'");

  return toPgPlaceholders(s);
}

function runPg(payload) {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL belum dikonfigurasi');
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const result = spawnSync(process.execPath, [runnerPath, encoded], {
    env: process.env,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || 'PostgreSQL runner error');
  }

  return JSON.parse(result.stdout || '{}');
}

function createStatement(rawSql) {
  const sql = normalizeSql(rawSql);

  return {
    get: (...params) => {
      const result = runPg({ type: 'query', sql, params });
      return result.rows?.[0];
    },
    all: (...params) => {
      const result = runPg({ type: 'query', sql, params });
      return result.rows || [];
    },
    run: (...params) => {
      let runSql = sql;
      const isInsert = /^\s*insert\s+/i.test(runSql);

      // Keep compatibility with better-sqlite3's lastInsertRowid behavior.
      if (isInsert && !/\breturning\b/i.test(runSql)) {
        runSql = `${runSql} RETURNING *`;
      }

      const result = runPg({ type: 'query', sql: runSql, params });
      return {
        changes: result.rowCount || 0,
        lastInsertRowid: result.rows?.[0]?.id,
      };
    },
  };
}

function initDatabase() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL wajib diisi untuk mode PostgreSQL/Neon');
  }

  // Connectivity test
  runPg({ type: 'query', sql: 'SELECT 1 AS ok', params: [] });

  // Initialize schema (idempotent)
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  runPg({ type: 'script', sql: schema });

  db = {
    prepare: createStatement,
    transaction: (fn) => (...args) => fn(...args),
  };

  console.log('✅ PostgreSQL (Neon) berhasil diinisialisasi');
  return db;
}

function getDb() {
  if (!db) return initDatabase();
  return db;
}

function closeDb() {
  // No-op because each query uses a short-lived runner process.
}

module.exports = { initDatabase, getDb, closeDb };

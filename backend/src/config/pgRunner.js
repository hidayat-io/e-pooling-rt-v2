const { Client } = require('pg');

function shouldUseSsl() {
  const url = process.env.DATABASE_URL || '';
  const sslMode = (process.env.PGSSLMODE || '').toLowerCase();
  return sslMode === 'require' || url.includes('sslmode=require');
}

async function main() {
  const encoded = process.argv[2];
  if (!encoded) {
    throw new Error('Missing payload');
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    if (payload.type === 'script') {
      await client.query(payload.sql);
      process.stdout.write(JSON.stringify({ ok: true }));
      return;
    }

    if (payload.type === 'query') {
      const result = await client.query(payload.sql, payload.params || []);
      process.stdout.write(JSON.stringify({
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        command: result.command,
      }));
      return;
    }

    throw new Error(`Unknown payload type: ${payload.type}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(error.stack || String(error));
  process.exit(1);
});

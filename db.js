const { Pool } = require('pg');

// Neon / Render Postgres вимагає SSL. У більшості випадків достатньо rejectUnauthorized: false.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] УВАГА: DATABASE_URL не задано. Додай його в Environment на Render.');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[db] Несподівана помилка пулу з’єднань:', err.message);
});

// Створення таблиці при старті — окрема міграція не потрібна.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id              SERIAL PRIMARY KEY,
      request_number  TEXT UNIQUE NOT NULL,
      insurance_type  TEXT NOT NULL,
      full_name       TEXT NOT NULL,
      phone           TEXT NOT NULL,
      email           TEXT,
      birth_date      DATE,
      city            TEXT,
      details         JSONB NOT NULL DEFAULT '{}'::jsonb,
      estimated_price NUMERIC(12,2),
      final_price     NUMERIC(12,2),
      status          TEXT NOT NULL DEFAULT 'new',
      admin_notes     TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(insurance_type);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_applications_created ON applications(created_at DESC);`);
  console.log('[db] Таблиця applications готова.');
}

module.exports = { pool, initDb };

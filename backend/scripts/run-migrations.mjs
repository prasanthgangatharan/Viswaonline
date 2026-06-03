import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read DATABASE_URL from .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
const dbUrl = dbUrlMatch?.[1]?.trim();

if (!dbUrl) {
  console.error('\nDATABASE_URL is not set in backend/.env');
  console.error('Add it from: Supabase Dashboard → Project Settings → Database → Connection string → URI');
  console.error('Example: DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres\n');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map(r => r.name));

  let ranCount = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await pool.query('COMMIT');
    console.log(`  ✓     ${file}`);
    ranCount++;
  }

  console.log(ranCount > 0 ? `\n${ranCount} migration(s) applied.` : '\nAll migrations already up to date.');
} catch (err) {
  await pool.query('ROLLBACK').catch(() => {});
  console.error('\nMigration failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}

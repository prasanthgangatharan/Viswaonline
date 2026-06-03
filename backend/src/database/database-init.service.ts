import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {}

  async onModuleInit() {
    try {
      await this.runMigrations();
    } catch (err: any) {
      this.logger.warn(`[Migration] Skipped — could not connect to database: ${err.message}`);
    }
    await this.seedAdmin();
  }

  private async runMigrations(): Promise<void> {
    const dbUrl = this.config.get<string>('DATABASE_URL');
    if (!dbUrl) {
      this.logger.warn('DATABASE_URL not set — skipping migrations');
      return;
    }

    const migrationsDir = path.join(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      this.logger.warn('migrations/ directory not found — skipping migrations');
      return;
    }

    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      // Bootstrap the tracking table (runs outside a transaction so it always exists)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          name       TEXT        PRIMARY KEY,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      const { rows } = await pool.query('SELECT name FROM schema_migrations');
      const applied = new Set(rows.map((r: any) => r.name));

      for (const file of files) {
        if (applied.has(file)) {
          this.logger.log(`[Migration] ${file} — already applied, skipping`);
          continue;
        }

        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        this.logger.log(`[Migration] Running ${file}...`);

        try {
          await pool.query('BEGIN');
          await pool.query(sql);
          await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
          await pool.query('COMMIT');
          this.logger.log(`[Migration] ${file} applied successfully`);
        } catch (err: any) {
          await pool.query('ROLLBACK');
          this.logger.error(`[Migration] ${file} FAILED: ${err.message}`);
          throw err;
        }
      }

      this.logger.log('[Migration] All migrations up to date');
    } finally {
      await pool.end();
    }
  }

  private async seedAdmin(): Promise<void> {
    const username = this.config.get<string>('ADMIN_USERNAME');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!username || !password) {
      this.logger.warn('ADMIN_USERNAME or ADMIN_PASSWORD not set — skipping admin seed');
      return;
    }

    const sb = this.supabase.getClient();

    const { data: existing } = await sb
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('role', 'admin')
      .maybeSingle();

    const hash = await bcrypt.hash(password, 10);

    if (existing) {
      const { error } = await sb
        .from('users')
        .update({ password_hash: hash })
        .eq('id', existing.id);
      if (error) this.logger.error(`Admin password update failed: ${error.message}`);
      else this.logger.log(`Admin "${username}" password synced from env`);
    } else {
      const { error } = await sb
        .from('users')
        .insert({ username, password_hash: hash, role: 'admin', status: 'active' });
      if (error) this.logger.error(`Admin creation failed: ${error.message}`);
      else this.logger.log(`Admin "${username}" created from env`);
    }
  }
}

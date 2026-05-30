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
    await this.initSchema();
    await this.seedAdmin();
  }

  private async initSchema(): Promise<void> {
    const dbUrl = this.config.get<string>('DATABASE_URL');
    if (!dbUrl) {
      this.logger.warn('DATABASE_URL not set — skipping automatic schema init');
      return;
    }

    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      this.logger.warn('schema.sql not found — skipping schema init');
      return;
    }

    const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      this.logger.log('Database schema verified / created successfully');
    } catch (err: any) {
      this.logger.error(`Schema init failed: ${err.message}`);
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

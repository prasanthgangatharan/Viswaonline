import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
  ) {}

  async validateUser(username: string, password: string, role: string) {
    const { data: user, error } = await this.supabase
      .getClient()
      .from('users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .eq('role', role)
      .eq('status', 'active')
      .single();

    if (error || !user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  generateToken(user: any) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwt.sign(payload, { expiresIn: '8h' }),
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async generateAgentToken(user: any) {
    const { data: agent } = await this.supabase
      .getClient()
      .from('agents')
      .select('tab1_price, tab2_price, tab3_price')
      .eq('id', user.id)
      .single();

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwt.sign(payload, { expiresIn: '8h' }),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tab1_price: agent?.tab1_price ?? 0,
        tab2_price: agent?.tab2_price ?? 0,
        tab3_price: agent?.tab3_price ?? 0,
      },
    };
  }

  async logout(userId: string) {
    // Record logout time — tokens issued before this are considered invalid
    await this.supabase
      .getClient()
      .from('users')
      .update({ last_logout_at: new Date().toISOString() })
      .eq('id', userId);
    return { success: true };
  }

  async changeAdminPassword(userId: string, currentPassword: string, newPassword: string) {
    const sb = this.supabase.getClient();

    const { data: user, error } = await sb
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .eq('role', 'admin')
      .single();

    if (error || !user) throw new UnauthorizedException('Admin not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 10);

    const { error: updateErr } = await sb
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);
    if (updateErr) throw new Error(updateErr.message);

    // Keep .env in sync so server restarts don't overwrite the new password
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${newPassword}`);
      fs.writeFileSync(envPath, envContent, 'utf8');
    }

    return { success: true };
  }
}

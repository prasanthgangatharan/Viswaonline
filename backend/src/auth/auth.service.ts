import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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
}

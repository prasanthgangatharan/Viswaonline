import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private supabase: SupabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.role) throw new UnauthorizedException();

    if (payload.role === 'agent') {
      const { data: user } = await this.supabase
        .getClient()
        .from('users')
        .select('status')
        .eq('id', payload.sub)
        .single();

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Account is inactive');
      }
    }

    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}

import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAgentDto, UpdateAgentDto, ResetPasswordDto } from './dto/create-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from('agents')
      .select('*, users(username, created_at, status)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async create(dto: CreateAgentDto) {
    const username = dto.username.trim().toLowerCase();
    const hash = await bcrypt.hash(dto.password, 10);
    const { data: user, error: userErr } = await this.supabase
      .getClient()
      .from('users')
      .insert({ username, password_hash: hash, role: 'agent', status: 'active' })
      .select()
      .single();
    if (userErr) throw new ConflictException('Username already exists');

    const { data: agent, error: agentErr } = await this.supabase
      .getClient()
      .from('agents')
      .insert({
        id: user.id,
        username,
        status: 'active',
        tab1_price: dto.tab1_price,
        tab2_price: dto.tab2_price,
        tab3_price: dto.tab3_price,
      })
      .select()
      .single();
    if (agentErr) throw new Error(agentErr.message);
    return agent;
  }

  async update(id: string, dto: UpdateAgentDto) {
    const sb = this.supabase.getClient();

    if (dto.username) {
      const username = dto.username.trim().toLowerCase();
      await sb.from('users').update({ username }).eq('id', id);
      await sb.from('agents').update({ username }).eq('id', id);
    }

    if (dto.password) {
      const hash = await bcrypt.hash(dto.password, 10);
      await sb.from('users').update({ password_hash: hash }).eq('id', id);
    }

    const priceUpdate: any = {};
    if (dto.tab1_price !== undefined) priceUpdate.tab1_price = dto.tab1_price;
    if (dto.tab2_price !== undefined) priceUpdate.tab2_price = dto.tab2_price;
    if (dto.tab3_price !== undefined) priceUpdate.tab3_price = dto.tab3_price;

    if (Object.keys(priceUpdate).length > 0) {
      await sb.from('agents').update(priceUpdate).eq('id', id);
    }

    const { data } = await sb.from('agents').select('*, users(username, created_at, status)').eq('id', id).single();
    return data;
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const { error } = await this.supabase
      .getClient()
      .from('users')
      .update({ password_hash: hash })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  async toggleStatus(id: string, status: string) {
    await this.supabase.getClient().from('users').update({ status }).eq('id', id);
    const { data, error } = await this.supabase
      .getClient()
      .from('agents')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteAgent(id: string, adminId: string, password: string) {
    await this.verifyAdminPassword(adminId, password);
    const sb = this.supabase.getClient();
    await sb.from('overflow_bets').delete().eq('agent_id', id);
    await sb.from('bets').delete().eq('agent_id', id);
    await sb.from('agents').delete().eq('id', id);
    const { error } = await sb.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  private async verifyAdminPassword(adminId: string, password: string) {
    const { data: user } = await this.supabase
      .getClient()
      .from('users')
      .select('password_hash')
      .eq('id', adminId)
      .single();
    if (!user) throw new ForbiddenException('Admin not found');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new ForbiddenException('Incorrect password');
  }
}

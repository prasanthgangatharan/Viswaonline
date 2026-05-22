import { Injectable, ConflictException } from '@nestjs/common';
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
    const hash = await bcrypt.hash(dto.password, 10);
    const { data: user, error: userErr } = await this.supabase
      .getClient()
      .from('users')
      .insert({ username: dto.username, password_hash: hash, role: 'agent', status: 'active' })
      .select()
      .single();
    if (userErr) throw new ConflictException('Username already exists');

    const { data: agent, error: agentErr } = await this.supabase
      .getClient()
      .from('agents')
      .insert({
        id: user.id,
        username: user.username,
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
      await sb.from('users').update({ username: dto.username }).eq('id', id);
      await sb.from('agents').update({ username: dto.username }).eq('id', id);
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
}

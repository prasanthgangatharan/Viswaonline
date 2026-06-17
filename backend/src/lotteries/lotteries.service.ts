import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../supabase/supabase.service';
import { AppGateway } from '../gateway/app.gateway';
import { CreateLotteryDto } from './dto/create-lottery.dto';
import { UpdateLotteryDto } from './dto/update-lottery.dto';

@Injectable()
export class LotteriesService {
  constructor(private supabase: SupabaseService, private gateway: AppGateway) {}

  async findAll(role?: string) {
    let query = this.supabase.getClient().from('lotteries').select('*').order('created_at', { ascending: false });
    if (role === 'agent') query = query.eq('status', 'active');
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async create(dto: CreateLotteryDto) {
    if (new Date(dto.draw_time) <= new Date()) {
      throw new BadRequestException('Draw time must be in the future');
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('lotteries')
      .insert({
        name: dto.name,
        draw_time: dto.draw_time,
        stop_betting_minutes: dto.stop_betting_minutes ?? 10,
        status: 'active',
        tab1_max: dto.tab1_max ?? null,
        tab2_max: dto.tab2_max ?? null,
        tab3_max: dto.tab3_max ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    this.gateway.emitLotteryCreated(data);
    return data;
  }

  async update(id: string, dto: UpdateLotteryDto, adminId: string) {
    await this.verifyAdminPassword(adminId, dto.admin_password);
    if (dto.draw_time && new Date(dto.draw_time) <= new Date()) {
      throw new BadRequestException('Draw time must be in the future');
    }
    const { admin_password, ...fields } = dto;
    const { data, error } = await this.supabase
      .getClient()
      .from('lotteries')
      .update(fields)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Lottery not found');
    return data;
  }

  async close(id: string, adminId: string, password: string) {
    await this.verifyAdminPassword(adminId, password);
    const { data, error } = await this.supabase
      .getClient()
      .from('lotteries')
      .update({ status: 'closed' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Lottery not found');
    this.gateway.emitLotteryClosed(data);
    return data;
  }

  async delete(id: string, adminId: string, password: string) {
    await this.verifyAdminPassword(adminId, password);
    const sb = this.supabase.getClient();
    await sb.from('overflow_bets').delete().eq('lottery_id', id);
    await sb.from('results').delete().eq('lottery_id', id);
    await sb.from('bets').delete().eq('lottery_id', id);
    const { error } = await sb.from('lotteries').delete().eq('id', id);
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

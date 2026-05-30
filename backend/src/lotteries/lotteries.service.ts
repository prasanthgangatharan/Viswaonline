import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AppGateway } from '../gateway/app.gateway';
import { CreateLotteryDto } from './dto/create-lottery.dto';

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

  async close(id: string) {
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

  async delete(id: string) {
    const sb = this.supabase.getClient();
    await sb.from('results').delete().eq('lottery_id', id);
    await sb.from('bets').delete().eq('lottery_id', id);
    const { error } = await sb.from('lotteries').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  }
}

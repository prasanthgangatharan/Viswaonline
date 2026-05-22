import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AppGateway } from '../gateway/app.gateway';
import { DeclareResultDto } from './dto/declare-result.dto';

@Injectable()
export class ResultsService {
  constructor(private supabase: SupabaseService, private gateway: AppGateway) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from('results')
      .select('*, lotteries(name, draw_time)')
      .order('declared_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async declare(dto: DeclareResultDto) {
    const sb = this.supabase.getClient();

    const { data: result, error: rErr } = await sb
      .from('results')
      .insert({ lottery_id: dto.lottery_id, winning_number: dto.winning_number })
      .select()
      .single();
    if (rErr) throw new Error(rErr.message);

    const { data: lottery } = await sb
      .from('lotteries')
      .select('name')
      .eq('id', dto.lottery_id)
      .single();

    await sb.from('lotteries').update({ status: 'done' }).eq('id', dto.lottery_id);

    const payload = { ...result, winning_number: dto.winning_number, lottery_name: lottery.name };
    this.gateway.emitResultDeclared(payload);
    this.gateway.emitLotteryClosed({ id: dto.lottery_id, status: 'done' });

    return result;
  }
}

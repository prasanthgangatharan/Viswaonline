import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AppGateway } from '../gateway/app.gateway';
import { CreateBetsDto } from './dto/create-bets.dto';

@Injectable()
export class BetsService {
  constructor(private supabase: SupabaseService, private gateway: AppGateway) {}

  async findAll(user: any, lotteryId?: string, agentId?: string) {
    let query = this.supabase
      .getClient()
      .from('bets')
      .select('*, users!bets_agent_id_fkey(username), lotteries(name)')
      .order('created_at', { ascending: false });

    if (user.role === 'agent') query = query.eq('agent_id', user.id);
    if (lotteryId) query = query.eq('lottery_id', lotteryId);
    if (agentId && user.role === 'admin') query = query.eq('agent_id', agentId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async batchCreate(dto: CreateBetsDto, agentId: string) {
    const [{ data: lottery, error: lErr }, { data: agent, error: aErr }] = await Promise.all([
      this.supabase.getClient()
        .from('lotteries')
        .select('status, draw_time, stop_betting_minutes')
        .eq('id', dto.lottery_id)
        .single(),
      this.supabase.getClient()
        .from('agents')
        .select('tab1_price, tab2_price, tab3_price')
        .eq('id', agentId)
        .single(),
    ]);

    if (lErr || !lottery) throw new ForbiddenException('Lottery not found');
    if (aErr || !agent) throw new ForbiddenException('Agent not found');
    if (lottery.status !== 'active') throw new ForbiddenException('Lottery is not active');

    const bettingCloseMs =
      new Date(lottery.draw_time).getTime() - Number(lottery.stop_betting_minutes) * 60 * 1000;
    if (Date.now() >= bettingCloseMs) {
      throw new ForbiddenException('Betting window has closed for this lottery');
    }

    const prices = [agent.tab1_price, agent.tab2_price, agent.tab3_price];
    const rows = dto.entries.map((e) => ({
      ticket_id: dto.ticket_id,
      agent_id: agentId,
      lottery_id: dto.lottery_id,
      type: e.type,
      number: e.number,
      count: e.count,
      tab: e.tab,
      amount: e.count * prices[e.tab - 1],
      customer_name: dto.customer_name || null,
    }));

    const { data, error } = await this.supabase.getClient().from('bets').insert(rows).select();
    if (error) throw new Error(error.message);
    (data as any[]).forEach(bet => this.gateway.emitBetPlaced(bet));
    return data;
  }

  async getMyTickets(agentId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('bets')
      .select('*, lotteries(name)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async getSalesSummary(agentId: string, date?: string) {
    let query = this.supabase
      .getClient()
      .from('bets')
      .select('*, lotteries(name)')
      .eq('agent_id', agentId);
    if (date) {
      query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async getNetPay(agentId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('bets')
      .select('lottery_id, amount, win_amount, lotteries(name, draw_time, status)')
      .eq('agent_id', agentId);
    if (error) throw new Error(error.message);

    const grouped: Record<string, any> = {};
    for (const b of data) {
      const lid = b.lottery_id;
      if (!grouped[lid]) {
        grouped[lid] = {
          lottery_id: lid,
          lottery_name: (b.lotteries as any)?.name,
          draw_time: (b.lotteries as any)?.draw_time,
          status: (b.lotteries as any)?.status,
          total_sales: 0,
          wins_paid: 0,
        };
      }
      grouped[lid].total_sales += Number(b.amount);
      grouped[lid].wins_paid += Number(b.win_amount);
    }
    return Object.values(grouped).map((g: any) => ({
      ...g,
      net_amount: g.total_sales - g.wins_paid,
      settlement_status: g.status === 'done' ? 'Settled' : 'Pending',
    }));
  }

  async getRiskView() {
    const { data, error } = await this.supabase
      .getClient()
      .from('bets')
      .select('lottery_id, type, number, count, amount, lotteries(name)');
    if (error) throw new Error(error.message);

    const grouped: Record<string, any> = {};
    for (const b of data) {
      const key = `${b.lottery_id}_${b.number}_${b.type}`;
      if (!grouped[key]) {
        grouped[key] = {
          lottery_id: b.lottery_id,
          lottery_name: (b.lotteries as any)?.name,
          number: b.number,
          type: b.type,
          total_count: 0,
          total_amount: 0,
        };
      }
      grouped[key].total_count += Number(b.count);
      grouped[key].total_amount += Number(b.amount);
    }
    return Object.values(grouped).sort((a: any, b: any) => b.total_amount - a.total_amount);
  }
}

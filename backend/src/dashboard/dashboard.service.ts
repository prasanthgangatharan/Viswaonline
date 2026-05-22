import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
  constructor(private supabase: SupabaseService) {}

  async getStats() {
    const sb = this.supabase.getClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: bets } = await sb
      .from('bets')
      .select('amount, win_amount, agent_id, lottery_id, users!bets_agent_id_fkey(username), lotteries(name)')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const { data: agents } = await sb
      .from('agents')
      .select('id, username, status')
      .eq('status', 'active');

    const { data: recentBets } = await sb
      .from('bets')
      .select('id, ticket_id, agent_id, lottery_id, type, number, count, amount, win_amount, created_at, users!bets_agent_id_fkey(username), lotteries(name)')
      .order('created_at', { ascending: false })
      .limit(20);

    const totalSales = (bets || []).reduce((s, b) => s + Number(b.amount), 0);
    const winsPaid = (bets || []).reduce((s, b) => s + Number(b.win_amount), 0);
    const netProfit = totalSales - winsPaid;
    const ticketCount = (bets || []).length;
    const margin = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;

    const salesByGame: Record<string, number> = {};
    const agentPerf: Record<string, number> = {};
    for (const b of bets || []) {
      const game = (b.lotteries as any)?.name || 'Unknown';
      salesByGame[game] = (salesByGame[game] || 0) + Number(b.amount);
      const ag = (b.users as any)?.username || 'Unknown';
      agentPerf[ag] = (agentPerf[ag] || 0) + Number(b.amount);
    }

    return {
      totalSalesToday: totalSales,
      ticketCount,
      winsPaid,
      netProfit,
      margin,
      activeAgents: agents || [],
      salesByGame,
      agentPerformance: agentPerf,
      recentBets: recentBets || [],
    };
  }
}

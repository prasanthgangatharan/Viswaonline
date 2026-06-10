import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private supabase: SupabaseService) {}

  onModuleInit() {
    // Run once on startup, then every 24 hours
    this.runCleanup();
    setInterval(() => this.runCleanup(), ONE_DAY_MS);
  }

  private async runCleanup() {
    this.logger.log('[Cleanup] Starting scheduled database cleanup...');
    const cutoff = new Date(Date.now() - TWO_WEEKS_MS).toISOString();
    const sb = this.supabase.getClient();

    try {
      // 1. Clear bets for lotteries whose closing time (draw_time) was > 2 weeks ago
      const { data: oldLotteries } = await sb
        .from('lotteries')
        .select('id')
        .lt('draw_time', cutoff);

      if (oldLotteries?.length) {
        const ids = oldLotteries.map((l: any) => l.id);
        const { count: betsDeleted } = await sb
          .from('bets')
          .delete({ count: 'exact' })
          .in('lottery_id', ids);
        const { count: overflowDeleted } = await sb
          .from('overflow_bets')
          .delete({ count: 'exact' })
          .in('lottery_id', ids);
        this.logger.log(`[Cleanup] Cleared ${betsDeleted ?? 0} bets, ${overflowDeleted ?? 0} overflow bets for lotteries closed > 2 weeks ago`);
      }

      // 2. Clear results declared > 2 weeks ago
      const { count: resultsDeleted } = await sb
        .from('results')
        .delete({ count: 'exact' })
        .lt('declared_at', cutoff);
      this.logger.log(`[Cleanup] Cleared ${resultsDeleted ?? 0} results declared > 2 weeks ago`);

      // 3. Delete entire done lotteries whose betting closed > 2 weeks ago (cascade removes remaining bets/results/overflow)
      const { data: oldDone } = await sb
        .from('lotteries')
        .select('id')
        .eq('status', 'done')
        .lt('draw_time', cutoff);

      if (oldDone?.length) {
        const ids = oldDone.map((l: any) => l.id);
        const { count: lotteriesDeleted } = await sb
          .from('lotteries')
          .delete({ count: 'exact' })
          .in('id', ids);
        this.logger.log(`[Cleanup] Deleted ${lotteriesDeleted ?? 0} done lotteries created > 2 weeks ago`);
      }

      this.logger.log('[Cleanup] Cleanup complete');
    } catch (err: any) {
      this.logger.error(`[Cleanup] Failed: ${err.message}`);
    }
  }
}

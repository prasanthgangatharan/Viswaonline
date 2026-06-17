import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeBets(onInsert: (bet: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('bets-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, (payload) => {
        onInsert(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [onInsert]);
}

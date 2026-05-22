import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import { Trophy, ChevronUp, ChevronDown } from 'lucide-react';

function checkWin(bet: any, winStr: string): boolean {
  const [d1, d2, d3] = winStr.split('');
  const betNum = String(bet.number).padStart(Number(bet.tab), '0');
  if (bet.tab === 1) {
    if (bet.type === 'A') return betNum === d1;
    if (bet.type === 'B') return betNum === d2;
    if (bet.type === 'C') return betNum === d3;
  } else if (bet.tab === 2) {
    if (bet.type === 'AB') return betNum === d1 + d2;
    if (bet.type === 'BC') return betNum === d2 + d3;
    if (bet.type === 'AC') return betNum === d1 + d3;
  } else if (bet.tab === 3) {
    return betNum === winStr;
  }
  return false;
}

const TYPE_COLOR: Record<string, string> = {
  A: '#16a34a', B: '#dc2626', C: '#2563eb',
  AB: '#d97706', BC: '#7c3aed', AC: '#0891b2',
};

export function ShopResultPage() {
  const [results, setResults] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [resData, betsData] = await Promise.all([
        api.get('/results'),
        api.get('/bets/my-tickets'),
      ]);
      setResults(resData.data);
      setMyBets(betsData.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const onResultDeclared = (result: any) => {
      setFlashIds((prev) => new Set(prev).add(result.id));
      setTimeout(() => setFlashIds((prev) => { const s = new Set(prev); s.delete(result.id); return s; }), 2000);
      fetchData();
    };
    socket.on('result:declared', onResultDeclared);
    return () => { socket.off('result:declared', onResultDeclared); };
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Shop Result</div>

      {results.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          No results declared yet
        </div>
      )}

      {results.map((r: any) => {
        const winStr = String(r.winning_number).padStart(3, '0');
        const lotteryBets = myBets.filter(b => b.lottery_id === r.lottery_id);
        const winningBets = lotteryBets.filter(b => checkWin(b, winStr));
        const isExpanded = expanded.has(r.id);

        return (
          <div
            key={r.id}
            className={flashIds.has(r.id) ? 'flash-green' : ''}
            style={{ background: '#fff', border: `1px solid ${winningBets.length > 0 ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'border 0.3s' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{r.lotteries?.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                {winStr.split('').map((d, i) => (
                  <div key={i} style={{ width: 32, height: 38, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>{d}</div>
                  </div>
                ))}
              </div>

              {winningBets.length > 0 ? (
                <button
                  onClick={() => toggleExpand(r.id)}
                  style={{ padding: '5px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, color: '#16a34a', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Trophy size={12} />
                  {winningBets.length} WIN{winningBets.length > 1 ? 'S' : ''}
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              ) : (
                <div style={{ padding: '5px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                  No win
                </div>
              )}
            </div>

            {isExpanded && winningBets.length > 0 && (
              <div style={{ borderTop: '1px solid #f0fdf4', padding: '10px 16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {winningBets.map((b: any, i: number) => {
                  const color = TYPE_COLOR[b.type] || '#94a3b8';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 6, background: color + '18', border: `1px solid ${color}44`, color, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.type}</span>
                      <span style={{ fontWeight: 700, fontSize: 17, color: '#0f172a', letterSpacing: 2 }}>{String(b.number).padStart(b.tab, '0')}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>x{b.count}</span>
                      {b.customer_name && <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', borderRadius: 4, padding: '2px 8px' }}>{b.customer_name}</span>}
                      <span style={{ marginLeft: 'auto', padding: '2px 10px', background: '#16a34a', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#fff' }}>WON</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

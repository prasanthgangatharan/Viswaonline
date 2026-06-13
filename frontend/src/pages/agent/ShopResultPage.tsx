import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import { Trophy, ChevronUp, ChevronDown, FileText, ExternalLink } from 'lucide-react';

function checkWin(bet: any, winStr: string, extraPrizes: string[] = []): boolean {
  const [d1, d2, d3] = winStr.split('');
  const tabNum = Number(bet.tab);
  const betNum = String(bet.number).padStart(tabNum, '0');
  if (tabNum === 1) {
    if (bet.type === 'A') return betNum === d1;
    if (bet.type === 'B') return betNum === d2;
    if (bet.type === 'C') return betNum === d3;
  } else if (tabNum === 2) {
    if (bet.type === 'AB') return betNum === d1 + d2;
    if (bet.type === 'BC') return betNum === d2 + d3;
    if (bet.type === 'AC') return betNum === d1 + d3;
  } else if (tabNum === 3) {
    const all = [winStr, ...extraPrizes];
    const sort = (s: string) => s.split('').sort().join('');
    if (bet.type === 'SUPER') return all.some(p => betNum === p);
    if (bet.type === 'BOX') return all.some(p => sort(betNum) === sort(p));
  }
  return false;
}

function pad3(n: number | string) { return String(n).padStart(3, '0'); }

function getWonPrize(bet: any, winStr: string, r: any): string {
  const tabNum = Number(bet.tab);
  const betNum = String(bet.number).padStart(tabNum, '0');
  const sort = (s: string) => s.split('').sort().join('');
  if (tabNum < 3) return '1st';
  const prizes = [
    { label: '1st', val: winStr },
    ...[r.prize_2, r.prize_3, r.prize_4, r.prize_5].map((v: any, i: number) => v != null ? { label: ['2nd', '3rd', '4th', '5th'][i], val: pad3(v) } : null).filter(Boolean),
    ...(Array.isArray(r.complementary_numbers) ? r.complementary_numbers.map((n: number) => ({ label: 'Comp', val: pad3(n) })) : []),
  ] as { label: string; val: string }[];
  for (const p of prizes) {
    if (bet.type === 'SUPER' && betNum === p.val) return p.label;
    if (bet.type === 'BOX' && sort(betNum) === sort(p.val)) return p.label;
  }
  return '1st';
}

const TYPE_COLOR: Record<string, string> = {
  A: '#05CD99', B: '#EE5D50', C: '#7C3AED',
  AB: '#FFCE20', BC: '#9F7AEA', AC: '#A78BFA',
  SUPER: '#FF8C42', BOX: '#7B61FF',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Shop Result</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: 500 }}>Declared lottery results</div>
      </div>

      {results.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, textAlign: 'center', color: '#6B7280', fontSize: 14, boxShadow: 'none', border: '1px solid #F3F4F6' }}>
          No results declared yet
        </div>
      )}

      {results.map((r: any) => {
        const winStr = String(r.winning_number).padStart(3, '0');
        const extraPrizes = [r.prize_2, r.prize_3, r.prize_4, r.prize_5]
          .filter((v: any) => v != null)
          .map((v: number) => String(v).padStart(3, '0'))
          .concat((Array.isArray(r.complementary_numbers) ? r.complementary_numbers : []).map((n: number) => String(n).padStart(3, '0')));
        const lotteryBets = myBets.filter(b => b.lottery_id === r.lottery_id);
        const winningBets = lotteryBets.filter(b => checkWin(b, winStr, extraPrizes));
        const isExpanded = expanded.has(r.id);
        const hasWin = winningBets.length > 0;

        return (
          <div
            key={r.id}
            className={flashIds.has(r.id) ? 'flash-green' : ''}
            style={{
              background: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: hasWin ? '0 4px 20px rgba(5,205,153,0.15)' : '0 2px 16px rgba(112,144,176,0.1)',
              transition: 'box-shadow 0.3s',
            }}
          >
            <div style={{ padding: '14px 16px' }}>
              {/* Top row: name + date + buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{r.lotteries?.name}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 8, fontWeight: 500 }}>
                    {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                {r.document_url && (
                  <a href={r.document_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#F0F4FF', border: '1px solid #C7D2FE', borderRadius: 14, color: '#4318FF', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    <FileText size={11} /> Doc <ExternalLink size={10} />
                  </a>
                )}
                {hasWin ? (
                  <button onClick={() => toggleExpand(r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#E6FAF5', border: 'none', borderRadius: 14, color: '#05CD99', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <Trophy size={12} />
                    {winningBets.length} WIN{winningBets.length > 1 ? 'S' : ''}
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                ) : (
                  <div style={{ padding: '5px 12px', background: '#F9FAFB', borderRadius: 14, color: '#9CA3AF', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    No win
                  </div>
                )}
              </div>

              {/* Prizes row — horizontal wrap */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', alignItems: 'center' }}>
                {[
                  { label: '1st', value: r.winning_number },
                  { label: '2nd', value: r.prize_2 },
                  { label: '3rd', value: r.prize_3 },
                  { label: '4th', value: r.prize_4 },
                  { label: '5th', value: r.prize_5 },
                ].filter(p => p.value != null).map((prize, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? '#7C3AED' : '#9CA3AF', minWidth: 24, flexShrink: 0 }}>{prize.label}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {pad3(prize.value!).split('').map((d, di) => (
                        <div key={di} style={{ width: i === 0 ? 28 : 22, height: i === 0 ? 34 : 26, background: i === 0 ? '#F5F3FF' : '#E5E7EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: i === 0 ? 15 : 12, fontWeight: 800, color: i === 0 ? '#7C3AED' : '#111827' }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Array.isArray(r.complementary_numbers) && r.complementary_numbers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>Comp</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.complementary_numbers.map((n: number, i: number) => (
                        <span key={i} style={{ padding: '2px 7px', background: '#F0FDF9', border: '1px solid #A7F3D0', borderRadius: 5, fontSize: 11, fontWeight: 800, color: '#059669', letterSpacing: 1 }}>
                          {pad3(n)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isExpanded && winningBets.length > 0 && (
              <div style={{ borderTop: '1px solid #F4F7FE', padding: '12px 18px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {winningBets.map((b: any, i: number) => {
                  const color = TYPE_COLOR[b.type] || '#6B7280';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 6px rgba(112,144,176,0.08)' }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: color + '18', color, fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.type}</span>
                      <span style={{ fontWeight: 800, fontSize: 18, color: '#111827', letterSpacing: 2 }}>{String(b.number).padStart(3, '0')}</span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>x{b.count}</span>
                      {b.customer_name && <span style={{ fontSize: 11, color: '#111827', background: '#F9FAFB', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{b.customer_name}</span>}
                      <span style={{ marginLeft: 'auto', padding: '3px 12px', background: '#05CD99', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff' }}>{getWonPrize(b, winStr, r)} WON</span>
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

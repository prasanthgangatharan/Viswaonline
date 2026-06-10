import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import { Trophy, ChevronUp, ChevronDown, FileText, ExternalLink } from 'lucide-react';

function checkWin(bet: any, winStr: string): boolean {
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
    if (bet.type === 'SUPER') return betNum === winStr;
    if (bet.type === 'BOX') {
      const sort = (s: string) => s.split('').sort().join('');
      return sort(betNum) === sort(winStr);
    }
  }
  return false;
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
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Shop Result</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>Declared lottery results</div>
      </div>

      {results.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, textAlign: 'center', color: '#6B7280', fontSize: 14, boxShadow: 'none', border: '1px solid #F3F4F6' }}>
          No results declared yet
        </div>
      )}

      {results.map((r: any) => {
        const winStr = String(r.winning_number).padStart(3, '0');
        const lotteryBets = myBets.filter(b => b.lottery_id === r.lottery_id);
        const winningBets = lotteryBets.filter(b => checkWin(b, winStr));
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{r.lotteries?.name}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>
                  {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 5 }}>
                {winStr.split('').map((d, i) => (
                  <div key={i} style={{ width: 34, height: 40, background: '#F3F4F6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{d}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                {r.document_url && (
                  <a href={r.document_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#F0F4FF', border: '1px solid #C7D2FE', borderRadius: 20, color: '#4318FF', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    <FileText size={11} /> Result Doc <ExternalLink size={10} />
                  </a>
                )}
                {hasWin ? (
                  <button
                    onClick={() => toggleExpand(r.id)}
                    style={{ padding: '6px 14px', background: '#E6FAF5', border: 'none', borderRadius: 20, color: '#05CD99', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Trophy size={13} />
                    {winningBets.length} WIN{winningBets.length > 1 ? 'S' : ''}
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                ) : (
                  <div style={{ padding: '6px 14px', background: '#F9FAFB', borderRadius: 20, color: '#6B7280', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    No win
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
                      <span style={{ fontWeight: 800, fontSize: 18, color: '#111827', letterSpacing: 2 }}>{String(b.number).padStart(b.tab, '0')}</span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>x{b.count}</span>
                      {b.customer_name && <span style={{ fontSize: 11, color: '#111827', background: '#F9FAFB', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{b.customer_name}</span>}
                      <span style={{ marginLeft: 'auto', padding: '3px 12px', background: '#05CD99', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff' }}>WON</span>
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

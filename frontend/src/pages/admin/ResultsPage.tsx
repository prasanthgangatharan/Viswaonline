import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
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

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

export function ResultsPage() {
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [winNumbers, setWinNumbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [declaredResults, setDeclaredResults] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchLotteries = useCallback(async () => {
    try {
      const { data } = await api.get('/lotteries');
      setLotteries(data.filter((l: any) => l.status === 'active' || l.status === 'closed'));
    } catch {}
  }, []);

  const fetchDeclared = useCallback(async () => {
    try {
      const [resData, betsData] = await Promise.all([api.get('/results'), api.get('/bets')]);
      setDeclaredResults(resData.data);
      setAllBets(betsData.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchLotteries();
    fetchDeclared();
    const onResultDeclared = () => { fetchLotteries(); fetchDeclared(); };
    socket.on('result:declared', onResultDeclared);
    return () => { socket.off('result:declared', onResultDeclared); };
  }, [fetchLotteries, fetchDeclared]);

  const declare = async (lotteryId: string) => {
    const raw = winNumbers[lotteryId] || '';
    if (!raw) return toast.error('Enter the 3-digit winning number');
    const num = Number(raw);
    if (isNaN(num) || num < 0 || num > 999) return toast.error('Winning number must be 000-999');
    setLoading((p) => ({ ...p, [lotteryId]: true }));
    try {
      await api.post('/results/declare', { lottery_id: lotteryId, winning_number: num });
      toast.success('Result declared!');
      setWinNumbers((p) => ({ ...p, [lotteryId]: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to declare result');
    } finally {
      setLoading((p) => ({ ...p, [lotteryId]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Results</div>

      {/* Pending Declaration */}
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 12 }}>PENDING DECLARATION</div>
        {lotteries.length === 0 ? (
          <div style={{ ...card, padding: 24, color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>
            No lotteries pending result declaration
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {lotteries.map((l) => (
              <div key={l.id} style={{ ...card, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                  {new Date(l.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="e.g. 456"
                    value={winNumbers[l.id] || ''}
                    onChange={(e) => setWinNumbers((p) => ({ ...p, [l.id]: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    style={{ flex: 1, border: '2px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', color: '#0f172a', fontSize: 22, fontWeight: 700, letterSpacing: 8, textAlign: 'center', background: '#f8fafc', outline: 'none' }}
                  />
                  <button
                    onClick={() => declare(l.id)}
                    disabled={loading[l.id] || (winNumbers[l.id] || '').length !== 3}
                    style={{ padding: '10px 16px', background: (winNumbers[l.id] || '').length === 3 ? '#6366f1' : '#f1f5f9', border: 'none', borderRadius: 8, color: (winNumbers[l.id] || '').length === 3 ? '#fff' : '#94a3b8', cursor: (winNumbers[l.id] || '').length === 3 ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}
                  >
                    {loading[l.id] ? 'Declaring...' : 'Declare'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Declared Results */}
      {declaredResults.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 12 }}>DECLARED RESULTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {declaredResults.map((r: any) => {
              const winStr = String(r.winning_number).padStart(3, '0');
              const lotteryBets = allBets.filter((b: any) => b.lottery_id === r.lottery_id);
              const winningBets = lotteryBets.filter((b: any) => checkWin(b, winStr));
              const isExpanded = expanded.has(r.id);

              return (
                <div key={r.id} style={{ ...card, overflow: 'hidden', border: `1px solid ${winningBets.length > 0 ? '#bbf7d0' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{r.lotteries?.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      {winStr.split('').map((d, i) => (
                        <div key={i} style={{ width: 34, height: 40, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                        No winners
                      </div>
                    )}
                  </div>

                  {isExpanded && winningBets.length > 0 && (
                    <div style={{ borderTop: '1px solid #f0fdf4', padding: '10px 18px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {winningBets.map((b: any, i: number) => {
                        const color = TYPE_COLOR[b.type] || '#94a3b8';
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ minWidth: 0, flex: '0 0 auto' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{b.users?.username || b.agent_id}</div>
                              {b.customer_name && <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.customer_name}</div>}
                            </div>
                            <span style={{ width: 30, height: 26, borderRadius: 5, background: color + '18', border: `1px solid ${color}55`, color, fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.type}</span>
                            <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', letterSpacing: 2 }}>{String(b.number).padStart(b.tab, '0')}</span>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>x{b.count}</span>
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
        </div>
      )}
    </div>
  );
}

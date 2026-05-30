import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
import { Trophy, ChevronUp, ChevronDown } from 'lucide-react';

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
  A: '#05CD99', B: '#EE5D50', C: '#2B73FF',
  AB: '#FFCE20', BC: '#9F7AEA', AC: '#39B8FF',
  SUPER: '#FF8C42', BOX: '#7B61FF',
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 2px 16px rgba(112,144,176,0.1)',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Results</div>
        <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Declare and view lottery results</div>
      </div>

      {/* Pending Declaration */}
      <div>
        <div style={{ fontSize: 11, color: '#A3AED0', letterSpacing: 1.2, fontWeight: 700, marginBottom: 14 }}>PENDING DECLARATION</div>
        {lotteries.length === 0 ? (
          <div style={{ ...card, padding: 28, color: '#A3AED0', fontSize: 14, textAlign: 'center' }}>
            No lotteries pending result declaration
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {lotteries.map((l) => (
              <div key={l.id} style={{ ...card, padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#2B3674', marginBottom: 4 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: '#A3AED0', marginBottom: 16, fontWeight: 500 }}>
                  {new Date(l.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="000"
                    value={winNumbers[l.id] || ''}
                    onChange={(e) => setWinNumbers((p) => ({ ...p, [l.id]: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    style={{ flex: 1, border: '2px solid #E0E5F2', borderRadius: 12, padding: '12px 14px', color: '#2B3674', fontSize: 26, fontWeight: 800, letterSpacing: 10, textAlign: 'center', background: '#F4F7FE', outline: 'none' }}
                  />
                  <button
                    onClick={() => declare(l.id)}
                    disabled={loading[l.id] || (winNumbers[l.id] || '').length !== 3}
                    style={{
                      padding: '10px 18px',
                      background: (winNumbers[l.id] || '').length === 3
                        ? 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)'
                        : '#F4F7FE',
                      border: 'none', borderRadius: 12,
                      color: (winNumbers[l.id] || '').length === 3 ? '#fff' : '#A3AED0',
                      cursor: (winNumbers[l.id] || '').length === 3 ? 'pointer' : 'not-allowed',
                      fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                      boxShadow: (winNumbers[l.id] || '').length === 3 ? '0 4px 14px rgba(67,24,255,0.3)' : 'none',
                    }}
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
          <div style={{ fontSize: 11, color: '#A3AED0', letterSpacing: 1.2, fontWeight: 700, marginBottom: 14 }}>DECLARED RESULTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {declaredResults.map((r: any) => {
              const winStr = String(r.winning_number).padStart(3, '0');
              const lotteryBets = allBets.filter((b: any) => b.lottery_id === r.lottery_id);
              const winningBets = lotteryBets.filter((b: any) => checkWin(b, winStr));
              const isExpanded = expanded.has(r.id);

              return (
                <div key={r.id} style={{ ...card, overflow: 'hidden', boxShadow: winningBets.length > 0 ? '0 2px 16px rgba(5,205,153,0.15)' : '0 2px 16px rgba(112,144,176,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#2B3674' }}>{r.lotteries?.name}</div>
                      <div style={{ fontSize: 11, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>
                        {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 5 }}>
                      {winStr.split('').map((d, i) => (
                        <div key={i} style={{ width: 36, height: 44, background: '#E6FAF5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#05CD99' }}>{d}</div>
                        </div>
                      ))}
                    </div>

                    {winningBets.length > 0 ? (
                      <button
                        onClick={() => toggleExpand(r.id)}
                        style={{ padding: '6px 14px', background: '#E6FAF5', border: 'none', borderRadius: 20, color: '#05CD99', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Trophy size={13} />
                        {winningBets.length} WIN{winningBets.length > 1 ? 'S' : ''}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    ) : (
                      <div style={{ padding: '6px 14px', background: '#F4F7FE', borderRadius: 20, color: '#A3AED0', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        No winners
                      </div>
                    )}
                  </div>

                  {isExpanded && winningBets.length > 0 && (
                    <div style={{ borderTop: '1px solid #F4F7FE', padding: '12px 20px', background: '#FAFBFF', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {winningBets.map((b: any, i: number) => {
                        const color = TYPE_COLOR[b.type] || '#A3AED0';
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 6px rgba(112,144,176,0.08)' }}>
                            <div style={{ minWidth: 0, flex: '0 0 auto' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3674' }}>{b.users?.username || b.agent_id}</div>
                              {b.customer_name && <div style={{ fontSize: 11, color: '#A3AED0' }}>{b.customer_name}</div>}
                            </div>
                            <span style={{ width: 32, height: 28, borderRadius: 7, background: color + '18', color, fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.type}</span>
                            <span style={{ fontWeight: 800, fontSize: 17, color: '#2B3674', letterSpacing: 2 }}>{String(b.number).padStart(b.tab, '0')}</span>
                            <span style={{ fontSize: 12, color: '#A3AED0' }}>x{b.count}</span>
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
        </div>
      )}
    </div>
  );
}

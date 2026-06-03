import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
import { Trophy, ChevronUp, ChevronDown, Filter } from 'lucide-react';

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
const ALL_TYPES = ['A', 'B', 'C', 'AB', 'BC', 'AC', 'SUPER', 'BOX'];

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 20,
  boxShadow: '0 2px 16px rgba(112,144,176,0.1)',
};

const sel: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E0E5F2',
  background: '#fff', color: '#2B3674', fontSize: 13, fontWeight: 600,
};

export function ResultsPage() {
  const [pendingLotteries, setPendingLotteries] = useState<any[]>([]);
  const [winNumbers, setWinNumbers] = useState<Record<string, string>>({});
  const [declaring, setDeclaring] = useState<Record<string, boolean>>({});

  const [results, setResults] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [filterDate, setFilterDate] = useState('');
  const [filterLottery, setFilterLottery] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterType, setFilterType] = useState('');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchPending = useCallback(async () => {
    const { data } = await api.get('/lotteries').catch(() => ({ data: [] }));
    setPendingLotteries((data || []).filter((l: any) => l.status === 'closed'));
  }, []);

  // Fetch results and bets together so winners are never computed against an empty bets array
  const fetchDeclaredData = useCallback(async () => {
    const params: any = {};
    if (filterLottery) params.lottery_id = filterLottery;
    if (filterAgent) params.agent_id = filterAgent;
    const [resResp, betsResp] = await Promise.all([
      api.get('/results').catch(() => ({ data: [] })),
      api.get('/bets', { params }).catch(() => ({ data: [] })),
    ]);
    setResults(resResp.data || []);
    setBets(betsResp.data || []);
  }, [filterLottery, filterAgent]);

  useEffect(() => {
    fetchPending();
    fetchDeclaredData();
    api.get('/lotteries').then(({ data }) => setLotteries(data || [])).catch(() => {});
    api.get('/agents').then(({ data }) => setAgents(data || [])).catch(() => {});
  }, [fetchPending, fetchDeclaredData]);

  useEffect(() => {
    const handler = () => { fetchPending(); fetchDeclaredData(); };
    socket.on('result:declared', handler);
    return () => { socket.off('result:declared', handler); };
  }, [fetchPending, fetchDeclaredData]);

  const declare = async (lotteryId: string) => {
    const raw = winNumbers[lotteryId] || '';
    if (!raw) return toast.error('Enter the 3-digit winning number');
    const num = Number(raw);
    if (isNaN(num) || num < 0 || num > 999) return toast.error('Winning number must be 000–999');
    setDeclaring(p => ({ ...p, [lotteryId]: true }));
    try {
      await api.post('/results/declare', { lottery_id: lotteryId, winning_number: num });
      toast.success('Result declared!');
      setWinNumbers(p => ({ ...p, [lotteryId]: '' }));
      fetchPending(); fetchDeclaredData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to declare result');
    } finally { setDeclaring(p => ({ ...p, [lotteryId]: false })); }
  };

  const toggleExpand = (id: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  // Apply filters to declared results
  const filteredResults = results.filter(r => {
    if (filterDate) {
      const drawDate = new Date(r.lotteries?.draw_time).toISOString().split('T')[0];
      if (drawDate !== filterDate) return false;
    }
    if (filterLottery && r.lottery_id !== filterLottery) return false;
    return true;
  });

  // Per-result type breakdown — respects filterType
  function getBreakdown(result: any) {
    const winStr = String(result.winning_number).padStart(3, '0');
    const lotteryBets = bets.filter(b => b.lottery_id === result.lottery_id);
    const typesToShow = filterType ? [filterType] : ALL_TYPES;
    return typesToShow.map(type => {
      const ofType = lotteryBets.filter(b => b.type === type);
      const winners = ofType.filter(b => checkWin(b, winStr));
      const totalBetCount = ofType.reduce((s, b) => s + Number(b.count), 0);
      const winCount = winners.reduce((s, b) => s + Number(b.count), 0);
      const betAmount = ofType.reduce((s, b) => s + Number(b.amount), 0);
      const winAmount = winners.reduce((s, b) => s + Number(b.amount), 0);
      return { type, totalBetCount, winCount, betAmount, winAmount, winnerRows: winners };
    }).filter(row => row.totalBetCount > 0);
  }

  const hasFilters = filterDate || filterLottery || filterAgent || filterType;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Results</div>
        <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Declare and analyse lottery results</div>
      </div>

      {/* ── Pending Declaration ─────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, color: '#A3AED0', letterSpacing: 1.2, fontWeight: 700, marginBottom: 14 }}>PENDING DECLARATION</div>
        {pendingLotteries.length === 0 ? (
          <div style={{ ...card, padding: 28, color: '#A3AED0', fontSize: 14, textAlign: 'center' }}>
            No lotteries pending result declaration
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {pendingLotteries.map(l => (
              <div key={l.id} style={{ ...card, padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#2B3674', marginBottom: 4 }}>{l.name}</div>
                <div style={{ fontSize: 12, color: '#A3AED0', marginBottom: 16, fontWeight: 500 }}>
                  {new Date(l.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text" inputMode="numeric" maxLength={3} placeholder="000"
                    value={winNumbers[l.id] || ''}
                    onChange={e => setWinNumbers(p => ({ ...p, [l.id]: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    style={{ flex: 1, border: '2px solid #E0E5F2', borderRadius: 12, padding: '12px 14px', color: '#2B3674', fontSize: 26, fontWeight: 800, letterSpacing: 10, textAlign: 'center', background: '#F4F7FE', outline: 'none' }}
                  />
                  <button
                    onClick={() => declare(l.id)}
                    disabled={declaring[l.id] || (winNumbers[l.id] || '').length !== 3}
                    style={{
                      padding: '10px 18px', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                      background: (winNumbers[l.id] || '').length === 3 ? 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)' : '#F4F7FE',
                      color: (winNumbers[l.id] || '').length === 3 ? '#fff' : '#A3AED0',
                      cursor: (winNumbers[l.id] || '').length === 3 ? 'pointer' : 'not-allowed',
                      boxShadow: (winNumbers[l.id] || '').length === 3 ? '0 4px 14px rgba(67,24,255,0.3)' : 'none',
                    }}
                  >
                    {declaring[l.id] ? 'Declaring...' : 'Declare'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Declared Results with Filters ──────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 11, color: '#A3AED0', letterSpacing: 1.2, fontWeight: 700 }}>
            DECLARED RESULTS {filteredResults.length > 0 && `(${filteredResults.length})`}
          </div>
          {hasFilters && (
            <button onClick={() => { setFilterDate(''); setFilterLottery(''); setFilterAgent(''); }}
              style={{ fontSize: 12, color: '#EE5D50', background: '#FEF3F2', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ ...card, padding: '16px 20px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Filter size={15} color="#A3AED0" style={{ marginBottom: 8 }} />
            <div>
              <div style={{ fontSize: 10, color: '#A3AED0', fontWeight: 700, marginBottom: 4 }}>DATE</div>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={sel} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#A3AED0', fontWeight: 700, marginBottom: 4 }}>LOTTERY</div>
              <select value={filterLottery} onChange={e => setFilterLottery(e.target.value)} style={sel}>
                <option value="">All Lotteries</option>
                {lotteries.filter(l => l.status === 'done').map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#A3AED0', fontWeight: 700, marginBottom: 4 }}>AGENT</div>
              <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={sel}>
                <option value="">All Agents</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
              </select>
            </div>
          </div>

          {/* Type toggle buttons */}
          <div>
            <div style={{ fontSize: 10, color: '#A3AED0', fontWeight: 700, marginBottom: 8 }}>TYPE</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_TYPES.map(t => {
                const active = filterType === t;
                const color = TYPE_COLOR[t];
                return (
                  <button key={t} onClick={() => setFilterType(active ? '' : t)} style={{
                    padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${active ? color : '#E0E5F2'}`,
                    background: active ? color + '18' : '#F4F7FE',
                    color: active ? color : '#A3AED0',
                    fontWeight: active ? 800 : 600, fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div style={{ ...card, padding: 28, color: '#A3AED0', fontSize: 14, textAlign: 'center' }}>
            No declared results{hasFilters ? ' matching the selected filters' : ''}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredResults.map(r => {
              const winStr = String(r.winning_number).padStart(3, '0');
              const breakdown = getBreakdown(r);
              const totalWinAmount = breakdown.reduce((s, row) => s + row.winAmount, 0);
              const totalWinCount = breakdown.reduce((s, row) => s + row.winCount, 0);
              const isExpanded = expanded.has(r.id);

              return (
                <div key={r.id} style={{ ...card, overflow: 'hidden' }}>
                  {/* Result header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#2B3674' }}>{r.lotteries?.name}</div>
                      <div style={{ fontSize: 11, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>
                        {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>

                    {/* Winning number bubbles */}
                    <div style={{ display: 'flex', gap: 5 }}>
                      {winStr.split('').map((d, i) => (
                        <div key={i} style={{ width: 38, height: 46, background: '#E6FAF5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#05CD99' }}>{d}</div>
                        </div>
                      ))}
                    </div>

                    {/* Summary chips */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {totalWinCount > 0 ? (
                        <div style={{ padding: '5px 14px', background: '#E6FAF5', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#05CD99', whiteSpace: 'nowrap' }}>
                          <Trophy size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {totalWinCount} win{totalWinCount !== 1 ? 's' : ''} · {fmt(totalWinAmount)}
                        </div>
                      ) : (
                        <div style={{ padding: '5px 14px', background: '#F4F7FE', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#A3AED0' }}>No winners</div>
                      )}
                      <button onClick={() => toggleExpand(r.id)} style={{
                        padding: '5px 14px', background: '#EFF4FB', border: 'none', borderRadius: 20,
                        fontSize: 12, fontWeight: 700, color: '#4318FF', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {isExpanded ? 'Hide' : 'Details'}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Type breakdown table */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #F4F7FE', padding: '16px 20px', background: '#FAFBFF' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#A3AED0', letterSpacing: 1, marginBottom: 12 }}>TYPE BREAKDOWN</div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid #E0E5F2' }}>
                              {['Type', 'Total Bets', 'Total Count', 'Bet Amount', 'Winning Count', 'Agents'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#A3AED0', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {breakdown.map(row => {
                              const agentNames = [...new Set(row.winnerRows.map((b: any) => b.users?.username).filter(Boolean))];
                              return (
                                <tr key={row.type} style={{ borderBottom: '1px solid #F4F7FE', background: row.winCount > 0 ? '#F0FDF9' : 'transparent' }}>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: 7, fontSize: 12, fontWeight: 800, background: (TYPE_COLOR[row.type] || '#A3AED0') + '18', color: TYPE_COLOR[row.type] || '#A3AED0' }}>
                                      {row.type}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#2B3674', fontWeight: 600 }}>{row.totalBetCount}</td>
                                  <td style={{ padding: '10px 12px', color: '#A3AED0' }}>
                                    {bets.filter(b => b.lottery_id === r.lottery_id && b.type === row.type).reduce((s, b) => s + Number(b.count), 0)}
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#2B3674', fontWeight: 600 }}>{fmt(row.betAmount)}</td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: row.winCount > 0 ? '#05CD99' : '#A3AED0' }}>
                                    {row.winCount > 0 ? row.winCount : '—'}
                                  </td>
                                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#A3AED0' }}>
                                    {agentNames.length > 0 ? agentNames.join(', ') : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '1.5px solid #E0E5F2', background: '#F4F7FE' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 800, color: '#2B3674', fontSize: 12 }}>TOTAL</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2B3674' }}>{breakdown.reduce((s, r) => s + r.totalBetCount, 0)}</td>
                              <td style={{ padding: '10px 12px' }} />
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2B3674' }}>{fmt(breakdown.reduce((s, r) => s + r.betAmount, 0))}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 800, color: '#05CD99' }}>{totalWinCount || '—'}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Winning bet rows per agent */}
                      {totalWinCount > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#A3AED0', letterSpacing: 1, marginBottom: 10 }}>WINNING BETS</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {bets.filter(b => b.lottery_id === r.lottery_id && checkWin(b, winStr) && (!filterType || b.type === filterType)).map((b: any, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 6px rgba(112,144,176,0.08)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#2B3674', minWidth: 80 }}>{b.users?.username || '—'}</span>
                                {b.customer_name && <span style={{ fontSize: 11, color: '#A3AED0' }}>{b.customer_name}</span>}
                                <span style={{ width: 34, height: 26, borderRadius: 7, background: (TYPE_COLOR[b.type] || '#A3AED0') + '18', color: TYPE_COLOR[b.type] || '#A3AED0', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.type}</span>
                                <span style={{ fontWeight: 800, fontSize: 16, color: '#2B3674', letterSpacing: 2 }}>{String(b.number).padStart(b.tab, '0')}</span>
                                <span style={{ fontSize: 12, color: '#A3AED0' }}>×{b.count}</span>
                                <span style={{ marginLeft: 'auto', padding: '3px 12px', background: '#05CD99', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff' }}>WON</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

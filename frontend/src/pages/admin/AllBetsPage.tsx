import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

const PAGE_SIZE = 20;

export function AllBetsPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [lotteryFilter, setLotteryFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const fetchBets = useCallback(async () => {
    const params: any = {};
    if (lotteryFilter) params.lottery_id = lotteryFilter;
    if (agentFilter) params.agent_id = agentFilter;
    try { const { data } = await api.get('/bets', { params }); setBets(data); } catch {}
  }, [lotteryFilter, agentFilter]);

  useEffect(() => {
    fetchBets();
    api.get('/lotteries').then(({ data }) => setLotteries(data)).catch(() => {});
    api.get('/agents').then(({ data }) => setAgents(data)).catch(() => {});
  }, [fetchBets]);

  useEffect(() => { setPage(1); }, [lotteryFilter, agentFilter]);

  useEffect(() => {
    const onBetPlaced = (bet: any) => {
      setFlashIds(prev => new Set(prev).add(bet.id));
      setTimeout(() => setFlashIds(prev => { const s = new Set(prev); s.delete(bet.id); return s; }), 1200);
      fetchBets();
    };
    socket.on('bet:placed', onBetPlaced);
    return () => { socket.off('bet:placed', onBetPlaced); };
  }, [fetchBets]);

  const paginated = bets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sel: React.CSSProperties = {
    border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '10px 14px', color: '#2B3674', fontSize: 13,
    background: '#fff', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="admin-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>All Bets</div>
          <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Complete betting ledger</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4318FF', background: '#EFF4FB', padding: '8px 16px', borderRadius: 12 }}>{bets.length} records</div>
      </div>

      <div className="admin-filters">
        <select style={sel} value={lotteryFilter} onChange={e => setLotteryFilter(e.target.value)}>
          <option value="">All Lotteries</option>
          {lotteries.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select style={sel} value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
          <option value="">All Agents</option>
          {agents.map((a: any) => <option key={a.id} value={a.id}>{a.username}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F4F7FE', background: '#FAFBFF' }}>
                {['Ticket', 'Agent', 'Game', 'Type', 'Number', 'Count', 'Amount', 'Time'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 && <tr><td colSpan={8} style={{ padding: 36, textAlign: 'center', color: '#A3AED0' }}>No bets found</td></tr>}
              {paginated.map((b: any) => (
                <tr key={b.id} className={flashIds.has(b.id) ? 'flash-green' : ''} style={{ borderBottom: '1px solid #F4F7FE' }}>
                  <td style={{ padding: '12px 16px', color: '#A3AED0', fontSize: 12, fontFamily: 'monospace' }}>{b.ticket_id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2B3674' }}>{b.users?.username}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', background: '#EFF4FB', color: '#4318FF', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{b.lotteries?.name}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2B3674' }}>{b.type}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 16, color: '#2B3674', letterSpacing: 1 }}>{b.number}</td>
                  <td style={{ padding: '12px 16px', color: '#A3AED0', fontWeight: 500 }}>{b.count}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#05CD99' }}>{fmt(b.amount)}</td>
                  <td style={{ padding: '12px 16px', color: '#A3AED0', fontSize: 12 }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={bets.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#4318FF" />
      </div>
    </div>
  );
}

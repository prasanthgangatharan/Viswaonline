import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function AllBetsPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [lotteryFilter, setLotteryFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    const onBetPlaced = (bet: any) => {
      setFlashIds(prev => new Set(prev).add(bet.id));
      setTimeout(() => setFlashIds(prev => { const s = new Set(prev); s.delete(bet.id); return s; }), 1200);
      fetchBets();
    };
    socket.on('bet:placed', onBetPlaced);
    return () => { socket.off('bet:placed', onBetPlaced); };
  }, [fetchBets]);

  const sel: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', color: '#0f172a', fontSize: 13, background: '#fff' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>All Bets</div>
        <div style={{ fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '5px 12px', borderRadius: 8 }}>{bets.length} records</div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <select style={sel} value={lotteryFilter} onChange={e => setLotteryFilter(e.target.value)}>
          <option value="">All Lotteries</option>
          {lotteries.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select style={sel} value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
          <option value="">All Agents</option>
          {agents.map((a: any) => <option key={a.id} value={a.id}>{a.username}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                {['Ticket', 'Agent', 'Game', 'Type', 'Number', 'Count', 'Amount', 'Time'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 && <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>No bets found</td></tr>}
              {bets.map((b: any) => (
                <tr key={b.id} className={flashIds.has(b.id) ? 'flash-green' : ''} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>{b.ticket_id}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{b.users?.username}</td>
                  <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', background: '#eef2ff', color: '#6366f1', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{b.lotteries?.name}</span></td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{b.type}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 15 }}>{b.number}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.count}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#16a34a' }}>{fmt(b.amount)}</td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

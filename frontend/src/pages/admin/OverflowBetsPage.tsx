import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import { Pagination } from '../../components/Pagination';

const PAGE_SIZE = 20;

function displayNumber(n: number | string) { return String(Number(n)); }

export function OverflowBetsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [lotteryFilter, setLotteryFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchOverflows = useCallback(async () => {
    const params: any = {};
    if (lotteryFilter) params.lottery_id = lotteryFilter;
    if (agentFilter) params.agent_id = agentFilter;
    try {
      const { data } = await api.get('/bets/overflow', { params });
      setRows(data);
    } catch {}
    finally { setLoading(false); }
  }, [lotteryFilter, agentFilter]);

  useEffect(() => {
    fetchOverflows();
    api.get('/lotteries').then(({ data }) => setLotteries(data)).catch(() => {});
    api.get('/agents').then(({ data }) => setAgents(data)).catch(() => {});
  }, [fetchOverflows]);

  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalOverflow = rows.reduce((s, r) => s + Number(r.overflow_count), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="admin-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Overflow Bets</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>
            Bets that partially exceeded the number limit
          </div>
        </div>
        {totalOverflow > 0 && (
          <div style={{ padding: '8px 16px', background: '#FFF8E1', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>
            {totalOverflow} total overflow slots
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={lotteryFilter}
          onChange={e => { setLotteryFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E0E5F2', background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, minWidth: 160 }}
        >
          <option value="">All Lotteries</option>
          {lotteries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select
          value={agentFilter}
          onChange={e => { setAgentFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E0E5F2', background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, minWidth: 140 }}
        >
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #F3F4F6' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Lottery', 'Agent', 'Ticket', 'Tab', 'Type', 'Number', 'Requested', 'Placed', 'Overflow', 'Time'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No overflow bets found</td></tr>
              ) : paginated.map((r, i) => {
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, fontWeight: 700 }}>{r.lotteries?.name || '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.users?.username || '—'}</td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13, fontFamily: 'monospace' }}>{r.ticket_id}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{r.tab}</td>
                    <td style={td}>
                      <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#EBF3FF', color: '#2B73FF' }}>{r.type}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 800, fontSize: 17, letterSpacing: 2 }}>{displayNumber(r.number)}</td>
                    <td style={{ ...td, color: '#6B7280' }}>{r.requested_count}</td>
                    <td style={{ ...td, color: '#05CD99', fontWeight: 700 }}>{r.placed_count}</td>
                    <td style={td}>
                      <span style={{ padding: '4px 12px', borderRadius: 8, background: '#FEF3F2', color: '#EE5D50', fontWeight: 800, fontSize: 14 }}>{r.overflow_count}</span>
                    </td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13 }}>
                      {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import { Pagination } from '../../components/Pagination';

const PAGE_SIZE = 20;

function pad(n: number, len: number) { return String(n).padStart(len, '0'); }

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
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Overflow Bets</div>
          <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>
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
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E0E5F2', background: '#fff', color: '#2B3674', fontSize: 13, fontWeight: 600, minWidth: 160 }}
        >
          <option value="">All Lotteries</option>
          {lotteries.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select
          value={agentFilter}
          onChange={e => { setAgentFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E0E5F2', background: '#fff', color: '#2B3674', fontSize: 13, fontWeight: 600, minWidth: 140 }}
        >
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F4F7FE', background: '#FAFBFF' }}>
                {['Lottery', 'Agent', 'Ticket', 'Tab', 'Type', 'Number', 'Requested', 'Placed', 'Overflow', 'Time'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#A3AED0' }}>Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#A3AED0' }}>No overflow bets found</td></tr>
              ) : paginated.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F4F7FE' }}>
                  <td style={{ padding: '13px 18px', color: '#2B3674', fontWeight: 600 }}>{r.lotteries?.name || '—'}</td>
                  <td style={{ padding: '13px 18px', color: '#2B3674' }}>{r.users?.username || '—'}</td>
                  <td style={{ padding: '13px 18px', color: '#A3AED0', fontFamily: 'monospace', fontSize: 12 }}>{r.ticket_id}</td>
                  <td style={{ padding: '13px 18px', color: '#2B3674', fontWeight: 700 }}>{r.tab}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 800, background: '#EBF3FF', color: '#2B73FF' }}>{r.type}</span>
                  </td>
                  <td style={{ padding: '13px 18px', fontWeight: 800, color: '#2B3674', letterSpacing: 2 }}>{pad(r.number, r.tab)}</td>
                  <td style={{ padding: '13px 18px', color: '#A3AED0', fontWeight: 600 }}>{r.requested_count}</td>
                  <td style={{ padding: '13px 18px', color: '#05CD99', fontWeight: 700 }}>{r.placed_count}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 8, background: '#FEF3F2', color: '#EE5D50', fontWeight: 800, fontSize: 13 }}>{r.overflow_count}</span>
                  </td>
                  <td style={{ padding: '13px 18px', color: '#A3AED0', fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import { useRealtimeBets } from '../../hooks/useRealtimeBets';
import { TrendingUp, Users, DollarSign, ArrowUpFromLine } from 'lucide-react';
import { Pagination } from '../../components/Pagination';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: '24px',
  boxShadow: '0 2px 16px rgba(112,144,176,0.1)',
};

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }

const statCards = [
  {
    key: 'sales',
    label: 'Total Sales Today',
    icon: DollarSign,
    color: '#05CD99',
    bg: 'linear-gradient(135deg, #05CD99 0%, #01B574 100%)',
    shadow: 'rgba(5,205,153,0.3)',
  },
  {
    key: 'profit',
    label: 'Net Profit',
    icon: TrendingUp,
    color: '#4318FF',
    bg: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
    shadow: 'rgba(67,24,255,0.3)',
  },
  {
    key: 'agents',
    label: 'Active Agents',
    icon: Users,
    color: '#2B73FF',
    bg: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)',
    shadow: 'rgba(43,115,255,0.3)',
  },
  {
    key: 'overflow',
    label: 'Overflow Today',
    icon: ArrowUpFromLine,
    color: '#F59E0B',
    bg: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    shadow: 'rgba(245,158,11,0.3)',
  },
];

const PAGE_SIZE = 10;

export function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [clock, setClock] = useState(new Date());
  const [page, setPage] = useState(1);

  useEffect(() => { const id = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(id); }, []);

  const fetchStats = useCallback(async () => {
    try { const { data } = await api.get('/dashboard/stats'); setStats(data); } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useRealtimeBets(useCallback(() => fetchStats(), [fetchStats]));

  const maxSales = stats ? Math.max(...Object.values(stats.salesByGame as Record<string, number>), 1) : 1;
  const maxAgent = stats ? Math.max(...Object.values(stats.agentPerformance as Record<string, number>), 1) : 1;

  const statValues = [
    { value: fmt(stats?.totalSalesToday || 0), sub: `${stats?.ticketCount || 0} tickets sold` },
    { value: fmt(stats?.netProfit || 0), sub: `${stats?.margin || 0}% margin` },
    { value: stats?.activeAgents?.length || 0, sub: (stats?.activeAgents || []).slice(0, 2).map((a: any) => a.username).join(', ') || 'None online' },
    { value: stats?.overflowTotal || 0, sub: `${stats?.overflowEventCount || 0} event${stats?.overflowEventCount === 1 ? '' : 's'}` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Dashboard</div>
          <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Live overview of all activity</div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 700, color: '#4318FF', background: '#EFF4FB', padding: '8px 16px', borderRadius: 12 }}>
          {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="admin-stat-grid">
        {statCards.map((s, i) => {
          const { value, sub } = statValues[i];
          return (
            <div key={s.key} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#A3AED0', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#2B3674', letterSpacing: -0.5 }}>{value}</div>
                </div>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${s.shadow}` }}>
                  <s.icon size={22} color="#fff" strokeWidth={2} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#A3AED0', fontWeight: 500 }}>{sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="admin-charts-grid">
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2B3674', marginBottom: 20 }}>Sales by Game</div>
          {Object.entries(stats?.salesByGame || {}).length === 0 && (
            <div style={{ color: '#A3AED0', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No sales today</div>
          )}
          {Object.entries(stats?.salesByGame || {}).map(([name, amt]: any) => (
            <div key={name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2B3674' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#05CD99' }}>{fmt(amt)}</span>
              </div>
              <div style={{ height: 6, background: '#F4F7FE', borderRadius: 10 }}>
                <div style={{ height: 6, background: 'linear-gradient(90deg, #05CD99 0%, #01B574 100%)', borderRadius: 10, width: `${(amt / maxSales) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2B3674', marginBottom: 20 }}>Agent Performance</div>
          {Object.entries(stats?.agentPerformance || {}).length === 0 && (
            <div style={{ color: '#A3AED0', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No data today</div>
          )}
          {Object.entries(stats?.agentPerformance || {}).map(([name, amt]: any) => (
            <div key={name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2B3674' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4318FF' }}>{fmt(amt)}</span>
              </div>
              <div style={{ height: 6, background: '#F4F7FE', borderRadius: 10 }}>
                <div style={{ height: 6, background: 'linear-gradient(90deg, #4318FF 0%, #9F7AEA 100%)', borderRadius: 10, width: `${(amt / maxAgent) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bets */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', fontSize: 15, fontWeight: 700, color: '#2B3674' }}>Recent Bets</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F4F7FE', background: '#FAFBFF' }}>
                {['Agent', 'Game', 'Number', 'Count', 'Amount', 'Time'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recentBets || []).length === 0 && (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#A3AED0' }}>No bets yet</td></tr>
              )}
              {(stats?.recentBets || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((b: any) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #F4F7FE' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2B3674' }}>{b.users?.username}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 10px', background: '#EFF4FB', color: '#4318FF', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{b.lotteries?.name}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: 15, color: '#2B3674' }}>{b.number}</td>
                  <td style={{ padding: '12px 14px', color: '#A3AED0', fontWeight: 500 }}>{b.count}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#05CD99' }}>{fmt(b.amount)}</td>
                  <td style={{ padding: '12px 14px', color: '#A3AED0', fontSize: 12 }}>{fmtTime(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={(stats?.recentBets || []).length} pageSize={PAGE_SIZE} onChange={setPage} accent="#4318FF" />
      </div>
    </div>
  );
}

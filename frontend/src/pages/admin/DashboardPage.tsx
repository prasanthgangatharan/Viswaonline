import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeBets } from '../../hooks/useRealtimeBets';
import { TrendingUp, Users, DollarSign, ArrowUpFromLine, ArrowUpRight } from 'lucide-react';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }

const statCards = [
  {
    key: 'sales',
    label: 'Total Sales Today',
    sub: 'Live tracking',
    icon: DollarSign,
    cardBg: '#FFFBEB',
    iconBg: '#F59E0B',
  },
  {
    key: 'profit',
    label: 'Net Profit',
    sub: 'After payouts',
    icon: TrendingUp,
    cardBg: '#F5F3FF',
    iconBg: '#7C3AED',
  },
  {
    key: 'agents',
    label: 'Active Agents',
    sub: 'Online now',
    icon: Users,
    cardBg: '#EFF6FF',
    iconBg: '#2563EB',
  },
  {
    key: 'overflow',
    label: 'Overflow Today',
    sub: 'Exceeded limits',
    icon: ArrowUpFromLine,
    cardBg: '#FFF1F2',
    iconBg: '#EF4444',
  },
];

const PAGE_SIZE = 10;

export function DashboardPage() {
  const { user } = useAuth();
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
    { value: fmt(stats?.totalSalesToday || 0), detail: `${stats?.ticketCount || 0} tickets sold` },
    { value: fmt(stats?.netProfit || 0), detail: `${stats?.margin || 0}% margin` },
    { value: String(stats?.activeAgents?.length || 0), detail: (stats?.activeAgents || []).slice(0, 2).map((a: any) => a.username).join(', ') || 'None online' },
    { value: String(stats?.overflowTotal || 0), detail: `${stats?.overflowEventCount || 0} events` },
  ];

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 22px',
    border: '1px solid #F3F4F6',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Greeting Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>
            Hello, {user?.username || 'Admin'}!
          </div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: 400 }}>
            Monitor performance and lottery insights in real time.
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)', padding: '10px 22px', borderRadius: 14, boxShadow: '0 4px 16px rgba(124,58,237,0.3)', textAlign: 'center' }}>
          <div style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
            {clock.getHours() < 12 ? 'AM' : 'PM'}
          </div>
        </div>
      </div>

      {/* Stat Cards — Aether style */}
      <div className="admin-stat-grid">
        {statCards.map((s, i) => {
          const { value, detail } = statValues[i];
          return (
            <div key={s.key} style={{
              background: s.cardBg,
              borderRadius: 20,
              padding: '22px 22px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 148,
              border: '1px solid rgba(0,0,0,0.04)',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{s.sub}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ArrowUpRight size={16} color="#fff" strokeWidth={2.5} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8, fontWeight: 500 }}>{detail}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="admin-charts-grid">
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 18 }}>Sales by Game</div>
          {Object.entries(stats?.salesByGame || {}).length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No sales today</div>
          )}
          {Object.entries(stats?.salesByGame || {}).map(([name, amt]: any) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmt(amt)}</span>
              </div>
              <div style={{ height: 6, background: '#F3F4F6', borderRadius: 10 }}>
                <div style={{ height: 6, background: 'linear-gradient(90deg, #7C3AED 0%, #A78BFA 100%)', borderRadius: 10, width: `${(amt / maxSales) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 18 }}>Agent Performance</div>
          {Object.entries(stats?.agentPerformance || {}).length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No data today</div>
          )}
          {Object.entries(stats?.agentPerformance || {}).map(([name, amt]: any) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>{fmt(amt)}</span>
              </div>
              <div style={{ height: 6, background: '#F3F4F6', borderRadius: 10 }}>
                <div style={{ height: 6, background: 'linear-gradient(90deg, #2563EB 0%, #60A5FA 100%)', borderRadius: 10, width: `${(amt / maxAgent) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bets */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Recent Bets</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Latest activity across all agents</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Agent', 'Game', 'Number', 'Count', 'Amount', 'Time'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recentBets || []).length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No bets yet</td></tr>
              )}
              {(stats?.recentBets || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((b: any, i: number) => {
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, fontWeight: 700 }}>{b.users?.username}</td>
                    <td style={td}>
                      <span style={{ padding: '4px 12px', background: '#F5F3FF', color: '#7C3AED', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{b.lotteries?.name}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 800, fontSize: 17, letterSpacing: 1 }}>{b.number}</td>
                    <td style={{ ...td, color: '#6B7280' }}>{b.count}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#059669' }}>{fmt(b.amount)}</td>
                    <td style={{ ...td, color: '#9CA3AF', fontSize: 13 }}>{fmtTime(b.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={(stats?.recentBets || []).length} pageSize={PAGE_SIZE} onChange={setPage} accent="#7C3AED" />
      </div>
    </div>
  );
}

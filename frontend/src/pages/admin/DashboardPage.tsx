import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import { useRealtimeBets } from '../../hooks/useRealtimeBets';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }

export function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => { const id = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(id); }, []);

  const fetchStats = useCallback(async () => {
    try { const { data } = await api.get('/dashboard/stats'); setStats(data); } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useRealtimeBets(useCallback(() => fetchStats(), [fetchStats]));

  const maxSales = stats ? Math.max(...Object.values(stats.salesByGame as Record<string, number>), 1) : 1;
  const maxAgent = stats ? Math.max(...Object.values(stats.agentPerformance as Record<string, number>), 1) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Dashboard</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Live overview of all activity</div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '6px 14px', borderRadius: 8 }}>
          {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Sales Today', value: fmt(stats?.totalSalesToday || 0), sub: `${stats?.ticketCount || 0} tickets`, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Net Profit', value: fmt(stats?.netProfit || 0), sub: `${stats?.margin || 0}% margin`, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Active Agents', value: stats?.activeAgents?.length || 0, sub: (stats?.activeAgents || []).slice(0, 3).map((a: any) => a.username).join(', ') || 'None', color: '#0284c7', bg: '#f0f9ff' },
        ].map(c => (
          <div key={c.label} style={{ ...card, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 10 }}>{c.label.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Sales by Game</div>
          {Object.entries(stats?.salesByGame || {}).length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No sales today</div>}
          {Object.entries(stats?.salesByGame || {}).map(([name, amt]: any) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{fmt(amt)}</span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                <div style={{ height: 5, background: '#16a34a', borderRadius: 3, width: `${(amt / maxSales) * 100}%`, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Agent Performance</div>
          {Object.entries(stats?.agentPerformance || {}).length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No data today</div>}
          {Object.entries(stats?.agentPerformance || {}).map(([name, amt]: any) => (
            <div key={name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>{fmt(amt)}</span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                <div style={{ height: 5, background: '#6366f1', borderRadius: 3, width: `${(amt / maxAgent) * 100}%`, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bets */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Recent Bets</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Agent', 'Game', 'Number', 'Count', 'Amount', 'Time'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recentBets || []).length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No bets yet</td></tr>
              )}
              {(stats?.recentBets || []).map((b: any) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: '#0f172a' }}>{b.users?.username}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', background: '#eef2ff', color: '#6366f1', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{b.lotteries?.name}</span></td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.number}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{b.count}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#16a34a' }}>{fmt(b.amount)}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{fmtTime(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

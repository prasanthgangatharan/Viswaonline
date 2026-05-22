import { useState, useEffect } from 'react';
import api from '../../lib/agentApi';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function ProfitPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bets/net-pay').then(({ data }) => setRows(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>My Profit</div>

      {loading && <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading...</div>}
      {!loading && rows.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          No profit data available
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {rows.map((r: any, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{r.lottery_name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>{new Date(r.draw_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>TOTAL SALES</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{fmt(r.total_sales)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

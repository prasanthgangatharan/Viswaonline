import { useState, useEffect } from 'react';
import api from '../../lib/agentApi';
import { TrendingUp } from 'lucide-react';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function ProfitPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bets/net-pay').then(({ data }) => setRows(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalProfit = rows.reduce((s, r) => s + Number(r.total_sales || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>My Profit</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: 500 }}>Sales performance per draw</div>
      </div>

      {/* Total Summary Card */}
      {!loading && rows.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', borderRadius: 20, padding: '24px', boxShadow: '0 8px 24px rgba(124,58,237,0.3)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 }}>TOTAL SALES</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 2 }}>{fmt(totalProfit)}</div>
            </div>
          </div>
        </div>
      )}

      {loading && <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 24 }}>Loading...</div>}
      {!loading && rows.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, textAlign: 'center', color: '#6B7280', fontSize: 14, boxShadow: 'none', border: '1px solid #F3F4F6' }}>
          No profit data available
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {rows.map((r: any, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 20, padding: '22px', boxShadow: 'none', border: '1px solid #F3F4F6' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827', marginBottom: 4 }}>{r.lottery_name}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 18, fontWeight: 500 }}>
              {new Date(r.draw_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ padding: '14px', background: '#E6FAF5', borderRadius: 14 }}>
              <div style={{ fontSize: 11, color: '#05CD99', fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>TOTAL SALES</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#05CD99' }}>{fmt(r.total_sales)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

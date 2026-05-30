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
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>My Profit</div>
        <div style={{ fontSize: 13, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Sales performance per draw</div>
      </div>

      {/* Total Summary Card */}
      {!loading && rows.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', borderRadius: 20, padding: '24px', boxShadow: '0 8px 24px rgba(43,115,255,0.3)', color: '#fff' }}>
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

      {loading && <div style={{ color: '#A3AED0', fontSize: 14, textAlign: 'center', padding: 24 }}>Loading...</div>}
      {!loading && rows.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: 28, textAlign: 'center', color: '#A3AED0', fontSize: 14, boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
          No profit data available
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {rows.map((r: any, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 20, padding: '22px', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#2B3674', marginBottom: 4 }}>{r.lottery_name}</div>
            <div style={{ fontSize: 12, color: '#A3AED0', marginBottom: 18, fontWeight: 500 }}>
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

import { useState, useEffect } from 'react';
import api from '../../lib/agentApi';
import { useAuth } from '../../hooks/useAuth';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function AccountPage() {
  const { user } = useAuth();
  const [bets, setBets] = useState<any[]>([]);

  useEffect(() => {
    api.get('/bets/my-tickets').then(({ data }) => setBets(data)).catch(() => {});
  }, []);

  const totalBets = bets.length;
  const totalAmount = bets.reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Account Summary</div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0f2fe', border: '2px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#0284c7' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{user?.username}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Agent ID: {user?.id?.slice(0, 8)}...</div>
          </div>
          <span style={{ marginLeft: 'auto', padding: '4px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>ACTIVE</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { label: 'Total Bets', value: totalBets, color: '#0284c7', bg: '#e0f2fe' },
          { label: 'Total Wagered', value: fmt(totalAmount), color: '#16a34a', bg: '#f0fdf4' },
        ].map((c) => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>{c.label.toUpperCase()}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

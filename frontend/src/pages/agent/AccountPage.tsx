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

      {/* Profile banner */}
      <div style={{ background: '#AB47BC', borderRadius: 16, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>{user?.username}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3, fontWeight: 500 }}>ID: {user?.id?.slice(0, 10)}...</div>
        </div>
        <span style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: 20, fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: 0.5, flexShrink: 0 }}>
          ACTIVE
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#5C6BC0', borderRadius: 16, padding: '22px 18px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>TOTAL BETS</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff' }}>{totalBets}</div>
        </div>
        <div style={{ background: '#66BB6A', borderRadius: 16, padding: '22px 18px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>TOTAL WAGERED</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{fmt(totalAmount)}</div>
        </div>
      </div>

    </div>
  );
}

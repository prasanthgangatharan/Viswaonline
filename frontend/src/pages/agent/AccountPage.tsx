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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Account</div>
        <div style={{ fontSize: 13, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Your profile and statistics</div>
      </div>

      {/* Profile Card */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 6px 16px rgba(43,115,255,0.3)' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#2B3674' }}>{user?.username}</div>
            <div style={{ fontSize: 12, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>ID: {user?.id?.slice(0, 8)}...</div>
          </div>
          <span style={{ padding: '6px 14px', background: '#E6FAF5', borderRadius: 20, fontSize: 11, color: '#05CD99', fontWeight: 700 }}>ACTIVE</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '22px', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 4px 10px rgba(43,115,255,0.3)' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>#</span>
          </div>
          <div style={{ fontSize: 11, color: '#A3AED0', fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>TOTAL BETS</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#2B3674' }}>{totalBets}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: '22px', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, #05CD99 0%, #01B574 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 4px 10px rgba(5,205,153,0.3)' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Rs</span>
          </div>
          <div style={{ fontSize: 11, color: '#A3AED0', fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>TOTAL WAGERED</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674' }}>{fmt(totalAmount)}</div>
        </div>
      </div>
    </div>
  );
}

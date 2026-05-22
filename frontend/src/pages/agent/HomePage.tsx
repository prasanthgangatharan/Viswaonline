import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import { useCountdown } from '../../hooks/useCountdown';
import { FileText, User, DollarSign, TrendingUp, Star } from 'lucide-react';

function pad(n: number) { return String(n).padStart(2, '0'); }

const menuItems = [
  { label: 'Sales Report',    icon: FileText,   color: '#6366f1', bg: '#eef2ff', to: '/agent/sales' },
  { label: 'Account',        icon: User,       color: '#0284c7', bg: '#e0f2fe', to: '/agent/account' },
  { label: 'Net Pay',        icon: DollarSign, color: '#16a34a', bg: '#f0fdf4', to: '/agent/net-pay' },
  { label: 'My Profit',      icon: TrendingUp, color: '#7c3aed', bg: '#f5f3ff', to: '/agent/profit' },
  { label: 'Shop Result',    icon: Star,       color: '#d97706', bg: '#fffbeb', to: '/agent/result' },
];

function LotteryTicketCard({ lottery, onTap }: { lottery: any; onTap: () => void }) {
  const bettingCloseIso = new Date(
    new Date(lottery.draw_time).getTime() - Number(lottery.stop_betting_minutes) * 60 * 1000
  ).toISOString();
  const { hours, minutes, seconds, expired } = useCountdown(bettingCloseIso);

  return (
    <div
      onClick={() => !expired && onTap()}
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        background: expired ? '#f8fafc' : '#fff',
        border: `1px solid ${expired ? '#e2e8f0' : '#bae6fd'}`,
        cursor: expired ? 'default' : 'pointer',
        opacity: expired ? 0.6 : 1,
        boxShadow: expired ? 'none' : '0 2px 8px rgba(2,132,199,0.08)',
      }}
    >
      <div style={{ padding: '16px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: expired ? '#dc2626' : '#0284c7', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>
          {expired ? 'BETTING CLOSED' : 'CLOSES IN'}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
          {lottery.name}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: expired ? '#94a3b8' : '#0284c7', letterSpacing: 3 }}>
          {expired ? '--:--:--' : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
          Draw {new Date(lottery.draw_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          {' - '}closes {new Date(bettingCloseIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [activeLotteries, setActiveLotteries] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchLotteries = useCallback(() => {
    api.get('/lotteries').then(({ data }) => {
      setActiveLotteries(data.filter((l: any) => l.status === 'active'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLotteries();
    socket.on('lottery:created', fetchLotteries);
    socket.on('lottery:closed', fetchLotteries);
    return () => {
      socket.off('lottery:created', fetchLotteries);
      socket.off('lottery:closed', fetchLotteries);
    };
  }, [fetchLotteries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Active Lottery Tickets */}
      {activeLotteries.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '36px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 28, color: '#cbd5e1', marginBottom: 10 }}>-</div>
          <div style={{ color: '#64748b', fontSize: 15, fontWeight: 600 }}>No Active Lottery</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>No tickets available right now</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 10 }}>AVAILABLE TICKETS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {activeLotteries.map((lottery) => (
              <LotteryTicketCard
                key={lottery.id}
                lottery={lottery}
                onTap={() => navigate(`/agent/data-entry/${lottery.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, fontWeight: 600, marginBottom: 10 }}>MENU</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {menuItems.map(({ label, icon: Icon, color, bg, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              style={{
                background: bg,
                border: `1px solid ${color}22`,
                borderRadius: 12,
                padding: '16px 8px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 1px 4px ${color}22` }}>
                <Icon size={20} color={color} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

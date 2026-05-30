import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import { useCountdown } from '../../hooks/useCountdown';
import { FileText, User, DollarSign, TrendingUp, Star } from 'lucide-react';

function pad(n: number) { return String(n).padStart(2, '0'); }

const menuItems = [
  { label: 'Sales Report', icon: FileText,   color: '#4318FF', bg: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', to: '/agent/sales' },
  { label: 'Account',      icon: User,       color: '#2B73FF', bg: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', to: '/agent/account' },
  { label: 'Net Pay',      icon: DollarSign, color: '#05CD99', bg: 'linear-gradient(135deg, #05CD99 0%, #01B574 100%)', to: '/agent/net-pay' },
  { label: 'My Profit',    icon: TrendingUp, color: '#9F7AEA', bg: 'linear-gradient(135deg, #9F7AEA 0%, #7B5EA7 100%)', to: '/agent/profit' },
  { label: 'Shop Result',  icon: Star,       color: '#FFCE20', bg: 'linear-gradient(135deg, #FFCE20 0%, #F5A623 100%)', to: '/agent/result' },
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
        borderRadius: 18,
        overflow: 'hidden',
        background: expired ? '#F4F7FE' : '#fff',
        boxShadow: expired ? 'none' : '0 4px 20px rgba(43,115,255,0.12)',
        cursor: expired ? 'default' : 'pointer',
        opacity: expired ? 0.55 : 1,
        transition: 'all 0.2s',
      }}
    >
      <div style={{ padding: '20px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: expired ? '#EE5D50' : '#2B73FF', letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>
          {expired ? 'BETTING CLOSED' : 'CLOSES IN'}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#2B3674', marginBottom: 10 }}>
          {lottery.name}
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 26, fontWeight: 800,
          color: expired ? '#A3AED0' : '#2B73FF', letterSpacing: 4,
          background: expired ? 'transparent' : '#EBF3FF',
          borderRadius: 12, padding: '8px 12px', display: 'inline-block',
        }}>
          {expired ? '--:--:--' : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
        </div>
        <div style={{ fontSize: 11, color: '#A3AED0', marginTop: 10, fontWeight: 500 }}>
          Draw {new Date(lottery.draw_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const [activeLotteries, setActiveLotteries] = useState<any[]>([]);
  const expiredIds = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  const fetchLotteries = useCallback(() => {
    api.get('/lotteries').then(({ data }) => {
      // Only filter by status; draw-time expiry is handled by the auto-remove effect
      setActiveLotteries(data.filter((l: any) =>
        l.status === 'active' && !expiredIds.current.has(l.id)
      ));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLotteries();
    const interval = setInterval(fetchLotteries, 15000);
    socket.on('lottery:created', fetchLotteries);
    socket.on('lottery:closed', fetchLotteries);
    return () => {
      clearInterval(interval);
      socket.off('lottery:created', fetchLotteries);
      socket.off('lottery:closed', fetchLotteries);
    };
  }, [fetchLotteries]);

  // Auto-remove each lottery the moment its draw time passes
  useEffect(() => {
    if (activeLotteries.length === 0) return;
    const now = Date.now();
    const soonest = Math.min(...activeLotteries.map(l => new Date(l.draw_time).getTime()));
    const delay = soonest - now;
    const removeExpired = () => {
      setActiveLotteries(prev => {
        const expired = prev.filter(l => new Date(l.draw_time).getTime() <= Date.now());
        expired.forEach(l => expiredIds.current.add(l.id));
        return prev.filter(l => new Date(l.draw_time).getTime() > Date.now());
      });
    };
    if (delay <= 0) { removeExpired(); return; }
    const timer = setTimeout(removeExpired, delay);
    return () => clearTimeout(timer);
  }, [activeLotteries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Active Lottery Tickets */}
      <div>
        <div style={{ fontSize: 11, color: '#A3AED0', letterSpacing: 1.2, fontWeight: 700, marginBottom: 12 }}>AVAILABLE TICKETS</div>
        {activeLotteries.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '36px 20px', textAlign: 'center', boxShadow: '0 2px 16px rgba(112,144,176,0.08)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎰</div>
            <div style={{ color: '#2B3674', fontSize: 16, fontWeight: 700 }}>No Active Lottery</div>
            <div style={{ color: '#A3AED0', fontSize: 13, marginTop: 6, fontWeight: 500 }}>No tickets available right now</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {activeLotteries.map((lottery) => (
              <LotteryTicketCard
                key={lottery.id}
                lottery={lottery}
                onTap={() => navigate(`/agent/data-entry/${lottery.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Menu Grid */}
      <div className="agent-home-menu">
        <div style={{ fontSize: 11, color: '#A3AED0', letterSpacing: 1.2, fontWeight: 700, marginBottom: 12 }}>QUICK ACCESS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {menuItems.map(({ label, icon: Icon, color, bg, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              style={{
                background: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '18px 8px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 2px 12px rgba(112,144,176,0.1)',
              }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${color}44` }}>
                <Icon size={20} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2B3674', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

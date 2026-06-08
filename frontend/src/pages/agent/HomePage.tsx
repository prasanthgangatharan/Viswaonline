import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import { useCountdown } from '../../hooks/useCountdown';
import { FileText, User, DollarSign, TrendingUp, Star } from 'lucide-react';

function pad(n: number) { return String(n).padStart(2, '0'); }

const LOTTERY_COLORS = ['#F06292', '#66BB6A', '#7986CB', '#FF7043', '#FFA726', '#26C6DA'];

const menuItems = [
  { label: 'Sales Report', icon: FileText,   bg: '#F06292', to: '/agent/sales'   },
  { label: 'Account',      icon: User,       bg: '#AB47BC', to: '/agent/account' },
  { label: 'Net Pay',      icon: DollarSign, bg: '#5C6BC0', to: '/agent/net-pay' },
  { label: 'My Profit',    icon: TrendingUp, bg: '#66BB6A', to: '/agent/profit'  },
  { label: 'Shop Result',  icon: Star,       bg: '#EF5350', to: '/agent/result'  },
];

function LotteryTicketCard({ lottery, onTap, colorIndex }: { lottery: any; onTap: () => void; colorIndex: number }) {
  const bettingCloseIso = new Date(
    new Date(lottery.draw_time).getTime() - Number(lottery.stop_betting_minutes) * 60 * 1000
  ).toISOString();
  const { hours, minutes, seconds, expired } = useCountdown(bettingCloseIso);
  const bg = expired ? '#9E9E9E' : LOTTERY_COLORS[colorIndex % LOTTERY_COLORS.length];

  return (
    <div
      onClick={() => !expired && onTap()}
      style={{
        borderRadius: 12,
        background: bg,
        cursor: expired ? 'default' : 'pointer',
        opacity: expired ? 0.6 : 1,
        padding: '16px 10px',
        textAlign: 'center',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
        {lottery.name}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 3, color: '#fff' }}>
        {expired ? 'CLOSED' : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: 600 }}>
        {new Date(lottery.draw_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
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

  const useCarousel = activeLotteries.length > 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Lottery Tickets */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>Tickets</div>

        {activeLotteries.length === 0 ? (
          <div style={{ background: '#F3F4F6', borderRadius: 12, padding: '18px', textAlign: 'center' }}>
            <div style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>No tickets right now</div>
          </div>
        ) : useCarousel ? (
          /* Carousel: horizontal scroll, 2 cards visible at a time */
          <div style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none' as any,
            paddingBottom: 4,
          }}>
            {activeLotteries.map((lottery, i) => (
              <div key={lottery.id} style={{ minWidth: 'calc(50% - 5px)', flexShrink: 0, scrollSnapAlign: 'start' }}>
                <LotteryTicketCard lottery={lottery} colorIndex={i} onTap={() => navigate(`/agent/data-entry/${lottery.id}`)} />
              </div>
            ))}
          </div>
        ) : (
          /* 2×2 grid for ≤4 */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {activeLotteries.map((lottery, i) => (
              <LotteryTicketCard
                key={lottery.id}
                lottery={lottery}
                colorIndex={i}
                onTap={() => navigate(`/agent/data-entry/${lottery.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Menu Grid */}
      <div className="agent-home-menu">
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>Menu</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {menuItems.map(({ label, icon: Icon, bg, to }, index) => {
            const count = menuItems.length;
            const rem = count % 3;
            let gridColumn = 'span 2';
            if (rem === 2 && index >= count - 2) {
              gridColumn = index === count - 2 ? '2 / span 2' : '4 / span 2';
            } else if (rem === 1 && index === count - 1) {
              gridColumn = '3 / span 2';
            }
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                style={{
                  gridColumn,
                  background: bg,
                  border: 'none',
                  borderRadius: 14,
                  padding: '22px 8px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'transform 0.12s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Icon size={28} color="#fff" strokeWidth={2} />
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

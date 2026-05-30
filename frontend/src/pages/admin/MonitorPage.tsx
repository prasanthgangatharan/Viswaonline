import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

const PAGE_SIZE = 20;

export function MonitorPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLTableRowElement>(null);

  const fetchBets = useCallback(async () => {
    try { const { data } = await api.get('/bets'); setBets(data); } catch {}
  }, []);

  useEffect(() => {
    fetchBets();
    const onBetPlaced = (bet: any) => {
      setFlashIds((prev) => new Set(prev).add(bet.id));
      setTimeout(() => setFlashIds((prev) => { const s = new Set(prev); s.delete(bet.id); return s; }), 1200);
      fetchBets();
      setPage(1);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    socket.on('bet:placed', onBetPlaced);
    return () => { socket.off('bet:placed', onBetPlaced); };
  }, [fetchBets]);

  const paginated = bets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Live Monitor</div>
          <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Real-time bet stream</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#E6FAF5', borderRadius: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#05CD99', boxShadow: '0 0 0 3px rgba(5,205,153,0.25)' }} />
          <span style={{ fontSize: 12, color: '#05CD99', fontWeight: 700 }}>Live</span>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#FAFBFF', zIndex: 1, borderBottom: '1px solid #F4F7FE' }}>
              <tr>
                {['Time', 'Agent', 'Lottery', 'Type', 'Number', 'Count', 'Amount'].map((h) => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: '#A3AED0' }}>Waiting for bets...</td></tr>
              )}
              {paginated.map((b: any, i) => (
                <tr key={b.id} ref={i === 0 && page === 1 ? topRef : undefined} className={flashIds.has(b.id) ? 'flash-green' : ''} style={{ borderBottom: '1px solid #F4F7FE', transition: 'background 0.3s' }}>
                  <td style={{ padding: '12px 16px', color: '#A3AED0', fontFamily: 'monospace', fontSize: 12 }}>
                    {new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2B3674' }}>{b.users?.username}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', background: '#EFF4FB', color: '#4318FF', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{b.lotteries?.name}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2B3674' }}>{b.type}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 16, color: '#2B3674', letterSpacing: 1 }}>{b.number}</td>
                  <td style={{ padding: '12px 16px', color: '#A3AED0', fontWeight: 500 }}>{b.count}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#05CD99' }}>{fmt(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={bets.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#4318FF" />
      </div>
    </div>
  );
}

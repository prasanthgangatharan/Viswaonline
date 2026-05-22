import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function MonitorPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const topRef = useRef<HTMLTableRowElement>(null);

  const fetchBets = useCallback(async () => {
    try { const { data } = await api.get('/bets'); setBets(data.slice(0, 50)); } catch {}
  }, []);

  useEffect(() => {
    fetchBets();
    const onBetPlaced = (bet: any) => {
      setFlashIds((prev) => new Set(prev).add(bet.id));
      setTimeout(() => setFlashIds((prev) => { const s = new Set(prev); s.delete(bet.id); return s; }), 1200);
      fetchBets();
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    socket.on('bet:placed', onBetPlaced);
    return () => { socket.off('bet:placed', onBetPlaced); };
  }, [fetchBets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Live Monitor</div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 2px #bbf7d0' }} />
        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>Live</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, borderBottom: '1px solid #f1f5f9' }}>
            <tr>
              {['Time', 'Agent', 'Lottery', 'Type', 'Number', 'Count', 'Amount'].map((h) => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bets.length === 0 && <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Waiting for bets...</td></tr>}
            {bets.map((b: any, i) => (
              <tr key={b.id} ref={i === 0 ? topRef : undefined} className={flashIds.has(b.id) ? 'flash-green' : ''} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.3s' }}>
                <td style={{ padding: '10px 14px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{b.users?.username}</td>
                <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', background: '#eef2ff', color: '#6366f1', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{b.lotteries?.name}</span></td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{b.type}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{b.number}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.count}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#16a34a' }}>{fmt(b.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

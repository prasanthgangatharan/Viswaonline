import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function RiskViewPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRisk = useCallback(() => {
    api.get('/bets/risk-view').then(({ data }) => setRows(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRisk();
    socket.on('bet:placed', fetchRisk);
    return () => { socket.off('bet:placed', fetchRisk); };
  }, [fetchRisk]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Risk View</div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                {['Lottery', 'Number', 'Type', 'Total Count', 'Total at Risk'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>No bets data</td></tr>}
              {rows.map((r, i) => {
                const highRisk = r.total_amount > 500;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f8fafc', background: highRisk ? '#fff7ed' : 'transparent' }}>
                    <td style={{ padding: '11px 16px', color: '#0f172a' }}>{r.lottery_name}</td>
                    <td style={{ padding: '11px 16px', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{r.number}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ padding: '2px 8px', background: '#eef2ff', color: '#6366f1', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r.type}</span>
                    </td>
                    <td style={{ padding: '11px 16px', color: '#64748b' }}>{r.total_count}</td>
                    <td style={{ padding: '11px 16px', fontWeight: 700, color: highRisk ? '#ea580c' : '#16a34a' }}>
                      {fmt(r.total_amount)}
                      {highRisk && <span style={{ marginLeft: 8, fontSize: 10, background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>HIGH</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

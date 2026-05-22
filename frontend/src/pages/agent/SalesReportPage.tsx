import { useState, useEffect } from 'react';
import api from '../../lib/agentApi';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function SalesReportPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try { const { data } = await api.get('/bets/sales-summary', { params: { date } }); setBets(data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [date]);

  const total = bets.reduce((s, b) => s + Number(b.amount), 0);

  const inp: React.CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', color: '#0f172a', fontSize: 13, background: '#fff' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Sales Report</div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        <div style={{ fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '5px 12px', borderRadius: 8 }}>{bets.length} entries - {fmt(total)}</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              {['Ticket#', 'Lottery', 'Type', 'Number', 'Count', 'Amount', 'Time'].map((h) => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>}
            {!loading && bets.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No bets found</td></tr>}
            {bets.map((b: any) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>{b.ticket_id}</td>
                <td style={{ padding: '10px 14px', color: '#0f172a' }}>{b.lotteries?.name}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0284c7' }}>{b.type}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{b.number}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.count}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#16a34a' }}>{fmt(b.amount)}</td>
                <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bets.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>TOTAL ENTRIES</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0284c7', marginTop: 4 }}>{bets.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>TOTAL AMOUNT</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>{fmt(total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

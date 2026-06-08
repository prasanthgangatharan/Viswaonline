import { useState, useEffect } from 'react';
import api from '../../lib/agentApi';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

const PAGE_SIZE = 20;

export function SalesReportPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try { const { data } = await api.get('/bets/sales-summary', { params: { date } }); setBets(data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); setPage(1); }, [date]);

  const total = bets.reduce((s, b) => s + Number(b.amount), 0);
  const paginated = bets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Sales Report</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>Your daily betting summary</div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: '1.5px solid #E0E5F2', borderRadius: 12, padding: '10px 14px', color: '#111827', fontSize: 13, background: '#fff', fontFamily: 'inherit' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', background: '#F0EBFF', padding: '8px 14px', borderRadius: 12 }}>
          {bets.length} entries · {fmt(total)}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'none', border: '1px solid #F3F4F6' }}>
        <div className="agent-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ticket#', 'Lottery', 'Type', 'Number', 'Count', 'Amount', 'Time'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>Loading...</td></tr>}
              {!loading && bets.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No bets found for this date</td></tr>}
              {paginated.map((b: any, i: number) => {
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13, fontFamily: 'monospace' }}>{b.ticket_id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{b.lotteries?.name}</td>
                    <td style={{ ...td, fontWeight: 800, color: '#7C3AED' }}>{b.type}</td>
                    <td style={{ ...td, fontWeight: 800, fontSize: 17, letterSpacing: 1 }}>{b.number}</td>
                    <td style={{ ...td, color: '#6B7280' }}>{b.count}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#05CD99' }}>{fmt(b.amount)}</td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13 }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={bets.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#7C3AED" />
      </div>

      {bets.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', display: 'flex', gap: 40, boxShadow: 'none', border: '1px solid #F3F4F6' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: 0.8 }}>TOTAL ENTRIES</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#7C3AED', marginTop: 6 }}>{bets.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: 0.8 }}>TOTAL AMOUNT</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#05CD99', marginTop: 6 }}>{fmt(total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

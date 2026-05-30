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
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Sales Report</div>
        <div style={{ fontSize: 13, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Your daily betting summary</div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: '1.5px solid #E0E5F2', borderRadius: 12, padding: '10px 14px', color: '#2B3674', fontSize: 13, background: '#fff', fontFamily: 'inherit' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2B73FF', background: '#EBF3FF', padding: '8px 14px', borderRadius: 12 }}>
          {bets.length} entries · {fmt(total)}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
        <div className="agent-table-scroll">
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F4F7FE', background: '#FAFBFF' }}>
                {['Ticket#', 'Lottery', 'Type', 'Number', 'Count', 'Amount', 'Time'].map((h) => (
                  <th key={h} style={{ padding: '14px 14px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#A3AED0' }}>Loading...</td></tr>}
              {!loading && bets.length === 0 && <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#A3AED0' }}>No bets found for this date</td></tr>}
              {paginated.map((b: any) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #F4F7FE' }}>
                  <td style={{ padding: '12px 14px', color: '#A3AED0', fontSize: 11, fontFamily: 'monospace' }}>{b.ticket_id}</td>
                  <td style={{ padding: '12px 14px', color: '#2B3674', fontWeight: 600 }}>{b.lotteries?.name}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#2B73FF' }}>{b.type}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#2B3674', letterSpacing: 1 }}>{b.number}</td>
                  <td style={{ padding: '12px 14px', color: '#A3AED0', fontWeight: 500 }}>{b.count}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#05CD99' }}>{fmt(b.amount)}</td>
                  <td style={{ padding: '12px 14px', color: '#A3AED0', fontSize: 12 }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={bets.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#2B73FF" />
      </div>

      {bets.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', display: 'flex', gap: 40, boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
          <div>
            <div style={{ fontSize: 11, color: '#A3AED0', fontWeight: 700, letterSpacing: 0.8 }}>TOTAL ENTRIES</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#2B73FF', marginTop: 6 }}>{bets.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#A3AED0', fontWeight: 700, letterSpacing: 0.8 }}>TOTAL AMOUNT</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#05CD99', marginTop: 6 }}>{fmt(total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

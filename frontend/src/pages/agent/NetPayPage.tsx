import { useState, useEffect } from 'react';
import api from '../../lib/agentApi';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

const PAGE_SIZE = 20;

export function NetPayPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/bets/net-pay').then(({ data }) => setRows(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Net Pay</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: 500 }}>Sales summary per lottery draw</div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'none', border: '1px solid #F3F4F6' }}>
        <div className="agent-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Lottery', 'Draw Date', 'Total Sales', 'Status'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No data found</td></tr>}
              {paginated.map((r: any, i) => {
                const settled = r.settlement_status === 'Settled';
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, fontWeight: 700 }}>{r.lottery_name}</td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13 }}>
                      {new Date(r.draw_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...td, fontWeight: 800, color: '#05CD99' }}>{fmt(r.total_sales)}</td>
                    <td style={td}>
                      <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: settled ? '#E6FAF5' : '#FFF8E6', color: settled ? '#05CD99' : '#D4A900' }}>
                        {r.settlement_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#7C3AED" />
      </div>
    </div>
  );
}

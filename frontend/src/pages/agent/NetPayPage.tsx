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
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Net Pay</div>
        <div style={{ fontSize: 13, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Sales summary per lottery draw</div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
        <div className="agent-table-scroll">
          <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F4F7FE', background: '#FAFBFF' }}>
                {['Lottery', 'Draw Date', 'Total Sales', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} style={{ padding: 28, textAlign: 'center', color: '#A3AED0' }}>Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={4} style={{ padding: 28, textAlign: 'center', color: '#A3AED0' }}>No data found</td></tr>}
              {paginated.map((r: any, i) => {
                const settled = r.settlement_status === 'Settled';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F4F7FE' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#2B3674' }}>{r.lottery_name}</td>
                    <td style={{ padding: '14px 18px', color: '#A3AED0', fontSize: 12, fontWeight: 500 }}>
                      {new Date(r.draw_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#05CD99' }}>{fmt(r.total_sales)}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: settled ? '#E6FAF5' : '#FFF8E6',
                        color: settled ? '#05CD99' : '#D4A900',
                      }}>
                        {r.settlement_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#2B73FF" />
      </div>
    </div>
  );
}

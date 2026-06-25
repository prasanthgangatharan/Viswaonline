import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import { AlertTriangle } from 'lucide-react';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }
function typeTab(type: string) {
  return ['A', 'B', 'C'].includes(type)
    ? 1
    : ['AB', 'BC', 'AC'].includes(type)
      ? 2
      : 3;
}

function displayNumber(
  number: number | string,
  tab?: number,
  type?: string,
) {
  return String(number).padStart(
    Number(tab ?? typeTab(type || 'SUPER')),
    '0',
  );
}
const PAGE_SIZE = 20;

export function RiskViewPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchRisk = useCallback(() => {
    api.get('/bets/risk-view').then(({ data }) => setRows(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRisk();
    socket.on('bet:placed', fetchRisk);
    return () => { socket.off('bet:placed', fetchRisk); };
  }, [fetchRisk]);

  const highRiskCount = rows.filter(r => r.total_amount > 500).length;
  const paginated = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="admin-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Risk View</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>Monitor high-risk bet concentrations</div>
        </div>
        {highRiskCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#FEF3F2', borderRadius: 12 }}>
            <AlertTriangle size={16} color="#EE5D50" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#EE5D50' }}>{highRiskCount} high risk</span>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #F3F4F6' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Lottery', 'Number', 'Type', 'Total Count', 'Total at Risk'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No bets data</td></tr>}
              {paginated.map((r, i) => {
                const highRisk = r.total_amount > 500;
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={i} style={{ background: highRisk ? '#FFFBF0' : i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, fontWeight: 600 }}>{r.lottery_name}</td>
                    <td style={{ ...td, fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{displayNumber(r.number, r.tab, r.type)}</td>
                    <td style={td}>
                      <span style={{ padding: '4px 12px', background: '#F5F3FF', color: '#7C3AED', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{r.type}</span>
                    </td>
                    <td style={{ ...td, color: '#6B7280' }}>{r.total_count}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: highRisk ? '#EE5D50' : '#05CD99' }}>{fmt(r.total_amount)}</span>
                        {highRisk && <span style={{ fontSize: 11, background: '#FEF3F2', color: '#EE5D50', borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>HIGH</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#4318FF" />
      </div>
    </div>
  );
}

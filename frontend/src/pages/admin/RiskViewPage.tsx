import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import { AlertTriangle } from 'lucide-react';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

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
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Risk View</div>
          <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>Monitor high-risk bet concentrations</div>
        </div>
        {highRiskCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#FEF3F2', borderRadius: 12 }}>
            <AlertTriangle size={16} color="#EE5D50" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#EE5D50' }}>{highRiskCount} high risk</span>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 16px rgba(112,144,176,0.1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F4F7FE', background: '#FAFBFF' }}>
                {['Lottery', 'Number', 'Type', 'Total Count', 'Total at Risk'].map((h) => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ padding: 36, textAlign: 'center', color: '#A3AED0' }}>Loading...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ padding: 36, textAlign: 'center', color: '#A3AED0' }}>No bets data</td></tr>}
              {paginated.map((r, i) => {
                const highRisk = r.total_amount > 500;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F4F7FE', background: highRisk ? '#FFFBF0' : 'transparent' }}>
                    <td style={{ padding: '13px 18px', color: '#2B3674', fontWeight: 500 }}>{r.lottery_name}</td>
                    <td style={{ padding: '13px 18px', fontWeight: 800, fontSize: 17, color: '#2B3674', letterSpacing: 1 }}>{r.number}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{ padding: '3px 10px', background: '#EFF4FB', color: '#4318FF', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{r.type}</span>
                    </td>
                    <td style={{ padding: '13px 18px', color: '#A3AED0', fontWeight: 500 }}>{r.total_count}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: highRisk ? '#EE5D50' : '#05CD99' }}>{fmt(r.total_amount)}</span>
                        {highRisk && (
                          <span style={{ fontSize: 10, background: '#FEF3F2', color: '#EE5D50', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>HIGH</span>
                        )}
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

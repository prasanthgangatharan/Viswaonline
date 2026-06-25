import { useState, useEffect } from 'react';
import api from '../../lib/agentApi';
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
  type?: string,
) {
  return String(number).padStart(typeTab(type || 'SUPER'), '0');
}
const ALL_TYPES = ['A', 'B', 'C', 'AB', 'BC', 'AC', 'SUPER', 'BOX'];
const PAGE_SIZE = 20;

export function SalesReportPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('');
  const [filterLottery, setFilterLottery] = useState('');
  const [lotteryNames, setLotteryNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchBets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bets/sales-summary', { params: { date } });
      setBets(data);
      const names = [...new Set<string>(data.map((b: any) => b.lotteries?.name).filter(Boolean))];
      setLotteryNames(names.sort());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchBets(); setPage(1); }, [date]);
  useEffect(() => { setPage(1); }, [filterType, filterLottery]);

  const filtered = bets.filter(b => {
    if (filterType && b.type !== filterType) return false;
    if (filterLottery && b.lotteries?.name !== filterLottery) return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, b) => s + Number(b.amount), 0);
  const totalCount = filtered.reduce((s, b) => s + Number(b.count), 0);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sel: React.CSSProperties = {
    border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '10px 14px', color: '#111827', fontSize: 13,
    background: '#fff', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Sales Report</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: 500 }}>Your daily betting summary</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={sel} />
        <select style={sel} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={sel} value={filterLottery} onChange={e => setFilterLottery(e.target.value)}>
          <option value="">All Lotteries</option>
          {lotteryNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {(filterType || filterLottery) && (
          <button onClick={() => { setFilterType(''); setFilterLottery(''); }}
            style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#EF4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Clear
          </button>
        )}
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
              {!loading && filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No bets found</td></tr>}
              {paginated.map((b: any, i: number) => {
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13, fontFamily: 'monospace' }}>{b.ticket_id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{b.lotteries?.name}</td>
                    <td style={{ ...td, fontWeight: 800, color: '#7C3AED' }}>{b.type}</td>
<td style={{ ...td, fontWeight: 800, fontSize: 17, letterSpacing: 1 }}>
  {displayNumber(b.number, b.type)}
</td>                    <td style={{ ...td, color: '#6B7280' }}>{b.count}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#05CD99' }}>{fmt(b.amount)}</td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13 }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#7C3AED" />
      </div>

      {filtered.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', display: 'flex', gap: 40, flexWrap: 'wrap', boxShadow: 'none', border: '1px solid #F3F4F6' }}>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: 0.8 }}>TOTAL ENTRIES</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#4318FF', marginTop: 6 }}>{filtered.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: 0.8 }}>TOTAL COUNT</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#7C3AED', marginTop: 6 }}>{totalCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, letterSpacing: 0.8 }}>TOTAL AMOUNT</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#05CD99', marginTop: 6 }}>{fmt(totalAmount)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

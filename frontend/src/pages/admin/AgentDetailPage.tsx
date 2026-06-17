import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/adminApi';
import { ArrowLeft, Download } from 'lucide-react';
import { Pagination } from '../../components/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ALL_TYPES = ['A', 'B', 'C', 'AB', 'BC', 'AC', 'SUPER', 'BOX'];
const PAGE_SIZE = 20;
function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [lotteryNames, setLotteryNames] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterLottery, setFilterLottery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/agents').then(({ data }) => {
      setAgent(data.find((a: any) => a.id === id) ?? null);
    }).catch(() => {});

    api.get('/bets', { params: { agent_id: id } }).then(({ data }) => {
      setBets(data);
      const names = [...new Set<string>(data.map((b: any) => b.lotteries?.name).filter(Boolean))];
      setLotteryNames(names.sort());
    }).catch(() => {});
  }, [id]);

  useEffect(() => { setPage(1); }, [filterType, filterDate, filterLottery]);

  const filtered = bets.filter(b => {
    if (filterType && b.type !== filterType) return false;
    if (filterDate && new Date(b.created_at).toISOString().split('T')[0] !== filterDate) return false;
    if (filterLottery && b.lotteries?.name !== filterLottery) return false;
    return true;
  });

  const totalCount = filtered.reduce((s, b) => s + Number(b.count), 0);
  const totalAmount = filtered.reduce((s, b) => s + Number(b.amount), 0);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const username = agent?.username || agent?.users?.username || '—';
  const status = agent?.status || agent?.users?.status || 'active';
  const createdAt = agent?.created_at || agent?.users?.created_at;

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.setTextColor(43, 54, 116);
    doc.text(`Agent Report: ${username}`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(163, 174, 208);
    const parts = [
      filterType ? `Type: ${filterType}` : '',
      filterDate ? `Date: ${filterDate}` : '',
      filterLottery ? `Lottery: ${filterLottery}` : '',
    ].filter(Boolean).join('  |  ');
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}${parts ? `   Filters: ${parts}` : ''}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Ticket', 'Lottery', 'Type', 'Number', 'Count', 'Amount', 'Date', 'Time']],
      body: filtered.map(b => [
        b.ticket_id || '-',
        b.lotteries?.name || '-',
        b.type,
        String(b.number).padStart(3, '0'),
        b.count,
        `Rs.${Math.round(b.amount).toLocaleString('en-IN')}`,
        new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      ]),
      headStyles: { fillColor: [67, 24, 255], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [244, 247, 254] },
    });
    doc.save(`agent-${username}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const sel: React.CSSProperties = {
    border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '10px 14px', color: '#111827', fontSize: 13,
    background: '#fff', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/admin/agents')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F9FAFB', border: '1.5px solid #E0E5F2', borderRadius: 10, color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff' }}>
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>{username}</div>
              <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: status === 'active' ? '#E6FAF5' : '#FEF3F2', color: status === 'active' ? '#05CD99' : '#EE5D50', marginRight: 8 }}>{status.toUpperCase()}</span>
                {createdAt && `Joined ${new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
              </div>
            </div>
          </div>
        </div>
        <button onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#fff', border: '1.5px solid #E0E5F2', borderRadius: 12, color: '#111827', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Download size={14} /> PDF
        </button>
      </div>

      {/* Agent prices */}
      {agent && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[['Tab 1 Price', agent.tab1_price], ['Tab 2 Price', agent.tab2_price], ['Tab 3 Price', agent.tab3_price]].map(([label, val]) => (
            <div key={label as string} style={{ background: '#fff', borderRadius: 14, padding: '14px 20px', border: '1px solid #F3F4F6', minWidth: 120 }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#4318FF', marginTop: 4 }}>Rs.{val ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select style={sel} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={{ ...sel, cursor: 'pointer' }} />
        <select style={sel} value={filterLottery} onChange={e => setFilterLottery(e.target.value)}>
          <option value="">All Lotteries</option>
          {lotteryNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {(filterType || filterDate || filterLottery) && (
          <button onClick={() => { setFilterType(''); setFilterDate(''); setFilterLottery(''); }}
            style={{ padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#EF4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'ENTRIES', value: filtered.length, color: '#4318FF' },
          { label: 'TOTAL COUNT', value: totalCount, color: '#7C3AED' },
          { label: 'TOTAL AMOUNT', value: fmt(totalAmount), color: '#05CD99' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 22px', border: '1px solid #F3F4F6', flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #F3F4F6' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ticket', 'Lottery', 'Type', 'Number', 'Count', 'Amount', 'Date', 'Time'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No bets found</td></tr>
              )}
              {paginated.map((b, i) => {
                const td: React.CSSProperties = { padding: '14px 18px', fontSize: 14, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, color: '#6B7280', fontSize: 12, fontFamily: 'monospace' }}>{b.ticket_id}</td>
                    <td style={td}>
                      <span style={{ padding: '3px 10px', background: '#F5F3FF', color: '#7C3AED', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{b.lotteries?.name}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{b.type}</td>
                    <td style={{ ...td, fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>{String(b.number).padStart(3, '0')}</td>
                    <td style={{ ...td, color: '#6B7280' }}>{b.count}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#05CD99' }}>{fmt(b.amount)}</td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 12 }}>{new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 12 }}>{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#4318FF" />
      </div>
    </div>
  );
}

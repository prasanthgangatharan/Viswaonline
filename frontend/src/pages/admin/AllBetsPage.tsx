import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pagination } from '../../components/Pagination';

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

const PAGE_SIZE = 20;

export function AllBetsPage() {
  const [bets, setBets] = useState<any[]>([]);
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [lotteryFilter, setLotteryFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);

  const fetchBets = useCallback(async () => {
    const params: any = {};
    if (lotteryFilter) params.lottery_id = lotteryFilter;
    if (agentFilter) params.agent_id = agentFilter;
    try { const { data } = await api.get('/bets', { params }); setBets(data); } catch {}
  }, [lotteryFilter, agentFilter]);

  useEffect(() => {
    fetchBets();
    api.get('/lotteries').then(({ data }) => setLotteries(data)).catch(() => {});
    api.get('/agents').then(({ data }) => setAgents(data)).catch(() => {});
  }, [fetchBets]);

  useEffect(() => { setPage(1); }, [lotteryFilter, agentFilter]);

  useEffect(() => {
    const onBetPlaced = (bet: any) => {
      setFlashIds(prev => new Set(prev).add(bet.id));
      setTimeout(() => setFlashIds(prev => { const s = new Set(prev); s.delete(bet.id); return s; }), 1200);
      fetchBets();
    };
    socket.on('bet:placed', onBetPlaced);
    return () => { socket.off('bet:placed', onBetPlaced); };
  }, [fetchBets]);

  const paginated = bets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.setTextColor(43, 54, 116);
    doc.text('Betting Details', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(163, 174, 208);
    const filterDesc = [
      lotteryFilter ? `Lottery: ${lotteries.find((l: any) => String(l.id) === lotteryFilter)?.name}` : '',
      agentFilter ? `Agent: ${agents.find((a: any) => String(a.id) === agentFilter)?.username}` : '',
    ].filter(Boolean).join('  |  ');
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}${filterDesc ? `   Filters: ${filterDesc}` : ''}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Ticket', 'Agent', 'Game', 'Type', 'Number', 'Count', 'Amount', 'Time']],
      body: bets.map((b: any) => [
        b.ticket_id || '-',
        b.users?.username || '-',
        b.lotteries?.name || '-',
        b.type,
        b.number,
        b.count,
        `Rs.${Math.round(b.amount).toLocaleString('en-IN')}`,
        new Date(b.created_at).toLocaleTimeString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }),
      ]),
      headStyles: { fillColor: [67, 24, 255], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [244, 247, 254] },
    });
    doc.save(`bets-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const sel: React.CSSProperties = {
    border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '10px 14px', color: '#111827', fontSize: 13,
    background: '#fff', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="admin-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>All Bets</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>Complete betting ledger</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '8px 16px', borderRadius: 12 }}>{bets.length} records</div>
          <button onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#fff', border: '1.5px solid #E0E5F2', borderRadius: 12, color: '#111827', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="admin-filters">
        <select style={sel} value={lotteryFilter} onChange={e => setLotteryFilter(e.target.value)}>
          <option value="">All Lotteries</option>
          {lotteries.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select style={sel} value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
          <option value="">All Agents</option>
          {agents.map((a: any) => <option key={a.id} value={a.id}>{a.username}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #F3F4F6' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ticket', 'Agent', 'Game', 'Type', 'Number', 'Count', 'Amount', 'Time'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No bets found</td></tr>}
              {paginated.map((b: any, i: number) => {
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={b.id} className={flashIds.has(b.id) ? 'flash-green' : ''} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13, fontFamily: 'monospace' }}>{b.ticket_id}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{b.users?.username}</td>
                    <td style={td}>
                      <span style={{ padding: '4px 12px', background: '#F5F3FF', color: '#7C3AED', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{b.lotteries?.name}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{b.type}</td>
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
        <Pagination page={page} total={bets.length} pageSize={PAGE_SIZE} onChange={setPage} accent="#4318FF" />
      </div>
    </div>
  );
}

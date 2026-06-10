import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
import { Trophy, ChevronUp, ChevronDown, Filter, Download, Paperclip, FileText, X, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function checkWin(bet: any, winStr: string): boolean {
  const [d1, d2, d3] = winStr.split('');
  const tabNum = Number(bet.tab);
  const betNum = String(bet.number).padStart(tabNum, '0');
  if (tabNum === 1) {
    if (bet.type === 'A') return betNum === d1;
    if (bet.type === 'B') return betNum === d2;
    if (bet.type === 'C') return betNum === d3;
  } else if (tabNum === 2) {
    if (bet.type === 'AB') return betNum === d1 + d2;
    if (bet.type === 'BC') return betNum === d2 + d3;
    if (bet.type === 'AC') return betNum === d1 + d3;
  } else if (tabNum === 3) {
    if (bet.type === 'SUPER') return betNum === winStr;
    if (bet.type === 'BOX') {
      const sort = (s: string) => s.split('').sort().join('');
      return sort(betNum) === sort(winStr);
    }
  }
  return false;
}

const TYPE_COLOR: Record<string, string> = {
  A: '#05CD99', B: '#EE5D50', C: '#2B73FF',
  AB: '#FFCE20', BC: '#A78BFA', AC: '#39B8FF',
  SUPER: '#FF8C42', BOX: '#7B61FF',
};
const ALL_TYPES = ['A', 'B', 'C', 'AB', 'BC', 'AC', 'SUPER', 'BOX'];

function fmt(n: number) { return `Rs.${Math.round(n).toLocaleString('en-IN')}`; }

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 20,
  boxShadow: 'none', border: '1px solid #F3F4F6',
};

const sel: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E0E5F2',
  background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600,
};

export function ResultsPage() {
  const [pendingLotteries, setPendingLotteries] = useState<any[]>([]);
  const [winNumbers, setWinNumbers] = useState<Record<string, string>>({});
  const [declaring, setDeclaring] = useState<Record<string, boolean>>({});
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [results, setResults] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [filterDate, setFilterDate] = useState('');
  const [filterLottery, setFilterLottery] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterType, setFilterType] = useState('');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchPending = useCallback(async () => {
    const { data } = await api.get('/lotteries').catch(() => ({ data: [] }));
    setPendingLotteries((data || []).filter((l: any) => l.status === 'closed'));
  }, []);

  // Fetch results and bets together so winners are never computed against an empty bets array
  const fetchDeclaredData = useCallback(async () => {
    const params: any = {};
    if (filterLottery) params.lottery_id = filterLottery;
    if (filterAgent) params.agent_id = filterAgent;
    const [resResp, betsResp] = await Promise.all([
      api.get('/results').catch(() => ({ data: [] })),
      api.get('/bets', { params }).catch(() => ({ data: [] })),
    ]);
    setResults(resResp.data || []);
    setBets(betsResp.data || []);
  }, [filterLottery, filterAgent]);

  useEffect(() => {
    fetchPending();
    fetchDeclaredData();
    api.get('/lotteries').then(({ data }) => setLotteries(data || [])).catch(() => {});
    api.get('/agents').then(({ data }) => setAgents(data || [])).catch(() => {});
  }, [fetchPending, fetchDeclaredData]);

  useEffect(() => {
    const handler = () => { fetchPending(); fetchDeclaredData(); };
    socket.on('result:declared', handler);
    return () => { socket.off('result:declared', handler); };
  }, [fetchPending, fetchDeclaredData]);

  const declare = async (lotteryId: string) => {
    const raw = winNumbers[lotteryId] || '';
    if (!raw) return toast.error('Enter the 3-digit winning number');
    const num = Number(raw);
    if (isNaN(num) || num < 0 || num > 999) return toast.error('Winning number must be 000–999');
    setDeclaring(p => ({ ...p, [lotteryId]: true }));
    try {
      let document_url: string | undefined;
      const file = docFiles[lotteryId];
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const { data } = await api.post('/results/upload-document', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        document_url = data.url;
      }
      await api.post('/results/declare', { lottery_id: lotteryId, winning_number: num, document_url });
      toast.success('Result declared!');
      setWinNumbers(p => ({ ...p, [lotteryId]: '' }));
      setDocFiles(p => { const n = { ...p }; delete n[lotteryId]; return n; });
      fetchPending(); fetchDeclaredData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to declare result');
    } finally { setDeclaring(p => ({ ...p, [lotteryId]: false })); }
  };

  const toggleExpand = (id: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  // Apply filters to declared results
  const filteredResults = results.filter(r => {
    if (filterDate) {
      const drawDate = new Date(r.lotteries?.draw_time).toISOString().split('T')[0];
      if (drawDate !== filterDate) return false;
    }
    if (filterLottery && r.lottery_id !== filterLottery) return false;
    return true;
  });

  // Per-result type breakdown — respects filterType
  function getBreakdown(result: any) {
    const winStr = String(result.winning_number).padStart(3, '0');
    const lotteryBets = bets.filter(b => b.lottery_id === result.lottery_id);
    const typesToShow = filterType ? [filterType] : ALL_TYPES;
    return typesToShow.map(type => {
      const ofType = lotteryBets.filter(b => b.type === type);
      const winners = ofType.filter(b => checkWin(b, winStr));
      const totalBetCount = ofType.reduce((s, b) => s + Number(b.count), 0);
      const winCount = winners.reduce((s, b) => s + Number(b.count), 0);
      const betAmount = ofType.reduce((s, b) => s + Number(b.amount), 0);
      const winAmount = winners.reduce((s, b) => s + Number(b.amount), 0);
      return { type, totalBetCount, winCount, betAmount, winAmount, winnerRows: winners };
    }).filter(row => row.totalBetCount > 0);
  }

  const hasFilters = filterDate || filterLottery || filterAgent || filterType;

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.setTextColor(43, 54, 116);
    doc.text('Results Report', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(163, 174, 208);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 25);

    const rows: any[] = [];
    filteredResults.forEach(r => {
      const winStr = String(r.winning_number).padStart(3, '0');
      const breakdown = getBreakdown(r);
      const lotteryName = r.lotteries?.name || '-';
      const drawTime = new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      if (breakdown.length === 0) {
        rows.push([lotteryName, drawTime, winStr, '-', '-', '-', '-', '-']);
      } else {
        breakdown.forEach((row, i) => {
          rows.push([
            i === 0 ? lotteryName : '',
            i === 0 ? drawTime : '',
            i === 0 ? winStr : '',
            row.type,
            row.totalBetCount,
            `Rs.${Math.round(row.betAmount).toLocaleString('en-IN')}`,
            row.winCount > 0 ? row.winCount : '—',
            row.winCount > 0 ? `Rs.${Math.round(row.winAmount).toLocaleString('en-IN')}` : '—',
          ]);
        });
      }
    });

    autoTable(doc, {
      startY: 30,
      head: [['Lottery', 'Draw Time', 'Win #', 'Type', 'Total Bets', 'Bet Amount', 'Win Count', 'Win Amount']],
      body: rows,
      headStyles: { fillColor: [67, 24, 255], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [244, 247, 254] },
    });
    doc.save(`results-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Results</div>
        <div style={{ fontSize: 14, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>Declare and analyse lottery results</div>
      </div>

      {/* ── Pending Declaration ─────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: 1.2, fontWeight: 700, marginBottom: 14 }}>PENDING DECLARATION</div>
        {pendingLotteries.length === 0 ? (
          <div style={{ ...card, padding: 28, color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
            No lotteries pending result declaration
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {pendingLotteries.map(l => {
              const selectedFile = docFiles[l.id] || null;
              const ready = (winNumbers[l.id] || '').length === 3;
              return (
                <div key={l.id} style={{ ...card, padding: 22 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#111827', marginBottom: 4 }}>{l.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, fontWeight: 500 }}>
                    {new Date(l.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text" inputMode="numeric" maxLength={3} placeholder="000"
                      value={winNumbers[l.id] || ''}
                      onChange={e => setWinNumbers(p => ({ ...p, [l.id]: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                      style={{ flex: 1, border: '2px solid #E0E5F2', borderRadius: 12, padding: '12px 14px', color: '#111827', fontSize: 26, fontWeight: 800, letterSpacing: 10, textAlign: 'center', background: '#F9FAFB', outline: 'none' }}
                    />
                    <button
                      onClick={() => declare(l.id)}
                      disabled={declaring[l.id] || !ready}
                      style={{
                        padding: '10px 18px', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                        background: ready ? 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)' : '#F4F7FE',
                        color: ready ? '#fff' : '#6B7280',
                        cursor: ready ? 'pointer' : 'not-allowed',
                        boxShadow: ready ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
                      }}
                    >
                      {declaring[l.id] ? 'Declaring...' : 'Declare'}
                    </button>
                  </div>

                  {/* Result document picker */}
                  <div style={{ marginTop: 12 }}>
                    <input
                      ref={el => { fileInputRefs.current[l.id] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files?.[0] || null;
                        if (f && f.size > 1024 * 1024) {
                          toast.error('File must be under 1 MB');
                          e.target.value = '';
                          return;
                        }
                        setDocFiles(p => ({ ...p, [l.id]: f }));
                      }}
                    />
                    {selectedFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0F4FF', borderRadius: 10, border: '1px solid #C7D2FE' }}>
                        <FileText size={14} color="#4318FF" style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, color: '#4318FF', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{(selectedFile.size / 1024).toFixed(0)} KB</span>
                        <button type="button" onClick={() => { setDocFiles(p => ({ ...p, [l.id]: null })); if (fileInputRefs.current[l.id]) fileInputRefs.current[l.id]!.value = ''; }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2, display: 'flex', alignItems: 'center' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRefs.current[l.id]?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: '#F9FAFB', border: '1.5px dashed #D1D5DB', borderRadius: 10, color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                        <Paperclip size={13} />
                        Attach result document (PDF / image, max 1 MB) — optional
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Declared Results with Filters ──────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: 1.2, fontWeight: 700 }}>
              DECLARED RESULTS {filteredResults.length > 0 && `(${filteredResults.length})`}
            </div>
            {filteredResults.length > 0 && (
              <button onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#fff', border: '1.5px solid #E0E5F2', borderRadius: 10, color: '#111827', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                <Download size={13} /> PDF
              </button>
            )}
          </div>
          {hasFilters && (
            <button onClick={() => { setFilterDate(''); setFilterLottery(''); setFilterAgent(''); }}
              style={{ fontSize: 12, color: '#EE5D50', background: '#FEF3F2', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ ...card, marginBottom: 16, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid #F3F4F6', background: '#FAFBFF' }}>
            <Filter size={13} color="#A3AED0" />
            <span style={{ fontSize: 11, color: '#A3AED0', fontWeight: 700, letterSpacing: 1 }}>FILTERS</span>
          </div>

          {/* Dropdowns row */}
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', borderBottom: '1px solid #F3F4F6' }}>
            {[
              {
                label: 'DATE',
                node: <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  style={{ ...sel, border: 'none', background: 'transparent', padding: '10px 14px', width: '100%' }} />,
              },
              {
                label: 'LOTTERY',
                node: (
                  <select value={filterLottery} onChange={e => setFilterLottery(e.target.value)}
                    style={{ ...sel, border: 'none', background: 'transparent', padding: '10px 14px', width: '100%' }}>
                    <option value="">All Lotteries</option>
                    {lotteries.filter(l => l.status === 'done').map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: 'AGENT',
                node: (
                  <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
                    style={{ ...sel, border: 'none', background: 'transparent', padding: '10px 14px', width: '100%' }}>
                    <option value="">All Agents</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                  </select>
                ),
              },
            ].map(({ label, node }, i, arr) => (
              <div key={label} style={{
                flex: '1 1 160px', minWidth: 140,
                borderRight: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                padding: '10px 18px 10px',
              }}>
                <div style={{ fontSize: 10, color: '#A3AED0', fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                {node}
              </div>
            ))}
          </div>

          {/* Type chips row */}
          <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#A3AED0', fontWeight: 700, letterSpacing: 0.8, whiteSpace: 'nowrap' }}>TYPE</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_TYPES.map(t => {
                const active = filterType === t;
                const color = TYPE_COLOR[t];
                return (
                  <button key={t} onClick={() => setFilterType(active ? '' : t)} style={{
                    padding: '5px 14px', borderRadius: 20,
                    border: `1.5px solid ${active ? color : '#E0E5F2'}`,
                    background: active ? color + '18' : '#F4F7FE',
                    color: active ? color : '#6B7280',
                    fontWeight: active ? 800 : 600, fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div style={{ ...card, padding: 28, color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
            No declared results{hasFilters ? ' matching the selected filters' : ''}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredResults.map(r => {
              const winStr = String(r.winning_number).padStart(3, '0');
              const breakdown = getBreakdown(r);
              const totalWinAmount = breakdown.reduce((s, row) => s + row.winAmount, 0);
              const totalWinCount = breakdown.reduce((s, row) => s + row.winCount, 0);
              const isExpanded = expanded.has(r.id);

              return (
                <div key={r.id} style={{ ...card, overflow: 'hidden' }}>
                  {/* Result header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{r.lotteries?.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>
                        {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>

                    {/* Winning number bubbles */}
                    <div style={{ display: 'flex', gap: 5 }}>
                      {winStr.split('').map((d, i) => (
                        <div key={i} style={{ width: 38, height: 46, background: '#F3F4F6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{d}</div>
                        </div>
                      ))}
                    </div>

                    {/* Document link */}
                    {r.document_url && (
                      <a href={r.document_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#F0F4FF', border: '1px solid #C7D2FE', borderRadius: 20, color: '#4318FF', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        <FileText size={12} /> Result Doc <ExternalLink size={11} />
                      </a>
                    )}

                    {/* Summary chips */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {totalWinCount > 0 ? (
                        <div style={{ padding: '5px 14px', background: '#E6FAF5', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#05CD99', whiteSpace: 'nowrap' }}>
                          <Trophy size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {totalWinCount} win{totalWinCount !== 1 ? 's' : ''} · {fmt(totalWinAmount)}
                        </div>
                      ) : (
                        <div style={{ padding: '5px 14px', background: '#F9FAFB', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#6B7280' }}>No winners</div>
                      )}
                      <button onClick={() => toggleExpand(r.id)} style={{
                        padding: '5px 14px', background: '#F5F3FF', border: 'none', borderRadius: 20,
                        fontSize: 12, fontWeight: 700, color: '#7C3AED', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {isExpanded ? 'Hide' : 'Details'}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Type breakdown table */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #F4F7FE', padding: '16px 20px', background: '#F9FAFB' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: 1, marginBottom: 12 }}>TYPE BREAKDOWN</div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['Type', 'Total Bets', 'Total Count', 'Bet Amount', 'Winning Count', 'Agents'].map(h => (
                                <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F3F4F6', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {breakdown.map((row, idx) => {
                              const agentNames = [...new Set(row.winnerRows.map((b: any) => b.users?.username).filter(Boolean))];
                              const td: React.CSSProperties = { padding: '14px 18px', fontSize: 14, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                              return (
                                <tr key={row.type} style={{ background: row.winCount > 0 ? '#F0FDF9' : idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                                  <td style={td}>
                                    <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: (TYPE_COLOR[row.type] || '#6B7280') + '22', color: TYPE_COLOR[row.type] || '#6B7280' }}>
                                      {row.type}
                                    </span>
                                  </td>
                                  <td style={{ ...td, fontWeight: 700 }}>{row.totalBetCount}</td>
                                  <td style={{ ...td, color: '#6B7280' }}>
                                    {bets.filter(b => b.lottery_id === r.lottery_id && b.type === row.type).reduce((s, b) => s + Number(b.count), 0)}
                                  </td>
                                  <td style={{ ...td, fontWeight: 700 }}>{fmt(row.betAmount)}</td>
                                  <td style={{ ...td, fontWeight: 800, color: row.winCount > 0 ? '#05CD99' : '#9CA3AF' }}>
                                    {row.winCount > 0 ? row.winCount : '—'}
                                  </td>
                                  <td style={{ ...td, color: '#6B7280', fontSize: 13 }}>
                                    {agentNames.length > 0 ? agentNames.join(', ') : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ borderTop: '2px solid #E5E7EB', background: '#F9FAFB' }}>
                              <td style={{ padding: '14px 18px', fontWeight: 800, color: '#111827', fontSize: 13 }}>TOTAL</td>
                              <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827', fontSize: 14 }}>{breakdown.reduce((s, r) => s + r.totalBetCount, 0)}</td>
                              <td style={{ padding: '14px 18px' }} />
                              <td style={{ padding: '14px 18px', fontWeight: 700, color: '#111827', fontSize: 14 }}>{fmt(breakdown.reduce((s, r) => s + r.betAmount, 0))}</td>
                              <td style={{ padding: '14px 18px', fontWeight: 800, color: '#05CD99', fontSize: 14 }}>{totalWinCount || '—'}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Winning bet rows per agent */}
                      {totalWinCount > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: 1, marginBottom: 10 }}>WINNING BETS</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {bets.filter(b => b.lottery_id === r.lottery_id && checkWin(b, winStr) && (!filterType || b.type === filterType)).map((b: any, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 6px rgba(112,144,176,0.08)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827', minWidth: 80 }}>{b.users?.username || '—'}</span>
                                {b.customer_name && <span style={{ fontSize: 11, color: '#6B7280' }}>{b.customer_name}</span>}
                                <span style={{ width: 34, height: 26, borderRadius: 7, background: (TYPE_COLOR[b.type] || '#6B7280') + '18', color: TYPE_COLOR[b.type] || '#6B7280', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.type}</span>
                                <span style={{ fontWeight: 800, fontSize: 16, color: '#111827', letterSpacing: 2 }}>{String(b.number).padStart(b.tab, '0')}</span>
                                <span style={{ fontSize: 12, color: '#6B7280' }}>×{b.count}</span>
                                <span style={{ marginLeft: 'auto', padding: '3px 12px', background: '#05CD99', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff' }}>WON</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

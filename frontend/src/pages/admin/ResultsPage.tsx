import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/adminApi';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
import { Trophy, ChevronUp, ChevronDown, Filter, Download, Paperclip, FileText, X, ExternalLink, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function checkWin(bet: any, winStr: string, extraPrizes: string[] = []): boolean {
  const tabNum = Number(bet.tab);
  const betNum = String(bet.number).padStart(tabNum, '0');
  if (tabNum === 1) {
    const [pd1, pd2, pd3] = winStr.split('');
    if (bet.type === 'A') return betNum === pd1;
    if (bet.type === 'B') return betNum === pd2;
    if (bet.type === 'C') return betNum === pd3;
    return false;
  } else if (tabNum === 2) {
    const [pd1, pd2, pd3] = winStr.split('');
    if (bet.type === 'AB') return betNum === pd1 + pd2;
    if (bet.type === 'BC') return betNum === pd2 + pd3;
    if (bet.type === 'AC') return betNum === pd1 + pd3;
    return false;
  } else if (tabNum === 3) {
    const sort = (s: string) => s.split('').sort().join('');
    if (bet.type === 'SUPER') return [winStr, ...extraPrizes].some(p => betNum === p);
    if (bet.type === 'BOX') return sort(betNum) === sort(winStr);
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
function pad3(n: number | string) { return String(n).padStart(3, '0'); }
function displayNumber(n: number | string) { return String(Number(n)); }

function getWonPrizes(bet: any, winStr: string, r: any): string[] {
  const tabNum = Number(bet.tab);
  const betNum = String(bet.number).padStart(tabNum, '0');
  if (bet.type === 'BOX') return checkWin(bet, winStr) ? ['1st'] : [];
  const prizes = [
    { label: '1st', val: winStr },
    ...[r.prize_2, r.prize_3, r.prize_4, r.prize_5].map((v: any, i: number) => v != null ? { label: ['2nd', '3rd', '4th', '5th'][i], val: pad3(v) } : null).filter(Boolean),
    ...(Array.isArray(r.complementary_numbers) ? r.complementary_numbers.map((n: number) => ({ label: 'Comp', val: pad3(n) })) : []),
  ] as { label: string; val: string }[];
  const labels: string[] = [];
  for (const p of prizes) {
    const [pd1, pd2, pd3] = p.val.split('');
    if (tabNum === 1) {
      if (p.label !== '1st') continue;
      if (bet.type === 'A' && betNum === pd1) labels.push(p.label);
      if (bet.type === 'B' && betNum === pd2) labels.push(p.label);
      if (bet.type === 'C' && betNum === pd3) labels.push(p.label);
    } else if (tabNum === 2) {
      if (p.label !== '1st') continue;
      if (bet.type === 'AB' && betNum === pd1 + pd2) labels.push(p.label);
      if (bet.type === 'BC' && betNum === pd2 + pd3) labels.push(p.label);
      if (bet.type === 'AC' && betNum === pd1 + pd3) labels.push(p.label);
    } else if (tabNum === 3) {
      if (bet.type === 'SUPER' && betNum === p.val) labels.push(p.label);
    }
  }
  return labels;
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 20,
  boxShadow: 'none', border: '1px solid #F3F4F6',
};

const sel: React.CSSProperties = {
  padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E0E5F2',
  background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600,
};

interface PrizeState { p1: string; p2: string; p3: string; p4: string; p5: string; }

export function ResultsPage() {
  const [pendingLotteries, setPendingLotteries] = useState<any[]>([]);
  const [prizes, setPrizes] = useState<Record<string, PrizeState>>({});
  const [compNums, setCompNums] = useState<Record<string, string[]>>({});
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrizes, setEditPrizes] = useState<PrizeState>({ p1: '', p2: '', p3: '', p4: '', p5: '' });
  const [editCompNums, setEditCompNums] = useState<string[]>(['']);
  const [editDocFile, setEditDocFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editFileRef = useRef<HTMLInputElement | null>(null);

  const fetchPending = useCallback(async () => {
    const { data } = await api.get('/lotteries').catch(() => ({ data: [] }));
    setPendingLotteries((data || []).filter((l: any) => l.status === 'closed'));
  }, []);

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

  const getPrizes = (id: string): PrizeState => prizes[id] || { p1: '', p2: '', p3: '', p4: '', p5: '' };
  const getComp = (id: string): string[] => compNums[id] || [''];

  const setPrize = (id: string, key: keyof PrizeState, val: string) =>
    setPrizes(p => ({ ...p, [id]: { ...getPrizes(id), [key]: val.replace(/\D/g, '').slice(0, 3) } }));

  const setComp = (id: string, idx: number, val: string) =>
    setCompNums(p => {
      const arr = [...getComp(id)];
      arr[idx] = val.replace(/\D/g, '').slice(0, 3);
      return { ...p, [id]: arr };
    });

  const addComp = (id: string) =>
    setCompNums(p => ({ ...p, [id]: [...getComp(id), ''] }));

  const removeComp = (id: string, idx: number) =>
    setCompNums(p => {
      const arr = getComp(id).filter((_, i) => i !== idx);
      return { ...p, [id]: arr.length ? arr : [''] };
    });

  const declare = async (lotteryId: string) => {
    const p = getPrizes(lotteryId);
    if (!p.p1) return toast.error('Enter the 1st prize number');
    setDeclaring(prev => ({ ...prev, [lotteryId]: true }));
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

      const comp = getComp(lotteryId).filter(Boolean).map(Number);

      await api.post('/results/declare', {
        lottery_id: lotteryId,
        winning_number: Number(p.p1),
        ...(p.p2 && { prize_2: Number(p.p2) }),
        ...(p.p3 && { prize_3: Number(p.p3) }),
        ...(p.p4 && { prize_4: Number(p.p4) }),
        ...(p.p5 && { prize_5: Number(p.p5) }),
        ...(comp.length > 0 && { complementary_numbers: comp }),
        document_url,
      });

      toast.success('Result declared!');
      setPrizes(p => { const n = { ...p }; delete n[lotteryId]; return n; });
      setCompNums(p => { const n = { ...p }; delete n[lotteryId]; return n; });
      setDocFiles(p => { const n = { ...p }; delete n[lotteryId]; return n; });
      fetchPending(); fetchDeclaredData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to declare result');
    } finally { setDeclaring(prev => ({ ...prev, [lotteryId]: false })); }
  };

  const toggleExpand = (id: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditPrizes({
      p1: r.winning_number != null ? displayNumber(r.winning_number) : '',
      p2: r.prize_2 != null ? displayNumber(r.prize_2) : '',
      p3: r.prize_3 != null ? displayNumber(r.prize_3) : '',
      p4: r.prize_4 != null ? displayNumber(r.prize_4) : '',
      p5: r.prize_5 != null ? displayNumber(r.prize_5) : '',
    });
    setEditCompNums(
      Array.isArray(r.complementary_numbers) && r.complementary_numbers.length > 0
        ? r.complementary_numbers.map((n: number) => displayNumber(n))
        : ['']
    );
    setEditDocFile(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string, currentDocUrl: string | null) => {
    if (!editPrizes.p1) { toast.error('1st prize is required'); return; }
    setEditSaving(true);
    try {
      let document_url: string | null = currentDocUrl;
      if (editDocFile) {
        const fd = new FormData();
        fd.append('file', editDocFile);
        const { data } = await api.post('/results/upload-document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        document_url = data.url;
      }
      const comp = editCompNums.filter(Boolean).map(Number);
      await api.patch(`/results/${id}`, {
        winning_number: Number(editPrizes.p1),
        prize_2: editPrizes.p2 ? Number(editPrizes.p2) : null,
        prize_3: editPrizes.p3 ? Number(editPrizes.p3) : null,
        prize_4: editPrizes.p4 ? Number(editPrizes.p4) : null,
        prize_5: editPrizes.p5 ? Number(editPrizes.p5) : null,
        complementary_numbers: comp,
        document_url,
      });
      toast.success('Result updated!');
      setEditingId(null);
      fetchDeclaredData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update result');
    } finally {
      setEditSaving(false);
    }
  };

  const filteredResults = results.filter(r => {
    if (filterDate) {
      const drawDate = new Date(r.lotteries?.draw_time).toISOString().split('T')[0];
      if (drawDate !== filterDate) return false;
    }
    if (filterLottery && r.lottery_id !== filterLottery) return false;
    return true;
  });

  function getExtraPrizes(result: any): string[] {
    return [result.prize_2, result.prize_3, result.prize_4, result.prize_5]
      .filter((v: any) => v != null)
      .map((v: number) => pad3(v))
      .concat((Array.isArray(result.complementary_numbers) ? result.complementary_numbers : []).map((n: number) => pad3(n)));
  }

  function getBreakdown(result: any) {
    const winStr = pad3(result.winning_number);
    const extraPrizes = getExtraPrizes(result);
    const lotteryBets = bets.filter(b => b.lottery_id === result.lottery_id);
    const typesToShow = filterType ? [filterType] : ALL_TYPES;
    return typesToShow.map(type => {
      const ofType = lotteryBets.filter(b => b.type === type);
      const winners = ofType.filter(b => checkWin(b, winStr, extraPrizes));
      const totalBetCount = ofType.reduce((s, b) => s + Number(b.count), 0);
      const winCount = winners.reduce((s, b) => s + Number(b.count) * getWonPrizes(b, winStr, result).length, 0);
      const betAmount = ofType.reduce((s, b) => s + Number(b.amount), 0);
      const winAmount = winners.reduce((s, b) => s + Number(b.amount) * getWonPrizes(b, winStr, result).length, 0);
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
      const breakdown = getBreakdown(r);
      const lotteryName = r.lotteries?.name || '-';
      const drawTime = new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
      if (breakdown.length === 0) {
        rows.push([lotteryName, drawTime, displayNumber(r.winning_number), '-', '-', '-', '-', '-']);
      } else {
        breakdown.forEach((row, i) => {
          rows.push([
            i === 0 ? lotteryName : '',
            i === 0 ? drawTime : '',
            i === 0 ? displayNumber(r.winning_number) : '',
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {pendingLotteries.map(l => {
              const p = getPrizes(l.id);
              const comp = getComp(l.id);
              const selectedFile = docFiles[l.id] || null;
              const ready = Boolean(p.p1);

              const inp = (val: string, big?: boolean): React.CSSProperties => ({
                width: '100%', border: `1.5px solid ${big && val ? '#7C3AED' : '#E5E7EB'}`,
                borderRadius: 8, padding: big ? '9px 6px' : '6px 4px',
                fontSize: big ? 20 : 13, fontWeight: 800, letterSpacing: big ? 6 : 3,
                textAlign: 'center', background: '#F9FAFB', outline: 'none', color: '#111827',
              });

              return (
                <div key={l.id} style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>{l.name}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                        {new Date(l.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <button onClick={() => declare(l.id)} disabled={declaring[l.id] || !ready}
                      style={{ padding: '6px 14px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12,
                        background: ready ? '#4318FF' : '#F3F4F6', color: ready ? '#fff' : '#9CA3AF',
                        cursor: ready ? 'pointer' : 'not-allowed' }}>
                      {declaring[l.id] ? '…' : 'Declare'}
                    </button>
                  </div>

                  {/* 1st prize */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>1st Prize ★</div>
                    <input type="text" inputMode="numeric" maxLength={3} placeholder="0"
                      value={p.p1} onChange={e => setPrize(l.id, 'p1', e.target.value)}
                      style={inp(p.p1, true)} />
                  </div>

                  {/* 2nd–5th in 2-col grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {(['p2','p3','p4','p5'] as (keyof PrizeState)[]).map((key, idx) => (
                      <div key={key}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginBottom: 3 }}>
                          {['2nd','3rd','4th','5th'][idx]}
                        </div>
                        <input type="text" inputMode="numeric" maxLength={3} placeholder="0"
                          value={p[key]} onChange={e => setPrize(l.id, key, e.target.value)}
                          style={inp(p[key])} />
                      </div>
                    ))}
                  </div>

                  {/* Complementary */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>Complementary</span>
                      <button type="button" onClick={() => addComp(l.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 7px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 5, color: '#7C3AED', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                        <Plus size={10} /> Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {comp.map((val, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <input type="text" inputMode="numeric" maxLength={3} placeholder="0"
                            value={val} onChange={e => setComp(l.id, idx, e.target.value)}
                            style={{ width: 52, border: '1.5px solid #E5E7EB', borderRadius: 6, padding: '5px 3px', fontSize: 12, fontWeight: 800, letterSpacing: 3, textAlign: 'center', background: '#F9FAFB', outline: 'none', color: '#111827' }} />
                          {(comp.length > 1 || idx > 0) && (
                            <button type="button" onClick={() => removeComp(l.id, idx)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 0, lineHeight: 1 }}>
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Document picker */}
                  <input ref={el => { fileInputRefs.current[l.id] = el; }} type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 1024 * 1024) { toast.error('File must be under 1 MB'); e.target.value = ''; return; }
                      setDocFiles(prev => ({ ...prev, [l.id]: f }));
                    }} />
                  {selectedFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#F0F4FF', borderRadius: 8, border: '1px solid #C7D2FE' }}>
                      <FileText size={12} color="#4318FF" style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11, color: '#4318FF', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                      <button type="button" onClick={() => { setDocFiles(prev => ({ ...prev, [l.id]: null })); if (fileInputRefs.current[l.id]) fileInputRefs.current[l.id]!.value = ''; }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}><X size={12} /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRefs.current[l.id]?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: '#F9FAFB', border: '1.5px dashed #E5E7EB', borderRadius: 8, color: '#9CA3AF', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                      <Paperclip size={12} /> Attach document (optional)
                    </button>
                  )}
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
            <button onClick={() => { setFilterDate(''); setFilterLottery(''); setFilterAgent(''); setFilterType(''); }}
              style={{ fontSize: 12, color: '#EE5D50', background: '#FEF3F2', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ ...card, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid #F3F4F6', background: '#FAFBFF' }}>
            <Filter size={13} color="#A3AED0" />
            <span style={{ fontSize: 11, color: '#A3AED0', fontWeight: 700, letterSpacing: 1 }}>FILTERS</span>
          </div>
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
              const winStr = pad3(r.winning_number);
              const breakdown = getBreakdown(r);
              const totalWinAmount = breakdown.reduce((s, row) => s + row.winAmount, 0);
              const totalWinCount = breakdown.reduce((s, row) => s + row.winCount, 0);
              const isExpanded = expanded.has(r.id);

              const allPrizes = [
                { label: '1st Prize', value: r.winning_number },
                { label: '2nd Prize', value: r.prize_2 },
                { label: '3rd Prize', value: r.prize_3 },
                { label: '4th Prize', value: r.prize_4 },
                { label: '5th Prize', value: r.prize_5 },
              ].filter(p => p.value != null);

              const compList: number[] = Array.isArray(r.complementary_numbers) ? r.complementary_numbers : [];

              return (
                <div key={r.id} style={{ ...card, overflow: 'hidden' }}>
                  {/* Result header */}
                  <div style={{ padding: '14px 18px' }}>
                    {/* Top row: name + date + buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{r.lotteries?.name}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 10, fontWeight: 500 }}>
                          {new Date(r.lotteries?.draw_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                      {r.document_url && (
                        <a href={r.document_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#F0F4FF', border: '1px solid #C7D2FE', borderRadius: 16, color: '#4318FF', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          <FileText size={11} /> Doc <ExternalLink size={10} />
                        </a>
                      )}
                      {totalWinCount > 0 ? (
                        <div style={{ padding: '4px 12px', background: '#E6FAF5', borderRadius: 16, fontSize: 12, fontWeight: 700, color: '#05CD99', whiteSpace: 'nowrap' }}>
                          <Trophy size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {totalWinCount} win{totalWinCount !== 1 ? 's' : ''} · {fmt(totalWinAmount)}
                        </div>
                      ) : (
                        <div style={{ padding: '4px 12px', background: '#F9FAFB', borderRadius: 16, fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>No winners</div>
                      )}
                      <button onClick={() => editingId === r.id ? cancelEdit() : startEdit(r)} style={{
                        padding: '4px 12px', background: editingId === r.id ? '#FFF7ED' : '#F9FAFB',
                        border: `1px solid ${editingId === r.id ? '#FED7AA' : '#E5E7EB'}`,
                        borderRadius: 16, fontSize: 12, fontWeight: 700,
                        color: editingId === r.id ? '#EA580C' : '#6B7280', cursor: 'pointer',
                      }}>
                        {editingId === r.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button onClick={() => toggleExpand(r.id)} style={{
                        padding: '4px 12px', background: '#F5F3FF', border: 'none', borderRadius: 16,
                        fontSize: 12, fontWeight: 700, color: '#7C3AED', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {isExpanded ? 'Hide' : 'Details'}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {/* Prizes row — horizontal wrap */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', alignItems: 'center' }}>
                      {allPrizes.map((prize, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? '#7C3AED' : '#9CA3AF', minWidth: 26, flexShrink: 0 }}>
                            {['1st','2nd','3rd','4th','5th'][i]}
                          </span>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {displayNumber(prize.value!).split('').map((d, di) => (
                              <div key={di} style={{
                                width: i === 0 ? 30 : 24, height: i === 0 ? 36 : 28,
                                background: i === 0 ? '#F5F3FF' : '#F3F4F6', borderRadius: 7,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <span style={{ fontSize: i === 0 ? 17 : 13, fontWeight: 800, color: i === 0 ? '#7C3AED' : '#374151' }}>{d}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {compList.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>Comp</span>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {compList.map((n, i) => (
                              <span key={i} style={{ padding: '2px 8px', background: '#F0FDF9', border: '1px solid #A7F3D0', borderRadius: 5, fontSize: 12, fontWeight: 800, color: '#059669', letterSpacing: 1 }}>
                                {displayNumber(n)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editingId === r.id && (
                    <div style={{ borderTop: '1px solid #F4F7FE', padding: '14px 18px', background: '#FAFAFA' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: 1, marginBottom: 12 }}>EDIT RESULT</div>

                      {/* 1st prize */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>1st Prize ★</div>
                        <input type="text" inputMode="numeric" maxLength={3} placeholder="0"
                          value={editPrizes.p1}
                          onChange={e => setEditPrizes(p => ({ ...p, p1: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                          style={{ width: 80, border: `1.5px solid ${editPrizes.p1 ? '#7C3AED' : '#E5E7EB'}`, borderRadius: 8, padding: '9px 6px', fontSize: 20, fontWeight: 800, letterSpacing: 6, textAlign: 'center', background: '#fff', outline: 'none', color: '#111827' }}
                        />
                      </div>

                      {/* 2nd–5th prizes */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                        {(['p2','p3','p4','p5'] as (keyof PrizeState)[]).map((key, idx) => (
                          <div key={key}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginBottom: 3 }}>{['2nd','3rd','4th','5th'][idx]}</div>
                            <input type="text" inputMode="numeric" maxLength={3} placeholder="—"
                              value={editPrizes[key]}
                              onChange={e => setEditPrizes(p => ({ ...p, [key]: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                              style={{ width: 60, border: '1.5px solid #E5E7EB', borderRadius: 7, padding: '6px 4px', fontSize: 13, fontWeight: 800, letterSpacing: 3, textAlign: 'center', background: '#fff', outline: 'none', color: '#111827' }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Complementary */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>Complementary</span>
                          <button type="button" onClick={() => setEditCompNums(c => [...c, ''])}
                            style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 7px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 5, color: '#7C3AED', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                            <Plus size={10} /> Add
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {editCompNums.map((val, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <input type="text" inputMode="numeric" maxLength={3} placeholder="0"
                                value={val}
                                onChange={e => setEditCompNums(c => { const a = [...c]; a[idx] = e.target.value.replace(/\D/g, '').slice(0, 3); return a; })}
                                style={{ width: 52, border: '1.5px solid #E5E7EB', borderRadius: 6, padding: '5px 3px', fontSize: 12, fontWeight: 800, letterSpacing: 3, textAlign: 'center', background: '#fff', outline: 'none', color: '#111827' }}
                              />
                              {(editCompNums.length > 1 || idx > 0) && (
                                <button type="button"
                                  onClick={() => setEditCompNums(c => { const a = c.filter((_, i) => i !== idx); return a.length ? a : ['']; })}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 0 }}>
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Document */}
                      <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files?.[0] || null;
                          if (f && f.size > 1024 * 1024) { toast.error('File must be under 1 MB'); e.target.value = ''; return; }
                          setEditDocFile(f);
                        }} />
                      {editDocFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#F0F4FF', borderRadius: 8, border: '1px solid #C7D2FE', marginBottom: 12 }}>
                          <FileText size={12} color="#4318FF" />
                          <span style={{ flex: 1, fontSize: 11, color: '#4318FF', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editDocFile.name}</span>
                          <button type="button" onClick={() => { setEditDocFile(null); if (editFileRef.current) editFileRef.current.value = ''; }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}><X size={12} /></button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => editFileRef.current?.click()}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: '#fff', border: '1.5px dashed #E5E7EB', borderRadius: 8, color: '#9CA3AF', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                          <Paperclip size={12} /> {r.document_url ? 'Replace document' : 'Attach document (optional)'}
                        </button>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEdit(r.id, r.document_url)} disabled={editSaving || !editPrizes.p1}
                          style={{ padding: '7px 20px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, background: editPrizes.p1 ? '#4318FF' : '#F3F4F6', color: editPrizes.p1 ? '#fff' : '#9CA3AF', cursor: editPrizes.p1 ? 'pointer' : 'not-allowed' }}>
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          style={{ padding: '7px 16px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontWeight: 600, fontSize: 13, background: '#fff', color: '#6B7280', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

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

                      {totalWinCount > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: 1, marginBottom: 10 }}>WINNING BETS</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {bets.filter(b => b.lottery_id === r.lottery_id && checkWin(b, winStr, getExtraPrizes(r)) && (!filterType || b.type === filterType)).map((b: any, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 6px rgba(112,144,176,0.08)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827', minWidth: 80 }}>{b.users?.username || '—'}</span>
                                {b.customer_name && <span style={{ fontSize: 11, color: '#6B7280' }}>{b.customer_name}</span>}
                                <span style={{ width: 34, height: 26, borderRadius: 7, background: (TYPE_COLOR[b.type] || '#6B7280') + '18', color: TYPE_COLOR[b.type] || '#6B7280', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.type}</span>
                                <span style={{ fontWeight: 800, fontSize: 16, color: '#111827', letterSpacing: 2 }}>{displayNumber(b.number)}</span>
                                <span style={{ fontSize: 12, color: '#6B7280' }}>×{b.count}</span>
                                <span style={{ marginLeft: 'auto', padding: '3px 12px', background: '#05CD99', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#fff' }}>{getWonPrizes(b, winStr, r).join(', ')} WON</span>
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

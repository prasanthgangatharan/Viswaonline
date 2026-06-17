import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
import { useCountdown } from '../../hooks/useCountdown';
import { useAuth } from '../../hooks/useAuth';
import { Trash2, Home } from 'lucide-react';

function pad(n: number) { return String(n).padStart(2, '0'); }

function getPermutations(s: string): string[] {
  if (s.length <= 1) return [s];
  const result = new Set<string>();
  for (let i = 0; i < s.length; i++) {
    const rest = s.slice(0, i) + s.slice(i + 1);
    for (const p of getPermutations(rest)) result.add(s[i] + p);
  }
  return Array.from(result);
}

interface Entry { type: string; number: string; count: string; tab: number; amount: number; overflowCount: number; }

const TYPE_COLOR: Record<string, string> = {
  A: '#05CD99', B: '#EE5D50', C: '#2B73FF',
  AB: '#FFCE20', BC: '#9F7AEA', AC: '#39B8FF',
  SUPER: '#FF8C42', BOX: '#7B61FF',
};

export function DataEntryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lotteryId: selectedId } = useParams<{ lotteryId: string }>();

  const [lottery, setLottery] = useState<any>(null);
  const [tab, setTab] = useState(3);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [numInput, setNumInput] = useState('');
  const [cntInput, setCntInput] = useState('');
  const [customer, setCustomer] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [setMode, setSetMode] = useState(false);
  const [usedCounts, setUsedCounts] = useState<Record<string, number>>({});
  const { hours, minutes, seconds } = useCountdown(lottery?.draw_time || null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let closedHandler: ((closed: any) => void) | null = null;
    let resultDeclaredHandler: ((result: any) => void) | null = null;
    let resultDeclared = false;

    api.get('/lotteries').then(({ data }) => {
      const active = data.find((l: any) => l.id === selectedId && l.status === 'active');
      if (!active) { navigate('/agent/home', { replace: true }); return; }

      const closeMs = new Date(active.draw_time).getTime() - Number(active.stop_betting_minutes) * 60 * 1000;
      if (Date.now() >= closeMs) {
        toast.error('Betting is closed for this lottery');
        navigate('/agent/home', { replace: true });
        return;
      }

      setLottery(active);
      api.get('/bets/counts', { params: { lottery_id: active.id } })
        .then(({ data }) => setUsedCounts(data))
        .catch(() => {});

      const remaining = closeMs - Date.now();
      timer = setTimeout(() => {
        toast.error('Betting window has closed!');
        navigate('/agent/home', { replace: true });
      }, remaining);

      resultDeclaredHandler = (result: any) => {
        if (result.lottery_id === active.id) {
          resultDeclared = true;
          toast(`Result has been declared for ${result.lottery_name}`, { icon: '🏆' });
          navigate('/agent/home', { replace: true });
        }
      };
      socket.on('result:declared', resultDeclaredHandler);

      closedHandler = (closed: any) => {
        if (closed.id === active.id && !resultDeclared) {
          toast(`Lottery ${active.name} is closed, the result will be declared shortly`, { icon: '🔔' });
          navigate('/agent/home', { replace: true });
        }
      };
      socket.on('lottery:closed', closedHandler);
    }).catch(() => navigate('/agent/home', { replace: true }));

    // Cleanup returned synchronously so React always calls it on unmount
    return () => {
      clearTimeout(timer);
      if (closedHandler) socket.off('lottery:closed', closedHandler);
      if (resultDeclaredHandler) socket.off('result:declared', resultDeclaredHandler);
    };
  }, []);

  const price = user ? Number((user as any)[`tab${tab}_price`] ?? 0) : 0;
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
  const numFull = numInput.length === tab;

  const changeTab = (t: number) => {
    setTab(t);
    setNumInput('');
    setCntInput('');
    if (t !== 3) setSetMode(false);
  };

  const getTypesForTab = (t: number) => {
    if (t === 1) return ['A', 'B', 'C'];
    if (t === 2) return ['AB', 'BC', 'AC'];
    if (t === 3) return ['SUPER', 'BOX'];
    return [];
  };

  const handleTypeButton = (type: string) => {
    if (!numInput || numInput.length < tab || !cntInput || !lottery) {
      toast.error('Enter number and count first');
      return;
    }
    const count = Number(cntInput);
    if (isNaN(count) || count <= 0) {
      toast.error('Enter number and count first');
      return;
    }

    const typesToAdd = type === 'ALL' ? getTypesForTab(tab) : [type];
    const numsToAdd = setMode && tab === 3 ? getPermutations(numInput) : [numInput];

    const maxes = [lottery.tab1_max, lottery.tab2_max, lottery.tab3_max];
    const max = maxes[tab - 1];

    const newEntries: Entry[] = [];
    for (const t of typesToAdd) {
      for (const n of numsToAdd) {
        let placedCount = count; // how many will actually be charged

        if (max) {
          const key = `${Number(n)}_${tab}_${t}`;
          const fromServer = usedCounts[key] || 0;
          const fromLocal = entries
            .filter(e => Number(e.number) === Number(n) && e.tab === tab && e.type === t)
            .reduce((s, e) => s + Number(e.count), 0);
          const remaining = max - fromServer - fromLocal;
          const numStr = String(Number(n)).padStart(tab, '0');

          if (remaining <= 0) {
            toast.error(`${numStr} (${t}) is fully booked`, { duration: 3000 });
            continue;
          }
          if (count > remaining) {
            // Partial fill: amount shown is for placed portion only; backend records the rest as overflow
            toast(`Only ${remaining} of ${count} will be placed for ${numStr} (${t}); ${count - remaining} recorded as overflow`, { duration: 5000 });
            placedCount = remaining;
          }
        }

        newEntries.push({ type: t, number: n, count: String(placedCount), tab, amount: placedCount * price, overflowCount: count - placedCount });
      }
    }
    if (newEntries.length > 0) {
      setEntries(prev => [...prev, ...newEntries]);
      setNumInput('');
      setCntInput('');
    }
  };

  const handleKey = (k: string) => {
    if (k === 'DEL') {
      if (cntInput) setCntInput(p => p.slice(0, -1));
      else setNumInput(p => p.slice(0, -1));
    } else if (k === 'UNDO') {
      setEntries(p => p.slice(0, -1));
    } else if (!isNaN(Number(k))) {
      if (!numFull) {
        setNumInput(p => p + k);
      } else {
        setCntInput(p => p + k);
      }
    }
  };

  const deleteEntry = (i: number) => setEntries(p => p.filter((_, idx) => idx !== i));

  const confirmSave = async () => {
    if (!entries.length || !lottery) return;
    setSaving(true);
    const seq = Number(localStorage.getItem('ticket_seq') || '0') + 1;
    localStorage.setItem('ticket_seq', String(seq));
    const ticketId = `#${user?.username?.toUpperCase()}-${String(seq).padStart(4, '0')}`;
    try {
      const { data: result } = await api.post('/bets/batch', {
        lottery_id: lottery.id,
        ticket_id: ticketId,
        customer_name: customer.trim() || undefined,
        entries: entries.map(e => ({ type: e.type, number: Number(e.number), count: Number(e.count), tab: e.tab, overflow_count: e.overflowCount ?? 0 })),
      });
      const overflows: any[] = result?.overflows ?? [];
      if (overflows.length > 0) {
        const totalOverflow = overflows.reduce((s: number, o: any) => s + o.overflow_count, 0);
        const totalPlaced = (result?.placed ?? []).reduce((s: number, p: any) => s + Number(p.count), 0);
        toast.success(`Ticket ${ticketId} saved! ${totalPlaced} placed, ${totalOverflow} as overflow`, { duration: 6000 });
      } else {
        toast.success(`Ticket ${ticketId} saved!`);
      }
      navigate('/agent/home', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg || 'Failed to save ticket'), { duration: 5000 });
    }
    finally { setSaving(false); }
  };

  const keyRows = [
    ['1', '2', '3', 'DEL'],
    ['4', '5', '6', 'UNDO'],
    ['7', '8', '9', '0'],
  ];

  const inputPhase = !numFull ? 'number' : 'count';
  const typeButtons = getTypesForTab(tab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%', background: '#F9FAFB', position: 'relative', overflow: 'hidden' }}>

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(27,37,89,0.3)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '22px 20px', width: '100%', maxWidth: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>Confirm Ticket</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, fontWeight: 600 }}>{lottery?.name}</div>
            </div>

            {/* Entry rows */}
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 14 }}>
              {entries.map((e, i) => {
                const color = TYPE_COLOR[e.type] || '#6B7280';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ minWidth: 36, padding: '2px 7px', borderRadius: 6, fontSize: 12, fontWeight: 800, background: color + '20', color, textAlign: 'center', flexShrink: 0 }}>
                      {e.type}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#111827', letterSpacing: 2, flex: 1 }}>
                      {String(e.number).padStart(e.tab, '0')}
                    </span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>×{e.count}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#05CD99' }}>Rs.{e.amount}</span>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '2px solid #F3F4F6', marginBottom: 18 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>TOTAL</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#05CD99' }}>Rs.{totalAmount}</span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '11px', background: '#F3F4F6', border: 'none', borderRadius: 12, color: '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmSave} disabled={saving} style={{ padding: '11px', background: '#2B73FF', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: '#fff', flexShrink: 0, borderBottom: '1px solid #F0F5FF', boxShadow: '0 2px 8px rgba(112,144,176,0.06)', display: 'flex', flexDirection: 'column', gap: 7, padding: '8px 14px' }}>
        {/* Row 1: home + lottery name + timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/agent/home')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9, background: '#F9FAFB', border: 'none', color: '#111827', cursor: 'pointer', flexShrink: 0 }}>
            <Home size={15} />
          </button>
          <div style={{ background: '#EBF3FF', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800, color: '#2B73FF', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {lottery?.name || '-'}
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: '#2B73FF', background: '#EBF3FF', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </div>
        </div>
        {/* Row 2: customer input + tab buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer name" style={{ width: 130, flexShrink: 0, background: '#F9FAFB', border: '1.5px solid #E0E5F2', borderRadius: 8, padding: '5px 10px', color: '#111827', fontSize: 12 }} />
          <span style={{ flex: 1 }} />
          {[1, 2, 3].map(t => (
            <button key={t} onClick={() => changeTab(t)} style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: tab === t ? 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)' : '#F9FAFB',
              border: 'none', color: tab === t ? '#fff' : '#6B7280',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}>{t}</button>
          ))}
          {tab === 3 && (
            <button onClick={() => setSetMode(p => !p)} style={{
              height: 34, padding: '0 10px', borderRadius: 8, border: 'none', flexShrink: 0,
              background: setMode ? '#FF8C42' : '#F9FAFB',
              color: setMode ? '#fff' : '#6B7280',
              fontWeight: 800, fontSize: 11, cursor: 'pointer',
            }}>SET</button>
          )}
        </div>
      </div>

      {/* Entries List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 100, background: '#fff' }}>
        {entries.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12, fontWeight: 500 }}>
            Enter number and count, then tap a type button
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderBottom: '1px solid #F3F4F6' }}>
              <tr>
                {['Type', 'Num', 'Cnt', 'Amount', ''].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#9CA3AF', fontSize: 11, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const color = TYPE_COLOR[e.type] || '#6B7280';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 700, background: color + '15', color }}>
                        {e.type}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: 1 }}>
                      {String(e.number).padStart(e.tab, '0')}
                    </td>
                    <td style={{ padding: '7px 10px', fontSize: 13, color: '#111827', fontWeight: 600 }}>{e.count}</td>
                    <td style={{ padding: '7px 10px', fontSize: 13, fontWeight: 700, color: '#111827' }}>Rs.{e.amount}</td>
                    <td style={{ padding: '7px 6px' }}>
                      <button onClick={() => deleteEntry(i)} style={{ background: 'none', border: 'none', color: '#EE5D50', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Panel */}
      <div style={{ background: 'linear-gradient(135deg, #2B73FF 0%, #1A5ACC 100%)', padding: '7px 10px 10px', flexShrink: 0 }}>

        {/* Number / Count Display */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <div style={{
            background: inputPhase === 'number' ? '#fff' : 'rgba(255,255,255,0.2)',
            borderRadius: 9, padding: '5px 10px', textAlign: 'center',
            fontSize: 18, fontWeight: 800,
            color: numInput ? '#111827' : (inputPhase === 'number' ? '#6B7280' : 'rgba(255,255,255,0.6)'),
            border: inputPhase === 'number' ? '2px solid #FFCE20' : '2px solid transparent',
            letterSpacing: 5, transition: 'all 0.15s',
          }}>
            {numInput || '_'.repeat(tab)}
          </div>
          <div style={{
            background: inputPhase === 'count' ? '#fff' : 'rgba(255,255,255,0.2)',
            borderRadius: 9, padding: '5px 10px', textAlign: 'center',
            fontSize: 18, fontWeight: 800,
            color: cntInput ? '#111827' : (inputPhase === 'count' ? '#6B7280' : 'rgba(255,255,255,0.6)'),
            border: inputPhase === 'count' ? '2px solid #FFCE20' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {cntInput || 'Count'}
          </div>
        </div>

        {/* Type Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${typeButtons.length + 1}, 1fr)`, gap: 5, marginBottom: 6 }}>
          {typeButtons.map(t => (
            <button key={t} onClick={() => handleTypeButton(t)} style={{
              padding: '7px 4px', background: 'rgba(255,255,255,0.18)',
              border: '2px solid rgba(255,255,255,0.4)', borderRadius: 9,
              color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}>{t}</button>
          ))}
          <button onClick={() => handleTypeButton('ALL')} style={{
            padding: '7px 4px', background: 'rgba(255,255,255,0.28)',
            border: '2px solid rgba(255,255,255,0.55)', borderRadius: 9,
            color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer',
          }}>ALL</button>
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 6 }}>
          {keyRows.flat().map((k, i) => {
            const isSpecial = ['DEL', 'UNDO'].includes(k);
            return (
              <button key={i} onClick={() => handleKey(k)} style={{
                padding: '9px 4px',
                background: isSpecial ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.18)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 9, color: '#fff',
                fontWeight: 800, fontSize: isSpecial ? 11 : 18,
                cursor: 'pointer',
              }}>{k}</button>
            );
          })}
        </div>

        {/* Save Ticket */}
        <button onClick={() => entries.length && setShowConfirm(true)} disabled={!entries.length} style={{
          width: '100%', padding: '10px',
          background: entries.length ? '#fff' : 'rgba(255,255,255,0.2)',
          border: 'none', borderRadius: 10,
          color: entries.length ? '#2B73FF' : 'rgba(255,255,255,0.5)',
          fontSize: 13, fontWeight: 800, cursor: entries.length ? 'pointer' : 'not-allowed',
          boxShadow: entries.length ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
        }}>
          {entries.length ? `Save Ticket · ${entries.length} entries · Rs.${totalAmount}` : 'Add entries to save'}
        </button>
      </div>
    </div>
  );
}

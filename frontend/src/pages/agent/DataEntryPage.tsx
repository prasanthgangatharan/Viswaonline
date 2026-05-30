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

interface Entry { type: string; number: string; count: string; tab: number; amount: number; }

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
  const [tab, setTab] = useState(1);
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
      const timer = setTimeout(() => {
        toast.error('Betting window has closed!');
        navigate('/agent/home', { replace: true });
      }, remaining);

      const onLotteryClosed = (closed: any) => {
        if (closed.id === active.id) {
          toast.error('This lottery has been closed by admin');
          navigate('/agent/home', { replace: true });
        }
      };
      socket.on('lottery:closed', onLotteryClosed);

      return () => {
        clearTimeout(timer);
        socket.off('lottery:closed', onLotteryClosed);
      };
    }).catch(() => navigate('/agent/home', { replace: true }));
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

    // Batch lock check: per (number, tab, type) — each type has its own independent budget
    const maxes = [lottery.tab1_max, lottery.tab2_max, lottery.tab3_max];
    const max = maxes[tab - 1];
    if (max) {
      const adding: Record<string, number> = {};
      for (const t of typesToAdd) {
        for (const n of numsToAdd) {
          const key = `${Number(n)}_${tab}_${t}`;
          adding[key] = (adding[key] || 0) + count;
        }
      }
      for (const [key, totalAdding] of Object.entries(adding)) {
        const parts = key.split('_');
        const numVal = Number(parts[0]);
        const entryType = parts[2];
        const fromServer = usedCounts[key] || 0;
        const fromLocal = entries
          .filter(e => Number(e.number) === numVal && e.tab === tab && e.type === entryType)
          .reduce((s, e) => s + Number(e.count), 0);
        const remaining = max - fromServer - fromLocal;
        if (remaining < totalAdding) {
          const numStr = String(numVal).padStart(tab, '0');
          toast.error(
            remaining > 0
              ? `Only ${remaining} slot${remaining === 1 ? '' : 's'} left for ${numStr} (${entryType})`
              : `${numStr} (${entryType}) is fully booked`,
            { duration: 4000 }
          );
          return;
        }
      }
    }

    // All checks passed — add all entries in one update
    const newEntries: Entry[] = [];
    for (const t of typesToAdd) {
      for (const n of numsToAdd) {
        newEntries.push({ type: t, number: n, count: cntInput, tab, amount: count * price });
      }
    }
    setEntries(prev => [...prev, ...newEntries]);
    setNumInput('');
    setCntInput('');
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
      await api.post('/bets/batch', {
        lottery_id: lottery.id,
        ticket_id: ticketId,
        customer_name: customer.trim() || undefined,
        entries: entries.map(e => ({ type: e.type, number: Number(e.number), count: Number(e.count), tab: e.tab })),
      });
      toast.success(`Ticket ${ticketId} saved!`);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F7FE', position: 'relative' }}>

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(27,37,89,0.3)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 340, boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2B3674', marginBottom: 4 }}>Confirm Ticket</div>
            <div style={{ fontSize: 13, color: '#A3AED0', marginBottom: 18, fontWeight: 500 }}>{lottery?.name}</div>

            <div style={{ background: '#F4F7FE', borderRadius: 14, padding: 14, marginBottom: 18, maxHeight: 200, overflowY: 'auto' }}>
              {entries.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #E0E5F2', fontSize: 13 }}>
                  <span style={{ color: TYPE_COLOR[e.type] || '#A3AED0', fontWeight: 800 }}>{e.type}</span>
                  <span style={{ color: '#2B3674', fontWeight: 700 }}>{e.number}</span>
                  <span style={{ color: '#A3AED0' }}>x{e.count}</span>
                  <span style={{ color: '#05CD99', fontWeight: 800 }}>Rs.{e.amount}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22, fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: '#A3AED0' }}>Total</span>
              <span style={{ color: '#05CD99', fontSize: 20 }}>Rs.{totalAmount}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '12px', background: '#F4F7FE', border: 'none', borderRadius: 12, color: '#A3AED0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmSave} disabled={saving} style={{ padding: '12px', background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(43,115,255,0.3)' }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: '#fff', flexShrink: 0, borderBottom: '1px solid #F0F5FF', boxShadow: '0 2px 8px rgba(112,144,176,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 14px', borderBottom: '1px solid #F4F7FE' }}>
          <button onClick={() => navigate('/agent/home')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9, background: '#F4F7FE', border: 'none', color: '#2B3674', cursor: 'pointer', flexShrink: 0 }}>
            <Home size={15} />
          </button>
          <span style={{ fontSize: 11, color: '#A3AED0', fontWeight: 500 }}>CNT <strong style={{ color: '#2B3674', fontWeight: 800 }}>{entries.length}</strong></span>
          <span style={{ fontSize: 11, color: '#A3AED0', fontWeight: 500 }}>Rs <strong style={{ color: '#05CD99', fontWeight: 800 }}>{totalAmount.toFixed(1)}</strong></span>
          <span style={{ flex: 1 }} />
          <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: '#2B73FF', background: '#EBF3FF', padding: '4px 10px', borderRadius: 8 }}>
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 14px' }}>
          <div style={{ background: '#EBF3FF', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#2B73FF', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lottery?.name || '-'}
          </div>
          <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer name" style={{ flex: 1, background: '#F4F7FE', border: '1.5px solid #E0E5F2', borderRadius: 8, padding: '5px 10px', color: '#2B3674', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[1, 2, 3].map(t => (
              <button key={t} onClick={() => changeTab(t)} style={{
                width: 30, height: 30, borderRadius: 8,
                background: tab === t ? 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)' : '#F4F7FE',
                border: 'none',
                color: tab === t ? '#fff' : '#A3AED0',
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}>{t}</button>
            ))}
            {tab === 3 && (
              <button onClick={() => setSetMode(p => !p)} style={{
                height: 30, padding: '0 10px', borderRadius: 8, border: 'none',
                background: setMode ? '#FF8C42' : '#F4F7FE',
                color: setMode ? '#fff' : '#A3AED0',
                fontWeight: 800, fontSize: 11, cursor: 'pointer', letterSpacing: 0.5,
              }}>SET</button>
            )}
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 100, background: '#fff' }}>
        {entries.length === 0 ? (
          <div style={{ padding: '18px 16px', textAlign: 'center', color: '#A3AED0', fontSize: 12, fontWeight: 500 }}>
            Enter number and count, then tap a type button
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#FAFBFF', zIndex: 1, borderBottom: '1px solid #E0E5F2' }}>
              <tr>
                {['TYPE', 'NUM', 'CNT', 'AMOUNT', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#A3AED0', fontSize: 10, letterSpacing: 0.8, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const color = TYPE_COLOR[e.type] || '#A3AED0';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F4F7FE' }}>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 7, fontSize: 12, fontWeight: 800, background: color + '18', color }}>
                        {e.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', fontWeight: 800, fontSize: 18, color: '#2B3674', letterSpacing: 2 }}>{e.number}</td>
                    <td style={{ padding: '10px 10px', fontSize: 15, color: '#A3AED0', fontWeight: 700 }}>{e.count}</td>
                    <td style={{ padding: '10px 10px', fontSize: 14, fontWeight: 800, color: '#05CD99' }}>Rs.{e.amount}</td>
                    <td style={{ padding: '10px 6px' }}>
                      <button onClick={() => deleteEntry(i)} style={{ background: 'none', border: 'none', color: '#EE5D50', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
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
      <div style={{ background: 'linear-gradient(135deg, #2B73FF 0%, #1A5ACC 100%)', padding: '10px 12px 12px', flexShrink: 0 }}>

        {/* Number / Count Display */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div style={{
            background: inputPhase === 'number' ? '#fff' : 'rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '8px 12px', textAlign: 'center',
            fontSize: 22, fontWeight: 800,
            color: numInput ? '#2B3674' : (inputPhase === 'number' ? '#A3AED0' : 'rgba(255,255,255,0.6)'),
            border: inputPhase === 'number' ? '2px solid #FFCE20' : '2px solid transparent',
            letterSpacing: 6, transition: 'all 0.15s',
          }}>
            {numInput || '_'.repeat(tab)}
          </div>
          <div style={{
            background: inputPhase === 'count' ? '#fff' : 'rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '8px 12px', textAlign: 'center',
            fontSize: 22, fontWeight: 800,
            color: cntInput ? '#2B3674' : (inputPhase === 'count' ? '#A3AED0' : 'rgba(255,255,255,0.6)'),
            border: inputPhase === 'count' ? '2px solid #FFCE20' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {cntInput || 'Count'}
          </div>
        </div>

        {/* Type Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${typeButtons.length + 1}, 1fr)`, gap: 6, marginBottom: 8 }}>
          {typeButtons.map(t => (
            <button key={t} onClick={() => handleTypeButton(t)} style={{
              padding: '9px 4px', background: 'rgba(255,255,255,0.18)',
              border: '2px solid rgba(255,255,255,0.4)', borderRadius: 10,
              color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
            }}>{t}</button>
          ))}
          <button onClick={() => handleTypeButton('ALL')} style={{
            padding: '9px 4px', background: 'rgba(255,255,255,0.28)',
            border: '2px solid rgba(255,255,255,0.55)', borderRadius: 10,
            color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer',
          }}>ALL</button>
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
          {keyRows.flat().map((k, i) => {
            const isSpecial = ['DEL', 'UNDO'].includes(k);
            return (
              <button key={i} onClick={() => handleKey(k)} style={{
                padding: '11px 4px',
                background: isSpecial ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.18)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 10, color: '#fff',
                fontWeight: 800, fontSize: isSpecial ? 11 : 20,
                cursor: 'pointer',
              }}>{k}</button>
            );
          })}
        </div>

        {/* Save Ticket */}
        <button onClick={() => entries.length && setShowConfirm(true)} disabled={!entries.length} style={{
          width: '100%', padding: '12px',
          background: entries.length ? '#fff' : 'rgba(255,255,255,0.2)',
          border: 'none', borderRadius: 12,
          color: entries.length ? '#2B73FF' : 'rgba(255,255,255,0.5)',
          fontSize: 14, fontWeight: 800, cursor: entries.length ? 'pointer' : 'not-allowed',
          boxShadow: entries.length ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
        }}>
          {entries.length ? `Save Ticket · ${entries.length} entries · Rs.${totalAmount}` : 'Add entries to save'}
        </button>
      </div>
    </div>
  );
}

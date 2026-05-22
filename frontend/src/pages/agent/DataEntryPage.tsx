import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/agentApi';
import socket from '../../lib/socket';
import toast from 'react-hot-toast';
import { useCountdown } from '../../hooks/useCountdown';
import { useAuth } from '../../hooks/useAuth';
import { Trash2, Home } from 'lucide-react';

function pad(n: number) { return String(n).padStart(2, '0'); }

interface Entry { type: string; number: string; count: string; tab: number; amount: number; }

const TYPE_COLOR: Record<string, string> = {
  A: '#16a34a', B: '#dc2626', C: '#2563eb',
  AB: '#d97706', BC: '#7c3aed', AC: '#0891b2',
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
  };

  const addEntry = (type: string): boolean => {
    if (!numInput || numInput.length < tab || !cntInput || !lottery) return false;
    const count = Number(cntInput);
    if (isNaN(count) || count <= 0) return false;
    setEntries(prev => [...prev, { type, number: numInput, count: cntInput, tab, amount: count * price }]);
    return true;
  };

  const getTypesForTab = (t: number) => {
    if (t === 1) return ['A', 'B', 'C'];
    if (t === 2) return ['AB', 'BC', 'AC'];
    return [];
  };

  const handleTypeButton = (type: string) => {
    if (type === 'ALL') {
      if (!numInput || numInput.length < tab || !cntInput) {
        toast.error('Enter number and count first');
        return;
      }
      let added = false;
      getTypesForTab(tab).forEach(t => { if (addEntry(t)) added = true; });
      if (added) { setNumInput(''); setCntInput(''); }
    } else {
      if (!addEntry(type)) {
        toast.error('Enter number and count first');
        return;
      }
      setNumInput(''); setCntInput('');
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
      await api.post('/bets/batch', {
        lottery_id: lottery.id,
        ticket_id: ticketId,
        customer_name: customer.trim() || undefined,
        entries: entries.map(e => ({ type: e.type, number: Number(e.number), count: Number(e.count), tab: e.tab })),
      });
      toast.success(`Ticket ${ticketId} saved!`);
      navigate('/agent/home', { replace: true });
    } catch { toast.error('Failed to save ticket'); }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f1f5f9', position: 'relative' }}>

      {showConfirm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Confirm Ticket</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{lottery?.name}</div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
              {entries.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <span style={{ color: TYPE_COLOR[e.type] || '#64748b', fontWeight: 700 }}>{e.type}</span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{e.number}</span>
                  <span style={{ color: '#94a3b8' }}>x{e.count}</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>Rs.{e.amount}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
              <span style={{ color: '#64748b' }}>Total</span>
              <span style={{ color: '#16a34a', fontSize: 18 }}>Rs.{totalAmount}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmSave} disabled={saving} style={{ padding: '11px', background: '#0284c7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ background: '#fff', flexShrink: 0, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <button onClick={() => navigate('/agent/home')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
            <Home size={14} />
          </button>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>CNT <strong style={{ color: '#0f172a' }}>{entries.length}</strong></span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Rs <strong style={{ color: '#16a34a' }}>{totalAmount.toFixed(1)}</strong></span>
          <span style={{ flex: 1 }} />
          <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#0284c7' }}>
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 12px' }}>
          <div style={{ background: '#e0f2fe', borderRadius: 5, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#0284c7', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lottery?.name || '-'}
          </div>
          <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer" style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '4px 8px', color: '#0f172a', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3].map(t => (
              <button key={t} onClick={() => changeTab(t)} style={{ width: 28, height: 28, borderRadius: 5, background: tab === t ? '#0284c7' : '#f1f5f9', border: `1px solid ${tab === t ? '#0284c7' : '#e2e8f0'}`, color: tab === t ? '#fff' : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 100 }}>
        {entries.length === 0 ? (
          <div style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
            No entries yet - enter number and count, then tap type button
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                {['TYPE', 'NUM', 'CNT', 'AMOUNT', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8', fontSize: 11, letterSpacing: 0.5, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const color = TYPE_COLOR[e.type] || '#64748b';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 12, fontWeight: 700, background: color + '18', border: `1px solid ${color}44`, color }}>
                        {e.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', fontWeight: 700, fontSize: 17, color: '#0f172a', letterSpacing: 2 }}>{e.number}</td>
                    <td style={{ padding: '10px 10px', fontSize: 15, color: '#64748b', fontWeight: 600 }}>{e.count}</td>
                    <td style={{ padding: '10px 10px', fontSize: 14, fontWeight: 700, color: '#16a34a' }}>Rs.{e.amount}</td>
                    <td style={{ padding: '10px 6px' }}>
                      <button onClick={() => deleteEntry(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
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
      <div style={{ background: '#0284c7', padding: '8px 10px 10px', flexShrink: 0 }}>

        {/* Number / Count Display */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 7 }}>
          <div style={{ background: inputPhase === 'number' ? '#fff' : '#e0f2fe', borderRadius: 7, padding: '6px 10px', textAlign: 'center', fontSize: 20, fontWeight: 700, color: numInput ? '#0f172a' : '#94a3b8', border: inputPhase === 'number' ? '2px solid #fbbf24' : '2px solid transparent', transition: 'border 0.15s', letterSpacing: 4 }}>
            {numInput || '_'.repeat(tab)}
          </div>
          <div style={{ background: inputPhase === 'count' ? '#fff' : '#e0f2fe', borderRadius: 7, padding: '6px 10px', textAlign: 'center', fontSize: 20, fontWeight: 700, color: cntInput ? '#0f172a' : '#94a3b8', border: inputPhase === 'count' ? '2px solid #fbbf24' : '2px solid transparent', transition: 'border 0.15s' }}>
            {cntInput || 'Count'}
          </div>
        </div>

        {/* Type Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${typeButtons.length + 1}, 1fr)`, gap: 5, marginBottom: 7 }}>
          {typeButtons.map(t => (
            <button key={t} onClick={() => handleTypeButton(t)} style={{ padding: '8px 4px', background: 'rgba(255,255,255,0.15)', border: `2px solid rgba(255,255,255,0.4)`, borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{t}</button>
          ))}
          {tab !== 3 && (
            <button onClick={() => handleTypeButton('ALL')} style={{ padding: '8px 4px', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>ALL</button>
          )}
          {tab === 3 && (
            <button onClick={() => handleTypeButton('X')} style={{ padding: '8px 4px', background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>ADD</button>
          )}
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 7 }}>
          {keyRows.flat().map((k, i) => {
            const isSpecial = ['DEL', 'UNDO'].includes(k);
            return (
              <button key={i} onClick={() => handleKey(k)} style={{
                padding: '10px 4px',
                background: isSpecial ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.18)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 7, color: '#fff',
                fontWeight: 700,
                fontSize: isSpecial ? 11 : 18,
                cursor: 'pointer',
              }}>{k}</button>
            );
          })}
        </div>

        {/* Save Ticket */}
        <button onClick={() => entries.length && setShowConfirm(true)} disabled={!entries.length} style={{
          width: '100%', padding: '10px',
          background: entries.length ? '#fff' : 'rgba(255,255,255,0.2)',
          border: 'none', borderRadius: 7,
          color: entries.length ? '#0284c7' : 'rgba(255,255,255,0.5)',
          fontSize: 13, fontWeight: 700, letterSpacing: 0.5, cursor: entries.length ? 'pointer' : 'not-allowed',
        }}>
          {entries.length ? `Save Ticket - ${entries.length} entries - Rs.${totalAmount}` : 'Add entries to save'}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import api from '../../lib/adminApi';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Lock, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 2px 16px rgba(112,144,176,0.1)',
};

const inp: React.CSSProperties = {
  width: '100%', border: '1.5px solid #E0E5F2', borderRadius: 12,
  padding: '11px 14px', fontSize: 14, color: '#2B3674',
  background: '#F4F7FE', boxSizing: 'border-box',
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function buildDrawTime(f: { draw_date: string; draw_hour: string; draw_minute: string; draw_ampm: string }) {
  let h = parseInt(f.draw_hour) % 12;
  if (f.draw_ampm === 'PM') h += 12;
  const [year, month, day] = f.draw_date.split('-').map(Number);
  return new Date(year, month - 1, day, h, parseInt(f.draw_minute), 0).toISOString();
}

function parseDrawTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return {
    draw_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    draw_hour: String(h),
    draw_minute: String(d.getMinutes()).padStart(2, '0'),
    draw_ampm: ampm,
  };
}

const emptyForm = { name: '', draw_date: '', draw_hour: '12', draw_minute: '00', draw_ampm: 'AM', stop_betting_minutes: 10, tab1_max: '', tab2_max: '', tab3_max: '' };

type PwAction = { type: 'close' | 'delete'; lotteryId: string } | { type: 'edit'; lotteryId: string; payload: any };

function FormFields({ f, set }: { f: typeof emptyForm; set: (v: any) => void }) {
  const todayStr = new Date().toISOString().split('T')[0];
  return (
    <>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Lottery Name</label>
        <input style={inp} value={f.name} onChange={e => set({ ...f, name: e.target.value })} required placeholder="e.g. Morning Draw" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Draw Date</label>
        <input type="date" min={todayStr} style={inp} value={f.draw_date} onChange={e => set({ ...f, draw_date: e.target.value })} required />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Draw Time</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>Hour</div>
            <select style={inp} value={f.draw_hour} onChange={e => set({ ...f, draw_hour: e.target.value })} required>
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => <option key={h} value={h}>{h.padStart(2, '0')}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>Minute</div>
            <select style={inp} value={f.draw_minute} onChange={e => set({ ...f, draw_minute: e.target.value })} required>
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>AM / PM</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['AM', 'PM'].map(p => (
                <button key={p} type="button" onClick={() => set({ ...f, draw_ampm: p })} style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: `1.5px solid ${f.draw_ampm === p ? '#4318FF' : '#E0E5F2'}`,
                  background: f.draw_ampm === p ? '#EFF4FB' : '#F4F7FE',
                  color: f.draw_ampm === p ? '#4318FF' : '#A3AED0',
                  cursor: 'pointer', fontWeight: 700, fontSize: 13,
                }}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Stop Betting (minutes before draw)</label>
        <input type="number" style={inp} value={f.stop_betting_minutes} onChange={e => set({ ...f, stop_betting_minutes: Number(e.target.value) })} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2B3674', marginBottom: 10 }}>
          Number Lock Limits <span style={{ color: '#A3AED0', fontWeight: 500 }}>(optional)</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[{ key: 'tab1_max', label: 'Tab 1' }, { key: 'tab2_max', label: 'Tab 2' }, { key: 'tab3_max', label: 'Tab 3' }].map(({ key, label }) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>{label}</div>
              <input type="number" min={1} placeholder="Max" style={{ ...inp, padding: '9px 12px' }}
                value={(f as any)[key]}
                onChange={e => set({ ...f, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function LotteriesPage() {
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Edit modal
  const [editingLottery, setEditingLottery] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // Password modal
  const [pwAction, setPwAction] = useState<PwAction | null>(null);
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const pwRef = useRef<HTMLInputElement>(null);

  const fetchLotteries = async () => {
    try { const { data } = await api.get('/lotteries'); setLotteries(data); } catch {}
  };

  useEffect(() => {
    fetchLotteries();
    const ch = supabase.channel('lotteries-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lotteries' }, fetchLotteries)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Open password modal for close/delete
  const askPassword = (action: PwAction) => {
    setPwAction(action);
    setPw('');
    setPwError('');
    setShowPw(false);
    setTimeout(() => pwRef.current?.focus(), 50);
  };

  // Execute the confirmed action
  const confirmAction = async () => {
    if (!pw.trim()) { setPwError('Password is required'); return; }
    if (!pwAction) return;
    setPwLoading(true);
    setPwError('');
    try {
      if (pwAction.type === 'close') {
        await api.patch(`/lotteries/${pwAction.lotteryId}/close`, { admin_password: pw });
        toast.success('Betting closed');
      } else if (pwAction.type === 'delete') {
        await api.delete(`/lotteries/${pwAction.lotteryId}`, { data: { admin_password: pw } });
        toast.success('Lottery deleted');
      } else if (pwAction.type === 'edit') {
        await api.patch(`/lotteries/${pwAction.lotteryId}`, { ...pwAction.payload, admin_password: pw });
        toast.success('Lottery updated');
      }
      setPwAction(null);
      setEditingLottery(null);
      fetchLotteries();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPwError(Array.isArray(msg) ? msg[0] : (msg || 'Failed'));
    } finally {
      setPwLoading(false);
    }
  };

  // Open edit modal pre-filled
  const openEdit = (lottery: any) => {
    setEditingLottery(lottery);
    setEditForm({
      ...parseDrawTime(lottery.draw_time),
      name: lottery.name,
      stop_betting_minutes: lottery.stop_betting_minutes,
      tab1_max: lottery.tab1_max ?? '',
      tab2_max: lottery.tab2_max ?? '',
      tab3_max: lottery.tab3_max ?? '',
    });
  };

  // Submit edit → open password modal with the payload
  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLottery) return;
    const draw_time = buildDrawTime(editForm);
    if (new Date(draw_time) <= new Date()) {
      toast.error('Draw time must be in the future');
      return;
    }
    const payload: any = {
      name: editForm.name,
      draw_time,
      stop_betting_minutes: Number(editForm.stop_betting_minutes),
    };
    if (editForm.tab1_max !== '') payload.tab1_max = Number(editForm.tab1_max);
    if (editForm.tab2_max !== '') payload.tab2_max = Number(editForm.tab2_max);
    if (editForm.tab3_max !== '') payload.tab3_max = Number(editForm.tab3_max);
    askPassword({ type: 'edit', lotteryId: editingLottery.id, payload });
  };

  // Create lottery
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const draw_time = buildDrawTime(form);
    if (new Date(draw_time) <= new Date()) {
      toast.error('Draw time must be in the future');
      return;
    }
    setLoading(true);
    try {
      await api.post('/lotteries', {
        draw_time,
        name: form.name,
        stop_betting_minutes: Number(form.stop_betting_minutes),
        ...(form.tab1_max ? { tab1_max: Number(form.tab1_max) } : {}),
        ...(form.tab2_max ? { tab2_max: Number(form.tab2_max) } : {}),
        ...(form.tab3_max ? { tab3_max: Number(form.tab3_max) } : {}),
      });
      toast.success('Lottery created');
      setForm(emptyForm);
      fetchLotteries();
      setTab('active');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg || 'Failed to create lottery'));
    } finally { setLoading(false); }
  };

  const active = lotteries.filter(l => l.status === 'active');
  const done = lotteries.filter(l => l.status === 'done' || l.status === 'closed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Password Confirmation Modal */}
      {pwAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,37,89,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#2B3674', marginBottom: 6 }}>Confirm Action</div>
            <div style={{ fontSize: 13, color: '#A3AED0', marginBottom: 24, fontWeight: 500 }}>
              {pwAction.type === 'close' && 'Enter your admin password to close betting.'}
              {pwAction.type === 'delete' && 'Enter your admin password to permanently delete this lottery.'}
              {pwAction.type === 'edit' && 'Enter your admin password to save the changes.'}
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                ref={pwRef}
                type={showPw ? 'text' : 'password'}
                placeholder="Admin password"
                value={pw}
                onChange={e => { setPw(e.target.value); setPwError(''); }}
                onKeyDown={e => e.key === 'Enter' && confirmAction()}
                style={{ ...inp, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#A3AED0', cursor: 'pointer', display: 'flex' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwError && <div style={{ fontSize: 12, color: '#EE5D50', marginBottom: 12, fontWeight: 600 }}>{pwError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              <button type="button" onClick={() => setPwAction(null)} style={{ padding: 12, background: '#F4F7FE', border: 'none', borderRadius: 12, color: '#A3AED0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={confirmAction} disabled={pwLoading} style={{
                padding: 12, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                background: pwAction.type === 'delete' ? 'linear-gradient(135deg, #EE5D50 0%, #FF8C42 100%)' : 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
                color: '#fff', boxShadow: '0 4px 14px rgba(67,24,255,0.25)',
              }}>
                {pwLoading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lottery Modal */}
      {editingLottery && !pwAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,37,89,0.4)', backdropFilter: 'blur(4px)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#2B3674', marginBottom: 4 }}>Edit Lottery</div>
            <div style={{ fontSize: 13, color: '#A3AED0', marginBottom: 24, fontWeight: 500 }}>{editingLottery.name}</div>
            <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormFields f={editForm} set={setEditForm} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                <button type="button" onClick={() => setEditingLottery(null)} style={{ padding: 12, background: '#F4F7FE', border: 'none', borderRadius: 12, color: '#A3AED0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: 12, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(67,24,255,0.25)' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Lotteries</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#EFF4FB', padding: 5, borderRadius: 14, width: 'fit-content' }}>
        {[
          { key: 'new', label: '+ New' },
          { key: 'active', label: `Active (${active.length})` },
          { key: 'done', label: `Done (${done.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none',
            background: tab === key ? '#fff' : 'transparent',
            color: tab === key ? '#4318FF' : '#A3AED0',
            cursor: 'pointer', fontSize: 13,
            fontWeight: tab === key ? 700 : 500,
            boxShadow: tab === key ? '0 2px 8px rgba(112,144,176,0.12)' : 'none',
            transition: 'all 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div style={{ ...card, padding: 28, maxWidth: 480 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2B3674', marginBottom: 22 }}>New Lottery</div>
          <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormFields f={form} set={setForm} />
            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
              border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', marginTop: 6, boxShadow: '0 4px 14px rgba(67,24,255,0.3)',
            }}>
              <Plus size={16} /> {loading ? 'Creating...' : 'Create Lottery'}
            </button>
          </form>
        </div>
      )}

      {tab === 'active' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {active.length === 0 && <div style={{ color: '#A3AED0', fontSize: 14 }}>No active lotteries</div>}
          {active.map(l => (
            <div key={l.id} style={{ ...card, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#2B3674' }}>{l.name}</div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#E6FAF5', color: '#05CD99' }}>OPEN</span>
              </div>
              <div style={{ fontSize: 13, color: '#A3AED0', marginBottom: 4, fontWeight: 500 }}>{fmtDateTime(l.draw_time)}</div>
              <div style={{ fontSize: 12, color: '#FFCE20', marginBottom: 10, fontWeight: 600 }}>Closes {l.stop_betting_minutes} min before draw</div>
              {(l.tab1_max || l.tab2_max || l.tab3_max) && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {[['T1', l.tab1_max], ['T2', l.tab2_max], ['T3', l.tab3_max]].map(([label, max]) =>
                    max ? (
                      <span key={label as string} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: '#F0EBFF', color: '#7B61FF', borderRadius: 8 }}>
                        {label} max {max}
                      </span>
                    ) : null
                  )}
                </div>
              )}
              <button onClick={() => openEdit(l)} style={{
                width: '100%', padding: '10px', background: '#EFF4FB',
                border: '1.5px solid #C8D7FF', borderRadius: 12,
                color: '#4318FF', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8,
              }}>
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => askPassword({ type: 'close', lotteryId: l.id })} style={{
                width: '100%', padding: '10px', background: '#FFF8E6',
                border: '1.5px solid #FFCE20', borderRadius: 12,
                color: '#D4A900', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8,
              }}>
                <Lock size={13} /> Close Betting
              </button>
              <button onClick={() => askPassword({ type: 'delete', lotteryId: l.id })} style={{ background: 'transparent', border: 'none', color: '#EE5D50', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'done' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {done.length === 0 && <div style={{ color: '#A3AED0', fontSize: 14 }}>No completed lotteries</div>}
          {done.map(l => (
            <div key={l.id} style={{ ...card, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#2B3674' }}>{l.name}</div>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#F4F7FE', color: '#A3AED0' }}>DONE</span>
              </div>
              <div style={{ fontSize: 13, color: '#A3AED0', marginTop: 8, fontWeight: 500 }}>{fmtDateTime(l.draw_time)}</div>
              <button onClick={() => askPassword({ type: 'delete', lotteryId: l.id })} style={{ marginTop: 12, background: 'transparent', border: 'none', color: '#EE5D50', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

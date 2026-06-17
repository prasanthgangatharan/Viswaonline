import { useState, useEffect, useRef } from 'react';
import api from '../../lib/adminApi';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Lock, Plus, Pencil, Trash2, Eye, EyeOff, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const inp = (error?: boolean): React.CSSProperties => ({
  width: '100%', border: `1.5px solid ${error ? '#EF4444' : '#E0E5F2'}`, borderRadius: 12,
  padding: '11px 14px', fontSize: 14, color: '#111827',
  background: error ? '#FFF5F5' : '#F9FAFB', boxSizing: 'border-box',
});

const errTxt: React.CSSProperties = { fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: 500 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 7 };
const required: React.CSSProperties = { color: '#EF4444', marginLeft: 2 };

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
type FormErrors = { name?: string; draw_date?: string; stop_betting?: string };

type PwAction = { type: 'close' | 'delete'; lotteryId: string } | { type: 'edit'; lotteryId: string; payload: any };

function ModalFormFields({ f, set }: { f: typeof emptyForm; set: (v: any) => void }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const si: React.CSSProperties = {
    width: '100%', border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '11px 14px', fontSize: 14, color: '#111827',
    background: '#F9FAFB', boxSizing: 'border-box',
  };
  return (
    <>
      <div>
        <label style={label}>Lottery Name <span style={required}>*</span></label>
        <input style={si} value={f.name} onChange={e => set({ ...f, name: e.target.value })} required placeholder="e.g. Morning Draw" />
      </div>
      <div>
        <label style={label}>Draw Date <span style={required}>*</span></label>
        <input type="date" min={todayStr} style={si} value={f.draw_date} onChange={e => set({ ...f, draw_date: e.target.value })} required />
      </div>
      <div>
        <label style={label}>Draw Time</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 5, fontWeight: 500 }}>Hour</div>
            <select style={si} value={f.draw_hour} onChange={e => set({ ...f, draw_hour: e.target.value })}>
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => <option key={h} value={h}>{h.padStart(2, '0')}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 5, fontWeight: 500 }}>Minute</div>
            <select style={si} value={f.draw_minute} onChange={e => set({ ...f, draw_minute: e.target.value })}>
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 5, fontWeight: 500 }}>AM / PM</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['AM', 'PM'].map(p => (
                <button key={p} type="button" onClick={() => set({ ...f, draw_ampm: p })} style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: `1.5px solid ${f.draw_ampm === p ? '#7C3AED' : '#E0E5F2'}`,
                  background: f.draw_ampm === p ? '#EFF4FB' : '#F4F7FE',
                  color: f.draw_ampm === p ? '#7C3AED' : '#6B7280',
                  cursor: 'pointer', fontWeight: 700, fontSize: 13,
                }}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <label style={label}>Stop Betting (minutes before draw)</label>
        <input type="number" style={si} value={f.stop_betting_minutes} onChange={e => set({ ...f, stop_betting_minutes: Number(e.target.value) })} />
      </div>
      <div>
        <label style={{ ...label, marginBottom: 10 }}>
          Number Lock Limits <span style={{ color: '#6B7280', fontWeight: 500, fontSize: 12 }}>(optional)</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[{ key: 'tab1_max', label: 'Tab 1' }, { key: 'tab2_max', label: 'Tab 2' }, { key: 'tab3_max', label: 'Tab 3' }].map(({ key, label: l }) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 5, fontWeight: 500 }}>{l}</div>
              <input type="number" min={1} placeholder="Max" style={{ ...si, padding: '9px 12px' }}
                value={(f as any)[key]} onChange={e => set({ ...f, [key]: e.target.value })} />
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [editingLottery, setEditingLottery] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

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

  const askPassword = (action: PwAction) => {
    setPwAction(action); setPw(''); setPwError(''); setShowPw(false);
    setTimeout(() => pwRef.current?.focus(), 50);
  };

  const confirmAction = async () => {
    if (!pw.trim()) { setPwError('Password is required'); return; }
    if (!pwAction) return;
    setPwLoading(true); setPwError('');
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
      setPwAction(null); setEditingLottery(null); fetchLotteries();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setPwError(Array.isArray(msg) ? msg[0] : (msg || 'Failed'));
    } finally { setPwLoading(false); }
  };

  const openEdit = (lottery: any) => {
    setEditingLottery(lottery);
    setEditForm({ ...parseDrawTime(lottery.draw_time), name: lottery.name, stop_betting_minutes: lottery.stop_betting_minutes, tab1_max: lottery.tab1_max ?? '', tab2_max: lottery.tab2_max ?? '', tab3_max: lottery.tab3_max ?? '' });
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLottery) return;
    const draw_time = buildDrawTime(editForm);
    if (new Date(draw_time) <= new Date()) { toast.error('Draw time must be in the future'); return; }
    const payload: any = { name: editForm.name, draw_time, stop_betting_minutes: Number(editForm.stop_betting_minutes) };
    if (editForm.tab1_max !== '') payload.tab1_max = Number(editForm.tab1_max);
    if (editForm.tab2_max !== '') payload.tab2_max = Number(editForm.tab2_max);
    if (editForm.tab3_max !== '') payload.tab3_max = Number(editForm.tab3_max);
    askPassword({ type: 'edit', lotteryId: editingLottery.id, payload });
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = 'Lottery name is required';
    if (!form.draw_date) errs.draw_date = 'Draw date is required';
    if (form.stop_betting_minutes < 1) errs.stop_betting = 'Must be at least 1 minute';
    return errs;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const draw_time = buildDrawTime(form);
    if (new Date(draw_time) <= new Date()) { toast.error('Draw time must be in the future'); return; }
    setLoading(true);
    try {
      await api.post('/lotteries', {
        draw_time, name: form.name,
        stop_betting_minutes: Number(form.stop_betting_minutes),
        ...(form.tab1_max ? { tab1_max: Number(form.tab1_max) } : {}),
        ...(form.tab2_max ? { tab2_max: Number(form.tab2_max) } : {}),
        ...(form.tab3_max ? { tab3_max: Number(form.tab3_max) } : {}),
      });
      toast.success('Lottery created');
      setForm(emptyForm); setFormErrors({});
      fetchLotteries(); setTab('active');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg || 'Failed to create lottery'));
    } finally { setLoading(false); }
  };

  const downloadPDF = (rows: any[], title: string) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 16);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 23);
    autoTable(doc, {
      startY: 29,
      head: [['#', 'Lottery Name', 'Draw Time', 'Stop Before', 'T1 Max', 'T2 Max', 'T3 Max', 'Status']],
      body: rows.map((l, i) => [i + 1, l.name, fmtDateTime(l.draw_time), `${l.stop_betting_minutes} min`, l.tab1_max ?? '—', l.tab2_max ?? '—', l.tab3_max ?? '—', l.status?.toUpperCase()]),
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [17, 24, 39] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { cellPadding: 4 },
    });
    doc.save(`lotteries-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const active = lotteries.filter(l => l.status === 'active');
  const done = lotteries.filter(l => l.status === 'done' || l.status === 'closed');
  const todayStr = new Date().toISOString().split('T')[0];

  const thStyle: React.CSSProperties = {
    padding: '13px 18px', fontSize: 12, fontWeight: 700,
    color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5,
    textAlign: 'left', background: '#F9FAFB', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '15px 18px', fontSize: 15, color: '#111827',
    borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Password Modal */}
      {pwAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,37,89,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Confirm Action</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, fontWeight: 500 }}>
              {pwAction.type === 'close' && 'Enter your admin password to close betting.'}
              {pwAction.type === 'delete' && 'Enter your admin password to permanently delete this lottery.'}
              {pwAction.type === 'edit' && 'Enter your admin password to save the changes.'}
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input ref={pwRef} type={showPw ? 'text' : 'password'} placeholder="Admin password" value={pw}
                onChange={e => { setPw(e.target.value); setPwError(''); }}
                onKeyDown={e => e.key === 'Enter' && confirmAction()}
                style={{ width: '100%', border: `1.5px solid ${pwError ? '#EF4444' : '#E0E5F2'}`, borderRadius: 12, padding: '11px 44px 11px 14px', fontSize: 14, color: '#111827', background: '#F9FAFB', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwError && <div style={errTxt}>{pwError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              <button type="button" onClick={() => setPwAction(null)} style={{ padding: 12, background: '#F9FAFB', border: 'none', borderRadius: 12, color: '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={confirmAction} disabled={pwLoading} style={{ padding: 12, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', background: pwAction.type === 'delete' ? 'linear-gradient(135deg,#EE5D50,#FF8C42)' : 'linear-gradient(135deg,#4318FF,#9F7AEA)', color: '#fff' }}>
                {pwLoading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLottery && !pwAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,37,89,0.4)', backdropFilter: 'blur(4px)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Edit Lottery</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, fontWeight: 500 }}>{editingLottery.name}</div>
            <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ModalFormFields f={editForm} set={setEditForm} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                <button type="button" onClick={() => setEditingLottery(null)} style={{ padding: 12, background: '#F9FAFB', border: 'none', borderRadius: 12, color: '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: 12, background: 'linear-gradient(135deg,#4318FF,#9F7AEA)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Lotteries</div>

      {/* Tabs + PDF */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, background: '#F5F3FF', padding: 5, borderRadius: 14 }}>
          {[{ key: 'new', label: '+ New' }, { key: 'active', label: `Active (${active.length})` }, { key: 'done', label: `Done (${done.length})` }].map(({ key, label: l }) => (
            <button key={key} onClick={() => setTab(key as any)} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none',
              background: tab === key ? '#fff' : 'transparent',
              color: tab === key ? '#7C3AED' : '#6B7280',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 700 : 500,
              boxShadow: tab === key ? '0 2px 8px rgba(112,144,176,0.12)' : 'none',
            }}>{l}</button>
          ))}
        </div>
        {tab !== 'new' && (
          <button onClick={() => downloadPDF(tab === 'active' ? active : done, tab === 'active' ? 'Active Lotteries' : 'Completed Lotteries')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: '1.5px solid #E0E5F2', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Download size={14} /> Download PDF
          </button>
        )}
      </div>

      {/* ── New Lottery Form ── */}
      {tab === 'new' && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', padding: '28px 32px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 24 }}>New Lottery</div>
          <form onSubmit={create} noValidate>

            {/* Row 1: Name + Date */}
            <div className="lottery-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={label}>Lottery Name <span style={required}>*</span></label>
                <input
                  value={form.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setFormErrors(er => ({ ...er, name: undefined })); }}
                  placeholder="e.g. Morning Draw"
                  style={inp(!!formErrors.name)}
                />
                {formErrors.name && <div style={errTxt}>{formErrors.name}</div>}
              </div>
              <div>
                <label style={label}>Draw Date <span style={required}>*</span></label>
                <input
                  type="date" min={todayStr}
                  value={form.draw_date}
                  onChange={e => { setForm({ ...form, draw_date: e.target.value }); setFormErrors(er => ({ ...er, draw_date: undefined })); }}
                  style={inp(!!formErrors.draw_date)}
                />
                {formErrors.draw_date && <div style={errTxt}>{formErrors.draw_date}</div>}
              </div>
            </div>

            {/* Row 2: Draw Time */}
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Draw Time <span style={required}>*</span></label>
              <div className="lottery-time-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>Hour</div>
                  <select style={inp()} value={form.draw_hour} onChange={e => setForm({ ...form, draw_hour: e.target.value })}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => <option key={h} value={h}>{h.padStart(2, '0')}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>Minute</div>
                  <select style={inp()} value={form.draw_minute} onChange={e => setForm({ ...form, draw_minute: e.target.value })}>
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>AM / PM</div>
                  <div style={{ display: 'flex', gap: 6, height: 44 }}>
                    {['AM', 'PM'].map(p => (
                      <button key={p} type="button" onClick={() => setForm({ ...form, draw_ampm: p })} style={{
                        flex: 1, borderRadius: 12,
                        border: `1.5px solid ${form.draw_ampm === p ? '#7C3AED' : '#E0E5F2'}`,
                        background: form.draw_ampm === p ? '#EFF4FB' : '#F9FAFB',
                        color: form.draw_ampm === p ? '#7C3AED' : '#6B7280',
                        cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>Stop Before Draw</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number" min={1}
                      value={form.stop_betting_minutes}
                      onChange={e => { setForm({ ...form, stop_betting_minutes: Number(e.target.value) }); setFormErrors(er => ({ ...er, stop_betting: undefined })); }}
                      style={{ ...inp(!!formErrors.stop_betting), flex: 1 }}
                    />
                    <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>min</span>
                  </div>
                  {formErrors.stop_betting && <div style={errTxt}>{formErrors.stop_betting}</div>}
                </div>
              </div>
            </div>

            {/* Row 3: Number Lock Limits */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ ...label, marginBottom: 10 }}>
                Number Lock Limits <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 12 }}>(optional)</span>
              </label>
              <div className="lottery-limits-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {[{ key: 'tab1_max', label: 'Tab 1 Max' }, { key: 'tab2_max', label: 'Tab 2 Max' }, { key: 'tab3_max', label: 'Tab 3 Max' }].map(({ key, label: l }) => (
                  <div key={key}>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: 600 }}>{l}</div>
                    <input type="number" min={1} placeholder="No limit"
                      style={inp()}
                      value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px',
              background: loading ? '#A78BFA' : 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
              border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
            }}>
              <Plus size={17} /> {loading ? 'Creating...' : 'Create Lottery'}
            </button>
          </form>
        </div>
      )}

      {/* Active Table */}
      {tab === 'active' && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
          {active.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No active lotteries</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Draw Time</th>
                    <th style={thStyle}>Stop Before</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>T1 Max</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>T2 Max</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>T3 Max</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((l, i) => (
                    <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ ...tdStyle, color: '#9CA3AF', fontWeight: 600, width: 44 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{l.name}</td>
                      <td style={{ ...tdStyle, color: '#374151' }}>{fmtDateTime(l.draw_time)}</td>
                      <td style={{ ...tdStyle, color: '#6B7280' }}>{l.stop_betting_minutes} min</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{l.tab1_max ?? <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{l.tab2_max ?? <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{l.tab3_max ?? <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#E6FAF5', color: '#05CD99' }}>OPEN</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button onClick={() => openEdit(l)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#F5F3FF', border: '1.5px solid #C8D7FF', borderRadius: 9, color: '#7C3AED', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={() => askPassword({ type: 'close', lotteryId: l.id })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#FFF8E6', border: '1.5px solid #FFCE20', borderRadius: 9, color: '#D4A900', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                            <Lock size={12} /> Close
                          </button>
                          <button onClick={() => askPassword({ type: 'delete', lotteryId: l.id })} style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', background: '#FFF5F5', border: '1.5px solid #FED7D7', borderRadius: 9, color: '#EE5D50', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Done Table */}
      {tab === 'done' && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
          {done.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No completed lotteries</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Draw Time</th>
                    <th style={thStyle}>Stop Before</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>T1 Max</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>T2 Max</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>T3 Max</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {done.map((l, i) => (
                    <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ ...tdStyle, color: '#9CA3AF', fontWeight: 600, width: 44 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{l.name}</td>
                      <td style={{ ...tdStyle, color: '#374151' }}>{fmtDateTime(l.draw_time)}</td>
                      <td style={{ ...tdStyle, color: '#6B7280' }}>{l.stop_betting_minutes} min</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{l.tab1_max ?? <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{l.tab2_max ?? <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{l.tab3_max ?? <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#F3F4F6', color: '#6B7280' }}>{l.status?.toUpperCase()}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button onClick={() => askPassword({ type: 'delete', lotteryId: l.id })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#FFF5F5', border: '1.5px solid #FED7D7', borderRadius: 9, color: '#EE5D50', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

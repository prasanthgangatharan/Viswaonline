import { useState, useEffect } from 'react';
import api from '../../lib/adminApi';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Lock, Plus } from 'lucide-react';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 2px 16px rgba(112,144,176,0.1)',
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export function LotteriesPage() {
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', draw_date: '', draw_hour: '12', draw_minute: '00', draw_ampm: 'AM', stop_betting_minutes: 10, tab1_max: '', tab2_max: '', tab3_max: '' });

  const buildDrawTime = () => {
    let h = parseInt(form.draw_hour) % 12;
    if (form.draw_ampm === 'PM') h += 12;
    const [year, month, day] = form.draw_date.split('-').map(Number);
    return new Date(year, month - 1, day, h, parseInt(form.draw_minute), 0).toISOString();
  };

  const fetch = async () => {
    try { const { data } = await api.get('/lotteries'); setLotteries(data); } catch {}
  };

  useEffect(() => {
    fetch();
    const ch = supabase.channel('lotteries-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lotteries' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/lotteries', {
        draw_time: buildDrawTime(),
        name: form.name,
        stop_betting_minutes: Number(form.stop_betting_minutes),
        ...(form.tab1_max ? { tab1_max: Number(form.tab1_max) } : {}),
        ...(form.tab2_max ? { tab2_max: Number(form.tab2_max) } : {}),
        ...(form.tab3_max ? { tab3_max: Number(form.tab3_max) } : {}),
      });
      toast.success('Lottery created');
      setForm({ name: '', draw_date: '', draw_hour: '12', draw_minute: '00', draw_ampm: 'AM', stop_betting_minutes: 10, tab1_max: '', tab2_max: '', tab3_max: '' });
      fetch(); setTab('active');
    } catch { toast.error('Failed to create lottery'); }
    finally { setLoading(false); }
  };

  const close = async (id: string) => {
    try { await api.patch(`/lotteries/${id}/close`); toast.success('Betting closed'); fetch(); } catch { toast.error('Failed'); }
  };

  const del = async (id: string) => {
    try { await api.delete(`/lotteries/${id}`); toast.success('Deleted'); fetch(); } catch { toast.error('Failed'); }
  };

  const active = lotteries.filter(l => l.status === 'active');
  const done = lotteries.filter(l => l.status === 'done' || l.status === 'closed');

  const inp: React.CSSProperties = {
    width: '100%', border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '11px 14px', fontSize: 14, color: '#2B3674',
    background: '#F4F7FE', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Lottery Name</label>
              <input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Morning Draw" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Draw Date</label>
              <input type="date" style={inp} value={form.draw_date} onChange={e => setForm({ ...form, draw_date: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Draw Time</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>Hour</div>
                  <select style={inp} value={form.draw_hour} onChange={e => setForm({ ...form, draw_hour: e.target.value })} required>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
                      <option key={h} value={h}>{h.padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>Minute</div>
                  <select style={inp} value={form.draw_minute} onChange={e => setForm({ ...form, draw_minute: e.target.value })} required>
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>AM / PM</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['AM', 'PM'].map(p => (
                      <button key={p} type="button" onClick={() => setForm({ ...form, draw_ampm: p })} style={{
                        flex: 1, padding: '11px 0', borderRadius: 12,
                        border: `1.5px solid ${form.draw_ampm === p ? '#4318FF' : '#E0E5F2'}`,
                        background: form.draw_ampm === p ? '#EFF4FB' : '#F4F7FE',
                        color: form.draw_ampm === p ? '#4318FF' : '#A3AED0',
                        cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Stop Betting (minutes before draw)</label>
              <input type="number" style={inp} value={form.stop_betting_minutes} onChange={e => setForm({ ...form, stop_betting_minutes: Number(e.target.value) })} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2B3674', marginBottom: 10 }}>
                Number Lock Limits <span style={{ color: '#A3AED0', fontWeight: 500 }}>(optional — leave blank for no limit)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { key: 'tab1_max', label: 'Tab 1', hint: '0 – 9' },
                  { key: 'tab2_max', label: 'Tab 2', hint: '00 – 99' },
                  { key: 'tab3_max', label: 'Tab 3', hint: '000 – 999' },
                ].map(({ key, label, hint }) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>{label} <span style={{ color: '#CBD5E0' }}>({hint})</span></div>
                    <input
                      type="number"
                      min={1}
                      placeholder="Max"
                      style={{ ...inp, padding: '9px 12px' }}
                      value={(form as any)[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

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
              <button onClick={() => close(l.id)} style={{
                width: '100%', padding: '10px', background: '#FFF8E6',
                border: '1.5px solid #FFCE20', borderRadius: 12,
                color: '#D4A900', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10,
              }}>
                <Lock size={13} /> Close Betting
              </button>
              <button onClick={() => del(l.id)} style={{ background: 'transparent', border: 'none', color: '#EE5D50', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Delete</button>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

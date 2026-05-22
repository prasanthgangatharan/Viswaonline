import { useState, useEffect } from 'react';
import api from '../../lib/adminApi';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Lock, Plus } from 'lucide-react';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export function LotteriesPage() {
  const [tab, setTab] = useState<'new' | 'active' | 'done'>('new');
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', draw_date: '', draw_hour: '12', draw_minute: '00', draw_ampm: 'AM', stop_betting_minutes: 10 });

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
      await api.post('/lotteries', { draw_time: buildDrawTime(), name: form.name, stop_betting_minutes: Number(form.stop_betting_minutes) });
      toast.success('Lottery created');
      setForm({ name: '', draw_date: '', draw_hour: '12', draw_minute: '00', draw_ampm: 'AM', stop_betting_minutes: 10 });
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

  const inp: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Lotteries</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {[
          { key: 'new', label: '+ New' },
          { key: 'active', label: `Active (${active.length})` },
          { key: 'done', label: `Done (${done.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#0f172a' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 600 : 400, boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div style={{ ...card, maxWidth: 480 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>New Lottery</div>
          <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Lottery Name</label>
              <input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Morning Draw" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Draw Date</label>
              <input type="date" style={inp} value={form.draw_date} onChange={e => setForm({ ...form, draw_date: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Draw Time</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Hour</div>
                  <select style={inp} value={form.draw_hour} onChange={e => setForm({ ...form, draw_hour: e.target.value })} required>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
                      <option key={h} value={h}>{h.padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Minute</div>
                  <select style={inp} value={form.draw_minute} onChange={e => setForm({ ...form, draw_minute: e.target.value })} required>
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>AM / PM</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['AM', 'PM'].map(p => (
                      <button key={p} type="button" onClick={() => setForm({ ...form, draw_ampm: p })} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${form.draw_ampm === p ? '#6366f1' : '#d1d5db'}`, background: form.draw_ampm === p ? '#eef2ff' : '#fff', color: form.draw_ampm === p ? '#6366f1' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Stop Betting (minutes before draw)</label>
              <input type="number" style={inp} value={form.stop_betting_minutes} onChange={e => setForm({ ...form, stop_betting_minutes: Number(e.target.value) })} />
            </div>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
              <Plus size={16} /> {loading ? 'Creating...' : 'Create Lottery'}
            </button>
          </form>
        </div>
      )}

      {tab === 'active' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {active.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14 }}>No active lotteries</div>}
          {active.map(l => (
            <div key={l.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{l.name}</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>OPEN</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{fmtDateTime(l.draw_time)}</div>
              <div style={{ fontSize: 12, color: '#f97316', marginBottom: 16 }}>Closes {l.stop_betting_minutes} min before draw</div>
              <button onClick={() => close(l.id)} style={{ width: '100%', padding: '9px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, color: '#ea580c', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                <Lock size={13} /> Close Betting
              </button>
              <button onClick={() => del(l.id)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'done' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {done.length === 0 && <div style={{ color: '#94a3b8', fontSize: 14 }}>No completed lotteries</div>}
          {done.map(l => (
            <div key={l.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{l.name}</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }}>DONE</span>
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>{fmtDateTime(l.draw_time)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

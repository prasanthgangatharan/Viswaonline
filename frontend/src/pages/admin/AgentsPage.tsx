import { useState, useEffect } from 'react';
import api from '../../lib/adminApi';
import toast from 'react-hot-toast';
import { Edit2, Plus } from 'lucide-react';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const EMPTY_FORM = { username: '', password: '', tab1_price: '', tab2_price: '', tab3_price: '' };

export function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [modal, setModal] = useState<{ open: boolean; agent: any | null }>({ open: false, agent: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const fetchAgents = async () => {
    try { const { data } = await api.get('/agents'); setAgents(data); } catch {}
  };

  useEffect(() => { fetchAgents(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ open: true, agent: null }); };
  const openEdit = (a: any) => {
    setForm({ username: a.username || a.users?.username || '', password: '', tab1_price: String(a.tab1_price ?? ''), tab2_price: String(a.tab2_price ?? ''), tab3_price: String(a.tab3_price ?? '') });
    setModal({ open: true, agent: a });
  };
  const closeModal = () => setModal({ open: false, agent: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modal.agent) {
        const payload: any = { tab1_price: Number(form.tab1_price), tab2_price: Number(form.tab2_price), tab3_price: Number(form.tab3_price) };
        if (form.username && form.username !== (modal.agent.username || modal.agent.users?.username)) payload.username = form.username;
        if (form.password) payload.password = form.password;
        await api.patch(`/agents/${modal.agent.id}`, payload);
        toast.success('Agent updated');
      } else {
        await api.post('/agents', { username: form.username, password: form.password, tab1_price: Number(form.tab1_price), tab2_price: Number(form.tab2_price), tab3_price: Number(form.tab3_price) });
        toast.success('Agent created');
      }
      closeModal(); fetchAgents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const toggle = async (a: any) => {
    const newStatus = (a.status || a.users?.status) === 'active' ? 'inactive' : 'active';
    try { await api.patch(`/agents/${a.id}/status`, { status: newStatus }); toast.success('Status updated'); fetchAgents(); }
    catch { toast.error('Failed'); }
  };

  const inp: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Agents</div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={15} /> New Agent
        </button>
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              {['Agent', 'Tab 1', 'Tab 2', 'Tab 3', 'Status', 'Created', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No agents yet. Click "New Agent" to add one.</td></tr>
            )}
            {agents.map(a => {
              const username = a.username || a.users?.username;
              const status = a.status || a.users?.status || 'active';
              const createdAt = a.created_at || a.users?.created_at;
              const isActive = status === 'active';
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{username}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 500 }}>Rs.{a.tab1_price ?? 0}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 500 }}>Rs.{a.tab2_price ?? 0}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 500 }}>Rs.{a.tab3_price ?? 0}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => toggle(a)} style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}`, background: isActive ? '#f0fdf4' : '#fef2f2', color: isActive ? '#16a34a' : '#dc2626' }}>
                      {status.toUpperCase()}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                    {createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openEdit(a)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      <Edit2 size={12} /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
              {modal.agent ? 'Edit Agent' : 'Create Agent'}
            </div>
            <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Username</label>
                <input autoComplete="off" style={inp} placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required={!modal.agent} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{modal.agent ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" autoComplete="new-password" style={inp} placeholder={modal.agent ? 'Leave blank to keep current' : 'Min 6 characters'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!modal.agent} minLength={form.password ? 6 : undefined} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Price per Count (Rs.)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {([1, 2, 3] as const).map(n => (
                    <div key={n}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Tab {n}</div>
                      <input type="number" autoComplete="off" style={inp} placeholder="0" min="0" value={form[`tab${n}_price` as keyof typeof form]} onChange={e => setForm({ ...form, [`tab${n}_price`]: e.target.value })} required />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={closeModal} style={{ padding: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '11px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  {loading ? 'Saving...' : (modal.agent ? 'Save' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

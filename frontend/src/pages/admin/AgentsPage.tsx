import { useState, useEffect } from 'react';
import api from '../../lib/adminApi';
import toast from 'react-hot-toast';
import { Edit2, Plus } from 'lucide-react';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 2px 16px rgba(112,144,176,0.1)',
};
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

  const inp: React.CSSProperties = {
    width: '100%', border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '11px 14px', fontSize: 14, color: '#2B3674',
    background: '#F4F7FE', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="admin-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>Agents</div>
          <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 3, fontWeight: 500 }}>{agents.length} registered agents</div>
        </div>
        <button onClick={openCreate} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
          border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14,
          cursor: 'pointer', boxShadow: '0 4px 14px rgba(67,24,255,0.3)',
        }}>
          <Plus size={16} /> New Agent
        </button>
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F4F7FE' }}>
              {['Agent', 'Tab 1', 'Tab 2', 'Tab 3', 'Status', 'Created', ''].map(h => (
                <th key={h} style={{ padding: '16px 18px', textAlign: 'left', color: '#A3AED0', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#A3AED0' }}>No agents yet. Click "New Agent" to add one.</td></tr>
            )}
            {agents.map(a => {
              const username = a.username || a.users?.username;
              const status = a.status || a.users?.status || 'active';
              const createdAt = a.created_at || a.users?.created_at;
              const isActive = status === 'active';
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #F4F7FE' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {username?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, color: '#2B3674' }}>{username}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#05CD99', fontWeight: 700 }}>Rs.{a.tab1_price ?? 0}</td>
                  <td style={{ padding: '14px 18px', color: '#05CD99', fontWeight: 700 }}>Rs.{a.tab2_price ?? 0}</td>
                  <td style={{ padding: '14px 18px', color: '#05CD99', fontWeight: 700 }}>Rs.{a.tab3_price ?? 0}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => toggle(a)} style={{
                      padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                      background: isActive ? '#E6FAF5' : '#FEF3F2',
                      color: isActive ? '#05CD99' : '#EE5D50',
                    }}>
                      {status.toUpperCase()}
                    </button>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#A3AED0', fontSize: 12 }}>
                    {createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => openEdit(a)} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                      background: '#F4F7FE', border: 'none', borderRadius: 10,
                      color: '#2B3674', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,37,89,0.25)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2B3674', marginBottom: 24 }}>
              {modal.agent ? 'Edit Agent' : 'Create Agent'}
            </div>
            <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>Username</label>
                <input autoComplete="off" style={inp} placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required={!modal.agent} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 6 }}>{modal.agent ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input type="password" autoComplete="new-password" style={inp} placeholder={modal.agent ? 'Leave blank to keep current' : 'Min 6 characters'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!modal.agent} minLength={form.password ? 6 : undefined} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#2B3674', marginBottom: 8 }}>Price per Count (Rs.)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {([1, 2, 3] as const).map(n => (
                    <div key={n}>
                      <div style={{ fontSize: 11, color: '#A3AED0', marginBottom: 5, fontWeight: 500 }}>Tab {n}</div>
                      <input type="number" autoComplete="off" style={inp} placeholder="0" min="0" value={form[`tab${n}_price` as keyof typeof form]} onChange={e => setForm({ ...form, [`tab${n}_price`]: e.target.value })} required />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                <button type="button" onClick={closeModal} style={{ padding: '12px', background: '#F4F7FE', border: 'none', borderRadius: 12, color: '#A3AED0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '12px', background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
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

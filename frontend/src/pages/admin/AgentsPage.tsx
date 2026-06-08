import { useState, useEffect } from 'react';
import api from '../../lib/adminApi';
import authApi from '../../lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { Edit2, Plus, Eye, EyeOff, Download, ShieldAlert, Link2, Copy, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  boxShadow: 'none', border: '1px solid #F3F4F6',
};
const EMPTY_FORM = { username: '', password: '', tab1_price: '', tab2_price: '', tab3_price: '' };
type ModalErrors = { username?: string; password?: string; tab1_price?: string; tab2_price?: string; tab3_price?: string };

const USERNAME_MAX = 20;
const PASSWORD_MAX = 32;

function validateUsername(v: string): string | undefined {
  if (!v.trim()) return 'Username is required';
  if (v.length < 3) return 'At least 3 characters required';
  if (v.length > USERNAME_MAX) return `Max ${USERNAME_MAX} characters`;
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Only letters, numbers and _ allowed';
}

function validatePassword(v: string, required: boolean): string | undefined {
  if (required && !v) return 'Password is required';
  if (v && v.length < 6) return 'At least 6 characters required';
  if (v.length > PASSWORD_MAX) return `Max ${PASSWORD_MAX} characters`;
}

export function AgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [modal, setModal] = useState<{ open: boolean; agent: any | null }>({ open: false, agent: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [modalErrors, setModalErrors] = useState<ModalErrors>({});
  const [toggleConfirm, setToggleConfirm] = useState<{ open: boolean; agent: any | null; pwd: string; loading: boolean; error: string; showPwd: boolean }>(
    { open: false, agent: null, pwd: '', loading: false, error: '', showPwd: false }
  );
  const [copied, setCopied] = useState(false);

  const agentPortalUrl = `${window.location.origin}/agent/login`;
  const copyLink = () => {
    navigator.clipboard.writeText(agentPortalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fetchAgents = async () => {
    try { const { data } = await api.get('/agents'); setAgents(data); } catch {}
  };

  useEffect(() => { fetchAgents(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setShowPwd(false); setModalErrors({}); setModal({ open: true, agent: null }); };
  const openEdit = (a: any) => {
    setForm({ username: a.username || a.users?.username || '', password: '', tab1_price: String(a.tab1_price ?? ''), tab2_price: String(a.tab2_price ?? ''), tab3_price: String(a.tab3_price ?? '') });
    setShowPwd(false); setModalErrors({});
    setModal({ open: true, agent: a });
  };
  const closeModal = () => { setModal({ open: false, agent: null }); setModalErrors({}); };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(43, 54, 116);
    doc.text('Agents Report', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(163, 174, 208);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Agent', 'Tab 1 Price', 'Tab 2 Price', 'Tab 3 Price', 'Status', 'Created']],
      body: agents.map(a => {
        const username = a.username || a.users?.username || '-';
        const status = a.status || a.users?.status || 'active';
        const createdAt = a.created_at || a.users?.created_at;
        return [
          username,
          `Rs.${a.tab1_price ?? 0}`,
          `Rs.${a.tab2_price ?? 0}`,
          `Rs.${a.tab3_price ?? 0}`,
          status.toUpperCase(),
          createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        ];
      }),
      headStyles: { fillColor: [67, 24, 255], textColor: 255, fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [244, 247, 254] },
    });
    doc.save(`agents-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCreate = !modal.agent;
    const errs: ModalErrors = {};
    if (isCreate || form.username !== (modal.agent?.username || modal.agent?.users?.username)) {
      const uErr = validateUsername(form.username);
      if (uErr) errs.username = uErr;
    }
    const pErr = validatePassword(form.password, isCreate);
    if (pErr) errs.password = pErr;
    if (form.tab1_price === '' || Number(form.tab1_price) < 0) errs.tab1_price = 'Required';
    if (form.tab2_price === '' || Number(form.tab2_price) < 0) errs.tab2_price = 'Required';
    if (form.tab3_price === '' || Number(form.tab3_price) < 0) errs.tab3_price = 'Required';
    if (Object.keys(errs).length) { setModalErrors(errs); return; }
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

  const toggle = (a: any) => {
    setToggleConfirm({ open: true, agent: a, pwd: '', loading: false, error: '', showPwd: false });
  };

  const confirmToggle = async () => {
    if (!toggleConfirm.pwd) { setToggleConfirm(s => ({ ...s, error: 'Password is required' })); return; }
    setToggleConfirm(s => ({ ...s, loading: true, error: '' }));
    try {
      await authApi.post('/auth/admin/login', { username: user?.username, password: toggleConfirm.pwd });
      const newStatus = (toggleConfirm.agent?.status || toggleConfirm.agent?.users?.status) === 'active' ? 'inactive' : 'active';
      await api.patch(`/agents/${toggleConfirm.agent.id}/status`, { status: newStatus });
      toast.success(`Agent ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      setToggleConfirm({ open: false, agent: null, pwd: '', loading: false, error: '', showPwd: false });
      fetchAgents();
    } catch (err: any) {
      const msg = err.response?.status === 401 ? 'Incorrect password' : 'Something went wrong';
      setToggleConfirm(s => ({ ...s, loading: false, error: msg }));
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', border: '1.5px solid #E0E5F2', borderRadius: 12,
    padding: '11px 14px', fontSize: 14, color: '#111827',
    background: '#F9FAFB', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="admin-page-header">
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Agents</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>{agents.length} registered agents</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={downloadPDF} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: '#fff', border: '1.5px solid #E0E5F2', borderRadius: 12,
            color: '#111827', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            <Download size={15} /> PDF
          </button>
          <button onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
            border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
          }}>
            <Plus size={16} /> New Agent
          </button>
        </div>
      </div>

      {/* Agent portal link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#F5F8FF', borderRadius: 14, border: '1px solid #E0E8FF', flexWrap: 'wrap' }}>
        <Link2 size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>Agent Login Link</span>
        <span style={{ flex: 1, fontSize: 14, color: '#111827', fontWeight: 500, wordBreak: 'break-all', minWidth: 0 }}>
          {agentPortalUrl}
        </span>
        <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: copied ? '#F0FDF9' : '#F9FAFB', border: `1px solid ${copied ? '#A7F3D0' : '#E5E7EB'}`, borderRadius: 8, color: copied ? '#059669' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}>
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Agent', 'Tab 1', 'Tab 2', 'Tab 3', 'Status', 'Created', ''].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', color: '#9CA3AF', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>No agents yet. Click "New Agent" to add one.</td></tr>
              )}
              {agents.map((a, i) => {
                const username = a.username || a.users?.username;
                const status = a.status || a.users?.status || 'active';
                const createdAt = a.created_at || a.users?.created_at;
                const isActive = status === 'active';
                const td: React.CSSProperties = { padding: '15px 18px', fontSize: 15, color: '#111827', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' };
                return (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {username?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700 }}>{username}</span>
                      </div>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>Rs.{a.tab1_price ?? 0}</td>
                    <td style={{ ...td, fontWeight: 700 }}>Rs.{a.tab2_price ?? 0}</td>
                    <td style={{ ...td, fontWeight: 700 }}>Rs.{a.tab3_price ?? 0}</td>
                    <td style={td}>
                      <button onClick={() => toggle(a)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: isActive ? '#E6FAF5' : '#FEF3F2', color: isActive ? '#05CD99' : '#EE5D50' }}>
                        {status.toUpperCase()}
                      </button>
                    </td>
                    <td style={{ ...td, color: '#6B7280', fontSize: 13 }}>
                      {createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button onClick={() => openEdit(a)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#F5F3FF', border: '1.5px solid #EDE9FE', borderRadius: 9, color: '#7C3AED', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                        <Edit2 size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,37,89,0.25)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 24 }}>
              {modal.agent ? 'Edit Agent' : 'Create Agent'}
            </div>
            <form onSubmit={handleSubmit} autoComplete="off" noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Username */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    Username <span style={{ color: '#EF4444' }}>*</span>
                    <span style={{ fontWeight: 400, fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>letters, numbers, _</span>
                  </label>
                  <span style={{ fontSize: 11, color: form.username.length > USERNAME_MAX ? '#EF4444' : '#9CA3AF', fontWeight: 500 }}>
                    {form.username.length}/{USERNAME_MAX}
                  </span>
                </div>
                <input
                  autoComplete="off"
                  maxLength={USERNAME_MAX}
                  placeholder="e.g. agent_john"
                  value={form.username}
                  onChange={e => {
                    const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                    setForm({ ...form, username: v });
                    setModalErrors(er => ({ ...er, username: validateUsername(v) }));
                  }}
                  style={{ ...inp, borderColor: modalErrors.username ? '#EF4444' : '#E0E5F2', background: modalErrors.username ? '#FFF5F5' : '#F9FAFB' }}
                />
                {modalErrors.username && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: 500 }}>{modalErrors.username}</div>}
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {modal.agent ? 'New Password' : 'Password'} {!modal.agent && <span style={{ color: '#EF4444' }}>*</span>}
                    {modal.agent && <span style={{ fontWeight: 400, fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>(leave blank to keep)</span>}
                  </label>
                  <span style={{ fontSize: 11, color: form.password.length > PASSWORD_MAX ? '#EF4444' : '#9CA3AF', fontWeight: 500 }}>
                    {form.password.length}/{PASSWORD_MAX}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    maxLength={PASSWORD_MAX}
                    placeholder={modal.agent ? 'Leave blank to keep current' : 'Min 6 characters'}
                    value={form.password}
                    onChange={e => {
                      const v = e.target.value;
                      setForm({ ...form, password: v });
                      setModalErrors(er => ({ ...er, password: validatePassword(v, !modal.agent) }));
                    }}
                    style={{ ...inp, paddingRight: 44, borderColor: modalErrors.password ? '#EF4444' : '#E0E5F2', background: modalErrors.password ? '#FFF5F5' : '#F9FAFB' }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {modalErrors.password
                  ? <div style={{ fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: 500 }}>{modalErrors.password}</div>
                  : form.password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[6, 12, 20].map((threshold, i) => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: form.password.length >= threshold ? ['#EF4444','#F59E0B','#10B981'][i] : '#E5E7EB', transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: form.password.length < 6 ? '#EF4444' : form.password.length < 12 ? '#F59E0B' : '#10B981', fontWeight: 500 }}>
                        {form.password.length < 6 ? 'Too short' : form.password.length < 12 ? 'Fair' : 'Strong'}
                      </div>
                    </div>
                  )
                }
              </div>

              {/* Prices */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Price per Count (Rs.) <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {([1, 2, 3] as const).map(n => {
                    const key = `tab${n}_price` as keyof ModalErrors;
                    const hasErr = !!modalErrors[key];
                    return (
                      <div key={n}>
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 5, fontWeight: 500 }}>Tab {n}</div>
                        <input
                          type="number" autoComplete="off" min="0" placeholder="0"
                          value={form[`tab${n}_price` as keyof typeof form]}
                          onChange={e => { setForm({ ...form, [`tab${n}_price`]: e.target.value }); setModalErrors(er => ({ ...er, [key]: undefined })); }}
                          style={{ ...inp, borderColor: hasErr ? '#EF4444' : '#E0E5F2', background: hasErr ? '#FFF5F5' : '#F9FAFB' }}
                        />
                        {hasErr && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>Required</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                <button type="button" onClick={closeModal} style={{ padding: '12px', background: '#F9FAFB', border: 'none', borderRadius: 12, color: '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '12px', background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  {loading ? 'Saving...' : (modal.agent ? 'Save' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Status Confirm Modal */}
      {toggleConfirm.open && (() => {
        const a = toggleConfirm.agent;
        const agentName = a?.username || a?.users?.username || 'this agent';
        const currentStatus = a?.status || a?.users?.status;
        const action = currentStatus === 'active' ? 'Deactivate' : 'Activate';
        const actionColor = currentStatus === 'active' ? '#EF4444' : '#05CD99';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(27,37,89,0.3)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(112,144,176,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: currentStatus === 'active' ? '#FEF2F2' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldAlert size={20} color={actionColor} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>{action} Agent</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{agentName}</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, paddingLeft: 54 }}>
                Enter your admin password to confirm this action.
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 7 }}>Admin Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={toggleConfirm.showPwd ? 'text' : 'password'}
                    autoFocus
                    placeholder="Enter your password"
                    value={toggleConfirm.pwd}
                    onChange={e => setToggleConfirm(s => ({ ...s, pwd: e.target.value, error: '' }))}
                    onKeyDown={e => e.key === 'Enter' && confirmToggle()}
                    style={{ ...inp, borderColor: toggleConfirm.error ? '#EF4444' : '#E0E5F2', background: toggleConfirm.error ? '#FFF5F5' : '#F9FAFB', paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setToggleConfirm(s => ({ ...s, showPwd: !s.showPwd }))}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', alignItems: 'center' }}>
                    {toggleConfirm.showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {toggleConfirm.error && (
                  <div style={{ fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: 500 }}>{toggleConfirm.error}</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
                <button type="button"
                  onClick={() => setToggleConfirm({ open: false, agent: null, pwd: '', loading: false, error: '', showPwd: false })}
                  style={{ padding: '12px', background: '#F9FAFB', border: 'none', borderRadius: 12, color: '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="button" onClick={confirmToggle} disabled={toggleConfirm.loading}
                  style={{ padding: '12px', background: currentStatus === 'active' ? '#EF4444' : 'linear-gradient(135deg, #059669 0%, #05CD99 100%)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: toggleConfirm.loading ? 'not-allowed' : 'pointer', opacity: toggleConfirm.loading ? 0.7 : 1 }}>
                  {toggleConfirm.loading ? 'Verifying...' : action}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

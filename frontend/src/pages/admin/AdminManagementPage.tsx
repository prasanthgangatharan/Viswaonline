import { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import adminApi from '../../lib/adminApi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export function AdminManagementPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast.error('New passwords do not match'); return; }
    if (next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await adminApi.patch('/auth/admin/change-password', { currentPassword: current, newPassword: next });
      toast.success('Password changed successfully');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const inp = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    show: boolean,
    toggle: () => void,
  ) => (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '11px 42px 11px 14px',
          border: '1.5px solid #E5E7EB', borderRadius: 12,
          fontSize: 14, outline: 'none', background: '#FAFAFA',
          color: '#111827', fontWeight: 500,
        }}
      />
      <button
        type="button"
        onClick={toggle}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Admin Management</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>Manage your admin account settings</div>
      </div>

      {/* Account info */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{user?.username?.[0]?.toUpperCase()}</span>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{user?.username}</div>
          <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600, marginTop: 2 }}>Administrator</div>
        </div>
      </div>

      {/* Change password card */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={17} color="#7C3AED" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Change Password</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Enter your current password to set a new one</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Current Password</label>
            {inp(current, setCurrent, 'Enter current password', showCurrent, () => setShowCurrent(v => !v))}
          </div>

          <div style={{ height: 1, background: '#F3F4F6' }} />

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>New Password</label>
            {inp(next, setNext, 'At least 6 characters', showNext, () => setShowNext(v => !v))}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
            {inp(confirm, setConfirm, 'Re-enter new password', showConfirm, () => setShowConfirm(v => !v))}
            {confirm && next && confirm !== next && (
              <div style={{ fontSize: 11, color: '#EF4444', marginTop: 5, fontWeight: 600 }}>Passwords do not match</div>
            )}
            {confirm && next && confirm === next && next.length >= 6 && (
              <div style={{ fontSize: 11, color: '#05CD99', marginTop: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={11} /> Passwords match
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !current || !next || !confirm || next !== confirm}
            style={{
              marginTop: 4,
              padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: (loading || !current || !next || !confirm || next !== confirm) ? '#E5E7EB' : 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
              color: (loading || !current || !next || !confirm || next !== confirm) ? '#9CA3AF' : '#fff',
              fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
            }}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

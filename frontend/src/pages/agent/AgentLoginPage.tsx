import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import api from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';

export function AgentLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, token, login } = useAuth();
  const navigate = useNavigate();

  if (token && user) {
    if (user.role === 'agent') return <Navigate to="/agent/home" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { toast.error('Username and password are required'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/agent/login', { username: username.trim(), password });
      login(data.access_token, data.user);
      navigate('/agent/home', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(msg === 'Unauthorized' ? 'Invalid credentials' : (msg || 'Login failed'));
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #E0E5F2', borderRadius: 12,
    fontSize: 14, color: '#111827', background: '#F9FAFB',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 20%, #DDD6FE 50%, #BAE6FD 80%, #E0F2FE 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 10px 28px rgba(124,58,237,0.3)' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>L</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>LottoAgent</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 6, fontWeight: 500 }}>Agent Terminal Login</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', boxShadow: '0 4px 32px rgba(112,144,176,0.15)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" required style={inp} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required style={{ ...inp, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, display: 'flex', alignItems: 'center' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a href="/admin/login" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>
              Switch to Admin Login →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

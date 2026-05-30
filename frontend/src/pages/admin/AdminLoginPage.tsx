import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';

export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, token, login } = useAuth();
  const navigate = useNavigate();

  if (token && user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/agent/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { toast.error('Username and password are required'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin/login', { username: username.trim(), password });
      login(data.access_token, data.user);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(msg === 'Unauthorized' ? 'Invalid credentials' : (msg || 'Login failed'));
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #E0E5F2', borderRadius: 12,
    fontSize: 14, color: '#2B3674', background: '#F4F7FE',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 10px 28px rgba(67,24,255,0.3)' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>L</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2B3674', letterSpacing: -0.5 }}>LottoAdmin</div>
          <div style={{ fontSize: 14, color: '#A3AED0', marginTop: 6, fontWeight: 500 }}>Sign in to your admin panel</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', boxShadow: '0 4px 32px rgba(112,144,176,0.15)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2B3674', marginBottom: 8 }}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" required style={inp} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2B3674', marginBottom: 8 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required style={inp} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? '#9F7AEA' : 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(67,24,255,0.3)',
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a href="/agent/login" style={{ fontSize: 13, color: '#A3AED0', textDecoration: 'none', fontWeight: 500 }}>
              Switch to Agent Login →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

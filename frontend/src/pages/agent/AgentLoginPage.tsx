import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';
import { UserCircle2 } from 'lucide-react';

export function AgentLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div style={{ minHeight: '100vh', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#fff', border: '1px solid #e0f2fe', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(2,132,199,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <UserCircle2 size={26} color="#0284c7" strokeWidth={2} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Agent Sign In</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Lottery Agent Terminal</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 14, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? '#38bdf8' : '#0284c7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a href="/admin/login" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>
              Admin login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

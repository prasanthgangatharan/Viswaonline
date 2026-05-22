import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import agentApi from '../lib/agentApi';
import { Home, FileText, DollarSign, Star, LogOut, User, TrendingUp } from 'lucide-react';


const sidebarItems = [
  { to: '/agent/home',    icon: Home,       label: 'Home' },
  { to: '/agent/sales',   icon: FileText,   label: 'Sales Report' },
  { to: '/agent/account', icon: User,       label: 'Account' },
  { to: '/agent/net-pay', icon: DollarSign, label: 'Net Pay' },
  { to: '/agent/profit',  icon: TrendingUp, label: 'My Profit' },
  { to: '/agent/result',  icon: Star,       label: 'Shop Result' },
];


export function AgentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await agentApi.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/agent/login', { replace: true });
  };

  return (
    <div className="agent-layout">
      {/* Desktop Sidebar */}
      <aside className="agent-sidebar">
        <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#0284c7', marginBottom: 2 }}>LOTTERY</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Agent Terminal</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0284c7' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 500 }}>Agent</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sidebarItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <NavLink key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                color: active ? '#0284c7' : '#64748b',
                background: active ? '#f0f9ff' : 'transparent',
                fontWeight: active ? 600 : 500,
                textDecoration: 'none', fontSize: 14,
                transition: 'all 0.15s',
              }}>
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '9px 12px', background: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: 8,
            color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="agent-main">
        {/* Mobile Header */}
        <div className="agent-mobile-header">
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 4, color: '#0284c7' }}>LOTTERY</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Agent Terminal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user?.username}</div>
              <div style={{ fontSize: 10, color: '#0284c7', fontWeight: 500 }}>Active</div>
            </div>
            <button onClick={handleLogout} style={{
              width: 34, height: 34, borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <main className="agent-content">
          <Outlet />
        </main>

      </div>
    </div>
  );
}

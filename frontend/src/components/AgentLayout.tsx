import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import agentApi from '../lib/agentApi';
import { Home, FileText, DollarSign, Star, LogOut, User, TrendingUp, ChevronLeft } from 'lucide-react';

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
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(43,115,255,0.35)' }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>L</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>LottoAgent</div>
              <div style={{ fontSize: 11, color: '#A3AED0', fontWeight: 500 }}>Agent Terminal</div>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div style={{ margin: '0 14px 20px', padding: '13px', background: '#F4F7FE', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2B3674', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: '#2B73FF', fontWeight: 600 }}>Agent</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A3AED0', letterSpacing: 1.5 }}>NAVIGATION</div>
        </div>

        <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sidebarItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <NavLink key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                color: active ? '#2B73FF' : '#A3AED0',
                background: active ? '#EBF3FF' : 'transparent',
                fontWeight: active ? 700 : 500,
                textDecoration: 'none', fontSize: 14,
                transition: 'all 0.15s',
              }}>
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '14px 10px', borderTop: '1px solid #F0F5FF' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 14px', background: '#FEF3F2',
            border: 'none', borderRadius: 12,
            color: '#EE5D50', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="agent-main">
        {/* Mobile Header */}
        <div className="agent-mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {location.pathname !== '/agent/home' && (
              <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: '#F4F7FE', border: '1px solid #E0E5F2', color: '#2B73FF', cursor: 'pointer', flexShrink: 0 }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>L</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2B3674' }}>LottoAgent</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2B3674' }}>{user?.username}</div>
              <div style={{ fontSize: 10, color: '#05CD99', fontWeight: 700 }}>Active</div>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #2B73FF 0%, #39B8FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <button onClick={handleLogout} style={{
              width: 34, height: 34, borderRadius: 10,
              background: '#FEF3F2', border: 'none',
              color: '#EE5D50', cursor: 'pointer',
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

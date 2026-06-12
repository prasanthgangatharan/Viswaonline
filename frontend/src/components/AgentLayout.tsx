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

  const currentLabel = sidebarItems.find(i => i.to === location.pathname)?.label || 'Agent';

  return (
    <div className="agent-layout">
      {/* Desktop Sidebar */}
      <aside className="agent-sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>L</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>LottoAgent</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Agent Terminal</div>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div style={{ margin: '0 14px 18px', padding: '12px', background: '#F9FAFB', borderRadius: 14, border: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>Agent</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 16px 6px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5 }}>NAVIGATION</div>
        </div>

        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {sidebarItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <NavLink key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 11,
                color: active ? '#fff' : '#4B5563',
                background: active ? '#111827' : 'transparent',
                fontWeight: active ? 600 : 500,
                textDecoration: 'none', fontSize: 14,
                transition: 'all 0.15s',
              }}>
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '14px 12px', borderTop: '1px solid #F3F4F6' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
            padding: '11px 12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: 'none', borderRadius: 11,
            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
          }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="agent-main">
        {/* Mobile Header — hidden on data-entry so its own bar sits at the top */}
        <div className="agent-mobile-header" style={location.pathname.startsWith('/agent/data-entry') ? { display: 'none' } : undefined}>
          {/* Left: back (if inner page) + agent identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {location.pathname !== '/agent/home' && (
              <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                <ChevronLeft size={18} />
              </button>
            )}
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #fff3 0%, #fff5 100%)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: -0.5 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>{user?.username}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(52,211,153,0.35)', border: '1px solid rgba(52,211,153,0.5)', borderRadius: 20, padding: '1px 7px', marginTop: 2 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                ACTIVE
              </div>
            </div>
          </div>

          {/* Right: page label + sign out pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {location.pathname !== '/agent/home' && (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '3px 10px' }}>{currentLabel}</span>
            )}
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 10px rgba(239,68,68,0.45)', letterSpacing: 0.2 }}>
              <LogOut size={13} />
              Sign Out
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

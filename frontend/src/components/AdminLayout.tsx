import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import adminApi from '../lib/adminApi';
import { LayoutDashboard, Ticket, Users, List, Trophy, LogOut, ShieldAlert, Activity } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/lotteries',  icon: Ticket,          label: 'Lotteries' },
  { to: '/admin/agents',     icon: Users,            label: 'Agents' },
  { to: '/admin/bets',       icon: List,             label: 'All Bets' },
  { to: '/admin/results',    icon: Trophy,           label: 'Results' },
  { to: '/admin/risk',       icon: ShieldAlert,      label: 'Risk View' },
  { to: '/admin/monitor',    icon: Activity,         label: 'Live Monitor' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await adminApi.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/admin/login', { replace: true });
  };

  const currentPage = navItems.find(n => n.to === location.pathname)?.label || 'Admin';

  return (
    <div className="admin-layout">

      {/* Mobile Top Header */}
      <div className="admin-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>L</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#2B3674' }}>{currentPage}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#EFF4FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#4318FF' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#FEF3F2', border: 'none', borderRadius: 10, color: '#EE5D50', cursor: 'pointer' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div style={{ padding: '28px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(67,24,255,0.35)' }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>L</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#2B3674', letterSpacing: -0.3 }}>LottoAdmin</div>
              <div style={{ fontSize: 11, color: '#A3AED0', fontWeight: 500 }}>Management Panel</div>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div style={{ margin: '0 14px 20px', padding: '13px', background: '#F4F7FE', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2B3674', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: '#4318FF', fontWeight: 600 }}>Administrator</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A3AED0', letterSpacing: 1.5 }}>NAVIGATION</div>
        </div>

        <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <NavLink key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                color: active ? '#4318FF' : '#A3AED0',
                background: active ? '#EFF4FB' : 'transparent',
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

      {/* Main content */}
      <main className="admin-main">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="admin-bottom-nav">
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink key={to} to={to} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, textDecoration: 'none',
              color: active ? '#4318FF' : '#A3AED0',
              background: active ? '#F4F7FE' : 'transparent',
              fontSize: 10, fontWeight: active ? 700 : 500,
              borderTop: active ? '2px solid #4318FF' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

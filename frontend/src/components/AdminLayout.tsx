import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import adminApi from '../lib/adminApi';
import { LayoutDashboard, Ticket, Users, List, Trophy, LogOut, ShieldAlert, Activity, ArrowUpFromLine, Settings } from 'lucide-react';

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/lotteries',  icon: Ticket,          label: 'Lotteries' },
      { to: '/admin/agents',     icon: Users,           label: 'Agents' },
      { to: '/admin/bets',       icon: List,            label: 'All Bets' },
    ],
  },
  {
    label: 'Results',
    items: [
      { to: '/admin/results',  icon: Trophy,          label: 'Results' },
      { to: '/admin/risk',     icon: ShieldAlert,     label: 'Risk View' },
      { to: '/admin/overflow', icon: ArrowUpFromLine, label: 'Overflow' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/monitor',     icon: Activity,  label: 'Live Monitor' },
      { to: '/admin/management',  icon: Settings,  label: 'Management' },
    ],
  },
];

const allNavItems = navSections.flatMap(s => s.items);

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try { await adminApi.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/admin/login', { replace: true });
  };

  const currentPage = allNavItems.find(n => n.to === location.pathname)?.label || 'Admin';

  return (
    <div className="admin-layout">

      {/* Mobile Top Header */}
      <div className="admin-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>V</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{currentPage}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#374151' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#FEF2F2', border: 'none', borderRadius: 10, color: '#EF4444', cursor: 'pointer' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #4318FF 0%, #9F7AEA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>V</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', letterSpacing: -0.3 }}>Viswa Online</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Management Panel</div>
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
              <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>Administrator</div>
            </div>
          </div>
        </div>

        {/* Nav Sections */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          {navSections.map(section => (
            <div key={section.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 6, paddingLeft: 4 }}>
                {section.label.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map(({ to, icon: Icon, label }) => {
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
              </div>
            </div>
          ))}
        </nav>

        <div style={{ padding: '14px 12px', borderTop: '1px solid #F3F4F6' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', background: 'transparent',
            border: '1px solid #FEE2E2', borderRadius: 11,
            color: '#EF4444', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            transition: 'background 0.15s',
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
        {allNavItems.slice(0, 5).map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink key={to} to={to} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, textDecoration: 'none',
              color: active ? '#7C3AED' : '#9CA3AF',
              fontSize: 10, fontWeight: active ? 700 : 500,
              borderTop: active ? '2px solid #7C3AED' : '2px solid transparent',
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

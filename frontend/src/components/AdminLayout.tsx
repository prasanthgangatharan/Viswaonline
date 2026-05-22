import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import adminApi from '../lib/adminApi';
import { LayoutDashboard, Ticket, Users, List, Trophy, LogOut } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/lotteries',  icon: Ticket,          label: 'Lotteries' },
  { to: '/admin/agents',     icon: Users,            label: 'Agents' },
  { to: '/admin/bets',       icon: List,             label: 'All Bets' },
  { to: '/admin/results',    icon: Trophy,           label: 'Results' },
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <aside style={{ width: 230, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#6366f1', marginBottom: 2 }}>LOTTERY</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: 0.5 }}>Admin Panel</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6366f1' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 500 }}>Administrator</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <NavLink key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                color: active ? '#6366f1' : '#64748b',
                background: active ? '#eef2ff' : 'transparent',
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

        {/* Logout */}
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

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: 28 }}>
        <Outlet />
      </main>
    </div>
  );
}

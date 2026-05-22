import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  role: 'admin' | 'agent';
  children: React.ReactNode;
}

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  agent: '/agent/home',
};

export function ProtectedRoute({ role, children }: Props) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to={`/${role}/login`} replace />;
  // Already authenticated but as a different role — send to their own home
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role] ?? '/admin/login'} replace />;
  return <>{children}</>;
}

import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, token, login, logout } = useAuthStore();
  return { user, token, login, logout, isAuthenticated: !!token };
}

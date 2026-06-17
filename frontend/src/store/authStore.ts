import { create } from 'zustand';

interface User { id: string; username: string; role: string; }

interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => { try { const u = localStorage.getItem('lottery_user'); return u ? JSON.parse(u) : null; } catch { return null; } })(),
  token: localStorage.getItem('lottery_token'),
  login: (token, user) => {
    localStorage.setItem('lottery_token', token);
    localStorage.setItem('lottery_role', user.role);
    localStorage.setItem('lottery_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('lottery_token');
    localStorage.removeItem('lottery_role');
    localStorage.removeItem('lottery_user');
    set({ token: null, user: null });
  },
}));

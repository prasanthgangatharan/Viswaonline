import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lottery_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url: string = err.config?.url || '';
      // Login endpoints returning 401 = wrong credentials — let the page's catch block handle it.
      if (url.includes('/auth/')) return Promise.reject(err);

      // Expired/revoked session on any other endpoint — clear and send to the right login.
      const role = localStorage.getItem('lottery_role');
      localStorage.removeItem('lottery_token');
      localStorage.removeItem('lottery_role');
      localStorage.removeItem('lottery_user');
      window.location.href = role === 'agent' ? '/agent/login' : '/admin/login';
    }
    return Promise.reject(err);
  },
);

export default api;

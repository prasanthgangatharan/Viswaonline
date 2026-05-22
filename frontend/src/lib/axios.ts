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

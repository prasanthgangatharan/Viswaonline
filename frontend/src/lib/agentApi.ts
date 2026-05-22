import axios from 'axios';

const agentApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

function clearAndRedirect() {
  localStorage.removeItem('lottery_token');
  localStorage.removeItem('lottery_role');
  localStorage.removeItem('lottery_user');
  window.location.href = '/agent/login';
}

agentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('lottery_token');
  const role = localStorage.getItem('lottery_role');

  if (!token || role !== 'agent') {
    clearAndRedirect();
    return Promise.reject(new Error('Agent authentication required'));
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

agentApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      clearAndRedirect();
    }
    return Promise.reject(err);
  },
);

export default agentApi;

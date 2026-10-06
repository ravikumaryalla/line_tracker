import { getToken, clearSession, notifyUnauthorized } from './auth';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request(path, options) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    await clearSession();
    notifyUnauthorized();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  auth: {
    login: (phone, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
    me: () => request('/auth/me'),
  },
  users: {
    list: () => request('/users'),
    create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    setPassword: (id, password) => request(`/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
    remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  },
  villages: {
    list: () => request('/villages'),
    create: (data) => request('/villages', { method: 'POST', body: JSON.stringify(data) }),
  },
  customers: {
    list: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
      const q = qs.toString();
      return request(`/customers${q ? `?${q}` : ''}`);
    },
    get: (id) => request(`/customers/${id}`),
    payments: (id) => request(`/customers/${id}/payments`),
    photo: (id) => request(`/customers/${id}/photo`),
    create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    collect: (id, amount, note) => request(`/customers/${id}/payments`, { method: 'POST', body: JSON.stringify({ amount, note }) }),
    pastLoan: (id, loanNo) => request(`/customers/${id}/loans/${loanNo}`),
    newLoan: (id, data) => request(`/customers/${id}/loans`, { method: 'POST', body: JSON.stringify(data) }),
  },
  expenses: {
    list: () => request('/expenses'),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  },
  losses: {
    list: () => request('/losses'),
    create: (data) => request('/losses', { method: 'POST', body: JSON.stringify(data) }),
  },
  dashboard: {
    summary: () => request('/dashboard/summary'),
    week: (offset = 0) => request(`/dashboard/week?offset=${offset}`),
  },
};

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  agents: {
    list: () => request('/agents'),
    get: (id) => request(`/agents/${id}`),
    toggle: (id, active) => request(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  },
  villages: {
    list: () => request('/villages'),
    assign: (id, agentId) => request(`/villages/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ agentId }) }),
  },
  customers: {
    list: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
      const q = qs.toString();
      return request(`/customers${q ? `?${q}` : ''}`);
    },
    get: (id) => request(`/customers/${id}`),
    payments: (id) => request(`/customers/${id}/payments`),
    create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    collect: (id, amount, note) => request(`/customers/${id}/payments`, { method: 'POST', body: JSON.stringify({ amount, note }) }),
  },
  expenses: {
    list: (agentId) => request(`/expenses${agentId ? `?agentId=${agentId}` : ''}`),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  },
  losses: {
    list: () => request('/losses'),
    create: (data) => request('/losses', { method: 'POST', body: JSON.stringify(data) }),
  },
  dashboard: {
    summary: () => request('/dashboard/summary'),
  },
};

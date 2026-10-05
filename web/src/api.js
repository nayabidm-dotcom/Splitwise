const TOKEN_KEY = 'splitwise.token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
const API_BASE = import.meta.env.VITE_API_URL || '';
export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
export const money = (cents, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format((cents || 0) / 100);
export const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
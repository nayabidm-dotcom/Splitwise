import { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, getToken, setToken } from './api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);
  const value = {
    user, loading, setUser,
    async login(email, password) {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken(d.token); setUser(d.user);
      toast.success(`Welcome back, ${d.user.name}!`);
    },
    async register(name, email, password) {
      const d = await api('/auth/register', { method: 'POST', body: { name, email, password } });
      setToken(d.token); setUser(d.user);
      toast.success(`Welcome, ${d.user.name}!`);
    },  
      async logout() {
      try { await api('/auth/logout', { method: 'POST' }); } catch {}
      setToken(null); setUser(null);
      toast.success('Logged out');
    },
    setTokenAndUser: (token, user) => {
      setToken(token);
      setUser(user);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
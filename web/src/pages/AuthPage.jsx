import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../auth';
import { api } from '../api';

export default function AuthPage() {
  const { user, login, register, setTokenAndUser } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const data = await api('/auth/google', {
        method: 'POST',
        body: { idToken: credentialResponse.credential },
      });
      setTokenAndUser(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
    } catch (err) {
      toast.error(err.message || 'Google login failed');
    }
  };

  return (
    <div className="auth-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
      <motion.div
        className="hero-shape"
        style={{ width: 180, height: 180, background: '#1cc29f', top: '10%', left: '8%' }}
        animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="hero-shape"
        style={{ width: 120, height: 120, background: '#4fd1b3', bottom: '15%', right: '10%' }}
        animate={{ y: [0, 25, 0], x: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="hero-shape"
        style={{ width: 90, height: 90, background: '#a5e8d4', top: '45%', right: '20%' }}
        animate={{ y: [0, -20, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="card auth-card"
        style={{ position: 'relative', zIndex: 2 }}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.2, 0.64, 1] }}
      >
        <div className="brand"><span className="brand-dot" />Splitwise</div>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 24 }}>
          Split expenses with friends, effortlessly.
        </p>

        {error && <div className="error">{error}</div>}

        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google login failed')}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20, color: '#6b7c74', fontSize: 13 }}>
          or use email
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="muted" style={{ textAlign: 'center', marginTop: 18, marginBottom: 0 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
          <button
            className="btn btn-sm"
            style={{ border: 'none', background: 'none', color: 'var(--accent-dark)', padding: 0 }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
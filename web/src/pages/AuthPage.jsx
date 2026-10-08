import { useState } from 'react';
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
    <div className="auth-wrap">
      <div className="card auth-card">
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
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
export default function AuthPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { if (mode === 'login') await login(email, password); else await register(name, email, password); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand"><span className="brand-dot" />Splitwise</div>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 24 }}>Split expenses with friends, effortlessly.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'register' && <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>}
          <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        <p className="muted" style={{ textAlign: 'center', marginTop: 18, marginBottom: 0 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
          <button className="btn btn-sm" style={{ border: 'none', background: 'none', color: 'var(--accent-dark)', padding: 0 }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
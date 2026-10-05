import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { AuthProvider, useAuth } from './auth';
import AuthPage from './pages/AuthPage';
import GroupsPage from './pages/GroupsPage';
import GroupPage from './pages/GroupPage';
import ProfilePage from './pages/ProfilePage';
function Shell({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand"><span className="brand-dot" />Splitwise</Link>
          <div className="topbar-user">
            <Link to="/profile" className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <User size={14} /> {user?.name}
            </Link>
            <button className="btn btn-sm" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>{children}</main>
    </>
  );
}
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<Protected><Shell><GroupsPage /></Shell></Protected>} />
          <Route path="/groups/:id" element={<Protected><Shell><GroupPage /></Shell></Protected>} />
          <Route path="/profile" element={<Protected><Shell><ProfilePage /></Shell></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
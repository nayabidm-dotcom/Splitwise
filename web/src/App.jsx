import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User } from 'lucide-react';
import { AuthProvider, useAuth } from './auth';
import AuroraBg from './components/AuroraBg';
import AuthPage from './pages/AuthPage';
import GroupsPage from './pages/GroupsPage';
import GroupPage from './pages/GroupPage';
import ProfilePage from './pages/ProfilePage';

function Shell({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      <AuroraBg />
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
      <main className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>{children}</main>
    </>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.34, 1.2, 0.64, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Protected><Shell><GroupsPage /></Shell></Protected>} />
          <Route path="/groups/:id" element={<Protected><Shell><GroupPage /></Shell></Protected>} />
          <Route path="/profile" element={<Protected><Shell><ProfilePage /></Shell></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RootRoutes() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="*" element={<AnimatedRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RootRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
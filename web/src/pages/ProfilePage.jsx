import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../auth';
import { useAppSounds } from '../sounds';
export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const sounds = useAppSounds();
  const [name, setName] = useState(user?.name || '');
  const [upi, setUpi] = useState(user?.upi_id || '');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); setBusy(true);
    try {
      const d = await api('/users/me', { method: 'PATCH', body: { name, upi_id: upi } });
      setUser(d.user); sounds.success(); toast.success('Profile saved!');
    } catch (err) { sounds.error(); toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Your profile</h1>
      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={save}>
          <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field"><label>Email</label><input value={user?.email || ''} disabled /></div>
          <div className="field">
            <label>UPI ID (for receiving payments)</label>
            <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@okhdfcbank" />
            <div className="muted" style={{ marginTop: 6 }}>Find yours in any UPI app under "My Profile". Friends will be able to pay you directly.</div>
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
      </motion.div>
    </>
  );
}
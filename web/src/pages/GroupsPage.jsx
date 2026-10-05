import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api, money } from '../api';
import { SkeletonGroupCards } from '../components/SkeletonCard';
import { useAppSounds } from '../sounds';
export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [balances, setBalances] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(true);
  const sounds = useAppSounds();
  async function load() {
    setLoading(true);
    try { const [g, b] = await Promise.all([api('/groups'), api('/me/balances')]); setGroups(g.groups); setBalances(b.balances); }
    catch (err) { toast.error(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function createGroup(e) {
    e.preventDefault();
    try {
      await api('/groups', { method: 'POST', body: { name, memberEmails: emails.split(',').map((s) => s.trim()).filter(Boolean) } });
      setName(''); setEmails(''); setShowForm(false); sounds.success(); toast.success('Group created!'); load();
    } catch (err) { sounds.error(); toast.error(err.message); }
  }
  return (
    <>
      <motion.div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Your groups</h1>
        <div className="spacer" />
        <motion.button className="btn btn-primary" onClick={() => setShowForm((v) => !v)} whileTap={{ scale: 0.95 }}>{showForm ? 'Cancel' : '+ New group'}</motion.button>
      </motion.div>
      <AnimatePresence>
        {showForm && (
          <motion.div className="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <h2>Create a group</h2>
            <form onSubmit={createGroup}>
              <div className="field"><label>Group name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Flatmates" required /></div>
              <div className="field"><label>Invite by email (comma separated)</label><input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="bob@example.com, carol@example.com" /></div>
              <button className="btn btn-primary">Create group</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {balances.length > 0 && (
        <div className="card">
          <h3>Overall balances</h3>
          <div className="list">
            {balances.map((b, i) => (
              <motion.div className="list-item" key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div style={{ fontWeight: 500 }}>{b.fromUser?.name} owes {b.toUser?.name}</div>
                <div className="amount neg">{money(b.amountCents)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {loading ? <SkeletonGroupCards count={3} /> : groups.length === 0 ? (
        <div className="card empty">No groups yet. Create one to start splitting. ✨</div>
      ) : (
        <div className="list">
          {groups.map((g, idx) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} whileHover={{ y: -2 }}>
              <Link to={`/groups/${g.id}`} className="card" style={{ display: 'block', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="avatar">{g.name[0]?.toUpperCase()}</div>
                  <div style={{ marginLeft: 14 }}>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div className="muted">{g.member_count} member{g.member_count === 1 ? '' : 's'}</div>
                  </div>
                  <div className="spacer" />
                  <div style={{ textAlign: 'right' }}>
                    {g.my_net_cents === 0 ? <span className="muted">settled up</span> : (
                      <><div className={`amount ${g.my_net_cents > 0 ? 'pos' : 'neg'}`}>{money(Math.abs(g.my_net_cents), g.currency)}</div>
                      <div className="muted">{g.my_net_cents > 0 ? 'you are owed' : 'you owe'}</div></>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
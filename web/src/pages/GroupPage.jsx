import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api, money, initials } from '../api';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseIcon from '../components/ExpenseIcon';
import AnimatedAmount from '../components/AnimatedAmount';
import { SkeletonList } from '../components/SkeletonCard';
import { celebrate } from '../components/Confetti';
import PayNowButton from '../components/PayNowButton';
import { useAppSounds } from '../sounds';
import { useAuth } from '../auth';

export default function GroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [tab, setTab] = useState('expenses');
  const [showForm, setShowForm] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const sounds = useAppSounds();

  const load = useCallback(async () => {
    try {
      const [g, e, b] = await Promise.all([api(`/groups/${id}`), api(`/groups/${id}/expenses?limit=200`), api(`/groups/${id}/balances`)]);
      setGroup(g.group); setExpenses(e.expenses); setBalances(b); setError('');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function addExpense(payload) {
    await api(`/groups/${id}/expenses`, { method: 'POST', body: payload });
    setShowForm(false); sounds.success(); toast.success('Expense added!'); await load();
  }

  async function deleteExpense(expenseId) {
    const removed = expenses.find((e) => e.id === expenseId);
    if (!removed) return;
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    toast((t) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Expense deleted</span>
        <button onClick={async () => {
          toast.dismiss(t.id);
          try {
            await api(`/groups/${id}/expenses`, { method: 'POST', body: { description: removed.description, amount: removed.amount_cents / 100, paidBy: removed.paid_by, splitType: removed.split_type } });
            toast.success('Restored!'); load();
          } catch { toast.error('Could not restore'); }
        }} style={{ background: '#1cc29f', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Undo</button>
      </div>
    ), { duration: 5000 });
    try { await api(`/expenses/${expenseId}`, { method: 'DELETE' }); }
    catch { toast.error('Delete failed'); load(); }
  }

  async function invite(e) {
    e.preventDefault();
    try {
      await api(`/groups/${id}/members`, { method: 'POST', body: { email: inviteEmail } });
      setInviteEmail(''); setShowInvite(false); sounds.success(); toast.success('Member added!'); load();
    } catch (err) { sounds.error(); toast.error(err.message); }
  }

  async function settle(entry, method = 'MANUAL') {
    try {
      await api(`/groups/${id}/settlements`, { method: 'POST', body: { fromUser: entry.from, toUser: entry.to, amount: entry.amountCents / 100, method } });
      sounds.coin(); toast.success('Settlement recorded!'); await load();
    } catch (err) { sounds.error(); toast.error(err.message); }
  }

  if (loading) return <><Link to="/" className="muted">← All groups</Link><SkeletonList rows={4} /></>;
  if (!group) return <div className="card empty">{error || 'Group not found'}</div>;

  const currency = group.currency || 'INR';
  const nameOf = (uid) => group.members.find((m) => m.id === uid)?.name ?? 'Unknown';

  return (
    <>
      <Link to="/" className="muted">← All groups</Link>
      <motion.div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 22px' }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <motion.div className="avatar" style={{ width: 48, height: 48, fontSize: 19 }} whileHover={{ scale: 1.08, rotate: 3 }}>{group.name[0]?.toUpperCase()}</motion.div>
        <div style={{ marginLeft: 14 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>{group.name}</h1>
          <div className="muted">{group.members.map((m) => m.name).join(', ')}</div>
        </div>
        <div className="spacer" />
        <motion.button className="btn btn-sm" onClick={() => setShowInvite((v) => !v)} whileTap={{ scale: 0.94 }}>+ Member</motion.button>
      </motion.div>
      {showInvite && (
        <motion.div className="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <form onSubmit={invite} style={{ display: 'flex', gap: 10 }}>
            <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="friend@example.com" required />
            <button className="btn btn-primary">Add</button>
          </form>
        </motion.div>
      )}
            <div className="tabs">
        <button className={`tab ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>
          Expenses
          {tab === 'expenses' && <motion.div className="tab-underline" layoutId="tab-underline" />}
        </button>
        <button className={`tab ${tab === 'balances' ? 'active' : ''}`} onClick={() => setTab('balances')}>
          Balances
          {tab === 'balances' && <motion.div className="tab-underline" layoutId="tab-underline" />}
        </button>
        <div className="spacer" />
        <motion.button
          className="btn btn-primary btn-sm btn-add-desktop"
          style={{ marginBottom: 8 }}
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
        >
          + Add expense
        </motion.button>
      </div>

      <motion.button
        className="fab"
        onClick={() => setShowForm(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
        aria-label="Add expense"
      >
        +
      </motion.button>
      <AnimatePresence mode="wait">
        {tab === 'expenses' && (
          <motion.div key="expenses" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <div className="card">
              {expenses.length === 0 ? <div className="empty">No expenses yet. Add the first one! 💸</div> : (
                <div className="list">
                  <AnimatePresence initial={false}>
                    {expenses.map((e) => (
                      <motion.div className="list-item" key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, height: 0, padding: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <ExpenseIcon description={e.description} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{e.description}</div>
                            <div className="meta">{e.paid_by_name} paid · {new Date(e.spent_at).toLocaleDateString()} · {e.split_type.toLowerCase()}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="amount">{money(e.amount_cents, currency)}</span>
                          <motion.button className="btn btn-sm btn-danger" onClick={() => deleteExpense(e.id)} whileTap={{ scale: 0.9 }}>✕</motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
        {tab === 'balances' && balances && (
          <motion.div key="balances" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
            <div className="card">
              <h3>Net balances</h3>
              <div className="list">
                {balances.net.map((n) => (
                  <div className="list-item" key={n.user.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{initials(n.user.name)}</div>
                      <span>{n.user.name}</span>
                    </div>
                    <span className={`amount ${n.netCents > 0 ? 'pos' : n.netCents < 0 ? 'neg' : ''}`}>
                      {n.netCents === 0 ? 'settled' : <AnimatedAmount value={Math.abs(n.netCents)} currency={currency} />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>Settle up (simplified)</h3>
              {balances.simplified.length === 0 ? <div className="empty">All settled up! 🎉</div> : (
                <div className="list">
                  {balances.simplified.map((t, i) => {
                    const isMe = t.from === user?.id;
                    return (
                      <motion.div className="list-item" key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <div>
                          <strong>{nameOf(t.from)}</strong> pays <strong>{nameOf(t.to)}</strong>
                          {isMe && <div className="muted" style={{ fontSize: 12 }}>You can pay via UPI</div>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="amount">{money(t.amountCents, currency)}</span>
                          {isMe && t.toUser?.upi_id && <PayNowButton toUser={t.toUser} amountCents={t.amountCents} onPaid={() => setTimeout(() => settle(t, 'UPI'), 1500)} />}
                          <button className="btn btn-sm" onClick={async () => {
                            const before = balances.simplified.length;
                            await settle(t, 'MANUAL');
                            if (before === 1) celebrate();
                          }}>Record</button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="card">
              <h3>Direct balances</h3>
              {balances.pairwise.length === 0 ? <div className="empty">Nobody owes anybody.</div> : (
                <div className="list">
                  {balances.pairwise.map((p, i) => (
                    <div className="list-item" key={i}>
                      <div>{nameOf(p.from)} owes {nameOf(p.to)}</div>
                      <span className="amount neg">{money(p.amountCents, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showForm && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
            <motion.div className="card modal" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
              <h2>Add an expense</h2>
              <ExpenseForm members={group.members} currency={currency} onSubmit={addExpense} onCancel={() => setShowForm(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
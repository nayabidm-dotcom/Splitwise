import { Router } from 'express';
import db from './db.js';
import { hashPassword, verifyPassword, createSession, deleteSession, requireAuth } from './auth.js';
import { computeSplits, SPLIT_TYPES } from './splits.js';
import { groupNet, groupPairwise, userPairwise, simplifyDebts } from './balances.js';
import { HttpError } from './errors.js';

const api = Router();
function toCents(v) { const n = Number(v); if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, 'Amount must be positive'); return Math.round(n * 100); }
function membersOf(gid) { return db.prepare(`SELECT u.id, u.name, u.email, u.upi_id FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY u.name`).all(gid); }
function assertMember(gid, uid) { if (!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(gid, uid)) throw new HttpError(403, 'Not a member'); }
function getGroupOr404(gid) { const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(gid); if (!g) throw new HttpError(404, 'Group not found'); return g; }
function expenseWithSplits(id) {
  const e = db.prepare(`SELECT e.*, u.name AS paid_by_name FROM expenses e JOIN users u ON u.id = e.paid_by WHERE e.id = ?`).get(id);
  if (!e) throw new HttpError(404, 'Expense not found');
  e.splits = db.prepare(`SELECT s.user_id, s.owed_cents, u.name FROM expense_splits s JOIN users u ON u.id = s.user_id WHERE s.expense_id = ? ORDER BY u.name`).all(id);
  return e;
}
function balancesForGroup(gid) {
  const members = membersOf(gid);
  const people = new Map(members.map((m) => [m.id, m]));
  const netMap = new Map(members.map((m) => [m.id, 0]));
  for (const row of groupNet(gid)) netMap.set(row.user_id, row.net);
  const net = members.map((m) => ({ user: m, netCents: netMap.get(m.id) || 0 }));
  const decorate = (t) => ({ ...t, fromUser: people.get(t.from), toUser: people.get(t.to) });
  return { net, pairwise: groupPairwise(gid).map(decorate), simplified: simplifyDebts(net.map((n) => ({ user_id: n.user.id, net: n.netCents }))).map(decorate) };
}

api.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) throw new HttpError(400, 'All fields required');
  if (String(password).length < 6) throw new HttpError(400, 'Password must be 6+ chars');
  const cleanEmail = String(email).toLowerCase().trim();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)) throw new HttpError(409, 'Email already registered');
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(String(name).trim(), cleanEmail, hashPassword(String(password)));
  const user = { id: Number(info.lastInsertRowid), name: String(name).trim(), email: cleanEmail, upi_id: null };
  res.status(201).json({ token: createSession(user.id), user });
});

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'Email and password required');
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
  if (!row || !verifyPassword(String(password), row.password_hash)) throw new HttpError(401, 'Invalid credentials');
  res.json({ token: createSession(row.id), user: { id: row.id, name: row.name, email: row.email, upi_id: row.upi_id } });
});

api.post('/auth/logout', requireAuth, (req, res) => { deleteSession(req.token); res.json({ ok: true }); });
api.get('/auth/me', requireAuth, (req, res) => { res.json({ user: req.user }); });

api.patch('/users/me', requireAuth, (req, res) => {
  const { name, upi_id } = req.body || {};
  const updates = [], values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(String(name).trim()); }
  if (upi_id !== undefined) { updates.push('upi_id = ?'); values.push(upi_id ? String(upi_id).trim() : null); }
  if (!updates.length) throw new HttpError(400, 'Nothing to update');
  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const user = db.prepare('SELECT id, name, email, upi_id FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

api.get('/groups', requireAuth, (req, res) => {
  const groups = db.prepare(`SELECT g.id, g.name, g.currency, g.created_at, (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id) AS member_count FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY g.created_at DESC`).all(req.user.id);
  for (const group of groups) {
    const mine = groupNet(group.id).find((n) => n.user_id === req.user.id);
    group.my_net_cents = mine ? mine.net : 0;
  }
  res.json({ groups });
});

api.post('/groups', requireAuth, (req, res) => {
  const { name, currency = 'INR', memberEmails = [] } = req.body || {};
  if (!name || !String(name).trim()) throw new HttpError(400, 'Group name required');
  const create = db.transaction(() => {
    const info = db.prepare('INSERT INTO groups (name, currency, created_by) VALUES (?, ?, ?)').run(String(name).trim(), currency, req.user.id);
    const gid = Number(info.lastInsertRowid);
    const addM = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)');
    addM.run(gid, req.user.id);
    for (const email of memberEmails) {
      const u = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
      if (u) addM.run(gid, u.id);
    }
    return gid;
  });
  const gid = create();
  res.status(201).json({ group: { ...getGroupOr404(gid), members: membersOf(gid) } });
});

api.get('/groups/:id', requireAuth, (req, res) => {
  const gid = Number(req.params.id);
  assertMember(gid, req.user.id);
  res.json({ group: { ...getGroupOr404(gid), members: membersOf(gid) } });
});

api.post('/groups/:id/members', requireAuth, (req, res) => {
  const gid = Number(req.params.id);
  assertMember(gid, req.user.id);
  const { email, userId } = req.body || {};
  const user = userId
    ? db.prepare('SELECT id FROM users WHERE id = ?').get(Number(userId))
    : db.prepare('SELECT id FROM users WHERE email = ?').get(String(email || '').toLowerCase().trim());
  if (!user) throw new HttpError(404, 'User not found');
  db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)').run(gid, user.id);
  res.status(201).json({ members: membersOf(gid) });
});

api.get('/groups/:id/expenses', requireAuth, (req, res) => {
  const gid = Number(req.params.id);
  assertMember(gid, req.user.id);
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const expenses = db.prepare(`SELECT e.id, e.description, e.amount_cents, e.split_type, e.spent_at, e.paid_by, u.name AS paid_by_name FROM expenses e JOIN users u ON u.id = e.paid_by WHERE e.group_id = ? ORDER BY e.spent_at DESC, e.id DESC LIMIT ? OFFSET ?`).all(gid, limit, offset);
  const total = db.prepare('SELECT COUNT(*) AS c FROM expenses WHERE group_id = ?').get(gid).c;
  res.json({ expenses, total, limit, offset });
});

api.post('/groups/:id/expenses', requireAuth, (req, res) => {
  const gid = Number(req.params.id);
  assertMember(gid, req.user.id);
  const { description, amount, paidBy, splitType = 'EQUAL', participants, spentAt } = req.body || {};
  if (!description || !String(description).trim()) throw new HttpError(400, 'Description required');
  if (!SPLIT_TYPES.includes(splitType)) throw new HttpError(400, 'Bad split type');
  const amountCents = toCents(amount);
  const members = membersOf(gid);
  const memberIds = new Set(members.map((m) => m.id));
  const payer = Number(paidBy);
  if (!memberIds.has(payer)) throw new HttpError(400, 'Payer must be member');
  const list = Array.isArray(participants) && participants.length ? participants : members.map((m) => ({ userId: m.id }));
  for (const p of list) if (!memberIds.has(Number(p.userId))) throw new HttpError(400, 'Participant must be member');
  const splits = computeSplits({ amountCents, splitType, participants: list.map((p) => ({ userId: Number(p.userId), value: p.value })) });
  const insert = db.transaction(() => {
    const info = db.prepare(`INSERT INTO expenses (group_id, description, amount_cents, paid_by, split_type, spent_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(gid, String(description).trim(), amountCents, payer, splitType, spentAt ? String(spentAt) : new Date().toISOString(), req.user.id);
    const eid = Number(info.lastInsertRowid);
    const addS = db.prepare('INSERT INTO expense_splits (expense_id, user_id, owed_cents) VALUES (?, ?, ?)');
    for (const s of splits) addS.run(eid, s.userId, s.owedCents);
    return eid;
  });
  res.status(201).json({ expense: expenseWithSplits(insert()) });
});

api.delete('/expenses/:id', requireAuth, (req, res) => {
  const eid = Number(req.params.id);
  const e = expenseWithSplits(eid);
  assertMember(e.group_id, req.user.id);
  db.prepare('DELETE FROM expenses WHERE id = ?').run(eid);
  res.json({ ok: true });
});

api.get('/groups/:id/balances', requireAuth, (req, res) => {
  const gid = Number(req.params.id);
  assertMember(gid, req.user.id);
  res.json(balancesForGroup(gid));
});

api.get('/me/balances', requireAuth, (req, res) => {
  const rows = userPairwise(req.user.id);
  const ids = new Set(rows.flatMap((r) => [r.from, r.to]));
  const people = new Map([...ids].map((id) => [id, db.prepare('SELECT id, name, email, upi_id FROM users WHERE id = ?').get(id)]));
  res.json({ balances: rows.map((r) => ({ ...r, fromUser: people.get(r.from), toUser: people.get(r.to) })) });
});

api.post('/groups/:id/settlements', requireAuth, (req, res) => {
  const gid = Number(req.params.id);
  assertMember(gid, req.user.id);
  const { fromUser, toUser, amount, method = 'MANUAL', note } = req.body || {};
  const from = Number(fromUser), to = Number(toUser);
  if (!from || !to || from === to) throw new HttpError(400, 'Pick two different people');
  assertMember(gid, from); assertMember(gid, to);
  const cents = toCents(amount);
  const info = db.prepare(`INSERT INTO settlements (group_id, from_user, to_user, amount_cents, method, note) VALUES (?, ?, ?, ?, ?, ?)`).run(gid, from, to, cents, String(method), note ? String(note) : null);
  res.status(201).json({ settlement: db.prepare('SELECT * FROM settlements WHERE id = ?').get(Number(info.lastInsertRowid)) });
});

export default api;
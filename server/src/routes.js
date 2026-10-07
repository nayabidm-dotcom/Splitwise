import { Router } from 'express';
import { client } from './db.js';
import { hashPassword, verifyPassword, createSession, deleteSession, requireAuth } from './auth.js';
import { computeSplits, SPLIT_TYPES } from './splits.js';
import { groupNet, groupPairwise, userPairwise, simplifyDebts } from './balances.js';
import { HttpError } from './errors.js';

const api = Router();

function toCents(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, 'Amount must be positive');
  return Math.round(n * 100);
}

async function membersOf(gid) {
  const { rows } = await client.execute({
    sql: `SELECT u.id, u.name, u.email, u.upi_id FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY u.name`,
    args: [gid],
  });
  return rows;
}

async function assertMember(gid, uid) {
  const { rows } = await client.execute({
    sql: 'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
    args: [gid, uid],
  });
  if (!rows.length) throw new HttpError(403, 'Not a member');
}

async function getGroupOr404(gid) {
  const { rows } = await client.execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [gid] });
  if (!rows.length) throw new HttpError(404, 'Group not found');
  return rows[0];
}

async function expenseWithSplits(id) {
  const { rows } = await client.execute({
    sql: `SELECT e.*, u.name AS paid_by_name FROM expenses e JOIN users u ON u.id = e.paid_by WHERE e.id = ?`,
    args: [id],
  });
  if (!rows.length) throw new HttpError(404, 'Expense not found');
  const expense = rows[0];
  const { rows: splitRows } = await client.execute({
    sql: `SELECT s.user_id, s.owed_cents, u.name FROM expense_splits s JOIN users u ON u.id = s.user_id WHERE s.expense_id = ? ORDER BY u.name`,
    args: [id],
  });
  expense.splits = splitRows;
  return expense;
}

async function balancesForGroup(gid) {
  const members = await membersOf(gid);
  const people = new Map(members.map((m) => [m.id, m]));
  const netMap = new Map(members.map((m) => [m.id, 0]));
  const netRows = await groupNet(gid);
  for (const row of netRows) netMap.set(row.user_id, row.net);
  const net = members.map((m) => ({ user: m, netCents: netMap.get(m.id) || 0 }));
  const decorate = (t) => ({ ...t, fromUser: people.get(t.from), toUser: people.get(t.to) });
  const pairwise = await groupPairwise(gid);
  const simplified = simplifyDebts(net.map((n) => ({ user_id: n.user.id, net: n.netCents })));
  return { net, pairwise: pairwise.map(decorate), simplified: simplified.map(decorate) };
}

// ============ AUTH ============
api.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) throw new HttpError(400, 'All fields required');
  if (String(password).length < 6) throw new HttpError(400, 'Password must be 6+ chars');
  const cleanEmail = String(email).toLowerCase().trim();
  const { rows: existing } = await client.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [cleanEmail] });
  if (existing.length) throw new HttpError(409, 'Email already registered');
  const result = await client.execute({
    sql: 'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    args: [String(name).trim(), cleanEmail, hashPassword(String(password))],
  });
  const userId = Number(result.lastInsertRowid);
  const user = { id: userId, name: String(name).trim(), email: cleanEmail, upi_id: null };
  const token = await createSession(userId);
  res.status(201).json({ token, user });
});

api.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, 'Email and password required');
  const { rows } = await client.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [String(email).toLowerCase().trim()],
  });
  const row = rows[0];
  if (!row || !verifyPassword(String(password), row.password_hash)) throw new HttpError(401, 'Invalid credentials');
  const token = await createSession(row.id);
  res.json({ token, user: { id: row.id, name: row.name, email: row.email, upi_id: row.upi_id } });
});

api.post('/auth/logout', requireAuth, async (req, res) => {
  await deleteSession(req.token);
  res.json({ ok: true });
});

api.get('/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

// ============ PROFILE ============
api.patch('/users/me', requireAuth, async (req, res) => {
  const { name, upi_id } = req.body || {};
  const updates = [], values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(String(name).trim()); }
  if (upi_id !== undefined) { updates.push('upi_id = ?'); values.push(upi_id ? String(upi_id).trim() : null); }
  if (!updates.length) throw new HttpError(400, 'Nothing to update');
  values.push(req.user.id);
  await client.execute({ sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, args: values });
  const { rows } = await client.execute({ sql: 'SELECT id, name, email, upi_id FROM users WHERE id = ?', args: [req.user.id] });
  res.json({ user: rows[0] });
});

// ============ GROUPS ============
api.get('/groups', requireAuth, async (req, res) => {
  const { rows: groups } = await client.execute({
    sql: `SELECT g.id, g.name, g.currency, g.created_at, (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id) AS member_count FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? ORDER BY g.created_at DESC`,
    args: [req.user.id],
  });
  for (const group of groups) {
    const netRows = await groupNet(group.id);
    const mine = netRows.find((n) => n.user_id === req.user.id);
    group.my_net_cents = mine ? mine.net : 0;
  }
  res.json({ groups });
});

api.post('/groups', requireAuth, async (req, res) => {
  const { name, currency = 'INR', memberEmails = [] } = req.body || {};
  if (!name || !String(name).trim()) throw new HttpError(400, 'Group name required');
  const groupResult = await client.execute({
    sql: 'INSERT INTO groups (name, currency, created_by) VALUES (?, ?, ?)',
    args: [String(name).trim(), currency, req.user.id],
  });
  const gid = Number(groupResult.lastInsertRowid);
  await client.execute({ sql: 'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', args: [gid, req.user.id] });
  for (const email of memberEmails) {
    const { rows } = await client.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [String(email).toLowerCase().trim()] });
    if (rows[0]) {
      await client.execute({ sql: 'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', args: [gid, rows[0].id] });
    }
  }
  const group = await getGroupOr404(gid);
  const members = await membersOf(gid);
  res.status(201).json({ group: { ...group, members } });
});

api.get('/groups/:id', requireAuth, async (req, res) => {
  const gid = Number(req.params.id);
  await assertMember(gid, req.user.id);
  const group = await getGroupOr404(gid);
  const members = await membersOf(gid);
  res.json({ group: { ...group, members } });
});

api.post('/groups/:id/members', requireAuth, async (req, res) => {
  const gid = Number(req.params.id);
  await assertMember(gid, req.user.id);
  const { email, userId } = req.body || {};
  let userRow;
  if (userId) {
    const { rows } = await client.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [Number(userId)] });
    userRow = rows[0];
  } else {
    const { rows } = await client.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [String(email || '').toLowerCase().trim()] });
    userRow = rows[0];
  }
  if (!userRow) throw new HttpError(404, 'User not found');
  await client.execute({ sql: 'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', args: [gid, userRow.id] });
  const members = await membersOf(gid);
  res.status(201).json({ members });
});

// ============ EXPENSES ============
api.get('/groups/:id/expenses', requireAuth, async (req, res) => {
  const gid = Number(req.params.id);
  await assertMember(gid, req.user.id);
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const { rows: expenses } = await client.execute({
    sql: `SELECT e.id, e.description, e.amount_cents, e.split_type, e.spent_at, e.paid_by, u.name AS paid_by_name FROM expenses e JOIN users u ON u.id = e.paid_by WHERE e.group_id = ? ORDER BY e.spent_at DESC, e.id DESC LIMIT ? OFFSET ?`,
    args: [gid, limit, offset],
  });
  const { rows: countRows } = await client.execute({ sql: 'SELECT COUNT(*) AS c FROM expenses WHERE group_id = ?', args: [gid] });
  res.json({ expenses, total: countRows[0].c, limit, offset });
});

api.post('/groups/:id/expenses', requireAuth, async (req, res) => {
  const gid = Number(req.params.id);
  await assertMember(gid, req.user.id);
  const { description, amount, paidBy, splitType = 'EQUAL', participants, spentAt } = req.body || {};
  if (!description || !String(description).trim()) throw new HttpError(400, 'Description required');
  if (!SPLIT_TYPES.includes(splitType)) throw new HttpError(400, 'Bad split type');
  const amountCents = toCents(amount);
  const members = await membersOf(gid);
  const memberIds = new Set(members.map((m) => m.id));
  const payer = Number(paidBy);
  if (!memberIds.has(payer)) throw new HttpError(400, 'Payer must be member');
  const list = Array.isArray(participants) && participants.length ? participants : members.map((m) => ({ userId: m.id }));
  for (const p of list) if (!memberIds.has(Number(p.userId))) throw new HttpError(400, 'Participant must be member');
  const splits = computeSplits({ amountCents, splitType, participants: list.map((p) => ({ userId: Number(p.userId), value: p.value })) });
  const expenseResult = await client.execute({
    sql: `INSERT INTO expenses (group_id, description, amount_cents, paid_by, split_type, spent_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [gid, String(description).trim(), amountCents, payer, splitType, spentAt ? String(spentAt) : new Date().toISOString(), req.user.id],
  });
  const eid = Number(expenseResult.lastInsertRowid);
  const splitStatements = splits.map((s) => ({
    sql: 'INSERT INTO expense_splits (expense_id, user_id, owed_cents) VALUES (?, ?, ?)',
    args: [eid, s.userId, s.owedCents],
  }));
  await client.batch(splitStatements, 'write');
  const expense = await expenseWithSplits(eid);
  res.status(201).json({ expense });
});

api.delete('/expenses/:id', requireAuth, async (req, res) => {
  const eid = Number(req.params.id);
  const expense = await expenseWithSplits(eid);
  await assertMember(expense.group_id, req.user.id);
  await client.execute({ sql: 'DELETE FROM expenses WHERE id = ?', args: [eid] });
  res.json({ ok: true });
});

// ============ BALANCES ============
api.get('/groups/:id/balances', requireAuth, async (req, res) => {
  const gid = Number(req.params.id);
  await assertMember(gid, req.user.id);
  const balances = await balancesForGroup(gid);
  res.json(balances);
});

api.get('/me/balances', requireAuth, async (req, res) => {
  const rows = await userPairwise(req.user.id);
  const ids = new Set(rows.flatMap((r) => [r.from, r.to]));
  const people = new Map();
  for (const id of ids) {
    const { rows: userRows } = await client.execute({ sql: 'SELECT id, name, email, upi_id FROM users WHERE id = ?', args: [id] });
    if (userRows[0]) people.set(id, userRows[0]);
  }
  res.json({ balances: rows.map((r) => ({ ...r, fromUser: people.get(r.from), toUser: people.get(r.to) })) });
});

// ============ SETTLEMENTS ============
api.post('/groups/:id/settlements', requireAuth, async (req, res) => {
  const gid = Number(req.params.id);
  await assertMember(gid, req.user.id);
  const { fromUser, toUser, amount, method = 'MANUAL', note } = req.body || {};
  const from = Number(fromUser), to = Number(toUser);
  if (!from || !to || from === to) throw new HttpError(400, 'Pick two different people');
  await assertMember(gid, from);
  await assertMember(gid, to);
  const cents = toCents(amount);
  const result = await client.execute({
    sql: `INSERT INTO settlements (group_id, from_user, to_user, amount_cents, method, note) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [gid, from, to, cents, String(method), note ? String(note) : null],
  });
  const { rows } = await client.execute({ sql: 'SELECT * FROM settlements WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  res.status(201).json({ settlement: rows[0] });
});

export default api;

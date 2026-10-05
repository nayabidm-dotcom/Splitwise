import db from './db.js';
import { hashPassword } from './auth.js';
db.exec('DELETE FROM settlements; DELETE FROM expense_splits; DELETE FROM expenses; DELETE FROM group_members; DELETE FROM groups; DELETE FROM sessions; DELETE FROM users;');
const addUser = db.prepare('INSERT INTO users (name, email, password_hash, upi_id) VALUES (?, ?, ?, ?)');
const pw = hashPassword('password123');
const alice = Number(addUser.run('Alice', 'alice@example.com', pw, 'alice@okhdfcbank').lastInsertRowid);
const bob = Number(addUser.run('Bob', 'bob@example.com', pw, 'bob@okicici').lastInsertRowid);
const carol = Number(addUser.run('Carol', 'carol@example.com', pw, 'carol@okaxis').lastInsertRowid);
const gid = Number(db.prepare('INSERT INTO groups (name, currency, created_by) VALUES (?, ?, ?)').run('Goa Trip', 'INR', alice).lastInsertRowid);
const addM = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
[alice, bob, carol].forEach((id) => addM.run(gid, id));
function addExpense(desc, amt, paidBy, shares) {
  const eid = Number(db.prepare(`INSERT INTO expenses (group_id, description, amount_cents, paid_by, split_type, created_by) VALUES (?, ?, ?, ?, 'EQUAL', ?)`).run(gid, desc, amt, paidBy, paidBy).lastInsertRowid);
  const addS = db.prepare('INSERT INTO expense_splits (expense_id, user_id, owed_cents) VALUES (?, ?, ?)');
  for (const [uid, owed] of Object.entries(shares)) addS.run(eid, Number(uid), owed);
}
addExpense('Hotel', 900000, alice, { [alice]: 300000, [bob]: 300000, [carol]: 300000 });
addExpense('Dinner', 180000, bob, { [alice]: 60000, [bob]: 60000, [carol]: 60000 });
addExpense('Cab', 90000, carol, { [alice]: 90000 });
console.log('Seeded. Login: alice@example.com / password123');
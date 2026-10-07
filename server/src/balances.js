import { client } from './db.js';

export async function groupNet(groupId) {
  const { rows } = await client.execute({
    sql: `
      SELECT user_id, SUM(net) AS net FROM (
        SELECT paid_by AS user_id, amount_cents AS net FROM expenses WHERE group_id = ?
        UNION ALL
        SELECT s.user_id, -s.owed_cents FROM expense_splits s JOIN expenses e ON e.id = s.expense_id WHERE e.group_id = ?
        UNION ALL
        SELECT from_user, amount_cents FROM settlements WHERE group_id = ?
        UNION ALL
        SELECT to_user, -amount_cents FROM settlements WHERE group_id = ?
      ) GROUP BY user_id
    `,
    args: [groupId, groupId, groupId, groupId],
  });
  return rows;
}

function netPairs(rows) {
  const map = new Map();
  for (const r of rows) {
    const a = Math.min(r.creditor, r.debtor);
    const b = Math.max(r.creditor, r.debtor);
    const key = `${a}:${b}`;
    const sign = r.debtor === a ? 1 : -1;
    map.set(key, (map.get(key) || 0) + sign * r.amount);
  }
  const out = [];
  for (const [key, value] of map) {
    if (value === 0) continue;
    const [a, b] = key.split(':').map(Number);
    out.push(value > 0 ? { from: a, to: b, amountCents: value } : { from: b, to: a, amountCents: -value });
  }
  return out;
}

export async function groupPairwise(groupId) {
  const { rows } = await client.execute({
    sql: `
      SELECT creditor, debtor, SUM(amount) AS amount FROM (
        SELECT e.paid_by AS creditor, s.user_id AS debtor, s.owed_cents AS amount
        FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
        WHERE e.group_id = ? AND s.user_id <> e.paid_by
        UNION ALL
        SELECT to_user, from_user, amount_cents FROM settlements WHERE group_id = ?
      ) GROUP BY creditor, debtor
    `,
    args: [groupId, groupId],
  });
  return netPairs(rows);
}

export async function userPairwise(userId) {
  const { rows } = await client.execute({
    sql: `
      SELECT creditor, debtor, SUM(amount) AS amount FROM (
        SELECT e.paid_by AS creditor, s.user_id AS debtor, s.owed_cents AS amount
        FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
        WHERE s.user_id <> e.paid_by
        UNION ALL
        SELECT to_user, from_user, amount_cents FROM settlements
      ) GROUP BY creditor, debtor
    `,
    args: [],
  });
  return netPairs(rows).filter((p) => p.from === userId || p.to === userId);
}

export function simplifyDebts(netRows) {
  const creditors = [], debtors = [];
  for (const row of netRows) {
    if (row.net > 0) creditors.push({ userId: row.user_id, amount: row.net });
    else if (row.net < 0) debtors.push({ userId: row.user_id, amount: -row.net });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  const result = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i], creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0) result.push({ from: debtor.userId, to: creditor.userId, amountCents: amount });
    debtor.amount -= amount; creditor.amount -= amount;
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }
  return result;
}

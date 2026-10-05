import { HttpError } from './errors.js';
export const SPLIT_TYPES = ['EQUAL', 'EXACT', 'PERCENT', 'SHARES'];
function distribute(totalCents, weighted) {
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  if (!(totalWeight > 0)) throw new HttpError(400, 'Total weight must be positive');
  const rows = weighted.map((w) => {
    const exact = (totalCents * w.weight) / totalWeight;
    const base = Math.floor(exact);
    return { userId: w.userId, owedCents: base, remainder: exact - base };
  });
  const leftover = totalCents - rows.reduce((s, r) => s + r.owedCents, 0);
  const order = [...rows].sort((a, b) => b.remainder - a.remainder || a.userId - b.userId);
  for (let i = 0; i < leftover; i++) order[i % order.length].owedCents += 1;
  return rows.map(({ userId, owedCents }) => ({ userId, owedCents }));
}
export function computeSplits({ amountCents, splitType, participants }) {
  if (!Array.isArray(participants) || participants.length === 0) throw new HttpError(400, 'At least one participant is required');
  const ids = participants.map((p) => p.userId);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Duplicate participants');
  switch (splitType) {
    case 'EQUAL': return distribute(amountCents, participants.map((p) => ({ userId: p.userId, weight: 1 })));
    case 'SHARES': {
      const w = participants.map((p) => ({ userId: p.userId, weight: Number(p.value) }));
      if (w.some((x) => !Number.isFinite(x.weight) || x.weight <= 0)) throw new HttpError(400, 'Shares must be positive numbers');
      return distribute(amountCents, w);
    }
    case 'PERCENT': {
      const w = participants.map((p) => ({ userId: p.userId, weight: Number(p.value) }));
      if (w.some((x) => !Number.isFinite(x.weight) || x.weight < 0)) throw new HttpError(400, 'Percentages must be non-negative');
      const sum = w.reduce((s, x) => s + x.weight, 0);
      if (Math.abs(sum - 100) > 0.001) throw new HttpError(400, 'Percentages must add to 100');
      return distribute(amountCents, w);
    }
    case 'EXACT': {
      const rows = participants.map((p) => ({ userId: p.userId, owedCents: Math.round(Number(p.value) * 100) }));
      if (rows.some((r) => !Number.isFinite(r.owedCents) || r.owedCents < 0)) throw new HttpError(400, 'Exact amounts must be non-negative');
      const sum = rows.reduce((s, r) => s + r.owedCents, 0);
      if (sum !== amountCents) throw new HttpError(400, `Exact amounts must sum to ${(amountCents / 100).toFixed(2)}`);
      return rows;
    }
    default: throw new HttpError(400, `Unknown split type: ${splitType}`);
  }
}
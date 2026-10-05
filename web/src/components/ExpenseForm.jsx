import { useState } from 'react';
const LABELS = { EQUAL: 'Equally', EXACT: 'Exact amounts', PERCENT: 'Percentages', SHARES: 'Shares' };
export default function ExpenseForm({ members, currency, onSubmit, onCancel }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? '');
  const [splitType, setSplitType] = useState('EQUAL');
  const [selected, setSelected] = useState(() => new Set(members.map((m) => m.id)));
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setValue = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));
  const selectedMembers = members.filter((m) => selected.has(m.id));
  const preview = (() => {
    const total = Math.round(Number(amount || 0) * 100);
    if (!total || !selectedMembers.length) return null;
    if (splitType === 'EQUAL') {
      const base = Math.floor(total / selectedMembers.length);
      const rem = total - base * selectedMembers.length;
      return selectedMembers.map((m, i) => ({ name: m.name, cents: base + (i < rem ? 1 : 0) }));
    }
    return null;
  })();
  async function submit(e) {
    e.preventDefault(); setError('');
    const participants = selectedMembers.map((m) => ({ userId: m.id, value: splitType === 'EQUAL' ? undefined : Number(values[m.id] || 0) }));
    if (!participants.length) { setError('Select at least one person'); return; }
    setBusy(true);
    try { await onSubmit({ description, amount: Number(amount), paidBy: Number(paidBy), splitType, participants }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="field"><label>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner, Cab, Hotel…" required /></div>
      <div className="row">
        <div className="field"><label>Amount ({currency})</label><input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required /></div>
        <div className="field"><label>Paid by</label><select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
      </div>
      <div className="field"><label>Split</label><select value={splitType} onChange={(e) => setSplitType(e.target.value)}>{Object.entries(LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div className="field"><label>Split between</label>
        <div style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '6px 12px' }}>
          {members.map((m) => (
            <div className="participant-row" key={m.id}>
              <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} id={`p-${m.id}`} />
              <label className="name" htmlFor={`p-${m.id}`} style={{ margin: 0, cursor: 'pointer' }}>{m.name}</label>
              {splitType !== 'EQUAL' && selected.has(m.id) && (
                <input type="number" step="0.01" min="0" placeholder={splitType === 'PERCENT' ? '%' : splitType === 'SHARES' ? 'shares' : '0.00'} value={values[m.id] ?? ''} onChange={(e) => setValue(m.id, e.target.value)} />
              )}
            </div>
          ))}
        </div>
      </div>
      {preview && <div className="muted" style={{ marginBottom: 14 }}>{preview.map((p) => `${p.name}: ${(p.cents / 100).toFixed(2)}`).join(' · ')}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Add expense'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
import crypto from 'node:crypto';
import db from './db.js';
import { HttpError } from './errors.js';
const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;
const SESSION_DAYS = 30;
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, KEYLEN, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), key.toString('hex')].join('$');
}
export function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltHex, keyHex] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`).run(token, userId, `+${SESSION_DAYS} days`);
  return token;
}
export function deleteSession(token) { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); }
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing auth token');
  const user = db.prepare(`SELECT u.id, u.name, u.email, u.upi_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token);
  if (!user) throw new HttpError(401, 'Invalid or expired session');
  req.user = user; req.token = token; next();
}
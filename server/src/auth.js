import crypto from 'node:crypto';
import { client } from './db.js';
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
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await client.execute({
    sql: 'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    args: [token, userId, expiresAt],
  });
  return token;
}

export async function deleteSession(token) {
  await client.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Missing auth token');
    const { rows } = await client.execute({
      sql: `SELECT u.id, u.name, u.email, u.upi_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')`,
      args: [token],
    });
    if (!rows.length) throw new HttpError(401, 'Invalid or expired session');
    req.user = rows[0];
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

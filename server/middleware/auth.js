import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';

// Resolve the signing secret at call time. It MUST be stable across processes and
// serverless instances, otherwise a token signed by one instance fails to verify on
// another (login succeeds, then the next request 401s). Priority:
//   1. JWT_SECRET env var (set this in production).
//   2. Deterministic value derived from ADMIN_PASSWORD, so setting a custom admin
//      password alone is enough to get a stable, non-public secret.
//   3. A public dev-only fallback (fine for local dev; never for a real launch).
const PLACEHOLDER = 'change-me-to-a-long-random-string';
function secret() {
  const s = process.env.JWT_SECRET;
  if (s && s !== PLACEHOLDER) return s;
  const pw = process.env.ADMIN_PASSWORD;
  if (pw && pw !== 'admin123') return createHash('sha256').update('jt-shirts:' + pw).digest('hex');
  return 'dev-insecure-secret';
}

export function signAdminToken() {
  return jwt.sign({ role: 'admin' }, secret(), { expiresIn: '12h' });
}

// Gate for admin-only routes. Expects `Authorization: Bearer <token>`.
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing admin token' } });
  }
  try {
    const payload = jwt.verify(token, secret());
    if (payload.role !== 'admin') throw new Error('wrong role');
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

import jwt from 'jsonwebtoken';

// Read the secret at call time (not import time) so the server can set/generate it
// during startup before any request is handled.
const secret = () => process.env.JWT_SECRET || 'dev-insecure-secret';

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

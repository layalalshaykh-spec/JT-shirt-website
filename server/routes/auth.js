import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { signAdminToken } from '../middleware/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }
});

// POST /api/auth/login  { password }
router.post('/login', loginLimiter, (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.ADMIN_PASSWORD || 'admin123';

  if (!password || password !== expected) {
    return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'Incorrect password' } });
  }
  res.json({ token: signAdminToken() });
});

export default router;

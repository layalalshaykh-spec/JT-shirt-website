import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import contactRouter from './routes/contact.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// ---- Credential safety check ----
// Never let the app run in production with the public default password/secret.
const WEAK = { ADMIN_PASSWORD: 'admin123', JWT_SECRET: 'dev-insecure-secret' };
(function checkSecrets() {
  const prod = process.env.NODE_ENV === 'production';
  const problems = [];
  for (const key of Object.keys(WEAK)) {
    const val = process.env[key];
    if (!val || val === WEAK[key] || val === 'change-me-to-a-long-random-string') {
      problems.push(key);
    }
  }
  if (problems.length && prod) {
    console.error(`\n[FATAL] Refusing to start in production with unset/default ${problems.join(', ')}.`);
    console.error('        Set strong values in your .env before deploying.\n');
    process.exit(1);
  }
  if (problems.length) {
    console.warn(`\n[WARNING] Using insecure default(s) for ${problems.join(', ')}. Fine for local dev only.`);
    console.warn('          Set strong values in .env (and NODE_ENV=production) before any public deploy.\n');
  }
})();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// Basic abuse protection on the API surface.
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } }
  })
);

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'jt-shirts', time: new Date().toISOString() }));

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/contact', contactRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Unknown API route -> JSON 404 (so the SPA fallback below never swallows it)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown API endpoint' } });
});

// Static storefront + admin. No-store in dev so edits always load; production can cache.
app.use(
  express.static(publicDir, {
    etag: process.env.NODE_ENV === 'production',
    setHeaders: (res) => {
      if (process.env.NODE_ENV !== 'production') res.setHeader('Cache-Control', 'no-store');
    }
  })
);

// Centralized error handler -> typed JSON shape, never leaks stack traces.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`JT Shirts store running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin.html`);
});

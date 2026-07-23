import { Router } from 'express';
import db from '../db.js';

const router = Router();

// POST /api/contact
router.post('/', (req, res) => {
  const { firstName, lastName, email, company, inquiry, message } = req.body || {};

  if (!email || !message) {
    return res
      .status(400)
      .json({ error: { code: 'MISSING_FIELDS', message: 'Email and message are required' } });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: { code: 'BAD_EMAIL', message: 'Invalid email address' } });
  }

  db.prepare(
    `INSERT INTO messages (firstName, lastName, email, company, inquiry, message)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    String(firstName || '').slice(0, 120),
    String(lastName || '').slice(0, 120),
    String(email).slice(0, 200),
    String(company || '').slice(0, 200),
    String(inquiry || '').slice(0, 120),
    String(message).slice(0, 4000)
  );

  res.status(201).json({ ok: true, message: 'Message received. We will reply within 24 hours.' });
});

export default router;

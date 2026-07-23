import { Router } from 'express';
import db, { hydrateProduct } from '../db.js';

const router = Router();

// GET /api/products?category=Polos&badge=sale&q=polo&type=item
router.get('/', (req, res) => {
  const { category, badge, q, type } = req.query;
  let rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort ASC, id ASC').all().map(hydrateProduct);

  if (type) {
    rows = rows.filter((p) => p.type === String(type));
  }
  if (category && category !== 'All') {
    rows = rows.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
  }
  if (badge) {
    rows = rows.filter((p) => p.badges.includes(String(badge)));
  }
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle)
    );
  }
  res.json({ products: rows });
});

// GET /api/products/categories -> distinct category list
router.get('/categories', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category').all();
  res.json({ categories: rows.map((r) => r.category) });
});

// GET /api/products/:idOrSlug
router.get('/:idOrSlug', (req, res) => {
  const { idOrSlug } = req.params;
  const byId = /^\d+$/.test(idOrSlug);
  const row = byId
    ? db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(idOrSlug))
    : db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(idOrSlug);

  if (!row) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  }
  res.json({ product: hydrateProduct(row) });
});

export default router;

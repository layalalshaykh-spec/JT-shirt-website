import { Router } from 'express';
import db, { hydrateProduct } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

const round = (n) => Math.round(n * 100) / 100;

// --- Dashboard summary ---
router.get('/stats', (_req, res) => {
  const orders = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS revenue FROM orders').get();
  const products = db.prepare("SELECT COUNT(*) AS n FROM products WHERE active = 1 AND type = 'item'").get();
  const programs = db.prepare("SELECT COUNT(*) AS n FROM products WHERE active = 1 AND type = 'program'").get();
  const messages = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE handled = 0').get();
  res.json({
    orders: orders.n,
    revenue: round(orders.revenue),
    products: products.n,
    programs: programs.n,
    unreadMessages: messages.n
  });
});

// --- Orders ---
router.get('/orders', (_req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const getItems = db.prepare('SELECT * FROM order_items WHERE orderId = ?');
  res.json({ orders: orders.map((o) => ({ ...o, items: getItems.all(o.id) })) });
});

router.patch('/orders/:id/status', (req, res) => {
  const allowed = ['paid', 'processing', 'shipped', 'delivered', 'cancelled'];
  const { status } = req.body || {};
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: { code: 'BAD_STATUS', message: 'Invalid status' } });
  }
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  if (result.changes === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }
  res.json({ ok: true });
});

// --- Messages ---
router.get('/messages', (_req, res) => {
  res.json({ messages: db.prepare('SELECT * FROM messages ORDER BY id DESC').all() });
});

router.patch('/messages/:id/handled', (req, res) => {
  db.prepare('UPDATE messages SET handled = 1 WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// --- Products (full CRUD) ---
router.get('/products', (_req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(hydrateProduct);
  res.json({ products: rows });
});

function normalizeTiers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => ({ minQty: parseInt(t.minQty, 10), price: Number(t.price) }))
    .filter((t) => Number.isFinite(t.minQty) && Number.isFinite(t.price))
    .sort((a, b) => a.minQty - b.minQty);
}

function normalizeProductBody(body) {
  const type = body.type === 'program' ? 'program' : 'item';
  const tiers = normalizeTiers(body.tiers);
  // "from" price: lowest tier for items, or the explicit flat price.
  const fromPrice = type === 'item' && tiers.length ? Math.min(...tiers.map((t) => t.price)) : Number(body.price);
  return {
    type,
    name: String(body.name || '').trim(),
    category: String(body.category || (type === 'program' ? 'Programs' : 'Polos')).trim(),
    price: fromPrice,
    minOrder: parseInt(body.minOrder, 10) || (type === 'program' ? 1 : 25),
    tiers: JSON.stringify(tiers),
    tierLabel: String(body.tierLabel || '').trim(),
    focus: String(body.focus || '').trim(),
    features: JSON.stringify(Array.isArray(body.features) ? body.features : []),
    image: String(body.image || '').trim(),
    images: JSON.stringify(Array.isArray(body.images) ? body.images : []),
    colors: JSON.stringify(Array.isArray(body.colors) ? body.colors : []),
    sizes: JSON.stringify(Array.isArray(body.sizes) ? body.sizes : []),
    badges: JSON.stringify(Array.isArray(body.badges) ? body.badges : []),
    description: String(body.description || '').trim(),
    specs: JSON.stringify(body.specs && typeof body.specs === 'object' ? body.specs : {}),
    rating: Number(body.rating) || 0,
    reviews: parseInt(body.reviews, 10) || 0
  };
}

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

router.post('/products', (req, res) => {
  const p = normalizeProductBody(req.body || {});
  if (!p.name || !Number.isFinite(p.price) || p.price < 0) {
    return res.status(400).json({ error: { code: 'INVALID', message: 'Name and a valid price are required' } });
  }
  if (!p.image) {
    p.image = 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop';
  }
  const result = db
    .prepare(
      `INSERT INTO products
        (slug, type, name, category, price, minOrder, tiers, tierLabel, focus, features, rating, reviews, image, images, colors, sizes, badges, description, specs)
       VALUES
        (@slug, @type, @name, @category, @price, @minOrder, @tiers, @tierLabel, @focus, @features, @rating, @reviews, @image, @images, @colors, @sizes, @badges, @description, @specs)`
    )
    .run({ slug: slugify(p.name), ...p });
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ product: hydrateProduct(row) });
});

router.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  }
  const p = normalizeProductBody(req.body || {});
  if (!p.name || !Number.isFinite(p.price) || p.price < 0) {
    return res.status(400).json({ error: { code: 'INVALID', message: 'Name and a valid price are required' } });
  }
  db.prepare(
    `UPDATE products SET
      type=@type, name=@name, category=@category, price=@price, minOrder=@minOrder, tiers=@tiers,
      tierLabel=@tierLabel, focus=@focus, features=@features, rating=@rating, reviews=@reviews,
      image=@image, images=@images, colors=@colors, sizes=@sizes, badges=@badges,
      description=@description, specs=@specs
     WHERE id=@id`
  ).run({ id, ...p });
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ product: hydrateProduct(row) });
});

// Soft delete so historical orders keep their product reference.
router.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  }
  res.json({ ok: true });
});

export default router;

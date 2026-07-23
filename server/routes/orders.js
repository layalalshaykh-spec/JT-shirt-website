import { Router } from 'express';
import db, { hydrateProduct, unitPriceFor } from '../db.js';

const router = Router();

const round = (n) => Math.round(n * 100) / 100;

function pricingConfig() {
  return {
    freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 500),
    shippingFlatRate: Number(process.env.SHIPPING_FLAT_RATE ?? 24.99),
    taxRate: Number(process.env.TAX_RATE ?? 0.08)
  };
}

// GET /api/orders/config -> shipping and tax rules the storefront needs to show totals
router.get('/config', (_req, res) => {
  res.json(pricingConfig());
});

// POST /api/orders
// Body: { items: [{ productId, color, size, logo, qty }], customer: {...} }
// The server re-prices every line from the database using the volume tiers, so a
// tampered cart cannot change what is charged, and enforces per-item minimums.
router.post('/', (req, res) => {
  const { items, customer } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: { code: 'EMPTY_CART', message: 'Cart is empty' } });
  }
  if (!customer || !customer.email || !customer.firstName || !customer.lastName) {
    return res
      .status(400)
      .json({ error: { code: 'MISSING_CUSTOMER', message: 'Name and email are required' } });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return res.status(400).json({ error: { code: 'BAD_EMAIL', message: 'Invalid email address' } });
  }

  const { freeShippingThreshold, shippingFlatRate, taxRate } = pricingConfig();

  // Build validated line items from the DB.
  const lines = [];
  for (const item of items) {
    const row = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(item.productId));
    if (!row) {
      return res
        .status(400)
        .json({ error: { code: 'BAD_ITEM', message: `Product ${item.productId} is unavailable` } });
    }
    const product = hydrateProduct(row);
    let qty = parseInt(item.qty, 10) || 0;

    // Enforce the per-item minimum (25 units for custom workwear, 1 for programs).
    if (qty < product.minOrder) {
      return res.status(400).json({
        error: { code: 'BELOW_MINIMUM', message: `${product.name} has a minimum of ${product.minOrder} unit(s) per order` }
      });
    }
    qty = Math.min(100000, qty);

    lines.push({
      productId: product.id,
      name: product.name,
      color: String(item.color || (product.colors[0]?.name ?? '')),
      size: String(item.size || (product.sizes[0] ?? '')),
      logo: String(item.logo || '').slice(0, 160),
      unitPrice: unitPriceFor(product, qty),
      qty,
      image: product.image
    });
  }

  const subtotal = round(lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0));
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : round(shippingFlatRate);
  const tax = round(subtotal * taxRate);
  const total = round(subtotal + shipping + tax);

  const orderNumber = 'JT-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

  // Mock payment. When STRIPE_SECRET_KEY is set you would create a PaymentIntent here
  // and only persist the order after it succeeds.
  const paymentRef = 'MOCK-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  // Persist order + items atomically. Workwear is made to order, so there is no stock
  // to decrement. node:sqlite has no transaction() helper, so we drive it by hand.
  db.exec('BEGIN');
  try {
    const orderResult = db
      .prepare(
        `INSERT INTO orders
          (orderNumber, email, firstName, lastName, company, phone, address, city, zip, country, subtotal, shipping, tax, total, status, paymentRef)
         VALUES
          (@orderNumber, @email, @firstName, @lastName, @company, @phone, @address, @city, @zip, @country, @subtotal, @shipping, @tax, @total, 'paid', @paymentRef)`
      )
      .run({
        orderNumber,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        company: customer.company || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        zip: customer.zip || '',
        country: customer.country || '',
        subtotal,
        shipping,
        tax,
        total,
        paymentRef
      });

    const orderId = orderResult.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO order_items (orderId, productId, name, color, size, logo, unitPrice, qty, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const l of lines) {
      insertItem.run(orderId, l.productId, l.name, l.color, l.size, l.logo, l.unitPrice, l.qty, l.image);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.status(201).json({
    order: { orderNumber, subtotal, shipping, tax, total, status: 'paid', items: lines }
  });
});

// GET /api/orders/:orderNumber -> lookup for the confirmation / status page
router.get('/:orderNumber', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE orderNumber = ?').get(req.params.orderNumber);
  if (!order) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
  }
  const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);
  res.json({ order: { ...order, items } });
});

export default router;

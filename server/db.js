// SQLite data layer using the built-in node:sqlite module (Node 22.5+).
// No native compilation required.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedProducts, seedPrograms } from './seed-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// On serverless hosts the project directory is read-only; only /tmp is writable
// (and ephemeral, so data does not persist across cold starts there).
const dataDir = process.env.VERCEL ? '/tmp/jt-data' : join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'store.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slug          TEXT UNIQUE NOT NULL,
    type          TEXT NOT NULL DEFAULT 'item',   -- 'item' | 'program'
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    price         REAL NOT NULL,                  -- "from" price for items; flat price for programs
    minOrder      INTEGER NOT NULL DEFAULT 25,
    tiers         TEXT NOT NULL DEFAULT '[]',     -- [{minQty, price}] ascending, items only
    tierLabel     TEXT NOT NULL DEFAULT '',       -- programs: Starter/Professional/Crew
    focus         TEXT NOT NULL DEFAULT '',       -- programs: focus line
    features      TEXT NOT NULL DEFAULT '[]',     -- programs: bullet list
    rating        REAL NOT NULL DEFAULT 0,
    reviews       INTEGER NOT NULL DEFAULT 0,
    image         TEXT NOT NULL,
    images        TEXT NOT NULL DEFAULT '[]',
    colors        TEXT NOT NULL DEFAULT '[]',
    sizes         TEXT NOT NULL DEFAULT '[]',
    badges        TEXT NOT NULL DEFAULT '[]',
    description   TEXT NOT NULL DEFAULT '',
    specs         TEXT NOT NULL DEFAULT '{}',
    active        INTEGER NOT NULL DEFAULT 1,
    sort          INTEGER NOT NULL DEFAULT 0,
    createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    orderNumber   TEXT UNIQUE NOT NULL,
    email         TEXT NOT NULL,
    firstName     TEXT NOT NULL,
    lastName      TEXT NOT NULL,
    company       TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    address       TEXT NOT NULL DEFAULT '',
    city          TEXT NOT NULL DEFAULT '',
    zip           TEXT NOT NULL DEFAULT '',
    country       TEXT NOT NULL DEFAULT '',
    subtotal      REAL NOT NULL,
    shipping      REAL NOT NULL,
    tax           REAL NOT NULL,
    total         REAL NOT NULL,
    status        TEXT NOT NULL DEFAULT 'paid',
    paymentRef    TEXT NOT NULL DEFAULT '',
    createdAt     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    productId  INTEGER NOT NULL,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '',
    size       TEXT NOT NULL DEFAULT '',
    logo       TEXT NOT NULL DEFAULT '',
    unitPrice  REAL NOT NULL,
    qty        INTEGER NOT NULL,
    image      TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName  TEXT NOT NULL DEFAULT '',
    lastName   TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL,
    company    TEXT NOT NULL DEFAULT '',
    inquiry    TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL,
    handled    INTEGER NOT NULL DEFAULT 0,
    createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed products + programs the first time the table is empty.
const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO products
      (slug, type, name, category, price, minOrder, tiers, tierLabel, focus, features, rating, reviews, image, images, colors, sizes, badges, description, specs, sort)
    VALUES
      (@slug, @type, @name, @category, @price, @minOrder, @tiers, @tierLabel, @focus, @features, @rating, @reviews, @image, @images, @colors, @sizes, @badges, @description, @specs, @sort)
  `);
  let sort = 0;
  const rows = [...seedProducts, ...seedPrograms];
  for (const p of rows) {
    insert.run({
      slug: p.slug,
      type: p.type || 'item',
      name: p.name,
      category: p.category,
      price: p.price,
      minOrder: p.minOrder ?? (p.type === 'program' ? 1 : 25),
      tiers: JSON.stringify(p.tiers ?? []),
      tierLabel: p.tierLabel ?? '',
      focus: p.focus ?? '',
      features: JSON.stringify(p.features ?? []),
      rating: p.rating ?? 0,
      reviews: p.reviews ?? 0,
      image: p.image,
      images: JSON.stringify(p.images ?? []),
      colors: JSON.stringify(p.colors ?? []),
      sizes: JSON.stringify(p.sizes ?? []),
      badges: JSON.stringify(p.badges ?? []),
      description: p.description ?? '',
      specs: JSON.stringify(p.specs ?? {}),
      sort: sort++
    });
  }
  console.log(`Seeded ${seedProducts.length} items and ${seedPrograms.length} programs.`);
}

// Turn a raw product row into an API-friendly object (parse JSON columns).
export function hydrateProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    name: row.name,
    category: row.category,
    price: row.price,
    minOrder: row.minOrder,
    tiers: JSON.parse(row.tiers),
    tierLabel: row.tierLabel,
    focus: row.focus,
    features: JSON.parse(row.features),
    rating: row.rating,
    reviews: row.reviews,
    image: row.image,
    images: JSON.parse(row.images),
    colors: JSON.parse(row.colors),
    sizes: JSON.parse(row.sizes),
    badges: JSON.parse(row.badges),
    description: row.description,
    specs: JSON.parse(row.specs),
    active: !!row.active
  };
}

// Shared pricing rule: the unit price for a given quantity.
// Programs are flat-priced. Items use the highest tier the quantity qualifies for.
export function unitPriceFor(product, qty) {
  if (product.type === 'program' || !product.tiers?.length) return product.price;
  const sorted = [...product.tiers].sort((a, b) => a.minQty - b.minQty);
  let price = sorted[0].price;
  for (const tier of sorted) {
    if (qty >= tier.minQty) price = tier.price;
  }
  return price;
}

export default db;

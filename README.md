# JT Shirts, full-stack B2B workwear store

A complete, runnable e-commerce app modelled on the real jtshirts.net business:
**B2B custom workwear with volume-tier pricing** (25-unit minimums, prices drop at
50 and 100 units), a uniform **configurator**, fixed-price **program bundles**, a
REST API, a real SQLite database, working cart and checkout, and an admin panel.

Built with **Node.js + Express** and the built-in **`node:sqlite`** driver, so there
is no native build step and no external database to install.

Real business data (catalog, tiers, programs, contact, copy) is documented in
[docs/jtshirts-net-extract.md](docs/jtshirts-net-extract.md).

## What works

- **Storefront** (`/`): home (premise, catalog, 4-phase process, sectors), catalog
  with category filter and search, a **configurator** (garment, color, size, logo
  upload, quantity with live tier pricing), **programs** page, cart, checkout, order
  confirmation, contact. Dark mode, mobile menu, responsive to phone width.
- **Free Audit** page (`#audit`): live savings calculator, rental-vs-JT comparison
  table, 90-second intake form (saved to the backend as a "Free Audit" message),
  and an FAQ accordion. Rebuilt from jtshirts.net/audit/.
- **Free Mockup** page (`#mockup`): upload a logo and preview it live on a polo and
  cap, plus the First Run Mini Pack (25 polos / $499). Rebuilt from /mockup/.
- **Blog** page (`#blog`): 10 field-guide article cards and local service areas.
  Rebuilt from /blog/.
- **Volume-tier pricing**: each catalog item has 25-49 / 50-99 / 100+ price tiers.
  The unit price is computed from quantity, both live in the UI and authoritatively
  on the server. 25-unit minimum per item is enforced.
- **Programs**: three fixed-price bundles (Foundation $1,249, Operational $4,499,
  Full Field $5,999) that add to the same cart.
- **Cart** persists in the browser (localStorage). Prices are re-validated and the
  minimum re-checked on the server at checkout, so a tampered cart cannot change
  what is charged.
- **Checkout** creates a real order (with company, phone, logo notes) and computes
  shipping and tax from server-side rules. Workwear is made to order, so there is no
  stock decrement. Payment is mocked (see below).
- **Contact form** saves quote/audit requests to the database.
- **Admin panel** (`/admin.html`): dashboard stats, product CRUD supporting both
  tiered items and flat-price programs, order list with status updates, and incoming
  messages. Protected by a JWT issued after a password login.

## Run it

```bash
npm install
cp .env.example .env      # then edit values if you like
npm start
```

Open:

- Store: http://localhost:4000
- Admin: http://localhost:4000/admin.html  (default password `admin123`)

Use `npm run dev` for auto-reload while editing.

The database file is created automatically at `data/store.db` on first run and
seeded with six products.

## Configuration (`.env`)

| Key | Purpose |
|---|---|
| `PORT` | Server port (default 4000) |
| `JWT_SECRET` | Secret used to sign admin tokens |
| `ADMIN_PASSWORD` | Password for the admin panel |
| `FREE_SHIPPING_THRESHOLD` | Order subtotal that unlocks free shipping (default 500) |
| `SHIPPING_FLAT_RATE` | Flat shipping fee below the threshold (default 24.99) |
| `TAX_RATE` | Sales tax rate as a decimal (0.08 = 8 percent) |
| `STRIPE_SECRET_KEY` | Leave empty for mock checkout; add a key to go live |

## Payments

Checkout is fully wired end to end but the payment step is **mocked**: no card is
collected and no money moves. Every order is still saved so you can see the full
flow and manage it in the admin panel.

To accept real payments, add your Stripe secret key to `.env` and create a
PaymentIntent inside `server/routes/orders.js` (there is a comment marking the exact
spot), persisting the order only after the charge succeeds.

## API reference

Public:

- `GET  /api/health`
- `GET  /api/products` (query: `category`, `badge`, `q`)
- `GET  /api/products/categories`
- `GET  /api/products/:idOrSlug`
- `GET  /api/orders/config`
- `POST /api/orders`
- `GET  /api/orders/:orderNumber`
- `POST /api/contact`
- `POST /api/auth/login`

Admin (require `Authorization: Bearer <token>`):

- `GET    /api/admin/stats`
- `GET    /api/admin/orders`
- `PATCH  /api/admin/orders/:id/status`
- `GET    /api/admin/messages`
- `PATCH  /api/admin/messages/:id/handled`
- `GET    /api/admin/products`
- `POST   /api/admin/products`
- `PUT    /api/admin/products/:id`
- `DELETE /api/admin/products/:id`  (soft delete)

## Project layout

```
jt-shirts/
├── server/
│   ├── index.js          Express app + middleware + routing
│   ├── db.js             SQLite schema, seeding, hydration
│   ├── seed-data.js      Initial product catalog
│   ├── middleware/auth.js JWT sign + admin guard
│   └── routes/           products, orders, contact, auth, admin
├── public/
│   ├── index.html        Storefront
│   ├── admin.html        Admin panel
│   ├── css/styles.css
│   └── js/app.js, js/admin.js
├── data/store.db         Created on first run (git-ignored)
└── .env                  Local config (git-ignored)
```

## Notes

- Requires Node 22.5 or newer (for `node:sqlite`). Node 24 recommended.
- Errors return a typed JSON shape `{ error: { code, message } }` and never leak
  stack traces to clients.
- Basic rate limiting is applied to the API and the admin login.

// ==================== JT Shirts storefront (B2B) ====================
// Volume-tier pricing, 25-unit minimums, uniform configurator, program bundles.
// Cart lives in localStorage; every price is re-validated server-side at checkout.

const API = '/api';

const state = {
  products: [],   // type 'item'
  programs: [],   // type 'program'
  byId: {},
  categories: ['All'],
  currentProduct: null,
  selectedColor: null,
  selectedSize: null,
  logoPosition: 'Left chest',
  logoName: '',
  qty: 25,
  cart: loadCart(),
  pricing: { freeShippingThreshold: 500, shippingFlatRate: 24.99, taxRate: 0.08 },
  shopCategory: 'All',
  shopQuery: ''
};

// ---------- helpers ----------
const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => '$' + Math.round(Number(n)).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function icons() { if (window.lucide) lucide.createIcons(); }
function scrollToId(id) { setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80); }

async function apiGet(path) {
  const res = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Request failed');
  return data;
}
async function apiPost(path, body) {
  const res = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Request failed');
  return data;
}

function loadCart() { try { return JSON.parse(localStorage.getItem('jt-cart') || '[]'); } catch { return []; } }
function saveCart() { localStorage.setItem('jt-cart', JSON.stringify(state.cart)); }

// Shared pricing rule (mirror of server unitPriceFor).
function unitPrice(product, qty) {
  if (!product) return 0;
  if (product.type === 'program' || !product.tiers?.length) return product.price;
  const sorted = [...product.tiers].sort((a, b) => a.minQty - b.minQty);
  let price = sorted[0].price;
  for (const t of sorted) if (qty >= t.minQty) price = t.price;
  return price;
}
// Human label for the tier a quantity falls into.
function tierLabelFor(product, qty) {
  if (!product?.tiers?.length) return '';
  const sorted = [...product.tiers].sort((a, b) => a.minQty - b.minQty);
  let active = sorted[0];
  for (const t of sorted) if (qty >= t.minQty) active = t;
  const idx = sorted.indexOf(active);
  const next = sorted[idx + 1];
  return next ? `${active.minQty}-${next.minQty - 1} units` : `${active.minQty}+ units`;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', init);

async function init() {
  icons();
  initTheme();
  initNavbarScroll();
  initScrollReveal();
  updateCartUI();

  try {
    const [{ products }, cfg] = await Promise.all([apiGet('/products'), apiGet('/orders/config')]);
    state.products = products.filter((p) => p.type === 'item');
    state.programs = products.filter((p) => p.type === 'program');
    products.forEach((p) => (state.byId[p.id] = p));
    state.pricing = cfg;
    state.categories = ['All', ...Array.from(new Set(state.products.map((p) => p.category)))];
    document.getElementById('cartFreeThreshold').textContent = cfg.freeShippingThreshold;
    // Expose read-only data + pricing for the AI engine (ai.js).
    window.JTData = { products: state.products, programs: state.programs, pricing: state.pricing, unitPrice, byId: state.byId };
    document.dispatchEvent(new CustomEvent('jt:ready'));
  } catch (err) {
    showToast('Could not load catalog: ' + err.message, 'error');
  }

  renderFeatured();
  renderShopCategories();
  renderShop();
  renderPrograms();
  renderFaq();
  renderBlog();
  runCalc();
  updateCartUI();
  handleInitialRoute();
}

// ==================== NAVIGATION ====================
function showPage(pageName) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + pageName)?.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach((a) => a.classList.toggle('active', a.getAttribute('data-nav') === pageName));
  if (['home', 'shop', 'programs', 'audit', 'mockup', 'blog', 'contact'].includes(pageName)) history.replaceState(null, '', '#' + pageName);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.dispatchEvent(new CustomEvent('jt:page', { detail: { name: pageName } }));
  setTimeout(icons, 40);
}
// Default hero CTA action; ai.js reassigns this to a personalized destination.
function heroCtaAction() { showPage('shop'); }

// Robust entry point for the quote builder. Works even if ai.js is still loading
// or failed: falls back to the contact page instead of silently doing nothing.
function openInstantQuote() {
  if (window.JTAI && typeof JTAI.openQuote === 'function') JTAI.openQuote();
  else showPage('contact');
}
// Open the admin login in a new tab.
function openLogin() { window.open('/admin.html', '_blank', 'noopener'); }
function handleInitialRoute() {
  const hash = (location.hash || '').replace('#', '');
  if (['shop', 'programs', 'audit', 'mockup', 'blog', 'contact'].includes(hash)) showPage(hash);
}
function showShopCategory(category) {
  state.shopCategory = category;
  state.shopQuery = '';
  const s = document.getElementById('shopSearch'); if (s) s.value = '';
  renderShopCategories();
  renderShop();
  showPage('shop');
}
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('mobileMenuOverlay').classList.toggle('open');
}
function initNavbarScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50));
}

// ==================== THEME ====================
function initTheme() { const s = localStorage.getItem('jt-theme'); if (s) applyTheme(s); }
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-icon-light').forEach((el) => el.classList.toggle('hidden', theme === 'dark'));
  document.querySelectorAll('.theme-icon-dark').forEach((el) => el.classList.toggle('hidden', theme !== 'dark'));
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next); localStorage.setItem('jt-theme', next);
}

// ==================== PRODUCT RENDERING ====================
function starsMarkup(rating, size = 14) {
  let out = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    out += `<i data-lucide="star" style="width:${size}px;height:${size}px;${filled ? 'fill:#F59E0B;color:#F59E0B;' : 'color:var(--border);'}"></i>`;
  }
  return out;
}

function productCard(p) {
  const bestPrice = p.tiers?.length ? Math.min(...p.tiers.map((t) => t.price)) : p.price;
  return `
  <div class="product-card">
    <div class="product-image-wrap" onclick="showProductDetail(${p.id})">
      <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
      <div class="product-badges">
        ${p.badges.includes('bestseller') ? '<span class="badge badge-primary">Bestseller</span>' : ''}
        ${p.badges.includes('sale') ? '<span class="badge badge-accent">Best Value</span>' : ''}
        ${p.badges.includes('new') ? '<span class="badge badge-success">New</span>' : ''}
      </div>
      <div class="product-quick-view">
        <button class="btn btn-primary btn-sm btn-full" onclick="event.stopPropagation(); showProductDetail(${p.id})">Configure</button>
      </div>
    </div>
    <div class="product-info">
      <div class="product-category">${esc(p.category)}</div>
      <h3 class="product-name" onclick="showProductDetail(${p.id})">${esc(p.name)}</h3>
      <div class="product-meta">
        <div class="product-price">
          <span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">FROM</span>
          <span class="product-price-current">${money(bestPrice)}</span>
          <span style="font-size:12px;color:var(--text-muted);">/unit</span>
        </div>
        <div class="product-rating"><i data-lucide="star" style="width:14px;height:14px;fill:#F59E0B;color:#F59E0B;"></i> ${p.rating}</div>
      </div>
      <div class="min-note"><i data-lucide="layers" style="width:12px;height:12px;"></i> Volume pricing · min ${p.minOrder} units</div>
    </div>
  </div>`;
}

function programCard(p) {
  const featured = p.badges.includes('bestseller');
  return `
  <div class="program-card ${featured ? 'featured' : ''}">
    ${featured ? '<div class="program-flag">Most Picked</div>' : ''}
    <div class="program-tier">${esc(p.tierLabel || '')}</div>
    <h3 class="program-name">${esc(p.name)}</h3>
    <div class="program-price">${money0(p.price)}</div>
    <ul class="program-features">
      ${p.features.map((f) => `<li><i data-lucide="check" style="width:16px;height:16px;"></i> ${esc(f)}</li>`).join('')}
    </ul>
    <div class="program-focus">Focus · ${esc(p.focus || '')}</div>
    <button class="btn ${featured ? 'btn-primary' : 'btn-outline'} btn-full" onclick="addProgramToCart(${p.id})">
      <i data-lucide="shopping-bag" style="width:18px;height:18px;"></i> Add Program
    </button>
  </div>`;
}

function renderFeatured() {
  document.getElementById('featuredProducts').innerHTML = state.products.slice(0, 4).map(productCard).join('');
  icons();
}
function renderShopCategories() {
  document.getElementById('shopCategories').innerHTML = state.categories
    .map((c) => `<button class="btn ${c === state.shopCategory ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="setShopCategory('${esc(c)}')">${esc(c)}</button>`)
    .join('');
}
function setShopCategory(c) { state.shopCategory = c; renderShopCategories(); renderShop(); }
function onShopSearch(v) { state.shopQuery = v.trim().toLowerCase(); renderShop(); }

function renderShop() {
  const el = document.getElementById('shopProducts');
  const empty = document.getElementById('shopEmpty');
  let list = state.products;
  if (state.shopCategory !== 'All') list = list.filter((p) => p.category === state.shopCategory);
  if (state.shopQuery) list = list.filter((p) => p.name.toLowerCase().includes(state.shopQuery) || p.description.toLowerCase().includes(state.shopQuery));
  el.innerHTML = list.map(productCard).join('');
  empty.classList.toggle('hidden', list.length > 0);
  icons();
}
function renderPrograms() {
  document.getElementById('programsGrid').innerHTML = state.programs.map(programCard).join('');
  icons();
}

// ==================== CONFIGURATOR (PRODUCT DETAIL) ====================
function showProductDetail(id) {
  const p = state.byId[id];
  if (!p) return;
  state.currentProduct = p;
  state.selectedColor = p.colors[0] || null;
  state.selectedSize = p.sizes[0] || null;
  state.logoPosition = 'Left chest';
  state.logoName = '';
  state.qty = p.minOrder;

  document.getElementById('pdCategory').textContent = p.category;
  document.getElementById('pdTitle').textContent = p.name;
  document.getElementById('pdPrice').textContent = money(Math.min(...(p.tiers?.length ? p.tiers.map((t) => t.price) : [p.price])));
  document.getElementById('pdDescription').textContent = p.description;
  document.getElementById('pdReviewCount').textContent = `(${p.reviews} reviews)`;
  document.getElementById('pdMinNote').textContent = `· min ${p.minOrder}`;

  document.getElementById('pdMainImage').src = p.images[0] || p.image;
  document.getElementById('pdThumbs').innerHTML = (p.images.length ? p.images : [p.image])
    .map((img, i) => `<div class="product-gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setMainImage('${esc(img)}', this)"><img src="${esc(img)}" alt="View ${i + 1}"></div>`)
    .join('');

  document.getElementById('pdBadges').innerHTML = p.badges
    .map((b) => (b === 'bestseller' ? '<span class="badge badge-primary">Bestseller</span>' : b === 'sale' ? '<span class="badge badge-accent">Best Value</span>' : b === 'new' ? '<span class="badge badge-success">New</span>' : ''))
    .join('');

  document.getElementById('pdStars').innerHTML = starsMarkup(p.rating, 18);

  document.getElementById('pdColors').innerHTML = p.colors
    .map((c, i) => `<div class="color-option ${i === 0 ? 'active' : ''}" style="background:${esc(c.hex)};" title="${esc(c.name)}" onclick="selectColor(${i}, this)"></div>`)
    .join('');

  const sizeSection = document.getElementById('pdSizeSection');
  if (p.sizes.length <= 1) {
    sizeSection.style.display = p.sizes.length === 1 && p.sizes[0] === 'One Size' ? 'none' : '';
    state.selectedSize = p.sizes[0] || '';
  } else {
    sizeSection.style.display = '';
  }
  document.getElementById('pdSizes').innerHTML = p.sizes
    .map((s, i) => `<button class="size-option ${i === 0 ? 'active' : ''}" onclick="selectSize('${esc(s)}', this)">${esc(s)}</button>`)
    .join('');

  // Logo positions
  const positions = ['Left chest', 'Right chest', 'Center'];
  document.getElementById('pdLogoPositions').innerHTML = positions
    .map((pos) => `<button class="size-option ${pos === state.logoPosition ? 'active' : ''}" onclick="selectLogoPosition('${pos}', this)">${pos}</button>`)
    .join('');
  document.getElementById('pdLogoLabel').textContent = 'Drop logo here or click to upload';
  document.getElementById('pdLogoDrop').style.backgroundImage = '';
  document.getElementById('pdLogoFile').value = '';

  document.getElementById('pdSpecs').innerHTML = Object.entries(p.specs)
    .map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-muted);font-size:14px;">${esc(k)}</span><span style="font-weight:600;font-size:14px;">${esc(v)}</span></div>`)
    .join('');

  document.getElementById('pdQty').value = state.qty;
  document.getElementById('pdQty').min = p.minOrder;
  renderTierTable();
  renderQuote();
  updateStickyBar();
  document.dispatchEvent(new CustomEvent('jt:product', { detail: { id: p.id, category: p.category, name: p.name } }));

  showPage('product');
  setTimeout(() => { icons(); initStickyBar(); }, 60);
}

function setMainImage(src, el) {
  document.getElementById('pdMainImage').src = src;
  document.querySelectorAll('.product-gallery-thumb').forEach((t) => t.classList.remove('active'));
  el.classList.add('active');
}
function selectColor(i, el) {
  state.selectedColor = state.currentProduct.colors[i];
  document.querySelectorAll('#pdColors .color-option').forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
}
function selectSize(size, el) {
  state.selectedSize = size;
  document.querySelectorAll('#pdSizes .size-option').forEach((s) => s.classList.remove('active'));
  el.classList.add('active');
}
function selectLogoPosition(pos, el) {
  state.logoPosition = pos;
  document.querySelectorAll('#pdLogoPositions .size-option').forEach((s) => s.classList.remove('active'));
  el.classList.add('active');
}
function onLogoPick(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Logo must be under 5MB', 'error'); input.value = ''; return; }
  state.logoName = file.name;
  document.getElementById('pdLogoLabel').textContent = file.name;
  try {
    const url = URL.createObjectURL(file);
    const drop = document.getElementById('pdLogoDrop');
    drop.style.backgroundImage = `url(${url})`;
    drop.classList.add('has-logo');
  } catch {}
}

function changeQty(delta) {
  const min = state.currentProduct?.minOrder || 25;
  state.qty = Math.max(min, (parseInt(document.getElementById('pdQty').value, 10) || min) + delta);
  document.getElementById('pdQty').value = state.qty;
  renderTierTable(); renderQuote(); updateStickyBar();
}
function onQtyInput(v) {
  const min = state.currentProduct?.minOrder || 25;
  state.qty = Math.max(1, parseInt(v, 10) || 0);
  renderTierTable(); renderQuote(); updateStickyBar();
  document.getElementById('pdMinNote').style.color = state.qty < min ? '#EF4444' : '';
}

function renderTierTable() {
  const p = state.currentProduct;
  if (!p?.tiers?.length) { document.getElementById('pdTierTable').innerHTML = ''; return; }
  const sorted = [...p.tiers].sort((a, b) => a.minQty - b.minQty);
  const active = unitPrice(p, state.qty);
  document.getElementById('pdTierTable').innerHTML = sorted
    .map((t, i) => {
      const next = sorted[i + 1];
      const range = next ? `${t.minQty}-${next.minQty - 1}` : `${t.minQty}+`;
      const isActive = t.price === active && state.qty >= t.minQty;
      return `<div class="tier-cell ${isActive ? 'active' : ''}"><div class="tier-range">${range} units</div><div class="tier-price">${money(t.price)}</div></div>`;
    })
    .join('');
}

function renderQuote() {
  const p = state.currentProduct;
  if (!p) return;
  const min = p.minOrder;
  const unit = unitPrice(p, state.qty);
  const total = unit * state.qty;
  const belowMin = state.qty < min;
  const addBtn = document.getElementById('pdAddToCart');
  addBtn.disabled = belowMin;

  // Next-tier savings hint
  let hint = '';
  const sorted = [...(p.tiers || [])].sort((a, b) => a.minQty - b.minQty);
  const next = sorted.find((t) => t.minQty > state.qty);
  if (next && !belowMin) {
    const save = ((unit - next.price) / unit) * 100;
    if (save > 0) hint = `<div class="quote-hint"><i data-lucide="trending-down" style="width:14px;height:14px;"></i> Add ${next.minQty - state.qty} more to hit the ${next.minQty}+ tier at ${money(next.price)}/unit and save ${save.toFixed(0)}%.</div>`;
  }

  document.getElementById('pdQuote').innerHTML = `
    <div class="quote-row"><span>Quantity</span><span>${state.qty.toLocaleString()} units</span></div>
    <div class="quote-row"><span>Tier</span><span>${esc(tierLabelFor(p, state.qty))}</span></div>
    <div class="quote-row"><span>Unit price</span><span>${money(unit)}</span></div>
    <div class="quote-row total"><span>Estimated total</span><span>${belowMin ? '—' : money(total)}</span></div>
    ${belowMin ? `<div class="quote-hint error"><i data-lucide="alert-triangle" style="width:14px;height:14px;"></i> Minimum ${min} units per item.</div>` : hint}
    <div class="quote-sub">USD · before shipping & tax</div>`;
  icons();
}

function updateStickyBar() {
  const p = state.currentProduct;
  if (!p) return;
  document.getElementById('stickyImg').src = p.image;
  document.getElementById('stickyTitle').textContent = p.name;
  const unit = unitPrice(p, state.qty);
  document.getElementById('stickyPrice').textContent = state.qty >= p.minOrder ? money(unit * state.qty) : money(unit) + '/unit';
}
let stickyObserver = null;
function initStickyBar() {
  const sticky = document.getElementById('stickyAddCart');
  const target = document.getElementById('pdAddToCart');
  if (stickyObserver) stickyObserver.disconnect();
  stickyObserver = new IntersectionObserver((entries) => entries.forEach((e) => sticky.classList.toggle('visible', !e.isIntersecting)), { threshold: 0 });
  if (target) stickyObserver.observe(target);
}

// ==================== SIZE MODAL ====================
function openSizeModal() { document.getElementById('sizeModal').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeSizeModal(e) { if (e && e.target !== e.currentTarget) return; document.getElementById('sizeModal').classList.remove('open'); document.body.style.overflow = ''; }

// ==================== CART ====================
function toggleCart() {
  const open = document.getElementById('cartSidebar').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function addToCartFromPD() {
  const p = state.currentProduct;
  if (!p) return;
  if (state.qty < p.minOrder) return showToast(`Minimum ${p.minOrder} units for ${p.name}`, 'error');

  const logo = state.logoName ? `${state.logoName} · ${state.logoPosition}` : 'No logo';
  const item = {
    id: p.id, name: p.name, image: p.image, type: p.type, minOrder: p.minOrder,
    color: state.selectedColor?.name || '', size: state.selectedSize || '', logo, qty: state.qty
  };
  const existing = state.cart.find((c) => c.id === item.id && c.color === item.color && c.size === item.size && c.logo === item.logo);
  if (existing) existing.qty += item.qty;
  else state.cart.push(item);

  saveCart(); updateCartUI();
  document.dispatchEvent(new CustomEvent('jt:cart', { detail: { category: p.category, name: p.name } }));
  showToast(`${p.name} added to your order`);
  if (!document.getElementById('cartSidebar').classList.contains('open')) toggleCart();
}

function addProgramToCart(id) {
  const p = state.byId[id];
  if (!p) return;
  const item = { id: p.id, name: p.name, image: p.image, type: 'program', minOrder: 1, color: p.tierLabel || 'Program', size: '', logo: '', qty: 1 };
  const existing = state.cart.find((c) => c.id === item.id);
  if (existing) existing.qty += 1;
  else state.cart.push(item);
  saveCart(); updateCartUI();
  document.dispatchEvent(new CustomEvent('jt:cart', { detail: { category: 'Programs', name: p.name } }));
  showToast(`${p.name} program added`);
  if (!document.getElementById('cartSidebar').classList.contains('open')) toggleCart();
}

function updateCartQty(index, delta) {
  const item = state.cart[index];
  const p = state.byId[item.id];
  const step = p?.type === 'program' ? 1 : 25;
  const min = item.minOrder || (p?.type === 'program' ? 1 : 25);
  item.qty = Math.max(min, item.qty + delta * step);
  saveCart(); updateCartUI();
}
function removeFromCart(index) { state.cart.splice(index, 1); saveCart(); updateCartUI(); }

function lineUnitPrice(item) { return unitPrice(state.byId[item.id], item.qty); }

function cartTotals() {
  const subtotal = state.cart.reduce((s, i) => s + lineUnitPrice(i) * i.qty, 0);
  const { freeShippingThreshold, shippingFlatRate, taxRate } = state.pricing;
  const shipping = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const tax = subtotal * taxRate;
  const r = (n) => Math.round(n * 100) / 100;
  return { subtotal: r(subtotal), shipping: r(shipping), tax: r(tax), total: r(subtotal + shipping + tax) };
}

function updateCartUI() {
  const count = state.cart.reduce((s, i) => s + (i.type === 'program' ? 1 : 1), 0); // lines, not units
  const t = cartTotals();

  const countEl = document.getElementById('cartCount');
  countEl.textContent = count;
  countEl.classList.toggle('hidden', count === 0);
  document.getElementById('cartSidebarCount').textContent = count;

  const items = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');

  if (state.cart.length === 0) {
    items.innerHTML = `
      <div class="cart-empty">
        <i data-lucide="shopping-bag" style="width:64px;height:64px;"></i>
        <p style="margin-top:16px;font-size:16px;">Your order is empty</p>
        <p style="font-size:14px;margin-top:4px;">Configure a uniform or add a program</p>
        <button class="btn btn-primary" style="margin-top:20px;" onclick="toggleCart(); showPage('shop');">Browse Catalog</button>
      </div>`;
    footer.style.display = 'none';
  } else {
    items.innerHTML = state.cart
      .map((item, i) => {
        const unit = lineUnitPrice(item);
        const variant = item.type === 'program'
          ? esc(item.color)
          : `${esc(item.color)}${item.size ? ' / ' + esc(item.size) : ''} · ${esc(item.logo)}`;
        return `
        <div class="cart-item">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" class="cart-item-img">
          <div class="cart-item-info">
            <div class="cart-item-name">${esc(item.name)}</div>
            <div class="cart-item-variant">${variant}</div>
            <div class="cart-item-variant" style="color:var(--text-secondary);">${money(unit)}${item.type === 'program' ? '' : '/unit'}</div>
            <div class="cart-item-qty">
              <button onclick="updateCartQty(${i}, -1)">-</button>
              <span style="font-weight:600;">${item.qty.toLocaleString()}${item.type === 'program' ? '' : ' units'}</span>
              <button onclick="updateCartQty(${i}, 1)">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="cart-item-price">${money(unit * item.qty)}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${i})"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
          </div>
        </div>`;
      })
      .join('');
    footer.style.display = 'block';
  }

  document.getElementById('cartSubtotal').textContent = money(t.subtotal);
  document.getElementById('cartShipping').textContent = t.subtotal === 0 ? 'Calculated at checkout' : t.shipping === 0 ? 'FREE' : money(t.shipping);
  document.getElementById('cartTotal').textContent = money(t.total);
  icons();
}

// ==================== CHECKOUT ====================
function goToCheckout() {
  if (state.cart.length === 0) return showToast('Your order is empty', 'error');
  renderCheckout();
  toggleCart();
  showPage('checkout');
}
function renderCheckout() {
  const t = cartTotals();
  document.getElementById('checkoutItems').innerHTML = state.cart
    .map((item) => {
      const unit = lineUnitPrice(item);
      const variant = item.type === 'program' ? esc(item.color) : `${esc(item.color)}${item.size ? ' / ' + esc(item.size) : ''}`;
      return `
      <div class="checkout-summary-item">
        <img src="${esc(item.image)}" alt="${esc(item.name)}">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;">${esc(item.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);">${variant} · ${item.qty.toLocaleString()}${item.type === 'program' ? '' : ' units'} @ ${money(unit)}</div>
        </div>
        <div style="font-weight:700;font-size:14px;">${money(unit * item.qty)}</div>
      </div>`;
    })
    .join('');
  document.getElementById('coSubtotal').textContent = money(t.subtotal);
  document.getElementById('coShipping').textContent = t.shipping === 0 ? 'FREE' : money(t.shipping);
  document.getElementById('coTax').textContent = money(t.tax);
  document.getElementById('coTotal').textContent = money(t.total);
  icons();
}

async function placeOrder() {
  const customer = {
    firstName: document.getElementById('coFirstName').value.trim(),
    lastName: document.getElementById('coLastName').value.trim(),
    email: document.getElementById('coEmail').value.trim(),
    phone: document.getElementById('coPhone').value.trim(),
    company: document.getElementById('coCompany').value.trim(),
    address: document.getElementById('coAddress').value.trim(),
    city: document.getElementById('coCity').value.trim(),
    zip: document.getElementById('coZip').value.trim(),
    country: document.getElementById('coCountry').value.trim()
  };
  if (!customer.firstName || !customer.lastName || !customer.email) return showToast('Please fill in your name and email', 'error');
  if (state.cart.length === 0) return showToast('Your order is empty', 'error');

  const btn = document.getElementById('coPlaceOrder');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing...';
  try {
    const payload = { customer, items: state.cart.map((i) => ({ productId: i.id, color: i.color, size: i.size, logo: i.logo, qty: i.qty })) };
    const { order } = await apiPost('/orders', payload);
    state.cart = []; saveCart(); updateCartUI();
    renderConfirmation(order);
    showPage('confirm');
    showToast('Order placed successfully');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i data-lucide="lock" style="width:18px;height:18px;"></i> Place Order'; icons();
  }
}

function renderConfirmation(order) {
  document.getElementById('confirmBox').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
      <div><div style="font-size:13px;color:var(--text-muted);">Order number</div><div class="confirm-order-num">${esc(order.orderNumber)}</div></div>
      <span class="badge badge-success">Confirmed</span>
    </div>
    ${order.items.map((i) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;">
      <span>${esc(i.name)} <span style="color:var(--text-muted);">(${esc(i.color)}${i.size ? '/' + esc(i.size) : ''}) · ${i.qty.toLocaleString()} @ ${money(i.unitPrice)}</span></span>
      <span style="font-weight:600;">${money(i.unitPrice * i.qty)}</span></div>`).join('')}
    <div style="display:flex;justify-content:space-between;margin-top:14px;color:var(--text-secondary);"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;color:var(--text-secondary);"><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : money(order.shipping)}</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;color:var(--text-secondary);"><span>Tax</span><span>${money(order.tax)}</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-weight:800;font-size:18px;"><span>Total</span><span>${money(order.total)}</span></div>`;
  icons();
}

// ==================== CONTACT ====================
async function submitContact() {
  const payload = {
    firstName: document.getElementById('ctFirstName').value.trim(),
    lastName: document.getElementById('ctLastName').value.trim(),
    email: document.getElementById('ctEmail').value.trim(),
    company: document.getElementById('ctCompany').value.trim(),
    inquiry: document.getElementById('ctInquiry').value,
    message: document.getElementById('ctMessage').value.trim()
  };
  if (!payload.email || !payload.message) return showToast('Please enter your email and details', 'error');
  const btn = document.getElementById('ctSubmit');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending...';
  try {
    const res = await apiPost('/contact', payload);
    showToast(res.message || 'Request sent');
    ['ctFirstName', 'ctLastName', 'ctEmail', 'ctCompany', 'ctMessage'].forEach((id) => (document.getElementById(id).value = ''));
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i data-lucide="send" style="width:18px;height:18px;"></i> Send Request'; icons();
  }
}

// ==================== FREE AUDIT ====================
// Live savings estimate. JT spend modelled at ~52.5% of current field-service SMB spend.
function runCalc() {
  const emp = Math.max(0, parseFloat(document.getElementById('calcEmployees')?.value) || 0);
  const per = Math.max(0, parseFloat(document.getElementById('calcPerYear')?.value) || 0);
  const cost = Math.max(0, parseFloat(document.getElementById('calcCost')?.value) || 0);
  const current = emp * per * cost;
  const jt = Math.round(current * 0.525);
  const savings = Math.max(0, current - jt);
  const f = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('calcCurrent', f(current));
  setText('calcJt', f(jt));
  setText('calcSavings', f(savings));
}

async function submitAudit() {
  const first = document.getElementById('auFirst').value.trim();
  const email = document.getElementById('auEmail').value.trim();
  if (!first || !email) return showToast('Please enter your name and work email', 'error');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email', 'error');

  const g = (id) => document.getElementById(id).value.trim();
  const details = [
    `Team size: ${g('auTeam') || 'n/a'}`,
    `Industry: ${g('auIndustry') || 'n/a'}`,
    `Order frequency: ${g('auFreq') || 'n/a'}`,
    `Units in last order: ${g('auUnits') || 'n/a'}`,
    `Phone: ${g('auPhone') || 'n/a'}`
  ].join(' · ');

  const btn = document.getElementById('auSubmit');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Booking...';
  try {
    await apiPost('/contact', {
      firstName: first, lastName: g('auLast'), email, company: g('auCompany'),
      inquiry: 'Free Audit', message: `Free audit request. ${details}`
    });
    showToast('Audit request received. We reply within 24 business hours.');
    ['auFirst', 'auLast', 'auEmail', 'auPhone', 'auCompany', 'auUnits'].forEach((id) => (document.getElementById(id).value = ''));
    ['auTeam', 'auIndustry', 'auFreq'].forEach((id) => (document.getElementById(id).selectedIndex = 0));
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i data-lucide="send" style="width:18px;height:18px;"></i> Book My Free Audit'; icons();
  }
}

const FAQS = [
  { q: 'Is the audit really free?', a: 'Yes. The 15-minute call and the one-page savings report cost nothing and carry no obligation. We only ask for the data needed to run accurate numbers.' },
  { q: 'How long does the audit take?', a: 'The intake form takes under 90 seconds. The call is 15 minutes. You get your custom report shortly after.' },
  { q: "What if I'm under contract with my current vendor?", a: 'That is common, and worth knowing about. We map your exit timing and show what switching would save once your term ends, so you are ready when it does.' },
  { q: 'Will you try to sell me on the call?', a: 'No pitch. The call walks through your numbers and the gaps. If JT Shirts is a fit you will see it in the math; if not, you keep the report either way.' },
  { q: 'What if I have fewer than 10 employees?', a: 'The audit still applies. Our First Run Mini Pack starts at 25 units with no contract, so small teams switch easily.' }
];
function renderFaq() {
  const el = document.getElementById('faqList');
  if (!el) return;
  el.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-q" onclick="toggleFaq(${i})"><span>${esc(f.q)}</span><i data-lucide="plus" style="width:20px;height:20px;"></i></button>
      <div class="faq-a"><p>${esc(f.a)}</p></div>
    </div>`).join('');
  icons();
}
function toggleFaq(i) {
  document.getElementById('faq-' + i).classList.toggle('open');
}

// ==================== FREE MOCKUP ====================
function onMockupLogo(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast('Logo must be under 10MB', 'error'); input.value = ''; return; }
  const url = URL.createObjectURL(file);
  ['mkPoloLogo', 'mkCapLogo'].forEach((id) => {
    const el = document.getElementById(id);
    el.style.backgroundImage = `url(${url})`;
    el.classList.add('placed');
  });
  const drop = document.getElementById('mkDrop');
  drop.querySelector('span').textContent = file.name;
  showToast('Preview generated. Book an audit to get it in HD.');
}

// ==================== BLOG ====================
const POSTS = [
  { cat: 'Industry Data', title: 'The State of the US Workwear Market in 2026', read: '6 min', excerpt: 'US workwear market hit $26.7B in 2025. 5 companies control 41% of supply. What every service business should know before their next uniform contract.' },
  { cat: 'Buyer Guide', title: 'The Fabric-to-Trade Match Guide', read: '7 min', excerpt: 'Different trades need different uniform fabrics. Complete spec guide for HVAC, plumbing, landscape, cleaning, and office staff with industry standards cited.' },
  { cat: 'Brand & Trust', title: 'The 7-Second Test', read: '5 min', excerpt: '75% of customers judge service businesses by uniforms in 7 seconds. J.D. Power data, HALO research, and what it means for HVAC, plumbing, and cleaning.' },
  { cat: 'Compliance', title: "OSHA's New Heat Rule and Your Uniform Program", read: '6 min', excerpt: "OSHA's August 2024 heat rule made uniform fabric a federal compliance variable. What HVAC, landscape, and roofing companies need to do now." },
  { cat: 'How-To', title: 'How to Audit Your Uniform Costs in 4 Minutes', read: '5 min', excerpt: 'Most businesses underestimate uniform cost by 30 to 50%. A free calculator gives a personalized 5-year comparison in 4 minutes.' },
  { cat: 'Comparison', title: 'Cintas Alternatives in 2026', read: '9 min', excerpt: 'Looking for Cintas alternatives? Compare 7 better options for service businesses in 2026, from UniFirst to ownership-based programs.' },
  { cat: 'Cost Analysis', title: 'Buy vs Rent Work Uniforms', read: '8 min', excerpt: 'Should you buy or rent work uniforms? A complete 5-year cost comparison with hidden fees, replacement cycles, and real math.' },
  { cat: 'Industry', title: 'HVAC Uniforms Complete Guide', read: '9 min', excerpt: 'Complete HVAC uniforms guide: fabric specs, FR compliance, hi-vis requirements, branding, fit, and cost.' },
  { cat: 'Branding', title: 'Custom Work Uniforms with Logo', read: '8 min', excerpt: 'Custom work uniforms with your logo build customer trust and brand visibility. A complete guide to fabric, branding methods, and cost.' },
  { cat: 'Quality', title: 'How Long Should Work Uniforms Last', read: '8 min', excerpt: 'Quality work uniforms should survive 50 to 80 industrial wash cycles. Here is the durability test every owner should run.' }
];
function renderBlog() {
  const el = document.getElementById('blogGrid');
  if (!el) return;
  el.innerHTML = POSTS.map((p) => `
    <article class="blog-card" onclick="showPage('audit')">
      <div class="blog-cat">${esc(p.cat)}</div>
      <h3 class="blog-title">${esc(p.title)}</h3>
      <p class="blog-excerpt">${esc(p.excerpt)}</p>
      <div class="blog-meta"><span><i data-lucide="clock" style="width:14px;height:14px;"></i> ${esc(p.read)} read</span><span class="blog-read">Read <i data-lucide="arrow-right" style="width:14px;height:14px;"></i></span></div>
    </article>`).join('');
  icons();
}

// ==================== TOAST ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  toast.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" style="width:20px;height:20px;"></i><span>${esc(message)}</span>`;
  container.appendChild(toast);
  icons();
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==================== SCROLL REVEAL ====================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

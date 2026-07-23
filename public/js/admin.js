// ==================== JT Shirts admin ====================
const API = '/api';
let token = localStorage.getItem('jt-admin-token') || '';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Number(n).toFixed(2);
function icons() { if (window.lucide) lucide.createIcons(); }

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { doLogout(); throw new Error('Session expired. Please sign in again.'); }
  if (!res.ok) throw new Error(data?.error?.message || 'Request failed');
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  icons();
  if (token) showDashboard();
});

// ---------- auth ----------
async function doLogin() {
  const password = document.getElementById('adminPassword').value;
  if (!password) return toast('Enter the password', 'error');
  try {
    const { token: t } = await api('/auth/login', { method: 'POST', body: { password } });
    token = t;
    localStorage.setItem('jt-admin-token', t);
    showDashboard();
    toast('Welcome back');
  } catch (err) {
    toast(err.message, 'error');
  }
}
function doLogout() {
  token = '';
  localStorage.removeItem('jt-admin-token');
  document.getElementById('dashView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
}

async function showDashboard() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('dashView').classList.remove('hidden');
  await Promise.all([loadStats(), loadProducts(), loadOrders(), loadMessages()]);
  icons();
}

// ---------- tabs ----------
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.admin-tabs .btn').forEach((b) => {
    const active = b.getAttribute('data-tab') === name;
    b.classList.toggle('btn-primary', active);
    b.classList.toggle('btn-outline', !active);
  });
}

// ---------- stats ----------
async function loadStats() {
  try {
    const s = await api('/admin/stats');
    document.getElementById('statGrid').innerHTML = `
      <div class="admin-stat"><div class="admin-stat-label">Revenue</div><div class="admin-stat-value" style="color:var(--primary);">${money(s.revenue)}</div></div>
      <div class="admin-stat"><div class="admin-stat-label">Orders</div><div class="admin-stat-value">${s.orders}</div></div>
      <div class="admin-stat"><div class="admin-stat-label">Catalog / Programs</div><div class="admin-stat-value">${s.products} / ${s.programs ?? 0}</div></div>
      <div class="admin-stat"><div class="admin-stat-label">Unread Messages</div><div class="admin-stat-value">${s.unreadMessages}</div></div>`;
  } catch (err) { toast(err.message, 'error'); }
}

// ---------- products ----------
async function loadProducts() {
  const { products } = await api('/admin/products');
  document.getElementById('productsBody').innerHTML = products
    .map((p) => {
      const pricing = p.type === 'program'
        ? money(p.price) + ' flat'
        : (p.tiers || []).map((t) => money(t.price)).join(' / ');
      return `
    <tr style="${p.active ? '' : 'opacity:0.45;'}">
      <td><div style="display:flex;align-items:center;gap:10px;"><img src="${esc(p.image)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;"><span style="font-weight:600;">${esc(p.name)}</span></div></td>
      <td><span class="status-pill ${p.type === 'program' ? 'status-shipped' : 'status-delivered'}">${p.type}</span></td>
      <td>${esc(p.category)}</td>
      <td style="font-size:13px;">${pricing}</td>
      <td>${p.minOrder}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-outline btn-sm" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
        ${p.active ? `<button class="btn btn-ghost btn-sm" style="color:#EF4444;" onclick="deleteProduct(${p.id})"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>` : '<span style="font-size:12px;color:var(--text-muted);">deleted</span>'}
      </td>
    </tr>`;
    })
    .join('');
  icons();
}

const $ = (id) => document.getElementById(id);
function onTypeChange() {
  const isProgram = $('pfType').value === 'program';
  $('pfItemFields').style.display = isProgram ? 'none' : '';
  $('pfProgramFields').style.display = isProgram ? '' : 'none';
}

function openProductForm() {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  ['pfId', 'pfName', 'pfImage', 'pfSizes', 'pfColors', 'pfBadges', 'pfDescription', 'pfP25', 'pfP50', 'pfP100', 'pfFlatPrice', 'pfTierLabel', 'pfFeatures', 'pfFocus'].forEach((id) => ($(id).value = ''));
  $('pfType').value = 'item';
  $('pfCategory').value = 'Polos';
  onTypeChange();
  document.getElementById('productModal').classList.add('open');
}
function closeProductForm() { document.getElementById('productModal').classList.remove('open'); }

function editProduct(p) {
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  $('pfId').value = p.id;
  $('pfType').value = p.type || 'item';
  $('pfName').value = p.name;
  $('pfCategory').value = p.category;
  $('pfImage').value = p.image;
  $('pfBadges').value = (p.badges || []).join(', ');
  $('pfDescription').value = p.description || '';
  // item fields
  $('pfSizes').value = (p.sizes || []).join(', ');
  $('pfColors').value = (p.colors || []).map((c) => `${c.name}:${c.hex}`).join(', ');
  const t = p.tiers || [];
  $('pfP25').value = t.find((x) => x.minQty === 25)?.price ?? '';
  $('pfP50').value = t.find((x) => x.minQty === 50)?.price ?? '';
  $('pfP100').value = t.find((x) => x.minQty === 100)?.price ?? '';
  // program fields
  $('pfFlatPrice').value = p.type === 'program' ? p.price : '';
  $('pfTierLabel').value = p.tierLabel || '';
  $('pfFeatures').value = (p.features || []).join(', ');
  $('pfFocus').value = p.focus || '';
  onTypeChange();
  document.getElementById('productModal').classList.add('open');
}

function parseColors(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [name, hex] = pair.split(':').map((x) => (x || '').trim());
      return { name: name || 'Color', hex: hex || '#374151' };
    });
}
function parseList(raw) { return raw.split(',').map((s) => s.trim()).filter(Boolean); }

async function saveProduct() {
  const id = $('pfId').value;
  const image = $('pfImage').value.trim();
  const type = $('pfType').value;
  const body = {
    type,
    name: $('pfName').value.trim(),
    category: $('pfCategory').value.trim() || (type === 'program' ? 'Programs' : 'Polos'),
    image,
    images: image ? [image] : [],
    badges: parseList($('pfBadges').value),
    description: $('pfDescription').value.trim()
  };

  if (type === 'program') {
    body.price = parseFloat($('pfFlatPrice').value);
    body.minOrder = 1;
    body.tierLabel = $('pfTierLabel').value.trim();
    body.features = parseList($('pfFeatures').value);
    body.focus = $('pfFocus').value.trim();
    if (!body.name || !Number.isFinite(body.price)) return toast('Name and a valid flat price are required', 'error');
  } else {
    const tiers = [
      { minQty: 25, price: parseFloat($('pfP25').value) },
      { minQty: 50, price: parseFloat($('pfP50').value) },
      { minQty: 100, price: parseFloat($('pfP100').value) }
    ].filter((t) => Number.isFinite(t.price));
    body.tiers = tiers;
    body.minOrder = 25;
    body.sizes = parseList($('pfSizes').value);
    body.colors = parseColors($('pfColors').value);
    if (!body.name || tiers.length === 0) return toast('Name and at least one tier price are required', 'error');
  }

  try {
    if (id) await api('/admin/products/' + id, { method: 'PUT', body });
    else await api('/admin/products', { method: 'POST', body });
    closeProductForm();
    toast('Product saved');
    await Promise.all([loadProducts(), loadStats()]);
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Remove this product from the store? Past orders keep their record.')) return;
  try {
    await api('/admin/products/' + id, { method: 'DELETE' });
    toast('Product removed');
    await Promise.all([loadProducts(), loadStats()]);
  } catch (err) { toast(err.message, 'error'); }
}

// ---------- orders ----------
const STATUSES = ['paid', 'processing', 'shipped', 'delivered', 'cancelled'];
async function loadOrders() {
  const { orders } = await api('/admin/orders');
  const body = document.getElementById('ordersBody');
  if (!orders.length) { body.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted);padding:24px;">No orders yet.</td></tr>'; return; }
  body.innerHTML = orders
    .map((o) => {
      const items = o.items.map((i) => `${esc(i.name)} (${esc(i.color)}/${esc(i.size)}) &times;${i.qty}`).join('<br>');
      const options = STATUSES.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('');
      return `<tr>
        <td><span style="font-family:var(--font-mono);font-size:12px;">${esc(o.orderNumber)}</span></td>
        <td>${esc(o.firstName)} ${esc(o.lastName)}<br><span style="font-size:12px;color:var(--text-muted);">${esc(o.email)}</span></td>
        <td style="font-size:12px;">${items}</td>
        <td style="font-weight:700;">${money(o.total)}</td>
        <td><span class="status-pill status-${o.status}">${o.status}</span><br>
          <select class="form-select" style="padding:4px 8px;font-size:12px;margin-top:6px;" onchange="updateOrderStatus(${o.id}, this.value)">${options}</select></td>
        <td style="font-size:12px;color:var(--text-muted);white-space:nowrap;">${esc((o.createdAt || '').replace('T', ' ').slice(0, 16))}</td>
      </tr>`;
    })
    .join('');
  icons();
}
async function updateOrderStatus(id, status) {
  try { await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }); toast('Status updated'); await loadOrders(); }
  catch (err) { toast(err.message, 'error'); }
}

// ---------- messages ----------
async function loadMessages() {
  const { messages } = await api('/admin/messages');
  const body = document.getElementById('messagesBody');
  if (!messages.length) { body.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);padding:24px;">No messages yet.</td></tr>'; return; }
  body.innerHTML = messages
    .map(
      (m) => `<tr style="${m.handled ? 'opacity:0.5;' : ''}">
        <td>${esc(m.firstName)} ${esc(m.lastName)}<br><span style="font-size:12px;color:var(--text-muted);">${esc(m.email)}</span>${m.company ? `<br><span style="font-size:12px;">${esc(m.company)}</span>` : ''}</td>
        <td>${esc(m.inquiry)}</td>
        <td style="max-width:360px;font-size:13px;">${esc(m.message)}</td>
        <td style="font-size:12px;color:var(--text-muted);white-space:nowrap;">${esc((m.createdAt || '').replace('T', ' ').slice(0, 16))}</td>
        <td>${m.handled ? '<span style="font-size:12px;color:var(--success);">done</span>' : `<button class="btn btn-outline btn-sm" onclick="markHandled(${m.id})">Mark done</button>`}</td>
      </tr>`
    )
    .join('');
}
async function markHandled(id) {
  try { await api(`/admin/messages/${id}/handled`, { method: 'PATCH' }); await Promise.all([loadMessages(), loadStats()]); }
  catch (err) { toast(err.message, 'error'); }
}

// ---------- toast ----------
function toast(message, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" style="width:20px;height:20px;"></i><span>${esc(message)}</span>`;
  c.appendChild(t);
  icons();
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2800);
}

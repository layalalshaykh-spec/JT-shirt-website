// ==================== JT Shirts AI + Conversion layer ====================
// A privacy-conscious, fully explainable behavioural engine. Everything runs in
// the visitor's browser. No cookies are shipped, no data leaves the device, and
// every score is derived from transparent, business-configurable rules.
//
// It powers: visitor intelligence, lead scoring, a proactive conversion assistant,
// personalized CTAs, an adaptive recommendation strip, exit-intent capture, a
// smart quote builder, and a live "AI Insights" panel for demos.

(function () {
  'use strict';

  // ---- Business-configurable weights (this is the "AI", made explicit) ----
  const WEIGHTS = {
    scrollDepth: 15,       // scaled by depth %
    timeOnSite: 15,        // scaled, caps ~2 min
    productView: 8,        // each, capped
    productViewCap: 24,
    categoryFocus: 10,     // a clear favourite emerged
    pricingInterest: 12,   // viewed programs / pricing
    quoteOpened: 15,
    ctaClick: 8,
    ctaClickCap: 16,
    cartAdd: 25,
    contactView: 12,
    returnVisit: 15
  };
  const TIERS = { high: 65, medium: 35 };

  const CATEGORY_COPY = {
    Polos: 'Looking at custom polos? I can help you weigh embroidery vs. print and estimate your volume price.',
    'Work Shirts': 'Work shirts are our most durable line. Want a quick quote for your crew size?',
    'T-Shirts': 'Custom tees are the fastest way to brand a whole crew. Want to see volume pricing?',
    Jackets: 'Jackets carry your brand year-round. I can estimate an embroidered run for your team.',
    Caps: 'Caps are the lowest-cost brand carrier. Want to bundle them with a polo order for a better price?',
    Programs: 'Comparing programs? I can build you an instant quote in about 30 seconds.'
  };
  const CROSS_SELL = {
    Polos: ['Caps', 'Jackets', 'Programs'],
    'Work Shirts': ['Jackets', 'Caps', 'T-Shirts'],
    'T-Shirts': ['Caps', 'Polos', 'Programs'],
    Jackets: ['Work Shirts', 'Caps', 'Polos'],
    Caps: ['Polos', 'T-Shirts', 'Jackets']
  };
  const METHODS = [
    { key: 'Embroidery', add: 2.0, sub: 'Premium, durable, best for polos & jackets' },
    { key: 'Screen print', add: 1.0, sub: 'Cost-effective for large runs' },
    { key: 'Heat transfer', add: 0.5, sub: 'Great for detailed, full-colour art' },
    { key: 'No branding', add: 0.0, sub: 'Blank stock' }
  ];

  // ---- State ----
  const persisted = loadPersisted();
  const S = {
    startedAt: Date.now(),
    lastActivity: Date.now(),
    scrollDepth: 0,
    mouseDistance: 0,
    hovers: 0,
    ctaClicks: 0,
    productViews: 0,
    categoryTime: {},      // seconds accumulated per category (via product views proxy)
    categoryViews: {},
    pricingViews: 0,
    contactViews: 0,
    quoteOpened: false,
    cartAdds: 0,
    pagesVisited: new Set(),
    device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    visits: persisted.visits + 1,
    returning: persisted.visits > 0,
    shown: {},             // one-shot nudge flags
    lastNudgeAt: 0,
    score: 0,
    tier: 'Low',
    reasons: [],
    interest: null
  };
  savePersisted({ visits: S.visits, firstSeen: persisted.firstSeen || Date.now() });

  let JTD = window.JTData || null;
  document.addEventListener('jt:ready', () => { JTD = window.JTData; renderReco(); recompute(); });

  // ---- Persistence (privacy-friendly: a single localStorage counter) ----
  function loadPersisted() { try { return JSON.parse(localStorage.getItem('jt-ai') || '{}').visits != null ? JSON.parse(localStorage.getItem('jt-ai')) : { visits: 0 }; } catch { return { visits: 0 }; } }
  function savePersisted(o) { try { localStorage.setItem('jt-ai', JSON.stringify(o)); } catch {} }

  // ---- Scoring (transparent + explainable) ----
  function recompute() {
    const secs = (Date.now() - S.startedAt) / 1000;
    const reasons = [];
    let score = 0;
    const add = (label, pts) => { if (pts > 0) { score += pts; reasons.push({ label, pts: Math.round(pts) }); } };

    add('Scroll depth', WEIGHTS.scrollDepth * Math.min(1, S.scrollDepth / 100));
    add('Time on site', WEIGHTS.timeOnSite * Math.min(1, secs / 120));
    add('Products viewed', Math.min(WEIGHTS.productViewCap, S.productViews * WEIGHTS.productView));
    if (topCategory()) add('Clear product interest', WEIGHTS.categoryFocus);
    if (S.pricingViews > 0) add('Viewed pricing / programs', WEIGHTS.pricingInterest);
    if (S.quoteOpened) add('Opened the quote builder', WEIGHTS.quoteOpened);
    add('CTA engagement', Math.min(WEIGHTS.ctaClickCap, S.ctaClicks * WEIGHTS.ctaClick));
    if (S.cartAdds > 0) add('Added to order', WEIGHTS.cartAdd);
    if (S.contactViews > 0) add('Viewed contact / audit', WEIGHTS.contactView);
    if (S.returning) add('Returning visitor', WEIGHTS.returnVisit);

    S.score = Math.max(0, Math.min(100, Math.round(score)));
    S.tier = S.score >= TIERS.high ? 'High' : S.score >= TIERS.medium ? 'Medium' : 'Low';
    S.reasons = reasons.sort((a, b) => b.pts - a.pts);
    S.interest = topCategory();

    personalize();
    if (insightsOpen) renderInsights();
    return S;
  }

  function topCategory() {
    const entries = Object.entries(S.categoryViews);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][1] >= 1 ? entries[0][0] : null;
  }

  // ---- Behaviour listeners ----
  function activity() { S.lastActivity = Date.now(); }

  window.addEventListener('scroll', throttle(() => {
    const h = document.documentElement;
    const depth = ((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100;
    S.scrollDepth = Math.max(S.scrollDepth, Math.min(100, depth));
    activity();
    recompute();
  }, 400), { passive: true });

  let lastX = null, lastY = null;
  window.addEventListener('mousemove', throttle((e) => {
    if (lastX != null) S.mouseDistance += Math.hypot(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
    activity();
    // hero cursor light
    const hero = document.getElementById('heroSection');
    const light = document.getElementById('heroLight');
    if (hero && light) {
      const r = hero.getBoundingClientRect();
      if (e.clientY > r.top && e.clientY < r.bottom) {
        light.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        light.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      }
    }
  }, 60), { passive: true });

  document.addEventListener('click', (e) => {
    activity();
    if (e.target.closest('.btn')) { S.ctaClicks++; recompute(); }
  });
  document.addEventListener('mouseover', (e) => { if (e.target.closest('.btn, .product-card, .program-card')) S.hovers++; });

  // Exit intent (desktop)
  document.addEventListener('mouseout', (e) => {
    if (e.clientY <= 0 && !e.relatedTarget && S.device === 'desktop') triggerExit();
  });
  // Exit intent (mobile: fast scroll up near top)
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    if (S.device === 'mobile' && window.scrollY < 300 && lastScroll - window.scrollY > 40) triggerExit();
    lastScroll = window.scrollY;
  }, { passive: true });

  // Idle / hesitation
  setInterval(() => {
    const idle = (Date.now() - S.lastActivity) / 1000;
    if (idle > 22 && !S.shown.hesitation && S.pagesVisited.size >= 1 && S.score >= 12) {
      S.shown.hesitation = true;
      showNudge({
        text: 'Can I help you find the right workwear for your crew? Happy to point you to the fastest option.',
        why: 'You paused for a moment here.',
        actions: [{ label: 'Yes, help me', primary: true, run: openAssistant }, { label: 'Just browsing', run: hideNudge }]
      });
    }
  }, 4000);

  // Track time on the active section a bit (proxy via score tick)
  setInterval(recompute, 5000);

  // ---- App events ----
  document.addEventListener('jt:page', (e) => {
    const name = e.detail?.name;
    S.pagesVisited.add(name);
    if (name === 'programs') { S.pricingViews++; maybePricingNudge(); }
    if (name === 'contact' || name === 'audit') S.contactViews++;
    activity(); recompute();
  });
  document.addEventListener('jt:product', (e) => {
    const cat = e.detail?.category;
    S.productViews++;
    if (cat) { S.categoryViews[cat] = (S.categoryViews[cat] || 0) + 1; maybeCategoryNudge(cat); }
    activity(); recompute(); renderReco();
  });
  document.addEventListener('jt:cart', () => { S.cartAdds++; activity(); recompute(); maybeHighIntentNudge(); });

  // ---- Nudges ----
  function canNudge() { return Date.now() - S.lastNudgeAt > 20000 && !document.querySelector('.ai-nudge.show'); }
  function maybeCategoryNudge(cat) {
    if (!canNudge() || S.shown['cat_' + cat] || (S.categoryViews[cat] || 0) < 2) return;
    S.shown['cat_' + cat] = true;
    setTimeout(() => showNudge({
      text: CATEGORY_COPY[cat] || CATEGORY_COPY.Polos,
      why: `You looked at ${cat} more than once.`,
      actions: [{ label: 'Build a quote', primary: true, run: () => openQuote(cat) }, { label: 'No thanks', run: hideNudge }]
    }), 1200);
  }
  function maybePricingNudge() {
    if (!canNudge() || S.shown.pricing || S.pricingViews < 1) return;
    S.shown.pricing = true;
    setTimeout(() => showNudge({
      text: 'Comparing programs? I can build you an instant quote in about 30 seconds, no email needed.',
      why: 'You are looking at pricing.',
      actions: [{ label: 'Get instant quote', primary: true, run: () => openQuote() }, { label: 'Later', run: hideNudge }]
    }), 900);
  }
  function maybeHighIntentNudge() {
    if (!canNudge() || S.shown.highIntent) return;
    S.shown.highIntent = true;
    showNudge({
      text: 'You are close. Want me to connect you with a printing expert to lock in specs and timing?',
      why: 'Strong buying signals detected.',
      actions: [{ label: 'Talk to an expert', primary: true, run: () => go('contact') }, { label: 'Keep browsing', run: hideNudge }]
    });
  }
  function triggerExit() {
    if (!canNudge() || S.shown.exit) return;
    S.shown.exit = true;
    showNudge({
      text: 'Before you go, want a free 15-minute uniform cost audit? We show where you are overpaying. No commitment.',
      why: 'You looked ready to leave.',
      actions: [{ label: 'Get my free audit', primary: true, run: () => go('audit') }, { label: 'No thanks', run: hideNudge }]
    });
  }

  // ---- Personalization ----
  let heroAction = () => go('shop');
  function personalize() {
    const label = document.getElementById('heroCtaText');
    if (!label) return;
    let text = 'Configure Your Uniform';
    if (S.tier === 'High') { text = 'Talk to a Printing Expert'; heroAction = () => go('contact'); }
    else if (S.pricingViews > 0 || S.quoteOpened) { text = 'Get My Instant Quote'; heroAction = () => openQuote(S.interest); }
    else if (S.interest) { text = 'Design My ' + S.interest; heroAction = () => go('shop'); }
    else { heroAction = () => go('shop'); }
    if (label.textContent !== text) label.textContent = text;
    const nav = document.getElementById('navQuote');
    if (nav) nav.textContent = S.tier === 'High' ? 'Talk to an Expert' : 'Get Instant Quote';
  }
  window.heroCtaAction = () => heroAction();

  // ---- Recommendation strip ----
  function renderReco() {
    const sec = document.getElementById('aiReco');
    const grid = document.getElementById('aiRecoGrid');
    if (!sec || !grid || !JTD) return;
    const cat = S.interest;
    if (!cat) { sec.style.display = 'none'; return; }
    const wanted = [cat, ...(CROSS_SELL[cat] || [])];
    const picks = [];
    for (const c of wanted) {
      const p = JTD.products.find((x) => x.category === c && !picks.includes(x));
      if (p) picks.push(p);
      if (picks.length >= 4) break;
    }
    if (picks.length < 2) { sec.style.display = 'none'; return; }
    document.getElementById('aiRecoLabel').textContent = `Because you looked at ${cat}`;
    document.getElementById('aiRecoReason').textContent = 'AI personalized';
    grid.innerHTML = picks.map((p) => {
      const from = p.tiers && p.tiers.length ? Math.min(...p.tiers.map((t) => t.price)) : p.price;
      return `<div class="product-card"><div class="product-image-wrap" onclick="showProductDetail(${p.id})">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
        <div class="product-info"><div class="product-category">${escapeHtml(p.category)}</div>
        <h3 class="product-name" onclick="showProductDetail(${p.id})">${escapeHtml(p.name)}</h3>
        <div class="product-meta"><div class="product-price"><span style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">FROM</span>
        <span class="product-price-current">$${from.toFixed(2)}</span><span style="font-size:12px;color:var(--text-muted);">/unit</span></div></div></div></div>`;
    }).join('');
    sec.style.display = 'block';
    if (window.lucide) lucide.createIcons();
  }

  // ---- Counters ----
  function initCounters() {
    const els = document.querySelectorAll('.counter');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { animateCount(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.4 });
    els.forEach((el) => io.observe(el));
  }
  function animateCount(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const compact = el.dataset.format === 'compact';
    const dur = 1400; const start = performance.now();
    function fmt(n) {
      if (compact) return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : Math.round(n);
      return Math.round(n).toLocaleString('en-US');
    }
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ==================== DOM: assistant, insights, quote builder ====================
  function injectDom() {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <button class="ai-assistant-fab" id="aiFab" aria-label="Open assistant">
      <span class="ai-orb"><i data-lucide="sparkles" style="width:15px;height:15px;"></i><span class="ai-fab-dot"></span></span>
      <span id="aiFabLabel">Ask JT</span>
    </button>
    <div class="ai-panel" id="aiPanel" role="dialog" aria-label="JT assistant">
      <div class="ai-panel-head">
        <span class="ai-orb"><i data-lucide="sparkles" style="width:16px;height:16px;"></i></span>
        <div><div class="ai-panel-title">JT Assistant</div><div class="ai-panel-sub">Here to help you decide, fast</div></div>
        <button class="ai-panel-close" onclick="JTAI.closeAssistant()"><i data-lucide="x" style="width:18px;height:18px;"></i></button>
      </div>
      <div class="ai-panel-body" id="aiPanelBody"></div>
      <div class="ai-panel-foot"><i data-lucide="shield-check" style="width:13px;height:13px;"></i> Private by design. Nothing leaves your browser.</div>
    </div>
    <div class="ai-nudge" id="aiNudge"><button class="ai-nudge-close" onclick="JTAI._hideNudge()">&times;</button><div class="ai-nudge-text" id="aiNudgeText"></div><div class="ai-nudge-actions" id="aiNudgeActions"></div></div>
    <button class="ai-insights-chip" id="aiChip" onclick="JTAI.toggleInsights()"><span class="dot"></span> AI INSIGHTS</button>
    <div class="ai-insights" id="aiInsights"></div>
    <div class="modal-overlay" id="qbModal"><div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header"><div class="modal-title">Instant Quote Builder</div><button class="modal-close" onclick="JTAI.closeQuote()"><i data-lucide="x"></i></button></div>
      <div class="qb-steps" id="qbSteps"></div>
      <div class="qb-body" id="qbBody"></div>
      <div class="qb-nav" id="qbNav"></div>
    </div></div>`;
    document.body.appendChild(wrap);
    document.getElementById('aiFab').addEventListener('click', openAssistant);
    document.getElementById('qbModal').addEventListener('click', (e) => { if (e.target.id === 'qbModal') closeQuote(); });
    if (window.lucide) lucide.createIcons();
  }

  // ---- Assistant panel ----
  function openAssistant() {
    hideNudge();
    renderAssistant();
    document.getElementById('aiPanel').classList.add('open');
    document.getElementById('aiFab').style.display = 'none';
  }
  function closeAssistant() {
    document.getElementById('aiPanel').classList.remove('open');
    document.getElementById('aiFab').style.display = '';
  }
  function renderAssistant() {
    const body = document.getElementById('aiPanelBody');
    const cat = S.interest;
    const greeting = cat
      ? `Hi. I noticed you were looking at <strong>${escapeHtml(cat)}</strong>. ${escapeHtml(CATEGORY_COPY[cat] || '')}`
      : 'Hi. I can help you choose the right workwear, estimate volume pricing, or book a free cost audit. What are you after?';
    const chips = [];
    chips.push({ label: 'Build an instant quote', primary: true, run: () => openQuote(cat) });
    if (cat) chips.push({ label: `See ${cat}`, run: () => go('shop') });
    chips.push({ label: 'Free cost audit', run: () => go('audit') });
    chips.push({ label: 'Talk to an expert', run: () => go('contact') });
    body.innerHTML = `<div class="ai-msg">${greeting}<span class="ai-why">Suggestions adapt to what you view. This runs privately in your browser.</span></div>
      <div class="ai-quick">${chips.map((c, i) => `<button class="${c.primary ? 'primary' : ''}" data-i="${i}">${escapeHtml(c.label)}</button>`).join('')}</div>`;
    body.querySelectorAll('.ai-quick button').forEach((b, i) => (b.onclick = chips[i].run));
    if (window.lucide) lucide.createIcons();
  }

  // ---- Nudge ----
  function showNudge({ text, why, actions }) {
    if (!canNudge()) return;
    S.lastNudgeAt = Date.now();
    const n = document.getElementById('aiNudge');
    document.getElementById('aiNudgeText').innerHTML = escapeHtml(text) + (why ? `<span class="ai-why" style="display:block;margin-top:6px;font-size:11px;color:var(--text-muted);font-style:italic;">${escapeHtml(why)}</span>` : '');
    const box = document.getElementById('aiNudgeActions');
    box.innerHTML = actions.map((a, i) => `<button class="btn ${a.primary ? 'btn-primary' : 'btn-outline'} btn-sm" data-i="${i}">${escapeHtml(a.label)}</button>`).join('');
    box.querySelectorAll('button').forEach((b, i) => (b.onclick = () => { hideNudge(); actions[i].run && actions[i].run(); }));
    n.classList.add('show');
    if (window.lucide) lucide.createIcons();
    clearTimeout(showNudge._t);
    showNudge._t = setTimeout(hideNudge, 14000);
  }
  function hideNudge() { document.getElementById('aiNudge')?.classList.remove('show'); }

  // ---- Insights panel ----
  let insightsOpen = false;
  function toggleInsights() { insightsOpen = !insightsOpen; const el = document.getElementById('aiInsights'); el.classList.toggle('open', insightsOpen); if (insightsOpen) renderInsights(); }
  function renderInsights() {
    const el = document.getElementById('aiInsights');
    const t = S.tier.toLowerCase();
    el.innerHTML = `
      <h4><i data-lucide="activity" style="width:16px;height:16px;"></i> Visitor Intelligence</h4>
      <div class="muted">Live, on-device behavioural model</div>
      <div><span class="ai-tier ${t}"><i data-lucide="${S.tier === 'High' ? 'flame' : S.tier === 'Medium' ? 'trending-up' : 'minus'}" style="width:13px;height:13px;"></i> ${S.tier} intent</span></div>
      <div class="ai-meter"><div class="ai-meter-label"><span>Buying-intent score</span><span>${S.score}/100</span></div>
        <div class="ai-meter-track"><div class="ai-meter-fill" style="width:${S.score}%"></div></div></div>
      <div class="ai-insights-row"><span>Top interest</span><span>${S.interest || '—'}</span></div>
      <div class="ai-insights-row"><span>Products viewed</span><span>${S.productViews}</span></div>
      <div class="ai-insights-row"><span>Scroll depth</span><span>${Math.round(S.scrollDepth)}%</span></div>
      <div class="ai-insights-row"><span>Visitor</span><span>${S.returning ? 'Returning' : 'New'} · ${S.device}</span></div>
      <div class="ai-section-title">Why this score</div>
      ${(S.reasons.length ? S.reasons : [{ label: 'Just arrived', pts: 0 }]).map((r) => `<div class="ai-reason"><span>${escapeHtml(r.label)}</span><span class="pts">+${r.pts}</span></div>`).join('')}
      <div class="ai-privacy"><i data-lucide="lock" style="width:13px;height:13px;"></i> <span>Explainable and private. No cookies, no tracking pixels, no data sent to a server. The business can tune every weight above.</span></div>`;
    if (window.lucide) lucide.createIcons();
  }

  // ==================== Quote builder ====================
  const QB = { step: 0, product: null, qty: 50, method: METHODS[0], rush: false };
  function openQuote(preferCat) {
    S.quoteOpened = true; recompute();
    if (!JTD) JTD = window.JTData;
    if (JTD && preferCat) { const p = JTD.products.find((x) => x.category === preferCat); if (p) QB.product = p; }
    if (JTD && !QB.product) QB.product = JTD.products[0];
    QB.step = 0;
    document.getElementById('qbModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderQB();
  }
  function closeQuote() { document.getElementById('qbModal').classList.remove('open'); document.body.style.overflow = ''; }

  function renderQB() {
    if (!JTD) { document.getElementById('qbBody').innerHTML = '<p>Loading catalog…</p>'; return; }
    const steps = ['Product', 'Quantity', 'Branding', 'Timeline', 'Quote'];
    document.getElementById('qbSteps').innerHTML = steps.map((_, i) => `<div class="qb-step ${i < QB.step ? 'done' : ''} ${i === QB.step ? 'active' : ''}"></div>`).join('');
    const body = document.getElementById('qbBody');
    const nav = document.getElementById('qbNav');

    if (QB.step === 0) {
      body.innerHTML = `<div class="qb-q">What are you ordering?</div><div class="qb-hint">Pick a garment. You can add more later.</div>
        <div class="qb-options">${JTD.products.map((p) => `<div class="qb-opt ${QB.product && QB.product.id === p.id ? 'sel' : ''}" data-id="${p.id}"><span class="qb-opt-title">${escapeHtml(p.name)}</span><span class="qb-opt-sub">from $${(p.tiers && p.tiers.length ? Math.min(...p.tiers.map((t) => t.price)) : p.price).toFixed(2)}/unit</span></div>`).join('')}</div>`;
      body.querySelectorAll('.qb-opt').forEach((o) => (o.onclick = () => { QB.product = JTD.products.find((p) => p.id == o.dataset.id); renderQB(); }));
    } else if (QB.step === 1) {
      const min = QB.product.minOrder || 25;
      if (QB.qty < min) QB.qty = min;
      body.innerHTML = `<div class="qb-q">How many ${escapeHtml(QB.product.name)}?</div><div class="qb-hint">Minimum ${min} units. Prices drop at 50 and 100.</div>
        <div class="qb-qty-display" id="qbQtyDisp">${QB.qty}</div>
        <input class="qb-range" type="range" min="${min}" max="500" step="25" value="${QB.qty}" id="qbRange">
        <div id="qbTierHint" class="qb-hint" style="text-align:center;margin-top:10px;"></div>`;
      const r = document.getElementById('qbRange');
      r.oninput = () => { QB.qty = parseInt(r.value, 10); document.getElementById('qbQtyDisp').textContent = QB.qty; updateTierHint(); };
      updateTierHint();
    } else if (QB.step === 2) {
      body.innerHTML = `<div class="qb-q">Branding method?</div><div class="qb-hint">Affects the per-unit price.</div>
        <div class="qb-options">${METHODS.map((m) => `<div class="qb-opt ${QB.method.key === m.key ? 'sel' : ''}" data-k="${m.key}"><span class="qb-opt-title">${m.key}${m.add ? ` <span style="color:var(--text-muted);font-weight:500;">+$${m.add.toFixed(2)}</span>` : ''}</span><span class="qb-opt-sub">${m.sub}</span></div>`).join('')}</div>`;
      body.querySelectorAll('.qb-opt').forEach((o) => (o.onclick = () => { QB.method = METHODS.find((m) => m.key === o.dataset.k); renderQB(); }));
    } else if (QB.step === 3) {
      body.innerHTML = `<div class="qb-q">When do you need them?</div><div class="qb-hint">Rush adds 10% for 5-business-day production.</div>
        <div class="qb-options"><div class="qb-opt ${!QB.rush ? 'sel' : ''}" data-r="0"><span class="qb-opt-title">Standard</span><span class="qb-opt-sub">7 to 14 business days</span></div>
        <div class="qb-opt ${QB.rush ? 'sel' : ''}" data-r="1"><span class="qb-opt-title">Rush <span style="color:var(--text-muted);font-weight:500;">+10%</span></span><span class="qb-opt-sub">5 business days</span></div></div>`;
      body.querySelectorAll('.qb-opt').forEach((o) => (o.onclick = () => { QB.rush = o.dataset.r === '1'; renderQB(); }));
    } else {
      const { low, high, unit } = quoteMath();
      body.innerHTML = `<div class="qb-result">
        <div class="qb-result-label">Estimated total</div>
        <div class="qb-result-box">
          <div class="qb-result-price">$${Math.round(low).toLocaleString()} – $${Math.round(high).toLocaleString()}</div>
          <div class="qb-result-unit">≈ $${unit.toFixed(2)}/unit · ${QB.qty} × ${escapeHtml(QB.product.name)}</div>
        </div>
        <div class="qb-summary">
          <div><span>Garment</span><span>${escapeHtml(QB.product.name)}</span></div>
          <div><span>Quantity</span><span>${QB.qty} units</span></div>
          <div><span>Branding</span><span>${escapeHtml(QB.method.key)}</span></div>
          <div><span>Timeline</span><span>${QB.rush ? 'Rush · 5 days' : 'Standard · 7-14 days'}</span></div>
        </div>
        <p class="qb-hint" style="margin-top:16px;">This is an instant estimate. Lock it in and an account manager confirms exact pricing and artwork.</p>
      </div>`;
    }

    // nav buttons
    const back = QB.step > 0 ? `<button class="btn btn-outline" onclick="JTAI._qbBack()">Back</button>` : '<span></span>';
    let next;
    if (QB.step < 4) next = `<button class="btn btn-primary" onclick="JTAI._qbNext()" ${QB.step === 0 && !QB.product ? 'disabled' : ''}>Continue <i data-lucide="arrow-right" style="width:16px;height:16px;"></i></button>`;
    else next = `<button class="btn btn-primary" onclick="JTAI._qbLock()"><i data-lucide="check" style="width:16px;height:16px;"></i> Lock In This Quote</button>`;
    nav.innerHTML = back + next;
    if (window.lucide) lucide.createIcons();
  }
  function updateTierHint() {
    const el = document.getElementById('qbTierHint'); if (!el) return;
    const unit = JTD.unitPrice(QB.product, QB.qty);
    el.innerHTML = `Current unit price at ${QB.qty} units: <strong style="color:var(--primary);">$${unit.toFixed(2)}</strong>`;
  }
  function quoteMath() {
    let unit = JTD.unitPrice(QB.product, QB.qty) + (QB.method.add || 0);
    if (QB.rush) unit *= 1.1;
    const total = unit * QB.qty;
    return { unit, low: total * 0.94, high: total * 1.08 };
  }
  function qbNext() { if (QB.step === 0 && !QB.product) return; QB.step = Math.min(4, QB.step + 1); recompute(); renderQB(); }
  function qbBack() { QB.step = Math.max(0, QB.step - 1); renderQB(); }
  function qbLock() {
    const { low, high } = quoteMath();
    closeQuote();
    go('contact');
    setTimeout(() => {
      const msg = document.getElementById('ctMessage');
      if (msg) msg.value = `Instant quote request: ${QB.qty} × ${QB.product.name}, ${QB.method.key}, ${QB.rush ? 'Rush (5 days)' : 'Standard'}. Estimated $${Math.round(low).toLocaleString()} - $${Math.round(high).toLocaleString()}. Please confirm exact pricing.`;
      const inq = document.getElementById('ctInquiry'); if (inq) inq.value = 'Bulk order quote';
    }, 200);
    if (window.showToast) showToast('Quote saved. Add your details and we confirm exact pricing.');
  }

  // ---- helpers ----
  function go(page) { if (window.showPage) showPage(page); hideNudge(); closeAssistant?.(); }
  function throttle(fn, ms) { let last = 0, t; return function (...a) { const now = Date.now(); if (now - last >= ms) { last = now; fn.apply(this, a); } else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn.apply(this, a); }, ms); } }; }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ---- Public API ----
  window.JTAI = {
    openQuote, closeQuote, openAssistant, closeAssistant, toggleInsights,
    getState: () => ({ ...S, interest: S.interest, categoryViews: { ...S.categoryViews } }),
    track: (ev, d) => document.dispatchEvent(new CustomEvent('jt:' + ev, { detail: d })),
    _qbNext: qbNext, _qbBack: qbBack, _qbLock: qbLock, _hideNudge: hideNudge
  };

  // ---- Boot ----
  function boot() { injectDom(); initCounters(); recompute(); renderReco(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

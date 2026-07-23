// ==================== Premium hero: particle field + parallax ====================
// Self-contained, performant (rAF paused off-screen), and reduced-motion aware.

(function () {
  'use strict';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.getElementById('heroSection');
  if (!hero) return;

  // ---------- Particle field ----------
  const canvas = document.getElementById('heroCanvas');
  let ctx, particles = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mouse = { x: -999, y: -999, active: false };
  let running = false, rafId = null;

  function sizeCanvas() {
    if (!canvas) return;
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticles() {
    const isMobile = W < 760;
    const count = Math.min(isMobile ? 34 : 92, Math.round((W * H) / (isMobile ? 22000 : 14000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6
    }));
  }

  const LINK = 128, LINK_M = 180;
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      // gentle attraction to cursor
      if (mouse.active) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
        if (d < LINK_M) {
          p.x += (dx / d) * 0.25; p.y += (dy / d) * 0.25;
          ctx.strokeStyle = `rgba(255,107,0,${0.14 * (1 - d / LINK_M)})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,107,0,0.5)'; ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(255,140,66,${0.13 * (1 - d / LINK)})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    rafId = requestAnimationFrame(draw);
  }
  function start() { if (running || reduce || !canvas) return; running = true; rafId = requestAnimationFrame(draw); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  if (canvas && !reduce) {
    sizeCanvas(); makeParticles(); start();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { sizeCanvas(); makeParticles(); }, 200); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    // pause when hero scrolls out of view
    new IntersectionObserver((e) => e.forEach((en) => (en.isIntersecting ? start() : stop())), { threshold: 0.02 }).observe(hero);
  }

  // ---------- Cursor parallax (shirt tilt + floating chips) ----------
  // Applied directly on move; the CSS `transition: transform` on .shirt-3d does the
  // smoothing, so this does not depend on requestAnimationFrame.
  const shirt = document.getElementById('shirtTilt');
  const chips = [...hero.querySelectorAll('.hero-float-badge')];
  const light = document.getElementById('heroLight');

  function apply(tX, tY) {
    if (shirt) shirt.style.transform = `rotateX(${(-tY * 9).toFixed(2)}deg) rotateY(${(tX * 12 - 8).toFixed(2)}deg)`;
    chips.forEach((chip) => {
      const depth = parseFloat(chip.dataset.depth || 24);
      chip.style.transform = `translate3d(${(-tX * depth).toFixed(1)}px, ${(-tY * depth).toFixed(1)}px, 0)`;
    });
  }
  function onMove(e) {
    const r = hero.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
    if (light) { light.style.setProperty('--mx', px * 100 + '%'); light.style.setProperty('--my', py * 100 + '%'); }
    if (!reduce) apply((px - 0.5) * 2, (py - 0.5) * 2);
  }
  function onLeave() { mouse.active = false; mouse.x = mouse.y = -999; if (!reduce) apply(0, 0); }
  if (!reduce) {
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      apply(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30)));
    });
  }
})();

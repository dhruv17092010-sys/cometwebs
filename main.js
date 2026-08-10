/* ============================================================
   COMET WEBS — Universal JavaScript
   Starfield particles, comet trails, nav, scroll reveals
   ============================================================ */

'use strict';

/* ── Starfield Canvas ────────────────────────────────────────── */
const StarField = (() => {
  let canvas, ctx, stars = [], comets = [], W, H, animId;
  const STAR_COUNT = 220;

  function init() {
    canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    createStars();
    loop();
    window.addEventListener('resize', resize);
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.6 + 0.15,
      speed: Math.random() * 0.008 + 0.004,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      hue: Math.random() < 0.15 ? 210 : Math.random() < 0.08 ? 280 : 220,
    }));
  }

  function spawnComet() {
    if (comets.length > 3) return;
    const fromTop = Math.random() < 0.5;
    comets.push({
      x: fromTop ? Math.random() * W : W + 50,
      y: fromTop ? -50 : Math.random() * H * 0.4,
      vx: -(Math.random() * 5 + 3),
      vy:  (Math.random() * 3 + 1.5),
      len: Math.random() * 180 + 120,
      width: Math.random() * 2 + 1,
      alpha: 0,
      life: 0,
      maxLife: Math.random() * 180 + 120,
      hue: Math.random() < 0.5 ? 200 : 260,
      sparkles: [],
    });
  }

  function updateComet(c) {
    c.x += c.vx;
    c.y += c.vy;
    c.life++;
    c.alpha = c.life < 20
      ? c.life / 20
      : c.life > c.maxLife - 20
        ? (c.maxLife - c.life) / 20
        : 1;
    // spawn sparkles
    if (Math.random() < 0.3) {
      c.sparkles.push({
        x: c.x + (Math.random() - 0.5) * 6,
        y: c.y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: Math.random() * 1.5 + 0.5,
        life: 0,
        maxLife: Math.random() * 30 + 15,
      });
    }
    c.sparkles = c.sparkles.filter(s => {
      s.x += s.vx; s.y += s.vy; s.life++;
      return s.life < s.maxLife;
    });
  }

  function drawComet(c) {
    const angle = Math.atan2(c.vy, c.vx);
    const tailX = c.x - Math.cos(angle) * c.len;
    const tailY = c.y - Math.sin(angle) * c.len;

    const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
    grad.addColorStop(0, `hsla(${c.hue}, 90%, 80%, 0)`);
    grad.addColorStop(0.6, `hsla(${c.hue}, 90%, 80%, ${c.alpha * 0.4})`);
    grad.addColorStop(1, `hsla(${c.hue}, 100%, 95%, ${c.alpha})`);

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(c.x, c.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = c.width;
    ctx.lineCap = 'round';
    ctx.stroke();

    // head glow
    const hGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 10);
    hGrad.addColorStop(0, `hsla(${c.hue}, 100%, 95%, ${c.alpha})`);
    hGrad.addColorStop(1, `hsla(${c.hue}, 100%, 80%, 0)`);
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = hGrad;
    ctx.fill();

    // sparkles
    c.sparkles.forEach(s => {
      const sa = 1 - s.life / s.maxLife;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${c.hue}, 80%, 90%, ${sa * c.alpha})`;
      ctx.fill();
    });
  }

  let cometTimer = 0;
  function loop() {
    ctx.clearRect(0, 0, W, H);

    // draw stars
    const t = performance.now() / 1000;
    stars.forEach(s => {
      s.twinklePhase += s.twinkleSpeed;
      const a = s.alpha * (0.6 + 0.4 * Math.sin(s.twinklePhase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, 60%, 90%, ${a})`;
      ctx.fill();
    });

    // comets
    cometTimer++;
    if (cometTimer > 180 && Math.random() < 0.015) {
      spawnComet();
      cometTimer = 0;
    }
    comets = comets.filter(c => {
      updateComet(c);
      if (c.life < c.maxLife && c.x > -200 && c.y < H + 200) {
        drawComet(c);
        return true;
      }
      return false;
    });

    animId = requestAnimationFrame(loop);
  }

  return { init };
})();

/* ── Navigation ─────────────────────────────────────────────── */
const Nav = (() => {
  function init() {
    const nav = document.querySelector('.nav');
    const hamburger = document.querySelector('.nav__hamburger');
    const mobileMenu = document.querySelector('.nav__mobile');
    const links = document.querySelectorAll('.nav__mobile a, .nav__links a');

    if (!nav) return;

    // Scroll effect
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Hamburger toggle
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        const open = mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
    }

    // Close mobile on link click
    links.forEach(a => {
      a.addEventListener('click', () => {
        if (mobileMenu) mobileMenu.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Active link highlight
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__links a, .nav__mobile a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === currentPath || (currentPath === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  return { init };
})();

/* ── Scroll Reveal ───────────────────────────────────────────── */
const ScrollReveal = (() => {
  function init() {
    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!targets.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const delay = e.target.dataset.delay || 0;
          setTimeout(() => e.target.classList.add('visible'), delay * 100);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(t => io.observe(t));
  }

  return { init };
})();

/* ── Cursor Comet Trail ──────────────────────────────────────── */
const CursorTrail = (() => {
  const trail = [];
  const MAX = 12;

  function init() {
    if (window.matchMedia('(hover: none)').matches) return; // skip touch

    document.addEventListener('mousemove', (e) => {
      trail.push({ x: e.clientX, y: e.clientY, life: MAX });

      if (trail.length > MAX) trail.shift();

      // remove old particles
      document.querySelectorAll('.cursor-spark').forEach(el => el.remove());

      trail.forEach((p, i) => {
        if (i % 3 !== 0) return;
        const dot = document.createElement('div');
        dot.className = 'cursor-spark';
        const progress = i / trail.length;
        const size = progress * 5 + 2;
        dot.style.cssText = `
          position: fixed;
          left: ${p.x}px;
          top: ${p.y}px;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: hsl(${190 + progress * 80}, 90%, 70%);
          opacity: ${progress * 0.6};
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          transition: opacity 0.3s;
          box-shadow: 0 0 ${size * 2}px hsl(${190 + progress * 80}, 90%, 70%);
        `;
        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 300);
      });
    });
  }

  return { init };
})();

/* ── Counter Animation ────────────────────────────────────────── */
const CounterAnim = (() => {
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();

    const frame = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = target * ease;
      el.textContent = (Number.isInteger(target) ? Math.round(value) : value.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  function init() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => io.observe(c));
  }

  return { init };
})();

/* ── Smooth Page Transitions ──────────────────────────────────── */
const PageTransitions = (() => {
  function init() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: var(--space-void);
      z-index: 9998;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
    `;
    document.body.appendChild(overlay);

    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (
        href &&
        !href.startsWith('#') &&
        !href.startsWith('http') &&
        !href.startsWith('mailto') &&
        !href.startsWith('tel') &&
        !href.startsWith('whatsapp')
      ) {
        a.addEventListener('click', e => {
          e.preventDefault();
          overlay.style.opacity = '1';
          setTimeout(() => window.location.href = href, 380);
        });
      }
    });

    // Fade in on load
    window.addEventListener('load', () => {
      overlay.style.opacity = '0';
    });
  }

  return { init };
})();

/* ── Init all on DOM ready ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  StarField.init();
  Nav.init();
  ScrollReveal.init();
  CursorTrail.init();
  CounterAnim.init();
  PageTransitions.init();
});

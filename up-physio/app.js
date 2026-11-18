/* UP Physio Osnabrück – Bewegung und Interaktion.
   Alles lokal, keine Bibliotheken, keine Verbindungen nach außen. */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let vh = window.innerHeight;
  let vw = window.innerWidth;
  window.addEventListener('resize', () => { vh = window.innerHeight; vw = window.innerWidth; }, { passive: true });

  /* ---------- ein gemeinsamer Takt ---------- */
  const tasks = new Set();
  const loop = (t) => { tasks.forEach((f) => f(t)); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const whileVisible = (el, fn, margin = '120px 0px') => {
    if (!el) return;
    new IntersectionObserver(([e]) => { if (e.isIntersecting) tasks.add(fn); else tasks.delete(fn); }, { rootMargin: margin }).observe(el);
  };

  /* ---------- Navigation, Fortschritt, Anruf-Knopf ---------- */
  const nav = $('#nav');
  const prog = $('.progress');
  const fab = $('.fab');
  let lastY = window.scrollY;
  let lastScrollRun = -1;
  tasks.add(() => {
    const y = window.scrollY;
    if (y === lastScrollRun) return;
    lastScrollRun = y;
    const max = document.documentElement.scrollHeight - vh;
    prog.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle('is-solid', y > 24);
    if (!document.body.classList.contains('menu-open')) {
      if (y > lastY + 6 && y > vh * 0.7) nav.classList.add('is-hidden');
      else if (y < lastY - 6 || y < vh * 0.7) nav.classList.remove('is-hidden');
    }
    if (fab) fab.classList.toggle('is-visible', y > vh * 0.8 && !fabBlock.size);
    lastY = y;
  });
  // Im Kontaktbereich gibt es schon grosse Anruf-Knoepfe – dort tritt der schwebende Knopf zurueck
  const fabBlock = new Set();
  const fabIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) fabBlock.add(e.target); else fabBlock.delete(e.target); });
    lastScrollRun = -1;
  });
  ['#kontakt', '.foot', '.hero'].forEach((s) => { const el = $(s); if (el) fabIO.observe(el); });

  // aktiven Abschnitt in der Navigation markieren
  const navLinks = $$('.nav__links a');
  const secIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  ['leistungen', 'ohne-rezept', 'ueber-mich', 'praxis', 'kontakt', 'top', 'so-arbeite-ich', 'fragen'].forEach((id) => { const s = document.getElementById(id); if (s) secIO.observe(s); });

  /* ---------- Menü ---------- */
  const burger = $('.nav__burger');
  const menu = $('#menu');
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    document.body.classList.toggle('menu-open', open);
    if (open) nav.classList.remove('is-hidden');
  };
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    window.matchMedia('(min-width: 1021px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  const countUp = (el) => {
    const to = parseInt(el.dataset.count, 10);
    if (reduce || !to) return;
    const t0 = performance.now();
    const dur = 1500;
    const step = (t) => {
      const k = clamp((t - t0) / dur, 0, 1);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      $$('[data-count]', e.target).forEach(countUp);
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ---------- HERO: Muskelfasern, die auf Berührung reagieren ---------- */
  class Fibers {
    constructor(canvas, host) {
      this.c = canvas;
      this.host = host;
      this.ctx = canvas.getContext('2d');
      this.N = 0;
      this.M = 0;
      this.t0 = null;
      this.hand = { x: 0, y: 0, s: 0, init: false };
      this.ptr = { x: 0, y: 0, last: -1e9, down: 0, inside: false };
      this.resize();
      const set = (x, y) => {
        const r = this.c.getBoundingClientRect();
        this.ptr.x = x - r.left;
        this.ptr.y = y - r.top;
        this.ptr.last = performance.now();
        this.ptr.inside = true;
      };
      host.addEventListener('pointermove', (e) => set(e.clientX, e.clientY), { passive: true });
      host.addEventListener('pointerdown', (e) => { set(e.clientX, e.clientY); this.ptr.down = 1; }, { passive: true });
      window.addEventListener('pointerup', () => { this.ptr.down = 0; }, { passive: true });
      host.addEventListener('pointerleave', () => { this.ptr.inside = false; this.ptr.down = 0; }, { passive: true });
      host.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) set(t.clientX, t.clientY); }, { passive: true });
      new ResizeObserver(() => { this.resize(); if (reduce) this.still(); }).observe(host);
    }

    alloc(N, M) {
      this.N = N;
      this.M = M;
      const K = N * M;
      this.px = new Float32Array(K); this.py = new Float32Array(K);
      this.vx = new Float32Array(K); this.vy = new Float32Array(K);
      this.cx = new Float32Array(M); this.cy = new Float32Array(M);
      this.nx = new Float32Array(M); this.ny = new Float32Array(M);
      this.pr = new Float32Array(M);
      this.fo = new Float32Array(N); this.fph = new Float32Array(N);
      this.fw = new Float32Array(N); this.fe = new Float32Array(N);
      this.jl = new Int16Array(N); this.jh = new Int16Array(N);
      let seed = 1234567;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < N; i++) {
        const o = -1 + (2 * (i + 0.5)) / N;
        this.fo[i] = o + (rnd() - 0.5) * (1.1 / N);
        this.fph[i] = rnd() * Math.PI * 2;
        const c = Math.abs(o);
        this.fw[i] = i === 0 || i === N - 1 ? 1.2 : 0.5 + 0.8 * Math.pow(1 - c, 0.7);
      }
      this.fresh = true;
    }

    resize() {
      const r = this.host.getBoundingClientRect();
      const W = r.width;
      const H = r.height;
      this.W = W;
      this.H = H;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.c.width = Math.round(W * this.dpr);
      this.c.height = Math.round(H * this.dpr);
      const mobile = W < 760;
      const N = mobile ? 46 : 74;
      const M = mobile ? 84 : 126;
      if (N !== this.N || M !== this.M) this.alloc(N, M);
      if (mobile) {
        // eigener Streifen zwischen Knoepfen und Fakten, damit kein Text ueberdeckt wird
        const inner = $('.hero__inner', this.host);
        const cta = $('.hero__cta', this.host);
        const facts = $('.hero__facts', this.host);
        let top = H * 0.55, bot = H * 0.8;
        if (inner && cta && facts) {
          top = inner.offsetTop + cta.offsetTop + cta.offsetHeight + 6;
          bot = inner.offsetTop + facts.offsetTop - 6;
        }
        const band = Math.max(90, bot - top), mid = (top + bot) / 2;
        this.P = [[-0.4 * W, mid + band * 0.62], [0.22 * W, mid + band * 0.42], [0.74 * W, mid - band * 0.42], [1.4 * W, mid - band * 0.62]];
        this.maxW = band * 0.34;
        this.R = 66;
        this.idle = 0.6;
      } else {
        this.P = [[0.2 * W, 1.18 * H], [0.5 * W, 0.86 * H], [0.67 * W, 0.24 * H], [1.08 * W, -0.16 * H]];
        this.maxW = Math.min(W, H) * 0.25;
        this.R = Math.max(110, Math.min(160, W * 0.1));
        this.idle = 0.85;
      }
      this.tendon = Math.max(3, this.maxW * 0.045);
    }

    centerline(t, intro) {
      const { M, cx, cy, nx, ny, pr, maxW, tendon } = this;
      const [p0, p1, p2, p3] = this.P;
      const breathe = 1 + 0.035 * Math.sin(t * 0.9);
      for (let j = 0; j < M; j++) {
        const s = j / (M - 1);
        const u = 1 - s;
        const b0 = u * u * u, b1 = 3 * u * u * s, b2 = 3 * u * s * s, b3 = s * s * s;
        cx[j] = b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0];
        cy[j] = b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1];
        const d0 = 3 * u * u, d1 = 6 * u * s, d2 = 3 * s * s;
        const tx = d0 * (p1[0] - p0[0]) + d1 * (p2[0] - p1[0]) + d2 * (p3[0] - p2[0]);
        const ty = d0 * (p1[1] - p0[1]) + d1 * (p2[1] - p1[1]) + d2 * (p3[1] - p2[1]);
        const L = Math.hypot(tx, ty) || 1;
        nx[j] = -ty / L;
        ny[j] = tx / L;
        const q = clamp((s - 0.06) / 0.88, 0, 1);
        const belly = Math.pow(Math.sin(Math.PI * q), 1.1);
        const wave = 1 + 0.06 * Math.sin((s * 2.4 - t * 0.16) * Math.PI * 2);
        pr[j] = (tendon + (maxW - tendon) * belly) * breathe * wave * intro;
      }
    }

    frame(time) {
      if (this.t0 === null) this.t0 = time;
      const t = time * 0.001;
      const intro = reduce ? 1 : 1 - Math.pow(1 - clamp((time - this.t0) / 1800, 0, 1), 3);
      this.centerline(t, intro);
      const { N, M, px, py, vx, vy, cx, cy, nx, ny, pr, fo, fph, fe, jl, jh, hand, ptr } = this;

      // Hand: echter Zeiger, sonst eine ruhige "Massage-Hand" entlang des Muskels
      const live = ptr.inside && time - ptr.last < 2600;
      let hx, hy, hs;
      if (live) {
        hx = ptr.x; hy = ptr.y; hs = ptr.down ? 1.8 : 1;
      } else {
        const s = 0.52 + 0.3 * Math.sin(t * 0.33);
        const j = Math.round(s * (M - 1));
        const lat = Math.sin(t * 0.81) * pr[j] * 0.5;
        hx = cx[j] + nx[j] * lat; hy = cy[j] + ny[j] * lat; hs = reduce ? 0 : this.idle * intro;
      }
      if (!hand.init) { hand.x = hx; hand.y = hy; hand.init = true; }
      const k = live ? 0.32 : 0.05;
      hand.x = lerp(hand.x, hx, k);
      hand.y = lerp(hand.y, hy, k);
      hand.s = lerp(hand.s, hs, 0.07);

      const R = this.R, R2 = R * R, push0 = R * 0.42 * hand.s;
      const fresh = this.fresh;
      for (let i = 0; i < N; i++) {
        const o = fo[i], ph = fph[i];
        let emax = 0, lo = M, hi = -1;
        const base = i * M;
        for (let j = 0; j < M; j++) {
          const kk = base + j;
          const off = (o + 0.016 * Math.sin(j * 0.13 + ph + t * 0.6)) * pr[j];
          let tx = cx[j] + nx[j] * off;
          let ty = cy[j] + ny[j] * off;
          const dx = tx - hand.x, dy = ty - hand.y, d2 = dx * dx + dy * dy;
          if (d2 < R2 && push0 > 0.01) {
            const d = Math.sqrt(d2) + 0.001, f = 1 - d / R, p = f * f * push0;
            tx += (dx / d) * p;
            ty += (dy / d) * p;
            if (f > emax) emax = f;
            if (f > 0.06) { if (j < lo) lo = j; hi = j; }
          }
          if (fresh) {
            px[kk] = tx; py[kk] = ty; vx[kk] = 0; vy[kk] = 0;
          } else {
            vx[kk] = (vx[kk] + (tx - px[kk]) * 0.16) * 0.78;
            vy[kk] = (vy[kk] + (ty - py[kk]) * 0.16) * 0.78;
            px[kk] += vx[kk];
            py[kk] += vy[kk];
          }
        }
        fe[i] += (emax * hand.s - fe[i]) * 0.12;
        if (hi >= 0) { jl[i] = lo; jh[i] = hi; }
      }
      this.fresh = false;
      this.draw(live);
    }

    draw(live) {
      const { ctx, N, M, px, py, fo, fw, fe, jl, jh, hand } = this;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < N; i++) {
        const e = Math.min(1, fe[i] * 1.35);
        const c = Math.abs(fo[i]);
        // Grundfaser in Tinte, leicht kraeftiger, wenn sie beruehrt wird
        const a = 0.24 + 0.36 * (1 - c) + 0.12 * e;
        ctx.strokeStyle = 'rgba(17,24,20,' + a.toFixed(3) + ')';
        ctx.lineWidth = fw[i];
        ctx.beginPath();
        let k = i * M;
        ctx.moveTo(px[k], py[k]);
        for (let j = 1; j < M; j++) { k++; ctx.lineTo(px[k], py[k]); }
        ctx.stroke();
        // nur das Stueck unter der Hand leuchtet gruen
        if (e > 0.03) {
          const j0 = Math.max(0, jl[i] - 4), j1 = Math.min(M - 1, jh[i] + 4);
          if (j1 > j0) {
            ctx.strokeStyle = 'rgba(96,150,16,' + (0.9 * e).toFixed(3) + ')';
            ctx.lineWidth = fw[i] + 0.7 * e;
            ctx.beginPath();
            k = i * M + j0;
            ctx.moveTo(px[k], py[k]);
            for (let j = j0 + 1; j <= j1; j++) { k++; ctx.lineTo(px[k], py[k]); }
            ctx.stroke();
          }
        }
      }
      if (live && hand.s > 0.05) {
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 7 + hand.s * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(140,190,34,' + (0.9 * Math.min(1, hand.s)).toFixed(3) + ')';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, this.R * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(68,112,10,' + (0.22 * Math.min(1, hand.s)).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    still() {
      this.fresh = true;
      this.frame(performance.now());
    }
  }

  const hero = $('.hero');
  const heroCanvas = $('.hero__canvas');
  if (hero && heroCanvas && heroCanvas.getContext) {
    const fibers = new Fibers(heroCanvas, hero);
    if (reduce) fibers.still();
    else whileVisible(hero, (t) => fibers.frame(t), '0px');
  }

  /* ---------- Laufband ---------- */
  const band = $('.band');
  const track = $('.band__track');
  if (band && track && !reduce) {
    let x = 0, v = 0, half = track.scrollWidth / 2, sy = window.scrollY;
    new ResizeObserver(() => { half = track.scrollWidth / 2; }).observe(track);
    whileVisible(band, () => {
      const y = window.scrollY;
      v = lerp(v, y - sy, 0.08);
      sy = y;
      x -= 0.55 + v * 0.3;
      if (half > 0) { while (x <= -half) x += half; while (x > 0) x -= half; }
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });
  }

  /* ---------- Orte: Weg zwischen den drei Symbolen ---------- */
  const places = $('.places');
  const route = $('.places__route');
  if (places && route) {
    const layout = () => {
      const icons = $$('.place__icon', places);
      if (icons.length < 3) return;
      const wr = places.getBoundingClientRect();
      const pos = icons.map((ic) => { const r = ic.getBoundingClientRect(); return [r.left + r.width / 2 - wr.left, r.top + r.height / 2 - wr.top]; });
      const vertical = Math.abs(pos[2][0] - pos[0][0]) < 12;
      route.classList.toggle('is-v', vertical);
      if (vertical) {
        const len = pos[2][1] - pos[0][1];
        route.style.cssText = 'left:' + (pos[0][0] - 1) + 'px;top:' + pos[0][1] + 'px;height:' + len + 'px;width:2px';
        route.style.setProperty('--mid', ((pos[1][1] - pos[0][1]) / len * 100).toFixed(2) + '%');
      } else {
        route.style.cssText = 'left:' + pos[0][0] + 'px;top:' + (pos[0][1] - 1) + 'px;width:' + (pos[2][0] - pos[0][0]) + 'px;height:2px';
      }
    };
    new ResizeObserver(layout).observe(places);
    if (!reduce) {
      new IntersectionObserver(([e], io) => {
        if (e.isIntersecting) { setTimeout(() => route.classList.add('is-run'), 1400); io.disconnect(); }
      }, { threshold: 0.4 }).observe(places);
    }
  }

  /* ---------- OHNE REZEPT: Wirbelsäule ---------- */
  class Spine {
    constructor(svg) {
      this.svg = svg;
      this.build();
    }

    build() {
      const NS = 'http://www.w3.org/2000/svg';
      const el = (tag, attrs, parent) => {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
      };
      const svg = this.svg;
      const defs = el('defs', {}, svg);
      const lg = el('linearGradient', { id: 'scanGrad', x1: '0', x2: '1', y1: '0', y2: '0' }, defs);
      el('stop', { offset: '0', 'stop-color': '#8CBE22', 'stop-opacity': '0' }, lg);
      el('stop', { offset: '.5', 'stop-color': '#8CBE22', 'stop-opacity': '.24' }, lg);
      el('stop', { offset: '1', 'stop-color': '#8CBE22', 'stop-opacity': '0' }, lg);

      const V = [];
      for (let i = 0; i < 7; i++) V.push({ lab: 'C' + (i + 1), w: 22 + i * 1.7, h: 9.5, g: 3.4, wing: 8 + i * 0.9, type: 'c' });
      for (let i = 0; i < 12; i++) V.push({ lab: 'Th' + (i + 1), w: 31 + i * 1.25, h: 11.5 + i * 0.32, g: 4, wing: 15 - i * 0.45, type: 't', ti: i });
      for (let i = 0; i < 5; i++) V.push({ lab: 'L' + (i + 1), w: 47 + i * 2.2, h: 16.5 + i * 0.5, g: 5, wing: 15 + i * 1.0, type: 'l' });
      let y = 58;
      V.forEach((v) => { v.y = y + v.h / 2; y += v.h + v.g; });
      const sacTop = y + 2;
      this.top = V[0].y - 8;
      this.bottom = sacTop + 76;

      // Becken (ruhig, im Hintergrund)
      const pel = el('g', { class: 'pelvis-g' }, svg);
      const st = sacTop;
      const pd = (m) => 'M' + m.map((p) => p.join(' ')).join(' ');
      const left = 'M170 ' + (st + 6) + ' C140 ' + (st - 26) + ' 96 ' + (st - 20) + ' 84 ' + (st + 18) + ' C76 ' + (st + 46) + ' 96 ' + (st + 72) + ' 128 ' + (st + 88);
      const right = 'M230 ' + (st + 6) + ' C260 ' + (st - 26) + ' 304 ' + (st - 20) + ' 316 ' + (st + 18) + ' C324 ' + (st + 46) + ' 304 ' + (st + 72) + ' 272 ' + (st + 88);
      el('path', { class: 'pelvis', d: left }, pel);
      el('path', { class: 'pelvis', d: right }, pel);
      el('path', { class: 'pelvis', d: 'M128 ' + (st + 88) + ' C152 ' + (st + 112) + ' 248 ' + (st + 112) + ' 272 ' + (st + 88) }, pel);
      el('circle', { class: 'pelvis', cx: 122, cy: st + 98, r: 11 }, pel);
      el('circle', { class: 'pelvis', cx: 278, cy: st + 98, r: 11 }, pel);
      void pd;

      // Kreuzbein
      const sac = el('g', { transform: 'translate(200 ' + st + ')' }, svg);
      el('path', { class: 'sac', d: 'M-32 0C-12 -3 12 -3 32 0C31 22 20 50 6 70C3 74 -3 74 -6 70C-20 50 -31 22 -32 0Z' }, sac);
      for (let k = 0; k < 4; k++) {
        const fy = 13 + k * 14, fx = 15 - k * 2.8, fr = 2.7 - k * 0.35;
        el('circle', { class: 'sac-h', cx: -fx, cy: fy, r: fr }, sac);
        el('circle', { class: 'sac-h', cx: fx, cy: fy, r: fr }, sac);
      }
      el('rect', { class: 'sac', x: -4, y: 76, width: 8, height: 5, rx: 2.5 }, sac);
      el('rect', { class: 'sac', x: -3, y: 83, width: 6, height: 4, rx: 2 }, sac);
      this.sac = sac;
      this.pel = pel;

      // Wirbel
      const ribR = [34, 52, 64, 72, 78, 82, 84, 84, 80, 72, 50, 34];
      const ribD = [10, 18, 26, 32, 38, 42, 46, 48, 48, 44, 30, 20];
      V.forEach((v) => {
        const g = el('g', {}, svg);
        const hw = v.w / 2;
        if (v.type === 't') {
          const wx = hw + v.wing, wy = -v.h * 0.5, rx = ribR[v.ti], dr = ribD[v.ti];
          const rib = (sx) => 'M' + sx * wx + ' ' + wy + 'C' + sx * (wx + rx * 0.5) + ' ' + (wy - 6) + ' ' + sx * (wx + rx) + ' ' + (wy + dr * 0.3) + ' ' + sx * (wx + rx * 0.94) + ' ' + (wy + dr);
          el('path', { class: 'rib', d: rib(1) + rib(-1) }, g);
        }
        let wd, ww;
        if (v.type === 'c') { wd = 'M' + -hw + ' ' + -v.h * 0.05 + 'L' + -(hw + v.wing) + ' ' + -v.h * 0.3 + 'M' + hw + ' ' + -v.h * 0.05 + 'L' + (hw + v.wing) + ' ' + -v.h * 0.3; ww = 2.8; }
        else if (v.type === 't') { wd = 'M' + -hw + ' ' + -v.h * 0.15 + 'L' + -(hw + v.wing) + ' ' + -v.h * 0.5 + 'M' + hw + ' ' + -v.h * 0.15 + 'L' + (hw + v.wing) + ' ' + -v.h * 0.5; ww = 3.2; }
        else { wd = 'M' + -hw + ' 0L' + -(hw + v.wing) + ' ' + -v.h * 0.08 + 'M' + hw + ' 0L' + (hw + v.wing) + ' ' + -v.h * 0.08; ww = 4.4; }
        el('path', { class: 'vw', d: wd, 'stroke-width': ww }, g);
        v.disc = el('rect', { class: 'vd', x: -v.w * 0.43, y: v.h / 2 + v.g * 0.12, width: v.w * 0.86, height: v.g * 0.76, rx: v.g * 0.38 }, g);
        v.body = el('rect', { class: 'vb', x: -hw, y: -v.h / 2, width: v.w, height: v.h, rx: Math.min(v.h * 0.42, 6) }, g);
        v.el = g;
        v.tip = hw + v.wing;
      });

      // Beschriftung (nur beim Befund sichtbar)
      const show = { C1: 1, C7: 1, Th1: 1, Th6: 1, Th12: 1, L1: 1, L5: 1 };
      this.labels = [];
      V.forEach((v) => {
        if (!show[v.lab]) return;
        const g = el('g', { class: 'lbl', opacity: 0 }, svg);
        const line = el('line', { x1: 0, y1: 0, x2: 0, y2: 0 }, g);
        const tx = el('text', { x: 336, y: v.y + 4 }, g);
        tx.textContent = v.lab;
        this.labels.push({ v, g, line });
      });

      // Scan-Linie
      this.scanG = el('g', { opacity: 0 }, svg);
      this.scanGlow = el('rect', { class: 'scan-glow', x: 40, y: 0, width: 320, height: 40 }, this.scanG);
      this.scanLine = el('line', { class: 'scan', x1: 56, x2: 344, y1: 0, y2: 0 }, this.scanG);
      this.V = V;
      this.update(0, 0, 0);
    }

    update(enter, P, t) {
      const V = this.V;
      const n = V.length;
      const a = smooth(0, 1, enter);
      const scanOn = smooth(0.3, 0.37, P) * (1 - smooth(0.63, 0.7, P));
      const sp = smooth(0.35, 0.63, P);
      const scanY = lerp(this.top - 14, this.bottom, sp);
      const m = smooth(0.67, 0.92, P);
      const xs = new Array(n);
      for (let i = 0; i < n; i++) {
        const env = Math.pow(Math.sin((Math.PI * (i + 1)) / (n + 1.6)), 0.8);
        xs[i] = env * (1.4 * Math.sin(t * 0.9 - i * 0.25) + m * 20 * Math.sin(t * 1.35 - i * 0.32));
      }
      const pelA = smooth(0, 0.35, a);
      this.pel.setAttribute('opacity', pelA.toFixed(3));
      this.sac.setAttribute('opacity', pelA.toFixed(3));
      for (let i = 0; i < n; i++) {
        const v = V[i];
        const ib = n - 1 - i;
        const f = smooth(0, 1, clamp(a * (n + 5) - ib - 2, 0, 3) / 3);
        const xPrev = i > 0 ? xs[i - 1] : xs[i];
        const xNext = i < n - 1 ? xs[i + 1] : 0;
        const yPrev = i > 0 ? V[i - 1].y : v.y - 12;
        const yNext = i < n - 1 ? V[i + 1].y : v.y + 12;
        const ang = (-Math.atan2(xNext - xPrev, yNext - yPrev) * 180) / Math.PI;
        const x = 200 + xs[i];
        const yy = v.y + (1 - f) * 16;
        v.el.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + yy.toFixed(2) + ') rotate(' + ang.toFixed(2) + ')');
        v.el.setAttribute('opacity', f.toFixed(3));
        v.x = x;
        const h = scanOn * Math.exp(-Math.pow((v.y - scanY) / 24, 2));
        const glow = m * (0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.45));
        if (h > 0.02 || v.h0 > 0.02) {
          v.body.style.stroke = 'rgba(' + Math.round(lerp(236, 140, h)) + ',' + Math.round(lerp(234, 190, h)) + ',' + Math.round(lerp(225, 34, h)) + ',' + lerp(0.62, 1, h).toFixed(3) + ')';
          v.body.style.fill = h > 0.02 ? 'rgba(140,190,34,' + (h * 0.18).toFixed(3) + ')' : '';
        }
        v.h0 = h;
        v.disc.style.fill = 'rgba(140,190,34,' + (glow * 0.85 + h * 0.5).toFixed(3) + ')';
      }
      this.labels.forEach((l) => {
        const passed = l.v.y < scanY;
        const h = Math.exp(-Math.pow((l.v.y - scanY) / 26, 2));
        const o = scanOn * Math.max(h, passed ? 0.55 : 0.18);
        l.g.setAttribute('opacity', o.toFixed(3));
        l.line.setAttribute('x1', (l.v.x + l.v.tip + 6).toFixed(1));
        l.line.setAttribute('y1', l.v.y.toFixed(1));
        l.line.setAttribute('x2', '330');
        l.line.setAttribute('y2', l.v.y.toFixed(1));
      });
      this.scanG.setAttribute('opacity', scanOn.toFixed(3));
      this.scanGlow.setAttribute('y', (scanY - 20).toFixed(1));
      this.scanLine.setAttribute('y1', scanY.toFixed(1));
      this.scanLine.setAttribute('y2', scanY.toFixed(1));
    }
  }

  const rezept = $('.rezept');
  const spineSvg = $('.spine');
  const steps = $$('.step');
  const stepsEl = $('.steps');
  const stage = $('.rezept__stage');
  if (rezept && spineSvg && stepsEl && stage) {
    const spine = new Spine(spineSvg);
    const capNo = $('.spine__no');
    const capLabel = $('.spine__label');
    const names = ['Ihr Anruf', 'Befundaufnahme', 'Behandlung'];
    let cur = -1;
    const run = (time) => {
      const mobile = vw < 861;
      const line = mobile ? 0.74 : 0.5;
      const r = stepsEl.getBoundingClientRect();
      const P = clamp((vh * line - r.top) / r.height, 0, 1);
      const sr = stage.getBoundingClientRect();
      const enter = clamp((vh - sr.top) / (vh * 0.85), 0, 1);
      spine.update(enter, P, reduce ? 0 : time * 0.001);
      const idx = P < 0.34 ? 0 : P < 0.67 ? 1 : 2;
      if (idx !== cur) {
        cur = idx;
        steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
        capNo.textContent = '0' + (idx + 1);
        capLabel.textContent = names[idx];
      }
    };
    if (reduce) {
      // ruhiges Standbild, der Text bleibt vollständig lesbar
      steps.forEach((s) => s.classList.add('is-active'));
      spine.update(1, 0.5, 0);
      window.addEventListener('scroll', () => run(0), { passive: true });
    } else {
      whileVisible(rezept, run, '200px 0px');
    }
  }

  /* ---------- LEISTUNGEN ---------- */
  const svcItems = $$('.svc__item');
  const svcShow = $('.svc__show');
  const svcCur = $('.svc__meta-cur');
  const svcTag = $('.svc__meta-tag');
  const desk = window.matchMedia('(min-width: 961px)');
  if (svcItems.length && svcShow) {
    let active = -1;
    let lastHover = 0;
    let swapT = 0;
    const put = (i) => {
      svcShow.innerHTML = '';
      const g = svcItems[i].querySelector('.glyph');
      if (g) {
        const c = g.cloneNode(true);
        svcShow.appendChild(c);
        if (reduce && c.pauseAnimations) c.pauseAnimations();
      }
    };
    const setActive = (i, instant) => {
      if (i === active) return;
      active = i;
      svcItems.forEach((it, k) => it.classList.toggle('is-active', k === i));
      if (svcCur) svcCur.textContent = String(i + 1).padStart(2, '0');
      if (svcTag) svcTag.textContent = (svcItems[i].querySelector('.svc__title') || {}).textContent || '';
      if (!desk.matches) return;
      clearTimeout(swapT);
      if (instant) { put(i); return; }
      svcShow.classList.add('is-swap');
      swapT = setTimeout(() => { put(i); svcShow.classList.remove('is-swap'); }, 230);
    };
    const syncAria = () => {
      svcItems.forEach((it) => {
        const b = it.querySelector('.svc__head');
        b.setAttribute('aria-expanded', desk.matches ? 'true' : String(it.classList.contains('is-open')));
      });
    };
    svcItems.forEach((it, i) => {
      const head = it.querySelector('.svc__head');
      head.addEventListener('click', () => {
        if (desk.matches) { lastHover = performance.now(); setActive(i); return; }
        const open = !it.classList.contains('is-open');
        svcItems.forEach((o) => o.classList.remove('is-open'));
        if (open) it.classList.add('is-open');
        setActive(i);
        syncAria();
      });
      head.addEventListener('focus', () => { if (desk.matches) setActive(i); });
      it.addEventListener('pointerenter', (e) => { if (desk.matches && e.pointerType === 'mouse') { lastHover = performance.now(); setActive(i); } });
    });
    const svcIO = new IntersectionObserver((entries) => {
      if (!desk.matches || performance.now() - lastHover < 1600) return;
      entries.forEach((e) => { if (e.isIntersecting) setActive(svcItems.indexOf(e.target)); });
    }, { rootMargin: '-46% 0px -46% 0px' });
    svcItems.forEach((it) => svcIO.observe(it));
    desk.addEventListener('change', () => { syncAria(); if (desk.matches) put(Math.max(0, active)); });
    setActive(0, true);
    syncAria();
  }

  // SMIL-Animationen der Symbole nur laufen lassen, wenn sie zu sehen sind
  const smilIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const s = e.target;
      if (!s.pauseAnimations) return;
      if (e.isIntersecting && !reduce) s.unpauseAnimations(); else s.pauseAnimations();
    });
  });
  $$('.glyph').forEach((g) => smilIO.observe(g));
  const showObs = new MutationObserver(() => { const g = svcShow && svcShow.querySelector('.glyph'); if (g) smilIO.observe(g); });
  if (svcShow) showObs.observe(svcShow, { childList: true });

  /* ---------- Zeitleiste, Parallax, Fußzeile ---------- */
  const tlWrap = $('.tl-wrap');
  if (tlWrap) {
    const lis = $$('.tl li', tlWrap);
    whileVisible(tlWrap, () => {
      const r = tlWrap.getBoundingClientRect();
      const mark = vh * 0.62;
      tlWrap.style.setProperty('--tp', clamp((mark - r.top) / (r.height - 34), 0, 1).toFixed(4));
      lis.forEach((li) => li.classList.toggle('is-on', li.getBoundingClientRect().top + 10 < mark));
    }, '0px');
  }

  if (!reduce) {
    $$('[data-parallax]').forEach((img) => {
      const f = parseFloat(img.dataset.parallax) || 0.08;
      const box = img.parentElement;
      whileVisible(box, () => {
        const r = box.getBoundingClientRect();
        const c = r.top + r.height / 2 - vh / 2;
        img.style.setProperty('--py', (-c * f).toFixed(1) + 'px');
      }, '0px');
    });
  }

  const word = $('.foot__word');
  if (word) {
    whileVisible(word, () => {
      const r = word.getBoundingClientRect();
      const p = clamp((vh - r.top) / (r.height + 40), 0, 1);
      word.style.setProperty('--fill', (p * 100).toFixed(1) + '%');
    }, '0px');
  }

  /* ---------- Karte ---------- */
  const map = $('.map');
  if (map) {
    new IntersectionObserver(([e], io) => {
      if (e.isIntersecting) { map.classList.add('is-drawn'); io.disconnect(); }
    }, { threshold: 0.3 }).observe(map);
  }
})();

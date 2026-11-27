/* Bilad Alsham — handgeschrieben, keine Library, kein Tracking. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── Überschriften in Wörter zerlegen ── */
  document.querySelectorAll('[data-split]').forEach((el) => {
    el.innerHTML = el.textContent
      .trim()
      .split(/\s+/)
      .map((w) => `<span class="word"><span>${w}</span></span>`)
      .join(' ');
    [...el.querySelectorAll('.word > span')].forEach((s, i) => {
      s.style.transitionDelay = `${i * 65}ms`;
    });
  });

  /* ── Einblenden beim Reinscrollen ── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-reveal],[data-split]').forEach((el) => io.observe(el));

  /* ── Sortiment: die Bühne links folgt dem Eintrag rechts ──
     Ein Beobachter pro Eintrag; wer der Bildschirmmitte am nächsten ist,
     bestimmt das Bild. Unter 900 px greift die Mechanik nicht — dort steht
     das Bild ohnehin über jedem Eintrag.                                  */
  const entries = [...document.querySelectorAll('.entry')];
  const stages = [...document.querySelectorAll('.stage__img')];

  if (entries.length && stages.length) {
    let active = -1;
    const setActive = (i) => {
      if (i === active || i < 0) return;
      active = i;
      stages.forEach((img) => img.classList.toggle('is-active', +img.dataset.stage === i));
      entries.forEach((el) => el.classList.toggle('is-active', +el.dataset.entry === i));
    };
    setActive(0);

    const pick = () => {
      const mid = innerHeight * 0.5;
      let best = 0, bestDist = Infinity;
      entries.forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = +el.dataset.entry; }
      });
      setActive(best);
    };

    const stageIo = new IntersectionObserver(pick, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: '-35% 0px -35% 0px',
    });
    entries.forEach((el) => stageIo.observe(el));
    addEventListener('scroll', pick, { passive: true });
  }

  /* ── Zeiger: eigener Ring und der warme Lichtkegel ── */
  const cursor = document.getElementById('cursor');
  const glow = document.getElementById('glow');
  const nav = document.getElementById('nav');
  const media = document.getElementById('heroMedia');
  const inner = document.querySelector('.hero__inner');
  const hero = document.querySelector('.hero');

  const p = {
    x: innerWidth / 2, y: innerHeight / 2,
    gx: innerWidth / 2, gy: innerHeight / 2,
    tx: innerWidth / 2, ty: innerHeight / 2,
    nx: 0, ny: 0, sx: 0, sy: 0,
  };
  let scrollY = window.scrollY;

  addEventListener('pointermove', (e) => {
    p.tx = e.clientX; p.ty = e.clientY;
    p.nx = (e.clientX / innerWidth) * 2 - 1;
    p.ny = (e.clientY / innerHeight) * 2 - 1;
    cursor.classList.add('is-on');
    glow.classList.add('is-on');
  }, { passive: true });

  addEventListener('pointerleave', () => {
    cursor.classList.remove('is-on');
    glow.classList.remove('is-on');
  });

  addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  document.querySelectorAll('a, .soc, button').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-lg'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-lg'));
  });

  const parallax = [...document.querySelectorAll('[data-parallax] img')];

  function frame() {
    p.x = lerp(p.x, p.tx, 0.22);
    p.y = lerp(p.y, p.ty, 0.22);
    cursor.style.transform = `translate(${p.x}px, ${p.y}px)`;

    p.gx = lerp(p.gx, p.tx, 0.045);
    p.gy = lerp(p.gy, p.ty, 0.045);
    glow.style.transform = `translate(${p.gx}px, ${p.gy}px)`;

    p.sx = lerp(p.sx, p.nx, 0.05);
    p.sy = lerp(p.sy, p.ny, 0.05);

    const t = clamp(scrollY / hero.offsetHeight, 0, 1);
    media.style.transform =
      `translate3d(${p.sx * 18}px, ${p.sy * 12 + t * 70}px, 0) scale(${1 + t * 0.12})`;
    inner.style.transform = `translate3d(0, ${t * 110}px, 0)`;
    inner.style.opacity = String(1 - clamp(t * 1.8, 0, 1));
    nav.classList.toggle('is-stuck', scrollY > 40);

    const vh = innerHeight;
    parallax.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const k = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = `translate3d(0, ${(-k * 26).toFixed(2)}px, 0) scale(1.09)`;
    });

    requestAnimationFrame(frame);
  }

  if (reduce) {
    addEventListener('scroll', () => nav.classList.toggle('is-stuck', window.scrollY > 40), { passive: true });
  } else {
    requestAnimationFrame(frame);
  }

  /* ── Öffnungsstatus aus den strukturierten Daten ──
     Die Zeiten stehen genau einmal im JSON-LD. Von dort liest die Anzeige
     sie ab, damit Seite und Google-Treffer nie auseinanderlaufen.          */
  const DAYS = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  function readHours() {
    const el = document.querySelector('script[type="application/ld+json"]');
    if (!el) return null;
    let data;
    try { data = JSON.parse(el.textContent); } catch { return null; }
    const spec = data.openingHoursSpecification;
    if (!Array.isArray(spec)) return null;

    const byDay = {};
    spec.forEach((s) => {
      const days = Array.isArray(s.dayOfWeek) ? s.dayOfWeek : [s.dayOfWeek];
      days.forEach((d) => {
        const i = DAYS[d];
        if (i === undefined) return;
        const [oh, om] = s.opens.split(':').map(Number);
        const [ch, cm] = s.closes.split(':').map(Number);
        byDay[i] = { open: oh * 60 + om, close: ch * 60 + cm };
      });
    });
    return byDay;
  }

  const hhmm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

  function renderStatus() {
    const byDay = readHours();
    if (!byDay) return;
    const targets = ['statusNow', 'statusCard'].map((id) => document.getElementById(id)).filter(Boolean);
    const out = {
      set textContent(v) { targets.forEach((t) => { t.textContent = v; }); },
      classList: {
        add: (c) => targets.forEach((t) => t.classList.add(c)),
        remove: (c) => targets.forEach((t) => t.classList.remove(c)),
      },
    };

    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    const today = byDay[now.getDay()];

    if (today && min >= today.open && min < today.close) {
      const left = today.close - min;
      out.textContent = left <= 60
        ? `Geöffnet, schließt in ${left} Min.`
        : `Geöffnet bis ${hhmm(today.close)} Uhr`;
      out.classList.add('is-open');
      return;
    }
    out.classList.remove('is-open');

    if (today && min < today.open) {
      out.textContent = `Öffnet heute um ${hhmm(today.open)} Uhr`;
      return;
    }
    for (let i = 1; i <= 7; i++) {
      const d = (now.getDay() + i) % 7;
      if (byDay[d]) {
        const label = i === 1 ? 'morgen' : NAMES[d];
        out.textContent = `Geschlossen, öffnet ${label} um ${hhmm(byDay[d].open)} Uhr`;
        return;
      }
    }
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  const todayRow = document.querySelector(`#hours tr[data-day="${new Date().getDay()}"]`);
  if (todayRow) todayRow.classList.add('is-today');

  /* ── Die Münze ──
     Am Rechner kippt sie zum Zeiger, am Handy zum Neigungssensor. Der
     Goldschimmer wandert gegenläufig, damit es nach Licht auf Metall aussieht
     und nicht nach einem gedrehten Bild. Reine Zierde — fällt sie aus, steht
     das Logo einfach still.                                                  */
  const coin = document.getElementById('coin');
  const coinInner = document.getElementById('coinInner');
  const gloss = coin && coin.querySelector('.coin__gloss');

  if (coin && coinInner && !reduce) {
    const c = { rx: 0, ry: 0, tx: 0, ty: 0 };   // ist / soll
    let live = false;

    const aim = (nx, ny) => {          // nx, ny von -1 bis 1
      c.ty = clamp(nx, -1, 1) * 16;    // Drehung um die Hochachse
      c.tx = clamp(-ny, -1, 1) * 13;   // Neigung um die Querachse
      if (!live) { live = true; coin.classList.add('is-live'); }
    };

    /* Rechner: der Zeiger führt. */
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = coin.getBoundingClientRect();
      aim((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2),
          (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2));
    }, { passive: true });

    /* Handy: der Neigungssensor führt. */
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return;
      aim(e.gamma / 38, (e.beta - 42) / 38);
    };

    function listenTilt() {
      addEventListener('deviceorientation', onTilt, { passive: true });
    }

    const needsAsk = typeof DeviceOrientationEvent !== 'undefined'
      && typeof DeviceOrientationEvent.requestPermission === 'function';

    if (needsAsk) {
      /* iOS gibt den Sensor nur nach einer echten Berührung frei. Wir fragen
         beim ersten Tippen irgendwo, ohne dafür einen Knopf aufzustellen. */
      const ask = async () => {
        removeEventListener('touchend', ask);
        try {
          if (await DeviceOrientationEvent.requestPermission() === 'granted') listenTilt();
        } catch { /* abgelehnt: Münze bleibt still */ }
      };
      addEventListener('touchend', ask, { once: true, passive: true });
    } else {
      listenTilt();
    }

    /* Nachlauf: die Münze zieht dem Ziel hinterher, nicht springt. */
    (function spin() {
      c.rx += (c.tx - c.rx) * 0.08;
      c.ry += (c.ty - c.ry) * 0.08;
      coinInner.style.transform = `rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg)`;
      if (gloss) {
        gloss.style.setProperty('--gx', `${(50 - c.ry * 2.1).toFixed(1)}%`);
        gloss.style.setProperty('--gy', `${(30 + c.rx * 2.1).toFixed(1)}%`);
      }
      requestAnimationFrame(spin);
    })();
  }

  /* ── Kein Video vorhanden? Poster bleibt stehen. ── */
  const video = document.getElementById('heroVideo');
  if (video) video.addEventListener('error', () => { video.style.display = 'none'; }, true);
})();

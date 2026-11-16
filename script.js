// Supabase: publishable key only. Never put a service_role key in this file.
const SUPABASE_URL = 'https://eqatkbttuwvveyvpbjpi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_l8ZWpsL_rHeNlJxdXHavxQ_5RBuEf33';

// Insert one row into a table. Anonymous visitors may only INSERT (see the RLS policies).
async function saveRow(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Save failed (${res.status})`);
}
// Empty form fields become null, so the database does not store empty strings
const orNull = (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v);

// Mobile nav toggle (the header turns purple while the menu is open)
const header = document.querySelector('.navbar');
const toggle = document.querySelector('.navbar__toggle');
const nav = document.getElementById('primary-nav');
// Keep the sticky banner right under the navbar, whatever the navbar's height
if (header) {
  const syncNavH = () => document.documentElement.style.setProperty('--nav-h', `${header.offsetHeight}px`);
  syncNavH();
  if ('ResizeObserver' in window) new ResizeObserver(syncNavH).observe(header);
  else window.addEventListener('resize', syncNavH);
}
const setNav = (open) => {
  if (open) header.style.setProperty('--nav-h', `${header.offsetHeight}px`);
  nav.classList.toggle('is-open', open);
  header.classList.toggle('is-open', open);
  document.documentElement.classList.toggle('nav-open', open); // stop the page scrolling behind the menu
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};
toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));

// Navbar dropdowns ("Academic", "School Life")
const dropdowns = [...document.querySelectorAll('.nav__dropdown')].map((dd) => ({
  btn: dd.querySelector('button'),
  menu: dd.querySelector('.nav__menu'),
}));
const setDropdown = (dd, open) => {
  dd.btn.setAttribute('aria-expanded', String(open));
  dd.menu.hidden = !open;
};
dropdowns.forEach((dd) => {
  dd.btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dd.menu.hidden;
    dropdowns.forEach((other) => setDropdown(other, other === dd && open));
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav__dropdown')) dropdowns.forEach((dd) => setDropdown(dd, false));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') dropdowns.forEach((dd) => setDropdown(dd, false));
});

// Tabs (ARIA tabs pattern with arrow-key support). Every [role="tablist"] is
// its own group: "Why choose us", "What Children Learn", "How to Apply", fees.
document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const vertical = list.getAttribute('aria-orientation') === 'vertical';
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      const [prevKey, nextKey] = vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
      const dir = e.key === nextKey ? 1 : e.key === prevKey ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });
});

// "Book a Tour" dialog: opened by any [data-open-tour] control
const tourDialog = document.getElementById('tour-dialog');
if (tourDialog) {
  document.querySelectorAll('[data-open-tour]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    setNav(false);
    tourDialog.showModal();
  }));
  tourDialog.querySelector('.modal__close').addEventListener('click', () => tourDialog.close());
  // Click on the backdrop closes it
  tourDialog.addEventListener('click', (e) => { if (e.target === tourDialog) tourDialog.close(); });
}

// Enquiry forms (contact page, Book a Tour and the other pages).
// Each valid submit is saved to the `enquiries` table in Supabase.
document.querySelectorAll('form[data-enquiry]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('.form__status');
    const fd = new FormData(form);
    const row = {
      first_name: orNull(fd.get('firstName')),
      last_name: orNull(fd.get('lastName')),
      email: orNull(fd.get('email')),
      phone: orNull(fd.get('phone')),
      subject: orNull(fd.get('subject')),
      message: orNull(fd.get('message')),
    };
    status.textContent = 'Sending…';
    try {
      await saveRow('enquiries', row);
      form.reset();
      status.textContent = 'Thank you! We have your message and will reply within 24 hours.';
    } catch {
      status.textContent = 'Sorry, your message could not be sent. Please try again.';
    }
  });
});

// Testimonials carousel (prev/next arrows + dots work on every screen size)
const track = document.querySelector('.carousel__track');
if (track) {
  const cards = [...track.children];
  const dotsWrap = document.querySelector('.dots');
  const prev = document.querySelector('.carousel__arrow--prev');
  const next = document.querySelector('.carousel__arrow--next');

  const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
  const maxScroll = () => track.scrollWidth - track.clientWidth;
  // Number of distinct snap positions = how many arrow clicks it takes to reach the end, + 1
  const pageCount = () => Math.max(1, Math.round(maxScroll() / step()) + 1);

  // Dots are built to match the current layout (6 cards fit 3-up on desktop,
  // 1-up on mobile), so there are never dead dots at the end.
  let dots = [];
  const buildDots = () => {
    const n = pageCount();
    if (dots.length === n) return;
    dotsWrap.innerHTML = '';
    dots = Array.from({ length: n }, (_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'dot';
      d.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      d.addEventListener('click', () => track.scrollTo({ left: Math.min(i * step(), maxScroll()), behavior: 'smooth' }));
      dotsWrap.append(d);
      return d;
    });
  };

  const update = () => {
    const s = track.scrollLeft;
    const max = maxScroll();
    const idx = step() ? Math.min(dots.length - 1, Math.round(s / step())) : 0;
    dots.forEach((d, i) => d.toggleAttribute('aria-current', i === idx));
    if (prev) prev.disabled = s <= 4;        // small tolerance for the track's 2px padding offset
    if (next) next.disabled = s >= max - 4;
  };

  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', () => { buildDots(); update(); });
  buildDots();
  update();
}

// Reveal animations: hero plays on page load, everything else on scroll
(() => {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const mark = (el, dir) => { if (!el.dataset.reveal) el.dataset.reveal = dir; return el; };
  const show = (el, delay) => {
    el.style.setProperty('--reveal-delay', `${delay}ms`);
    el.classList.add('is-visible');
  };

  /* ---------- Hero: on page load ---------- */
  // Title is split into words so they can rise in one by one. The full text
  // stays available to screen readers through aria-label.
  const heroText = [];
  const title = document.querySelector('.hero__title');
  if (title) {
    const words = title.textContent.trim().split(/\s+/);
    title.setAttribute('aria-label', words.join(' '));
    title.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      heroText.push(mark(span, 'word'));
      title.append(span, i < words.length - 1 ? ' ' : '');
    });
  }
  // Then each paragraph, then each button
  document.querySelectorAll('.hero__lead > *').forEach((el) => heroText.push(mark(el, 'up')));
  document.querySelectorAll('.hero__actions > *').forEach((el) => heroText.push(mark(el, 'pop')));
  const mascot = document.querySelector('.hero__mascot');
  if (mascot) mark(mascot, 'zoom');
  // Photos one by one; odd columns drop in from above, even ones rise from below
  const tiles = [];
  document.querySelectorAll('.gallery__col').forEach((col, c) => {
    col.querySelectorAll('.tile').forEach((tile) => tiles.push(mark(tile, c % 2 ? 'down' : 'up')));
  });

  // About page hero: title words, paragraphs, button, then the photo grid
  const abTitle = document.querySelector('.ab-hero__copy .h1');
  if (abTitle) {
    const words = abTitle.textContent.trim().split(/\s+/);
    abTitle.setAttribute('aria-label', words.join(' '));
    abTitle.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      heroText.push(mark(span, 'word'));
      abTitle.append(span, i < words.length - 1 ? ' ' : '');
    });
    document.querySelectorAll('.ab-hero__copy .prose > p').forEach((el) => heroText.push(mark(el, 'up')));
    document.querySelectorAll('.ab-hero__copy > .btn').forEach((el) => heroText.push(mark(el, 'pop')));
    document.querySelectorAll('.ab-hero .bento__cell').forEach((cell, i) => tiles.push(mark(cell, i % 2 ? 'down' : 'up')));
  }

  // Curriculum hero: title words, intro paragraphs, button, then the photo
  const cuTitle = document.querySelector('.pg-hero--cu .pg-hero__copy .h1');
  if (cuTitle) {
    const words = cuTitle.textContent.trim().split(/\s+/);
    cuTitle.setAttribute('aria-label', words.join(' '));
    cuTitle.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      heroText.push(mark(span, 'word'));
      cuTitle.append(span, i < words.length - 1 ? ' ' : '');
    });
    document.querySelectorAll('.pg-hero--cu .pg-hero__lead > p').forEach((el) => heroText.push(mark(el, 'up')));
    document.querySelectorAll('.pg-hero--cu .pg-hero__copy > .btn').forEach((el) => heroText.push(mark(el, 'pop')));
    document.querySelectorAll('.pg-hero--cu .pg-hero__img').forEach((el) => tiles.push(mark(el, 'right')));
  }

  // Programmes hero: title words, intro, both buttons, then the photo slides in from the right
  const prTitle = document.querySelector('.pr-hero__copy .h1');
  if (prTitle) {
    const words = prTitle.textContent.trim().split(/\s+/);
    prTitle.setAttribute('aria-label', words.join(' '));
    prTitle.textContent = '';
    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      heroText.push(mark(span, 'word'));
      prTitle.append(span, i < words.length - 1 ? ' ' : '');
    });
    document.querySelectorAll('.pr-hero__copy > .p1').forEach((el) => heroText.push(mark(el, 'up')));
    document.querySelectorAll('.pr-hero__copy .btn-row > .btn').forEach((el) => heroText.push(mark(el, 'pop')));
    document.querySelectorAll('.pr-hero__img').forEach((el) => tiles.push(mark(el, 'right')));
  }

  /* ---------- Other sections: on scroll ---------- */
  // Order matters: elements revealed in the same scroll step appear one by one in this (DOM) order.
  const scrollGroups = [
    ['.section-head > *', 'up'],
    ['.program', 'pop'],
    ['.tabs__list', 'up'],
    ['.tabs__title, .tabs__text > *, .tabs__copy > .btn', 'up'],
    ['.tabs__media', 'right'],
    ['.experience__media', 'left'],
    ['.experience__head > *, .experience__text > *, .experience__copy > .btn', 'up'],
    ['.feature', 'pop'],
    ['.quote', 'pop'],
    ['.dots, .testimonials__cta', 'up'],
    ['.sec-head, .card, .fcard, .stage, .cu-feature, .cu-tile, .vtabs, .cta__card, .sl-routine__list li, .faq__item', 'up'],
    // Curriculum: the round illustration turns 20° back to upright as it arrives
    ['.cu-world__row > img', 'spin'],
    // About: welcome from the principal (photo wipes in, then the text builds up in order)
    ['.ab-principal__photo', 'wipe'],
    ['.ab-principal__body .eyebrow, .ab-principal__body h2, .ab-principal__tag, .ab-principal__body .prose > p', 'up'],
    ['.ab-quote', 'pop'],
    ['.ab-principal__name, .ab-principal__role', 'up'],
    ['.footer__brand, .footer__col, .footer__contact, .footer__copy', 'up'],
  ];
  // On phones the program cards sit in a sideways scroller, so they appear
  // together as one block instead of one by one.
  if (window.matchMedia('(max-width: 640px)').matches) {
    const grid = document.querySelector('.programs__grid');
    if (grid) mark(grid, 'up');
  }
  // Programmes: journey cards slide in from alternating sides (matching their mirrored layout),
  // the timeline milestones pop in beside them, then the approach + learning sections
  document.querySelectorAll('.stage').forEach((el, i) => mark(el, i % 2 ? 'right' : 'left'));
  document.querySelectorAll('.pr-rail > img:not(.pr-rail__path), .pr-rail__dot').forEach((el) => mark(el, 'pop'));
  document.querySelectorAll('.pr-approach .p1').forEach((el) => mark(el, 'up'));
  document.querySelectorAll('.pr-approach img').forEach((el) => mark(el, 'right'));
  document.querySelectorAll('.pr-learning .card').forEach((el) => mark(el, 'pop'));
  scrollGroups.forEach(([sel, dir]) => document.querySelectorAll(sel).forEach((el) => {
    if (!el.closest('[data-reveal]')) mark(el, dir);
  }));
  const scrollTargets = [...document.querySelectorAll('[data-reveal]')]
    .filter((el) => !heroText.includes(el) && el !== mascot && !tiles.includes(el));

  // Hide everything that will animate (CSS keys off this class)
  root.classList.add('reveal-ready');

  const STEP = 130; // ms between items that enter together
  let queueEnd = 0; // time until which the current stagger queue is busy
  const onEnter = (entries, observer) => {
    const now = performance.now();
    entries
      .filter((e) => e.isIntersecting)
      .map((e) => e.target)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .forEach((el) => {
        // Continue the running stagger so items never appear all at once
        const start = Math.max(now, queueEnd);
        show(el, Math.min(start - now, 900));
        queueEnd = start + STEP;
        observer.unobserve(el);
      });
  };
  const io = new IntersectionObserver(onEnter, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  // The footer sits at the very end of the page, where the bottom margin above
  // could never be cleared, so it triggers as soon as any of it is on screen.
  const ioEnd = new IntersectionObserver(onEnter, { threshold: 0 });

  // Two frames so the hidden starting state is painted before anything plays
  const nextPaint = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  // Text + mascot start right away; scroll-triggered items start being watched
  nextPaint(() => {
    let t = 0;
    heroText.forEach((el) => {
      show(el, t);
      t += el.dataset.reveal === 'word' ? 90 : 150;
    });
    if (mascot) show(mascot, 350);
    scrollTargets.forEach((el) => (el.closest('.footer') ? ioEnd : io).observe(el));
  });

  // Photos wait until they are loaded so they don't fade in empty (max 3s)
  const imgs = tiles.map((t) => t.querySelector('img')).filter(Boolean);
  const loaded = Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => {
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  }))));
  const timeout = new Promise((res) => setTimeout(res, 3000));
  // Each photo plays when it is actually on screen: the ones visible on load go
  // one by one straight away, the rest wait until the visitor scrolls to them.
  const TILE_STEP = 240;
  let tileQueueEnd = 0;
  const tileIo = new IntersectionObserver((entries) => {
    const now = performance.now();
    entries
      .filter((e) => e.isIntersecting)
      .map((e) => e.target)
      .sort((a, b) => tiles.indexOf(a) - tiles.indexOf(b))
      .forEach((tile) => {
        const start = Math.max(now, tileQueueEnd);
        show(tile, start - now);
        tileQueueEnd = start + TILE_STEP;
        tileIo.unobserve(tile);
      });
  }, { threshold: 0.25 });
  Promise.race([loaded, timeout]).then(() => nextPaint(() => {
    tileQueueEnd = performance.now() + 300;
    tiles.forEach((tile) => tileIo.observe(tile));
  }));
})();

// Programs band on phones: the yellow behind the cards fades to white as the
// band scrolls up and away (drives --band-p from 0 to 1).
(() => {
  const band = document.querySelector('.programs__band');
  if (!band) return;
  const mq = window.matchMedia('(max-width: 640px)');
  let ticking = false;

  const update = () => {
    ticking = false;
    if (!mq.matches) { band.style.removeProperty('--band-p'); return; }
    const r = band.getBoundingClientRect();
    // 0 while the band's top is at or below the top of the screen,
    // 1 once 45% of the band has scrolled past it
    const p = Math.min(1, Math.max(0, -r.top / (r.height * 0.45)));
    band.style.setProperty('--band-p', p.toFixed(3));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  mq.addEventListener('change', update);
  update();
})();

// Contact scene: SMIL ignores the CSS reduced-motion rule, so drop it explicitly
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.ct__scene animate').forEach((a) => a.remove());
}

// If the window grows past the mobile breakpoint while the menu is open, close it
window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) setNav(false); });

/* FAQ: only one answer open at a time (fallback for browsers without <details name>) */
(() => {
  const items = document.querySelectorAll('details.faq__item');
  items.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) items.forEach((o) => { if (o !== d) o.open = false; });
  }));
})();

// Metrics bar: wipes in, figures pop in turn and count up (the text figure drops in letter by letter)
(() => {
  const stats = document.querySelector('.stats');
  if (!stats || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const counters = [];
  [...stats.children].forEach((item, i) => {
    item.style.setProperty('--i', i);
    const dt = item.querySelector('dt');
    if (!dt) return;
    const text = dt.textContent.trim();
    const shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    const real = document.createElement('span'); // screen readers get the final value straight away
    real.className = 'sr-only';
    real.textContent = text;
    const m = text.match(/^(\d[\d,]*)(.*)$/);
    if (m) {
      const to = parseInt(m[1].replace(/,/g, ''), 10);
      const fmt = (n) => (m[1].includes(',') ? Math.round(n).toLocaleString('en-US') : String(Math.round(n))) + m[2];
      shown.textContent = fmt(0);
      counters.push({ shown, to, fmt, delay: i * 150 + 350 });
    } else {
      [...text].forEach((ch, l) => {
        const sp = document.createElement('span');
        sp.className = 'stats__letter';
        sp.style.setProperty('--l', l);
        sp.style.setProperty('--base', `${i * 0.15 + 0.5}s`);
        sp.textContent = ch;
        shown.append(sp);
      });
    }
    dt.textContent = '';
    dt.append(shown, real);
  });

  stats.classList.add('stats-ready');
  new IntersectionObserver((entries, obs) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    obs.disconnect();
    stats.classList.add('is-in');
    const t0 = performance.now();
    const tick = (now) => {
      let running = false;
      counters.forEach((c) => {
        const t = Math.min(1, Math.max(0, (now - t0 - c.delay) / 1800));
        c.shown.textContent = c.fmt(c.to * ease(t));
        if (t < 1) running = true;
      });
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.35 }).observe(stats);
})();

// About: the Vision & Mission card drifts down with the scroll and settles in the middle of its photo
(() => {
  const vm = document.querySelector('.ab-vm');
  const card = vm && vm.querySelector('.ab-vm__card');
  if (!card) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;
  const update = () => {
    ticking = false;
    // distance from where the card sits in the layout to the vertical middle of the section
    const maxShift = Math.max(0, (vm.offsetHeight - card.offsetHeight) / 2 - card.offsetTop);
    let p = 1; // reduced motion: just sit in the middle
    if (!reduce) {
      // 0 as the section enters at the bottom of the screen, 1 when the section is centred on screen
      const r = vm.getBoundingClientRect();
      const vh = window.innerHeight;
      p = Math.min(1, Math.max(0, (vh - r.top) / (vh / 2 + r.height / 2)));
    }
    card.style.transform = `translateY(${(maxShift * p).toFixed(1)}px)`;
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Videos (curriculum): the poster/play button starts the clip, then the native controls take over
(() => {
  const boxes = [...document.querySelectorAll('[data-video]')];
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  boxes.forEach((box) => {
    const video = box.querySelector('video');
    const btn = box.querySelector('.video__btn');
    const dur = box.querySelector('.video__dur');
    const showDuration = () => { if (isFinite(video.duration)) { dur.textContent = fmt(video.duration); dur.hidden = false; } };
    if (video.readyState >= 1) showDuration(); else video.addEventListener('loadedmetadata', showDuration, { once: true });

    btn.addEventListener('click', () => {
      boxes.forEach((other) => { if (other !== box) other.querySelector('video').pause(); }); // one at a time
      box.classList.add('is-playing');
      video.controls = true;
      video.play();
    });
    video.addEventListener('ended', () => {
      box.classList.remove('is-playing');
      video.controls = false;
      video.currentTime = 0.1;
    });
  });
})();

// Programmes: keep the timeline icons level with their cards however tall the cards are
(() => {
  const rail = document.querySelector('.pr-rail');
  if (!rail) return;
  const stages = [...document.querySelectorAll('.pr-stages .stage')];
  const path = rail.querySelector('.pr-rail__path');
  const marks = [...rail.children].filter((el) => el !== path);
  const align = () => {
    if (!rail.offsetParent) return; // rail is hidden on narrow screens
    const railTop = rail.getBoundingClientRect().top;
    const centers = stages.map((st) => st.getBoundingClientRect().top - railTop + 110);
    marks.forEach((m, i) => { if (centers[i] != null) m.style.top = `${centers[i] - m.offsetHeight / 2}px`; });
    if (path && centers.length > 1) {
      path.style.top = `${centers[0] - 26}px`;
      path.style.height = `${centers[centers.length - 1] - centers[0] + 32}px`;
    }
  };
  align();
  window.addEventListener('resize', align);
  window.addEventListener('load', align);
  if (document.fonts) document.fonts.ready.then(align);
})();

/* =========================================================
   Enrolment form: 4 steps, per-step validation, review summary.
   There is no backend yet, so submitting only shows the thank-you
   state; send `new FormData(form)` from the submit handler once one exists.
   ========================================================= */
(() => {
  const form = document.querySelector('[data-enrol]');
  if (!form) return;

  const panels = [...form.querySelectorAll('.en-panel')];
  const stepEls = [...document.querySelectorAll('.stepper__item')];
  const backBtn = document.getElementById('en-back');
  const nextBtn = document.getElementById('en-next');
  const note = document.getElementById('en-note');
  const bar = document.getElementById('en-bar');
  const done = document.getElementById('en-done');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0;

  /* ---- helpers ---- */
  const $ = (sel, root = form) => root.querySelector(sel);
  const val = (name) => {
    const el = form.elements[name];
    if (!el) return '';
    if (el instanceof RadioNodeList) return el.value || '';
    return (el.value || '').trim();
  };
  const labelOf = (el) => {
    const l = el.id && form.querySelector(`label[for="${el.id}"]`);
    return l ? l.textContent.replace('*', '').trim() : 'This field';
  };
  const setError = (host, input, msg) => {
    const err = host.querySelector('.field__error');
    host.classList.toggle('is-invalid', !!msg);
    if (input && input.setAttribute) {
      if (msg) { input.setAttribute('aria-invalid', 'true'); if (err && err.id) input.setAttribute('aria-describedby', err.id); }
      else { input.removeAttribute('aria-invalid'); }
    }
    if (err) { err.textContent = msg || ''; err.hidden = !msg; }
  };

  /* ---- validation ---- */
  const ageYears = (iso) => (Date.now() - new Date(iso).getTime()) / (365.25 * 864e5);
  const validatePanel = (panel) => {
    let first = null;
    const fail = (host, input, msg) => { setError(host, input, msg); if (!first) first = input || host; };

    panel.querySelectorAll('.field').forEach((host) => {
      const input = host.querySelector('.phone input') || host.querySelector('input:not([type=checkbox]), select, textarea');
      const box = host.querySelector('input[type=checkbox]');
      if (box) {
        if (box.required && !box.checked) fail(host, box, 'Please tick this box to continue.');
        else setError(host, box, '');
        return;
      }
      if (!input || input.disabled && !input.required) return;
      const v = input.value.trim();
      let msg = '';
      if (input.required && !v) msg = `${labelOf(input)} is required`;
      else if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Enter a valid email address';
      else if (v && input.type === 'tel' && !/^[\d\s().-]{6,16}$/.test(v)) msg = 'Enter a valid phone number';
      else if (v && input.type === 'date') {
        const a = ageYears(v);
        if (isNaN(a) || a < 1 || a > 7) msg = 'Our programmes welcome children from 18 months to 6 years old';
      }
      if (msg) fail(host, input, msg); else setError(host, input, '');
    });

    panel.querySelectorAll('.choice-group').forEach((group) => {
      const ok = !!group.querySelector('input:checked');
      group.classList.toggle('is-invalid', !ok);
      const err = group.querySelector('.field__error');
      if (err) { err.textContent = ok ? '' : `Please choose ${group.dataset.label}`; err.hidden = ok; }
      if (!ok && !first) first = group.querySelector('input');
    });

    if (first) first.focus({ preventScroll: false });
    return !first;
  };

  // clear an error as soon as the user fixes the field
  form.addEventListener('input', (e) => {
    const host = e.target.closest('.field, .choice-group');
    if (host && host.classList.contains('is-invalid')) {
      if (host.classList.contains('choice-group')) { host.classList.remove('is-invalid'); const er = host.querySelector('.field__error'); if (er) er.hidden = true; }
      else setError(host, e.target, '');
    }
  });

  /* ---- date of birth: bounds + programme suggestion ---- */
  const dob = document.getElementById('c-dob');
  const hint = document.getElementById('c-dob-hint');
  const suggest = document.getElementById('en-suggest');
  const iso = (d) => d.toISOString().slice(0, 10);
  const yearsAgo = (n) => { const d = new Date(); d.setFullYear(d.getFullYear() - n); return iso(d); };
  if (dob) { dob.max = yearsAgo(1); dob.min = yearsAgo(7); }

  const PROGRAMMES = {
    TTP: { name: 'Toddler Transition Programme', age: '18 months – 2 years', sessions: ['Session 1 · 7:30 – 10:30', 'Session 2 · 11:00 – 14:00', 'Session 3 · 14:30 – 17:30'] },
    Playschool: { name: 'Playschool (PSY 1)', age: '2 – 3 years', sessions: ['Session 1 · 7:30 – 10:30', 'Session 2 · 11:00 – 14:00', 'Session 3 · 14:30 – 17:30'] },
    Nursery: { name: 'Nursery (PSY 2)', age: '3 – 4 years', sessions: ['Session 1 · 7:30 – 10:30', 'Session 2 · 11:00 – 14:00', 'Session 3 · 14:30 – 17:30'] },
    JKG: { name: 'Junior KG (PSY 3)', age: '4 – 5 years', sessions: ['Session 4 · 7:30 – 11:30', 'Session 5 · 12:00 – 16:00'] },
    SKG: { name: 'Senior KG (PSY 4)', age: '5 – 6 years', sessions: ['Session 4 · 7:30 – 11:30', 'Session 5 · 12:00 – 16:00'] },
  };
  const programmeForAge = (a) => (a < 2 ? 'TTP' : a < 3 ? 'Playschool' : a < 4 ? 'Nursery' : a < 5 ? 'JKG' : 'SKG');
  let suggested = '';
  const onDob = () => {
    suggested = '';
    hint.hidden = true;
    if (!dob.value) return;
    const a = ageYears(dob.value);
    if (isNaN(a) || a < 1 || a > 7) return;
    suggested = programmeForAge(a);
    const years = Math.floor(a), months = Math.floor((a - years) * 12);
    hint.textContent = `${years} year${years === 1 ? '' : 's'}${months ? ` ${months} month${months === 1 ? '' : 's'}` : ''} old`;
    hint.hidden = false;
  };
  if (dob) { dob.addEventListener('change', onDob); dob.addEventListener('input', onDob); }

  /* ---- programme -> session options ---- */
  const sessionSel = document.getElementById('s-session');
  const fillSessions = () => {
    const key = val('programme');
    const list = key ? PROGRAMMES[key].sessions : [];
    const prev = sessionSel.value;
    sessionSel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = ''; ph.disabled = true; ph.selected = true;
    ph.textContent = key ? 'Select a session' : 'Choose a programme first';
    sessionSel.append(ph);
    list.forEach((s) => { const o = document.createElement('option'); o.textContent = s; sessionSel.append(o); if (s === prev) o.selected = true; });
    sessionSel.disabled = !key;
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'programme') fillSessions(); });

  /* ---- marketing consent: "All" controls the three options ---- */
  const all = $('[data-all]');
  const opts = [...form.querySelectorAll('[data-opt]')];
  if (all) {
    all.addEventListener('change', () => opts.forEach((o) => { o.checked = all.checked; }));
    opts.forEach((o) => o.addEventListener('change', () => {
      const n = opts.filter((x) => x.checked).length;
      all.checked = n === opts.length;
      all.indeterminate = n > 0 && n < opts.length;
    }));
  }

  /* ---- review summary ---- */
  const fmtDate = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const buildReview = () => {
    const prog = PROGRAMMES[val('programme')];
    const sections = [
      { title: 'Parent’s particulars', step: 0, rows: [
        ['Name', `${val('parentFirst')} ${val('parentLast')}`], ['Relationship', val('relationship')], ['Email', val('email')],
        ['Phone', `${val('phoneCode')} ${val('phone')}`], ['Address', [val('address'), val('city')].filter(Boolean).join(', ')],
      ] },
      { title: 'Child’s particulars', step: 1, rows: [
        ['Name', `${val('childFirst')} ${val('childLast')}`], ['Date of birth', fmtDate(val('dob'))], ['Gender', val('gender')],
        ['Nationality', val('nationality')], ['Languages at home', val('languages') || '—'], ['Medical / dietary / learning needs', val('needs') || 'None provided'],
      ] },
      { title: 'Campus & programme', step: 2, rows: [
        ['Campus', val('campus')], ['Programme', prog ? `${prog.name} · ${prog.age}` : ''], ['Preferred session', val('session')],
        ['Preferred start', val('start')], ['School tour', form.elements.tour.checked ? 'Yes, please' : 'Not now'], ['Heard about us via', val('heard') || '—'],
      ] },
    ];
    const root = document.getElementById('en-review');
    root.innerHTML = '';
    sections.forEach((s) => {
      const sec = document.createElement('section');
      sec.className = 'review__sec';
      const head = document.createElement('div');
      head.className = 'review__head';
      const h = document.createElement('h3'); h.textContent = s.title;
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'review__edit'; edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${s.title}`);
      edit.addEventListener('click', () => go(s.step));
      head.append(h, edit);
      const dl = document.createElement('dl');
      s.rows.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); });
      sec.append(head, dl);
      root.append(sec);
    });
  };

  /* ---- navigation ---- */
  const go = (n, focus = true) => {
    const dir = n >= cur ? 1 : -1;
    cur = Math.max(0, Math.min(panels.length - 1, n));
    panels.forEach((p, i) => { p.hidden = i !== cur; p.classList.remove('is-in'); });
    const panel = panels[cur];
    if (!reduce) { panel.style.setProperty('--dx', `${24 * dir}px`); void panel.offsetWidth; panel.classList.add('is-in'); }
    stepEls.forEach((el, i) => {
      el.classList.toggle('is-active', i === cur);
      el.classList.toggle('is-done', i < cur);
      if (i === cur) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    const last = cur === panels.length - 1;
    backBtn.hidden = cur === 0;
    nextBtn.textContent = last ? 'Submit' : 'Next';
    note.textContent = `Step ${cur + 1} of ${panels.length}`;
    if (cur === 2 && !val('programme') && suggested) {
      const r = form.querySelector(`input[name="programme"][value="${suggested}"]`);
      const sg = document.getElementById('en-suggest');
      sg.textContent = `Suggested for ${val('childFirst') || 'your child'}: ${PROGRAMMES[suggested].name} · ${PROGRAMMES[suggested].age}. You can choose a different one.`;
      sg.hidden = false;
      if (r) { r.checked = true; fillSessions(); }
    }
    if (last) buildReview();
    if (focus) {
      const t = panel.querySelector('.en-panel__title');
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (t) t.focus({ preventScroll: true });
    }
  };

  const submit = async () => {
    const name = val('parentFirst') || 'there';
    const child = val('childFirst');
    const row = {
      parent_first: orNull(val('parentFirst')),
      parent_last: orNull(val('parentLast')),
      relationship: orNull(val('relationship')),
      email: orNull(val('email')),
      phone: orNull([val('phoneCode'), val('phone')].filter(Boolean).join(' ')),
      address: orNull(val('address')),
      city: orNull(val('city')),
      child_first: orNull(val('childFirst')),
      child_last: orNull(val('childLast')),
      dob: orNull(val('dob')),
      gender: orNull(val('gender')),
      nationality: orNull(val('nationality')),
      languages: orNull(val('languages')),
      needs: orNull(val('needs')),
      campus: orNull(val('campus')),
      programme: orNull(val('programme')),
      session: orNull(val('session')),
      start_pref: orNull(val('start')),
      heard: orNull(val('heard')),
      tour: !!form.elements.tour?.checked,
    };
    nextBtn.disabled = true;
    try {
      await saveRow('enrolments', row);
    } catch {
      nextBtn.disabled = false;
      note.textContent = 'Sorry, your enrolment could not be sent. Please try again.';
      return;
    }
    nextBtn.disabled = false;
    document.getElementById('en-done-title').textContent = `Thank you, ${name}!`;
    document.getElementById('en-done-text').textContent =
      `We have your enrolment request${child ? ` for ${child}` : ''}. Our admissions team will be in touch within 24 hours${form.elements.tour.checked ? ' to arrange your school tour' : ''}.`;
    panels.forEach((p) => { p.hidden = true; });
    stepEls.forEach((el) => { el.classList.remove('is-active'); el.classList.add('is-done'); el.removeAttribute('aria-current'); });
    bar.hidden = true;
    done.hidden = false;
    if (!reduce) { done.classList.remove('is-in'); void done.offsetWidth; done.classList.add('is-in'); }
    form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    document.getElementById('en-done-title').focus({ preventScroll: true });
    form.reset();
  };

  nextBtn.addEventListener('click', () => {
    if (!validatePanel(panels[cur])) return;
    if (cur === panels.length - 1) submit(); else go(cur + 1);
  });
  backBtn.addEventListener('click', () => go(cur - 1));
  form.addEventListener('submit', (e) => { e.preventDefault(); nextBtn.click(); }); // Enter key in a field
  fillSessions();
  go(0, false);
})();

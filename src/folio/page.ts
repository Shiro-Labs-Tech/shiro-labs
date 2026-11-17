/* Page modules: DOM-driven animation that runs once per mounted page and is fully undone on unmount.
   React renders static markup; these attach behavior to it (magnet, scramble, marquee, reveals, method rail). */
import { gsap, rt, clamp, SplitText } from './runtime';
import type { PageCtx } from './runtime';

/* ---------- Magnetic buttons ---------- */
export function magnet(): () => void {
  if (!rt.fine || rt.reduce) return () => {};
  type Item = { el: HTMLElement; x: (v: number) => void; y: (v: number) => void; on: boolean };
  const items: Item[] = Array.from(document.querySelectorAll<HTMLElement>('[data-magnet]')).map((el) => ({
    el, on: false,
    x: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }) as (v: number) => void,
    y: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' }) as (v: number) => void,
  }));
  const GAP = 4; /* minimum px kept between two magnetic items */
  const move = (e: PointerEvent) => {
    /* Rest rectangle (transform removed) and live rectangle for every item. */
    const rest = items.map((it) => {
      const r = it.el.getBoundingClientRect(), x = (gsap.getProperty(it.el, 'x') as number) || 0, y = (gsap.getProperty(it.el, 'y') as number) || 0;
      return { l: r.left - x, t: r.top - y, r: r.right - x, b: r.bottom - y, w: r.width, h: r.height, live: r };
    });
    /* Only the nearest item in reach follows the cursor, so neighbours never pull toward each other. */
    let best = -1, bestD = Infinity;
    rest.forEach((q, i) => {
      const d = Math.hypot(e.clientX - (q.l + q.w / 2), e.clientY - (q.t + q.h / 2));
      if (d < Math.max(q.w, q.h) * 0.75 + 30 && d < bestD) { best = i; bestD = d; }
    });
    items.forEach((it, i) => {
      if (i !== best) { if (it.on) { it.on = false; it.x(0); it.y(0); } return; }
      const me = rest[i];
      let dx = (e.clientX - (me.l + me.w / 2)) * 0.32, dy = (e.clientY - (me.t + me.h / 2)) * 0.32;
      const cap = me.w > 300 ? 14 : 30; /* wide items such as the email link drift only a little */
      dx = Math.max(-cap, Math.min(cap, dx)); dy = Math.max(-cap, Math.min(cap, dy));
      let mr = Infinity, ml = Infinity, md = Infinity, mu = Infinity;
      rest.forEach((o, j) => {
        if (j === i) return;
        const v = o.live; /* where the neighbour is right now */
        if (v.top < me.b && v.bottom > me.t) { /* shares a row: limit sideways travel */
          if (v.left >= me.r - 1) mr = Math.min(mr, v.left - me.r - GAP);
          if (v.right <= me.l + 1) ml = Math.min(ml, me.l - v.right - GAP);
        }
        if (v.left < me.r && v.right > me.l) { /* shares a column: limit vertical travel */
          if (v.top >= me.b - 1) md = Math.min(md, v.top - me.b - GAP);
          if (v.bottom <= me.t + 1) mu = Math.min(mu, me.t - v.bottom - GAP);
        }
      });
      dx = Math.max(-Math.max(0, ml), Math.min(Math.max(0, mr), dx));
      dy = Math.max(-Math.max(0, mu), Math.min(Math.max(0, md), dy));
      it.on = true; it.x(dx); it.y(dy);
    });
  };
  window.addEventListener('pointermove', move, { passive: true });
  return () => { window.removeEventListener('pointermove', move); items.forEach((it) => gsap.set(it.el, { x: 0, y: 0 })); };
}

/* ---------- Text scramble on hover ---------- */
export function scramble(): () => void {
  if (!rt.fine || rt.reduce) return () => {};
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ+/<>#';
  const undo: (() => void)[] = [];
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    const node = el.firstChild;
    /* Only plain text elements. The text node is edited in place so React keeps owning it. */
    if (!node || node.nodeType !== 3 || el.childNodes.length !== 1) return;
    const text = node as Text;
    const original = text.data;
    const labelled = !el.getAttribute('aria-label');
    if (labelled) el.setAttribute('aria-label', original);
    let running = false, raf = 0;
    const run = () => {
      if (running) return;
      const t0 = performance.now(), dur = 420 + original.length * 18;
      running = true;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        let out = '';
        for (let i = 0; i < original.length; i++) {
          const c = original[i];
          out += (c === ' ' || i < k * original.length) ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        text.data = out;
        if (k < 1) raf = requestAnimationFrame(step); else { text.data = original; running = false; }
      };
      step(t0);
    };
    el.addEventListener('pointerenter', run);
    el.addEventListener('focus', run);
    undo.push(() => {
      el.removeEventListener('pointerenter', run); el.removeEventListener('focus', run);
      cancelAnimationFrame(raf);
      /* React may already have written the next language into this node: only undo a scramble in progress. */
      if (running) text.data = original;
      if (labelled) el.removeAttribute('aria-label');
    });
  });
  return () => undo.forEach((u) => u());
}

/* ---------- Scroll progress bar ---------- */
export function progress(ctx: PageCtx) {
  const bar = document.getElementById('progress');
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0).toFixed(4) + ')';
  };
  ctx.on(window, 'scroll', update, { passive: true });
  update();
}

/* ---------- Marquees: constant drift, pushed by scroll velocity ---------- */
export function marquee(ctx: PageCtx) {
  const strips = Array.from(document.querySelectorAll<HTMLElement>('.marquee'));
  if (!strips.length) return;
  const data = strips.map((m) => {
    const track = m.querySelector('.marquee-track') as HTMLElement, base = track.innerHTML;
    let copies = 1;
    while (copies < 14 && track.scrollWidth < window.innerWidth * 2.6) { track.innerHTML += base; copies++; }
    ctx.cleanup(() => { track.innerHTML = base; track.style.transform = ''; });
    return { track, copies, dir: parseFloat(m.getAttribute('data-speed') || '') || 0.6, x: 0, half: track.scrollWidth / copies };
  });
  const measure = () => data.forEach((d) => { d.half = d.track.scrollWidth / d.copies; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  ctx.on(window, 'resize', measure);
  if (rt.reduce) return;
  let lastY = window.scrollY, boost = 0;
  ctx.tick((_t, dt) => {
    const y = window.scrollY, v = (y - lastY) / Math.max(dt, 0.001); lastY = y;
    boost += (clamp(v / 900, -6, 6) - boost) * 0.12;
    data.forEach((d) => {
      const speed = d.dir * 60 + d.dir * Math.abs(boost) * 90 + boost * 40;
      d.x -= speed * dt;
      if (d.x <= -d.half) d.x += d.half; else if (d.x > 0) d.x -= d.half;
      d.track.style.transform = 'translate3d(' + d.x.toFixed(1) + 'px,0,0)';
    });
  });
}

/* ---------- Statement, headings and reveals ---------- */
export function reveals(ctx: PageCtx) {
  if (rt.reduce) return;
  const g = gsap.context(() => {
    const el = document.getElementById('statement');
    if (el) {
      const original = el.textContent || '';
      const words = original.trim().split(/\s+/);
      el.textContent = '';
      const spans = words.map((word, i) => {
        const s = document.createElement('span'); s.className = 'w'; s.textContent = word; el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        return s;
      });
      ctx.cleanup(() => { el.textContent = original; });
      gsap.fromTo(spans, { opacity: 0.16 }, { opacity: 1, ease: 'none', duration: 1, stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: true } });
    }
    const cl = document.getElementById('contact-line');
    if (cl) {
      SplitText.create(cl, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, onSplit: (self) =>
        gsap.from(self.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: cl, start: 'top 85%', once: true } }) });
    }
    gsap.utils.toArray<HTMLElement>('.sec-head, .caps-grid article, .exp-list li, .contact-mail, .socials, .facts, .method-list li, .overlap').forEach((n) => {
      gsap.from(n, { y: 28, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 92%', once: true } });
    });
  });
  ctx.cleanup(() => g.revert());
}

/* ---------- Method: the rail fills with scroll and lights each step ---------- */
export function method(ctx: PageCtx) {
  const fill = document.getElementById('method-fill'), list = document.getElementById('method-list');
  if (!fill || !list || rt.reduce) return;
  const items = Array.from(list.children);
  const g = gsap.context(() => {
    gsap.to(fill, { scaleX: 1, ease: 'none', scrollTrigger: {
      trigger: list, start: 'top 78%', end: 'bottom 55%', scrub: true,
      onUpdate: (self) => { items.forEach((li, i) => li.classList.toggle('is-on', self.progress >= i / items.length + 0.02)); },
    } });
  });
  ctx.cleanup(() => { g.revert(); items.forEach((li) => li.classList.remove('is-on')); });
}


/* Work: tilting project cards, a pinned horizontal row, case studies that open with a
   shared-element (Flip) transition, and a floating preview in the index table. */
import { gsap, Flip, rt, pad, clamp, onIntro, isIntroDone } from './runtime';
import type { PageCtx } from './runtime';

export interface WorkApi { sync(hash: string): void }

export function work(ctx: PageCtx): WorkApi | null {
  const sec = document.getElementById('work'), pin = document.getElementById('work-pin'), track = document.getElementById('work-track'),
    bar = document.getElementById('work-bar'), now = document.getElementById('work-now');
  if (!sec || !pin || !track) return null;
  const panels = Array.from(track.querySelectorAll<HTMLElement>('.panel')), n = panels.length;

  /* ----- Progress counter ----- */
  const progress = (p: number) => {
    p = clamp(p, 0, 1);
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (now) now.textContent = pad(Math.min(n, Math.round(p * (n - 1)) + 1));
  };
  const nativeProgress = () => { const max = track.scrollWidth - track.clientWidth; progress(max > 0 ? track.scrollLeft / max : 0); };
  ctx.on(track, 'scroll', nativeProgress, { passive: true });
  nativeProgress();

  /* ----- Pinned horizontal row with velocity skew (desktop) ----- */
  let skew = 0, skewTarget = 0, pinned = false;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    sec.classList.add('is-pinned'); pinned = true;
    const margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--margin')) || 40;
    const dist = () => { const last = track.lastElementChild as HTMLElement; return Math.max(0, last.offsetLeft + last.offsetWidth + margin - window.innerWidth); };
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top 56px', end: () => '+=' + dist(),
        pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => { progress(self.progress); skewTarget = clamp(self.getVelocity() / -450, -5, 5); },
      },
    });
    return () => { pinned = false; sec.classList.remove('is-pinned'); gsap.set(panels, { clearProps: 'transform' }); nativeProgress(); };
  });
  ctx.cleanup(() => mm.revert());
  ctx.tick(() => {
    if (!pinned) return;
    skewTarget *= 0.9; skew += (skewTarget - skew) * 0.14;
    if (Math.abs(skew) > 0.02) gsap.set(panels, { skewX: skew }); else if (skew !== 0) { skew = 0; gsap.set(panels, { skewX: 0 }); }
  });

  /* ----- 3D tilt and glare on the project screens ----- */
  if (rt.fine && !rt.reduce) {
    const tg = gsap.context(() => {
      panels.forEach((p) => {
        const fr = p.querySelector<HTMLElement>('.frame');
        if (!fr) return;
        const rx = gsap.quickTo(fr, 'rotationX', { duration: 0.6, ease: 'power3.out' }), ry = gsap.quickTo(fr, 'rotationY', { duration: 0.6, ease: 'power3.out' }), sc = gsap.quickTo(fr, 'z', { duration: 0.6, ease: 'power3.out' });
        ctx.on(p, 'pointermove', (e: PointerEvent) => {
          if (fr.classList.contains('is-expanded')) return;
          const r = fr.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
          ry(nx * 11); rx(-ny * 9);
          fr.style.setProperty('--gx', ((nx + 0.5) * 100).toFixed(1) + '%'); fr.style.setProperty('--gy', ((ny + 0.5) * 100).toFixed(1) + '%');
        });
        ctx.on(p, 'pointerenter', () => { if (!fr.classList.contains('is-expanded')) sc(28); });
        ctx.on(p, 'pointerleave', () => { rx(0); ry(0); sc(0); });
      });
    });
    ctx.cleanup(() => tg.revert());
  }

  const api = initCases(ctx);
  initPeek(ctx);
  return api;
}

/* ---------- Case studies ---------- */
interface CaseRef { id: string; el: HTMLElement; panel: HTMLElement; frame: HTMLElement; slot: HTMLElement; stage: HTMLElement }
interface OpenOpts { history?: 'push' | 'replace' | 'none'; noFlip?: boolean; keepFocus?: boolean }

function initCases(ctx: PageCtx): WorkApi | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('.case'));
  if (!els.length) return null;
  const order: string[] = [], map: Record<string, CaseRef> = {};
  els.forEach((el) => {
    const id = el.getAttribute('data-project') || '', panel = document.querySelector<HTMLElement>('.panel[data-project="' + id + '"]');
    if (!panel) return;
    map[id] = { id, el, panel, frame: panel.querySelector('.frame') as HTMLElement, slot: panel.querySelector('.frame-slot') as HTMLElement, stage: el.querySelector('.case-stage') as HTMLElement };
    order.push(id);
  });
  const root = document.documentElement;
  let current: CaseRef | null = null, busy = false, lastFocus: HTMLElement | null = null, latestHash = location.hash, introReady = isIntroDone();
  const inertEls = [document.querySelector('main'), document.querySelector('.nav'), document.querySelector('.foot')] as (HTMLElement | null)[];
  const setInert = (on: boolean) => inertEls.forEach((n) => { if (!n) return; n.inert = on; if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden'); });
  const canFlip = () => !rt.reduce;
  const isId = (id: string) => !!map[id];
  const lang = document.documentElement.lang.indexOf('id') === 0;

  const countUp = (c: CaseRef) => {
    c.el.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const to = parseFloat(el.getAttribute('data-count') || '0'), dec = parseInt(el.getAttribute('data-dec') || '0', 10), suf = el.getAttribute('data-suffix') || '';
      const fmt = (v: number) => { const s = v.toFixed(dec); return (lang ? s.replace('.', ',') : s) + suf; }; /* Indonesian writes 99,4 */
      if (rt.reduce) { el.textContent = fmt(to); return; }
      const o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', delay: 0.6, onUpdate: () => { el.textContent = fmt(o.v); }, onComplete: () => { el.textContent = fmt(to); } });
    });
  };

  const open = (id: string, opts: OpenOpts = {}) => {
    const c = map[id];
    if (!c || current || busy) return;
    busy = true; current = c;
    if (!opts.keepFocus) lastFocus = document.activeElement as HTMLElement | null;
    if (opts.history === 'push') ctx.nav.open('#case-' + id, false, { case: id });
    else if (opts.history === 'replace') ctx.nav.open('#case-' + id, true, { case: id });
    if (rt.lenis) rt.lenis.stop();
    root.classList.add('case-open'); setInert(true);
    c.el.classList.add('is-entering', 'is-open'); c.el.scrollTop = 0;
    void c.el.offsetWidth; c.el.classList.remove('is-entering');
    const ins = c.el.querySelectorAll('[data-in]');
    const flip = canFlip() && !opts.noFlip;
    if (flip) gsap.set(c.frame, { clearProps: 'transform' });
    const state = flip ? Flip.getState(c.frame) : null;
    c.frame.classList.add('is-expanded');
    c.stage.appendChild(c.frame);
    const ready = () => {
      busy = false; root.classList.add('case-live');
      const cl = c.el.querySelector<HTMLElement>('.case-close'); if (cl) cl.focus({ preventScroll: true });
      sync(latestHash);
    };
    if (!rt.reduce) {
      gsap.from(ins, { y: 44, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: flip ? 0.45 : 0.15, clearProps: 'transform,opacity' });
      if (flip && state) Flip.from(state, { duration: 1, ease: 'expo.inOut', scale: false, onComplete: ready });
      else gsap.from(c.frame, { opacity: 0, y: 30, duration: 0.7, ease: 'expo.out', clearProps: 'transform,opacity', onComplete: ready });
    } else ready();
    countUp(c);
  };

  const finish = (c: CaseRef) => {
    c.frame.classList.remove('is-expanded');
    c.el.classList.remove('is-open', 'is-leaving', 'is-entering');
    root.classList.remove('case-open', 'case-live'); setInert(false);
    if (rt.lenis) rt.lenis.start();
    current = null; busy = false;
  };

  const close = (opts: { instant?: boolean } = {}) => {
    const c = current;
    if (!c || busy) return;
    busy = true; root.classList.remove('case-live');
    const restoreFocus = () => { if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch { /* focus can fail on detached nodes */ } } };
    if (!canFlip() || opts.instant) { c.slot.appendChild(c.frame); finish(c); restoreFocus(); sync(latestHash); return; }
    c.el.classList.add('is-leaving');
    gsap.delayedCall(0.3, () => {
      const state = Flip.getState(c.frame);
      c.slot.appendChild(c.frame);
      Flip.from(state, { duration: 0.85, ease: 'expo.inOut', scale: false, onComplete: () => { finish(c); restoreFocus(); sync(latestHash); } });
    });
  };

  const requestClose = () => {
    if (!current) return;
    const st = ctx.nav.locationState() as { case?: string } | null;
    if (st && st.case) ctx.nav.back();
    else { ctx.nav.open('', true); close(); }
  };

  const go = (dir: number) => {
    if (!current || busy) return;
    const c = current, i = order.indexOf(c.id), next = order[(i + dir + order.length) % order.length];
    c.slot.appendChild(c.frame); finish(c);
    open(next, { noFlip: true, history: 'replace', keepFocus: true });
  };

  /* The URL hash is the source of truth: back and forward open and close the layer. */
  function sync(hash: string) {
    latestHash = hash;
    if (!introReady || busy) return; /* re-applied when the intro or the transition ends */
    const id = hash.indexOf('#case-') === 0 ? hash.slice(6) : '';
    if (current) {
      if (id && isId(id) && map[id] !== current) { close({ instant: true }); open(id, { history: 'none', noFlip: true }); }
      else if (!id) close();
    } else if (id && isId(id)) open(id, { history: 'none', noFlip: true });
  }

  ctx.on(document, 'click', (e: MouseEvent) => {
    const t = e.target as Element | null;
    const a = t && t.closest ? t.closest('a[href^="#case-"]') : null;
    if (a) {
      const id = (a.getAttribute('href') || '').slice(6);
      if (!isId(id)) return;
      e.preventDefault();
      const inPanel = !!a.closest('.panel'), r = a.getBoundingClientRect();
      const onScreen = r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
      open(id, { history: 'push', noFlip: !(inPanel && onScreen) });
      return;
    }
    if (t && t.closest && t.closest('[data-case-close]')) { requestClose(); return; }
    if (t && t.closest && t.closest('[data-case-prev]')) { go(-1); return; }
    if (t && t.closest && t.closest('[data-case-next]')) { go(1); }
  });

  ctx.on(document, 'keydown', (e: KeyboardEvent) => {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
    if (e.key === 'Tab') {
      const f = Array.from(current.el.querySelectorAll<HTMLElement>('button, a[href]')).filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  let alive = true;
  onIntro(() => { if (!alive) return; introReady = true; sync(latestHash); });
  ctx.cleanup(() => {
    alive = false;
    if (current) { current.slot.appendChild(current.frame); finish(current); }
  });

  return { sync };
}

/* ---------- Index table: a floating preview follows the pointer ---------- */
function initPeek(ctx: PageCtx) {
  if (!rt.fine || rt.reduce) return;
  const rows = Array.from(document.querySelectorAll<HTMLElement>('.spec tr[data-project]'));
  if (!rows.length) return;
  const peek = document.createElement('div'), inner = document.createElement('div');
  peek.className = 'peek'; inner.className = 'peek-in'; peek.setAttribute('aria-hidden', 'true'); peek.appendChild(inner); document.body.appendChild(peek);
  ctx.cleanup(() => { gsap.killTweensOf([peek, inner]); peek.remove(); });
  const clones: Record<string, Node> = {};
  rows.forEach((r) => {
    const id = r.getAttribute('data-project') || '', shot = document.querySelector('.panel[data-project="' + id + '"] .shot');
    if (shot) clones[id] = shot.cloneNode(true);
  });
  let x = 0, y = 0, shown = false, rot = 0, active: string | null = null, frame = 0, inside = true;
  const show = (id: string) => {
    if (!clones[id]) return;
    inner.innerHTML = ''; inner.appendChild(clones[id]);
    if (!shown) { x = rt.pointer.x; y = rt.pointer.y; }
    shown = true;
    gsap.killTweensOf([peek, inner]);
    gsap.to(peek, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' });
    gsap.fromTo(inner, { scale: 0.82, rotation: -4 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'expo.out' });
  };
  const hide = () => { if (!shown) return; shown = false; active = null; gsap.to(peek, { autoAlpha: 0, duration: 0.2, ease: 'power2.in' }); gsap.to(inner, { scale: 0.9, duration: 0.3, ease: 'power2.in' }); };
  /* pointerenter/leave are unreliable when the page scrolls under a still cursor (smooth scroll, pinned
     sections), so the row under the pointer is re-checked while the preview is alive. */
  const rowUnder = () => {
    const el = document.elementFromPoint(rt.pointer.x, rt.pointer.y);
    return el && el.closest ? el.closest<HTMLElement>('.spec tr[data-project]') : null;
  };
  const sync = () => {
    const r = inside ? rowUnder() : null;
    if (!r) { hide(); return; }
    const id = r.getAttribute('data-project') || '';
    if (id !== active) { active = id; show(id); }
  };
  rows.forEach((r) => ctx.on(r, 'pointerenter', () => { inside = true; active = r.getAttribute('data-project'); if (active) show(active); }));
  ctx.on(window, 'scroll', () => { if (shown) sync(); }, { passive: true });
  ctx.on(document, 'pointerleave', () => { inside = false; hide(); });
  ctx.on(document, 'pointerenter', () => { inside = true; });
  ctx.on(window, 'blur', () => { inside = false; hide(); });
  ctx.on(document, 'visibilitychange', () => { if (document.hidden) hide(); });
  ctx.tick(() => {
    if (shown && (++frame % 4 === 0)) sync();
    if (!shown && !parseFloat(String(gsap.getProperty(peek, 'opacity')))) return;
    const P = rt.pointer, tx = P.x + 28, ty = P.y - peek.offsetHeight / 2;
    const nx = x + (tx - x) * 0.14, ny = y + (ty - y) * 0.14;
    rot += (clamp((tx - x) * 0.05, -9, 9) - rot) * 0.2;
    x = nx; y = ny;
    peek.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
  });
}

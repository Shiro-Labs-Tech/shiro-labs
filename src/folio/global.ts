/* Modules that live as long as the app: the custom cursor and smooth scrolling. */
import Lenis from 'lenis';
import { gsap, ScrollTrigger, rt, tick } from './runtime';

/* ---------- Custom cursor: dot, ring, and context labels ---------- */
export function startCursor(): () => void {
  if (!rt.fine || rt.reduce) return () => {};
  const root = document.documentElement;
  const dot = document.createElement('div'), ring = document.createElement('div');
  dot.className = 'cur-dot'; ring.className = 'cur-ring'; ring.innerHTML = '<i></i><span></span>';
  document.body.appendChild(dot); document.body.appendChild(ring);
  root.classList.add('has-cursor');
  const label = ring.querySelector('span') as HTMLSpanElement;
  let rx = rt.pointer.x, ry = rt.pointer.y;
  const stop = tick(() => {
    const p = rt.pointer;
    dot.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
    rx += (p.x - rx) * 0.2; ry += (p.y - ry) * 0.2;
    ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
  });
  const on = () => root.classList.add('cur-on');
  const off = () => root.classList.remove('cur-on');
  const over = (e: PointerEvent) => {
    const el = e.target as Element | null;
    const t = el && el.closest ? el.closest('[data-cursor]') : null;
    const l = el && el.closest ? el.closest('a,button,input,label,summary') : null;
    if (t) { label.textContent = t.getAttribute('data-cursor'); ring.classList.add('is-label'); ring.classList.remove('is-link'); dot.classList.add('is-hid'); }
    else { ring.classList.remove('is-label'); dot.classList.remove('is-hid'); ring.classList.toggle('is-link', !!l); }
  };
  const down = () => ring.classList.add('is-down');
  const up = () => ring.classList.remove('is-down');
  window.addEventListener('pointermove', on, { once: true, passive: true });
  document.addEventListener('pointerleave', off);
  document.addEventListener('pointerenter', on);
  document.addEventListener('pointerover', over);
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointerup', up);
  return () => {
    stop();
    window.removeEventListener('pointermove', on);
    document.removeEventListener('pointerleave', off);
    document.removeEventListener('pointerenter', on);
    document.removeEventListener('pointerover', over);
    document.removeEventListener('pointerdown', down);
    document.removeEventListener('pointerup', up);
    dot.remove(); ring.remove(); root.classList.remove('has-cursor', 'cur-on');
  };
}

/* ---------- Smooth scroll ---------- */
export function startSmooth(): () => void {
  if (rt.reduce) return () => {};
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  rt.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return () => { gsap.ticker.remove(raf); lenis.destroy(); rt.lenis = null; };
}

/* Jump or glide to a Y position, whichever scroller is active. */
export function scrollToY(y: number, instant: boolean) {
  if (rt.lenis) rt.lenis.scrollTo(y, { immediate: instant, force: true });
  else window.scrollTo({ top: y, behavior: 'auto' });
}

export function scrollToHash(hash: string, instant: boolean): boolean {
  if (!hash || hash.length < 2) return false;
  let target: Element | null = null;
  try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { target = null; }
  if (!target) return false;
  if (rt.lenis) rt.lenis.scrollTo(target as HTMLElement, { offset: -56, immediate: instant, force: true });
  else target.scrollIntoView({ block: 'start' });
  return true;
}

/* Shared animation runtime: GSAP plugins, environment flags, one frame loop, pointer state and
   intro hooks. Browser only: nothing here runs while prerendering. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import type Lenis from 'lenis';

export const rt = {
  reduce: false,
  fine: false,
  lenis: null as Lenis | null,
  started: false,
  pointer: { x: 0, y: 0, vx: 0, vy: 0, moved: 0 },
};

export const pad = (n: number, len = 2) => { let s = String(n); while (s.length < len) s = '0' + s; return s; };
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* Read a CSS color token as 0..1 floats. */
export function readColor(name: string): [number, number, number] {
  let v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (v.charAt(0) === '#') {
    if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return [parseInt(v.slice(1, 3), 16) / 255, parseInt(v.slice(3, 5), 16) / 255, parseInt(v.slice(5, 7), 16) / 255];
  }
  return [0.5, 0.5, 0.5];
}

/* ---------- One frame loop for everything, driven by the GSAP ticker ---------- */
export type TickFn = (t: number, dt: number) => void;
const subs = new Set<TickFn>();
let last = 0;
export function tick(fn: TickFn): () => void { subs.add(fn); return () => { subs.delete(fn); }; }
function frame() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  subs.forEach((fn) => fn(now / 1000, dt));
}

/* ---------- Intro: the loader calls introDone, other modules wait on it ---------- */
const intro = { done: false, cbs: [] as (() => void)[] };
export function onIntro(fn: () => void) { if (intro.done) fn(); else intro.cbs.push(fn); }
export function introDone() {
  if (intro.done) return;
  intro.done = true;
  intro.cbs.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
export const isIntroDone = () => intro.done;

/* Called once from the app entry in the browser. */
export function startRuntime() {
  if (rt.started) return;
  rt.started = true;
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  rt.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  rt.fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  rt.pointer.x = window.innerWidth / 2; rt.pointer.y = window.innerHeight / 2;
  document.documentElement.classList.add('js');
  window.addEventListener('pointermove', (e) => {
    const p = rt.pointer;
    p.vx = e.clientX - p.x; p.vy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY; p.moved = performance.now();
  }, { passive: true });
  last = performance.now();
  gsap.ticker.add(frame);
  setTimeout(introDone, 3600);
}

/* ---------- Per-page context: everything a module attaches is released together ---------- */
export interface PageCtx {
  /* react-router bridge for the case files */
  nav: { open(hash: string, replace: boolean, state?: unknown): void; back(): void; locationState(): unknown };
  on<K extends keyof WindowEventMap>(t: Window, type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions | boolean): void;
  on<K extends keyof DocumentEventMap>(t: Document, type: K, fn: (e: DocumentEventMap[K]) => void, opts?: AddEventListenerOptions | boolean): void;
  on(t: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean): void;
  tick(fn: TickFn): void;
  cleanup(fn: () => void): void;
}

export function createPageCtx(nav: PageCtx['nav']) {
  const undo: (() => void)[] = [];
  const ctx: PageCtx = {
    nav,
    on(t: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean) {
      t.addEventListener(type, fn, opts);
      undo.push(() => t.removeEventListener(type, fn, opts));
    },
    tick(fn) { undo.push(tick(fn)); },
    cleanup(fn) { undo.push(fn); },
  };
  return { ctx, dispose() { while (undo.length) { try { undo.pop()!(); } catch (e) { console.error(e); } } } };
}

export { gsap, ScrollTrigger, SplitText, Flip };

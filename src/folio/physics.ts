/* Toolbox: the skill chips become circles with real 2D physics (gravity, wall and
   circle collisions, pointer repel, drag and throw). Without JS or with reduced motion
   they stay a plain wrapped list. */
import { rt, clamp } from './runtime';
import type { PageCtx } from './runtime';

interface Body { el: HTMLElement; r: number; x: number; y: number; vx: number; vy: number; a: number; grab: boolean; tx: number; ty: number }

export function physics(ctx: PageCtx) {
  const box = document.getElementById('toybox'), list = document.getElementById('chips');
  if (!box || !list || rt.reduce) return;
  const items = Array.from(list.children) as HTMLElement[], bodies: Body[] = [];
  let W = 0, H = 0;
  const small = window.innerWidth < 700;
  box.classList.add('is-physics');

  items.forEach((el) => {
    const len = (el.textContent || '').length, r = (small ? 30 : 42) + Math.min(small ? 12 : 22, len * (small ? 2.2 : 3.2));
    el.style.width = el.style.height = (r * 2) + 'px';
    el.style.fontSize = (small ? 10 : 12) + 'px';
    bodies.push({ el, r, x: 0, y: -999, vx: 0, vy: 0, a: 0, grab: false, tx: 0, ty: 0 });
  });
  ctx.cleanup(() => {
    box.classList.remove('is-physics');
    items.forEach((el) => { el.style.width = ''; el.style.height = ''; el.style.fontSize = ''; el.style.transform = ''; el.classList.remove('is-grab'); });
  });

  const measure = () => {
    W = box.clientWidth; H = box.clientHeight;
    bodies.forEach((b) => { b.x = clamp(b.x, b.r, Math.max(b.r, W - b.r)); if (b.y > H - b.r) b.y = H - b.r; });
  };
  measure();
  if (window.ResizeObserver) { const ro = new ResizeObserver(measure); ro.observe(box); ctx.cleanup(() => ro.disconnect()); } else ctx.on(window, 'resize', measure);

  let active = false, started = false, awake = 0, anyGrab: Body | null = null, px = -999, py = -999, pIn = false;
  const spawn = () => {
    bodies.forEach((b, i) => {
      b.x = b.r + Math.random() * Math.max(1, W - b.r * 2);
      b.y = -b.r - i * 64; b.vx = (Math.random() - 0.5) * 160; b.vy = 0;
    });
  };
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver((es) => {
      active = es[0].isIntersecting;
      if (active && !started) { started = true; spawn(); }
      if (active) awake = 2;
    }, { threshold: 0.3 });
    io.observe(box); ctx.cleanup(() => io.disconnect());
  } else { active = started = true; spawn(); }

  const rel = (e: PointerEvent) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  ctx.on(box, 'pointermove', (e: PointerEvent) => {
    const p = rel(e); px = p.x; py = p.y; pIn = e.pointerType === 'mouse'; awake = 2;
    if (anyGrab) { anyGrab.tx = clamp(p.x, anyGrab.r, W - anyGrab.r); anyGrab.ty = clamp(p.y, anyGrab.r, H - anyGrab.r); }
  }, { passive: true });
  ctx.on(box, 'pointerleave', () => { pIn = false; });
  ctx.on(list, 'pointerdown', (e: PointerEvent) => {
    const li = (e.target as Element).closest ? (e.target as Element).closest('li') : null;
    if (!li) return;
    const b = bodies.filter((o) => o.el === li)[0];
    if (!b) return;
    e.preventDefault();
    try { li.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    const p = rel(e); b.grab = true; b.tx = p.x; b.ty = p.y; anyGrab = b; li.classList.add('is-grab'); awake = 3;
  });
  const release = () => {
    if (!anyGrab) return;
    anyGrab.grab = false; anyGrab.el.classList.remove('is-grab'); anyGrab = null; awake = 3;
  };
  ctx.on(list, 'pointerup', release); ctx.on(list, 'pointercancel', release);

  let acc = 0;
  const step = (dt: number) => {
    const g = 1500;
    let i: number, j: number, b: Body, o: Body;
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (b.grab) { b.vx = clamp((b.tx - b.x) * 18, -3200, 3200); b.vy = clamp((b.ty - b.y) * 18, -3200, 3200); }
      else {
        b.vy += g * dt;
        if (pIn && !anyGrab) {
          const dx = b.x - px, dy = b.y - py, d = Math.sqrt(dx * dx + dy * dy), R = b.r + 80;
          if (d < R && d > 0.1) { const f = (1 - d / R) * 1400 * dt; b.vx += dx / d * f; b.vy += dy / d * f; }
        }
      }
      b.vx *= 0.999; b.vy *= 0.999;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.4; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.4; }
      if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.32; b.vx *= 0.985; }
      if (b.y < -600) { b.y = -600; b.vy = Math.abs(b.vy) * 0.3; }
    }
    for (let it = 0; it < 3; it++) {
      for (i = 0; i < bodies.length; i++) {
        for (j = i + 1; j < bodies.length; j++) {
          b = bodies[i]; o = bodies[j];
          const cx = o.x - b.x, cy = o.y - b.y, dist = Math.sqrt(cx * cx + cy * cy), min = b.r + o.r;
          if (dist >= min || dist === 0) continue;
          const nx = cx / dist, ny = cy / dist, ov = min - dist;
          const wb = b.grab ? 0 : (o.grab ? 1 : 0.5), wo = o.grab ? 0 : (b.grab ? 1 : 0.5);
          b.x -= nx * ov * wb; b.y -= ny * ov * wb; o.x += nx * ov * wo; o.y += ny * ov * wo;
          const vn = (o.vx - b.vx) * nx + (o.vy - b.vy) * ny;
          if (vn < 0) {
            const imp = -(1 + 0.3) * vn;
            if (!b.grab) { b.vx -= nx * imp * wb; b.vy -= ny * imp * wb; }
            if (!o.grab) { o.vx += nx * imp * wo; o.vy += ny * imp * wo; }
          }
        }
      }
    }
  };

  ctx.tick((_t, dt) => {
    if (!active || document.hidden || !started) return;
    if (awake <= 0 && !anyGrab) return;
    acc += Math.min(dt, 0.05);
    const h = 1 / 120;
    while (acc >= h) { step(h); acc -= h; }
    let moving = false;
    bodies.forEach((b) => {
      b.a += (clamp(b.vx * 0.0012, -0.5, 0.5) - b.a) * 0.12;
      b.el.style.transform = 'translate3d(' + (b.x - b.r).toFixed(1) + 'px,' + (b.y - b.r).toFixed(1) + 'px,0) rotate(' + b.a.toFixed(3) + 'rad)';
      if (Math.abs(b.vx) + Math.abs(b.vy) > 14) moving = true;
    });
    awake = moving || anyGrab || pIn ? 2 : awake - dt;
  });
}

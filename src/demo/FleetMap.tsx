import { useEffect, useRef } from 'react';
import { Fleet, STOPS, MAP_W, MAP_H, STATUSES, type Status } from './fleetSim';

export interface MapControl { playing: boolean; rate: number; stress: boolean }
interface Props {
  fleet: Fleet; control: React.RefObject<MapControl>; selected: string | null; onSelect: (id: string | null) => void;
  onFps: (fps: number) => void; label: string; stressCount: number;
}

type Colors = Record<'ink' | 'muted' | 'rule' | 'accent' | 'panel', string> & Record<Status, string>;
const readColors = (el: HTMLElement): Colors => {
  const cs = getComputedStyle(el), g = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return {
    ink: g('--ink', '#111'), muted: g('--muted', '#777'), rule: g('--rule', '#ccc'), accent: g('--accent', '#c4300a'), panel: g('--panel', '#fff'),
    moving: g('--st-moving', '#1f9d6b'), delayed: g('--st-delayed', '#d4351c'), loading: g('--st-loading', '#3b82c4'), idle: g('--st-idle', '#d99a1a'), offline: g('--st-offline', '#8b8f8c'),
  };
};

/* The map is a canvas on purpose: thousands of moving routes stay smooth, which is the point of the demo. */
export default function FleetMap({ fleet, control, selected, onSelect, onFps, label, stressCount }: Props) {
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const sel = useRef(selected); sel.current = selected;
  const cbs = useRef({ onSelect, onFps }); cbs.current = { onSelect, onFps };

  useEffect(() => {
    const wrap = box.current!, canvas = cv.current!, ctx = canvas.getContext('2d');
    if (!ctx) return;
    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0, colors = readColors(wrap), still: HTMLCanvasElement | null = null;
    const hover = { id: null as string | null, x: 0, y: 0 };

    /* Stress routes: typed arrays, one colour band per status so each band is a single fillStyle. */
    const N = stressCount, ax = new Float32Array(N), ay = new Float32Array(N), bx = new Float32Array(N), by = new Float32Array(N), ph = new Float32Array(N), sp = new Float32Array(N);
    const band = [0.52, 0.12, 0.14, 0.1, 0.12];
    let seed = 99;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < N; i++) {
      const a = STOPS[Math.floor(rnd() * STOPS.length)], b = STOPS[Math.floor(rnd() * STOPS.length)];
      ax[i] = a.x; ay[i] = a.y; bx[i] = b.x; by[i] = b.y; ph[i] = rnd(); sp[i] = 0.006 + rnd() * 0.01;
    }
    const bandEnd = band.map((_, k) => Math.floor(band.slice(0, k + 1).reduce((s, v) => s + v, 0) * N));

    const px = (x: number) => ox + x * scale, py = (y: number) => oy + y * scale;

    const buildStill = () => {
      const c = document.createElement('canvas'); c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr);
      const g = c.getContext('2d')!; g.scale(dpr, dpr);
      g.strokeStyle = colors.rule; g.lineWidth = 1; g.globalAlpha = 0.55;
      g.beginPath();
      for (let x = 0; x <= MAP_W + 1e-6; x += 0.1) { g.moveTo(px(x), py(0)); g.lineTo(px(x), py(MAP_H)); }
      for (let y = 0; y <= MAP_H + 1e-6; y += 0.1) { g.moveTo(px(0), py(y)); g.lineTo(px(MAP_W), py(y)); }
      g.stroke();
      g.globalAlpha = 1; g.lineWidth = 7; g.strokeStyle = colors.rule; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px(0), py(0.46)); g.bezierCurveTo(px(0.4), py(0.36), px(0.7), py(0.66), px(1.0), py(0.5)); g.bezierCurveTo(px(1.25), py(0.38), px(1.4), py(0.62), px(MAP_W), py(0.54)); g.stroke();
      g.font = '500 10px "IBM Plex Mono", ui-monospace, monospace'; g.textBaseline = 'middle';
      for (const s of STOPS) {
        if (s.depot) { g.fillStyle = colors.ink; g.fillRect(px(s.x) - 5, py(s.y) - 5, 10, 10); }
        else { g.strokeStyle = colors.muted; g.lineWidth = 1.5; g.beginPath(); g.arc(px(s.x), py(s.y), 3.5, 0, 6.2832); g.stroke(); }
      }
      still = c;
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      scale = Math.min(W / MAP_W, H / MAP_H); ox = (W - MAP_W * scale) / 2; oy = (H - MAP_H * scale) / 2;
      buildStill();
    };
    const ro = new ResizeObserver(resize); ro.observe(wrap); resize();
    const onPalette = () => { colors = readColors(wrap); buildStill(); };
    window.addEventListener('palettechange', onPalette);

    const hit = (cx: number, cy: number) => {
      let best: string | null = null, bd = 16 * 16;
      for (const v of fleet.vehicles) { const dx = px(v.x) - cx, dy = py(v.y) - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = v.id; } }
      return best;
    };
    const rel = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onMove = (e: PointerEvent) => { const p = rel(e); hover.x = p.x; hover.y = p.y; hover.id = hit(p.x, p.y); canvas.style.cursor = hover.id ? 'pointer' : 'default'; };
    const onLeave = () => { hover.id = null; };
    const onClick = (e: PointerEvent) => { const p = rel(e); cbs.current.onSelect(hit(p.x, p.y)); };
    canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerleave', onLeave); canvas.addEventListener('click', onClick as unknown as EventListener);

    let raf = 0, last = performance.now(), sampleAcc = 0, fpsAcc = 0, fpsFrames = 0, t = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
      const c = control.current!;
      if (c.playing) {
        let left = dt * 60 * c.rate;
        while (left > 0) { const s = Math.min(20, left); fleet.step(s); left -= s; }
      }
      sampleAcc += dt; if (sampleAcc > 0.5) { sampleAcc = 0; if (c.playing) fleet.sample(); }
      fpsAcc += dt; fpsFrames++;
      if (fpsAcc >= 0.5) { if (c.stress) cbs.current.onFps(Math.round(fpsFrames / fpsAcc)); fpsAcc = 0; fpsFrames = 0; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (still) ctx.drawImage(still, 0, 0, W, H);
      const cl = fleet.closure;
      if (cl) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = colors.accent; ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.1;
        ctx.beginPath(); ctx.arc(px(cl.x), py(cl.y), cl.r * scale, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.restore();
      }
      const sv = sel.current ? fleet.vehicles.find((v) => v.id === sel.current) : undefined;
      if (sv) {
        ctx.save(); ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5; ctx.setLineDash([4, 4]); ctx.beginPath();
        sv.route.forEach((si, k) => { const s = STOPS[si]; if (k === 0) ctx.moveTo(px(s.x), py(s.y)); else ctx.lineTo(px(s.x), py(s.y)); });
        ctx.stroke(); ctx.restore();
      }
      if (c.stress) {
        const phase = t;
        let k = 0;
        for (let b = 0; b < 5; b++) {
          ctx.fillStyle = colors[STATUSES[b]]; ctx.globalAlpha = 0.85;
          ctx.beginPath();
          for (; k < bandEnd[b]; k++) {
            let u = (ph[k] + phase * sp[k]) % 2; if (u > 1) u = 2 - u;
            ctx.rect(px(ax[k] + (bx[k] - ax[k]) * u) - 1, py(ay[k] + (by[k] - ay[k]) * u) - 1, 2, 2);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      for (const v of fleet.vehicles) {
        const x = px(v.x), y = py(v.y), isSel = v.id === sel.current;
        ctx.fillStyle = colors[v.status]; ctx.beginPath(); ctx.arc(x, y, isSel ? 6 : 4.2, 0, 6.2832); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = colors.panel; ctx.stroke();
        if (isSel) { ctx.lineWidth = 2; ctx.strokeStyle = colors.ink; ctx.beginPath(); ctx.arc(x, y, 10, 0, 6.2832); ctx.stroke(); }
      }
      if (hover.id) {
        const v = fleet.vehicles.find((q) => q.id === hover.id);
        if (v) {
          ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
          const text = v.id + '  ' + Math.round(v.speed) + ' km/h', w = ctx.measureText(text).width + 14;
          const tx = Math.min(W - w - 4, Math.max(4, hover.x + 12)), ty = Math.max(4, hover.y - 30);
          ctx.fillStyle = colors.ink; ctx.fillRect(tx, ty, w, 22);
          ctx.fillStyle = colors.panel; ctx.textBaseline = 'middle'; ctx.fillText(text, tx + 7, ty + 11);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('palettechange', onPalette);
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('click', onClick as unknown as EventListener);
    };
  }, [fleet, control, stressCount]);

  return (
    <div className="fl-map" ref={box}>
      <canvas ref={cv} role="img" aria-label={label} />
    </div>
  );
}

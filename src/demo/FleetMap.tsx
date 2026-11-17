import { useEffect, useRef } from 'react';
import { Fleet, STOPS, MAP_W, MAP_H, STATUSES, VT, type Status } from './fleetSim';

export interface MapControl { playing: boolean; rate: number; stress: boolean }
interface Props {
  fleet: Fleet; control: React.RefObject<MapControl>; selected: string | null; onSelect: (id: string | null) => void;
  order?: string | null; onSelectOrder?: (id: string | null) => void; candidates?: string[];
  onFps?: (fps: number) => void; label: string; stressCount: number; className?: string;
}

type Colors = Record<'ink' | 'muted' | 'rule' | 'accent' | 'panel', string> & Record<Status, string>;
const readColors = (el: HTMLElement): Colors => {
  const cs = getComputedStyle(el), g = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return {
    ink: g('--ink', '#111'), muted: g('--muted', '#777'), rule: g('--rule', '#ccc'), accent: g('--accent', '#c4300a'), panel: g('--panel', '#fff'),
    moving: g('--st-moving', '#1f9d6b'), delayed: g('--st-delayed', '#d4351c'), loading: g('--st-loading', '#3b82c4'), idle: g('--st-idle', '#d99a1a'),
    offline: g('--st-offline', '#8b8f8c'), down: g('--st-down', '#8a3fb0'), maintenance: g('--st-maint', '#6a7380'),
  };
};

/* The map is a canvas on purpose: thousands of moving routes stay smooth, which is the point of the stress test.
   It only draws. The simulation clock is advanced by the app, so several maps can share one fleet. */
export default function FleetMap({ fleet, control, selected, onSelect, order = null, onSelectOrder, candidates, onFps, label, stressCount, className }: Props) {
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const live = useRef({ selected, order, candidates }); live.current = { selected, order, candidates };
  const cbs = useRef({ onSelect, onSelectOrder, onFps }); cbs.current = { onSelect, onSelectOrder, onFps };

  useEffect(() => {
    const wrap = box.current!, canvas = cv.current!, ctx = canvas.getContext('2d');
    if (!ctx) return;
    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0, colors = readColors(wrap), still: HTMLCanvasElement | null = null;
    const hover = { kind: '' as '' | 'v' | 'o', id: '', x: 0, y: 0 };

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
    const mono = '500 10px "IBM Plex Mono", ui-monospace, monospace';

    const buildStill = () => {
      const c = document.createElement('canvas'); c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr);
      const g = c.getContext('2d')!; g.scale(dpr, dpr);
      g.strokeStyle = colors.rule; g.lineWidth = 1; g.globalAlpha = 0.5;
      g.beginPath();
      for (let x = 0; x <= MAP_W + 1e-6; x += 0.1) { g.moveTo(px(x), py(0)); g.lineTo(px(x), py(MAP_H)); }
      for (let y = 0; y <= MAP_H + 1e-6; y += 0.1) { g.moveTo(px(0), py(y)); g.lineTo(px(MAP_W), py(y)); }
      g.stroke();
      g.globalAlpha = 1; g.lineWidth = 7; g.strokeStyle = colors.rule; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px(0), py(0.46)); g.bezierCurveTo(px(0.4), py(0.36), px(0.7), py(0.66), px(1.0), py(0.5)); g.bezierCurveTo(px(1.25), py(0.38), px(1.4), py(0.62), px(MAP_W), py(0.54)); g.stroke();
      for (const s of STOPS) {
        if (s.depot) { g.fillStyle = colors.ink; g.fillRect(px(s.x) - 6, py(s.y) - 6, 12, 12); g.fillStyle = colors.panel; g.fillRect(px(s.x) - 2, py(s.y) - 2, 4, 4); }
        else { g.strokeStyle = colors.muted; g.globalAlpha = 0.5; g.lineWidth = 1; g.beginPath(); g.arc(px(s.x), py(s.y), 9, 0, 6.2832); g.stroke(); g.globalAlpha = 1; }
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

    const hit = (cx: number, cy: number): { kind: '' | 'v' | 'o'; id: string } => {
      let best = '', bd = 15 * 15, kind: '' | 'v' | 'o' = '';
      for (const v of fleet.vehicles) { const dx = px(v.x) - cx, dy = py(v.y) - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = v.id; kind = 'v'; } }
      if (!kind) { bd = 12 * 12; for (const o of fleet.orders) { if (o.status === 'delivered') continue; const dx = px(o.x) - cx, dy = py(o.y) - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o.id; kind = 'o'; } } }
      return { kind, id: best };
    };
    const rel = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onMove = (e: PointerEvent) => { const p = rel(e), h = hit(p.x, p.y); hover.x = p.x; hover.y = p.y; hover.kind = h.kind; hover.id = h.id; canvas.style.cursor = h.kind ? 'pointer' : 'default'; };
    const onLeave = () => { hover.kind = ''; };
    const onClick = (e: PointerEvent) => {
      const p = rel(e), h = hit(p.x, p.y);
      if (h.kind === 'o') { cbs.current.onSelectOrder?.(h.id); } else if (h.kind === 'v') { cbs.current.onSelect(h.id); } else { cbs.current.onSelect(null); cbs.current.onSelectOrder?.(null); }
    };
    canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerleave', onLeave); canvas.addEventListener('click', onClick as unknown as EventListener);

    const diamond = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); };

    let raf = 0, last = performance.now(), fpsAcc = 0, fpsFrames = 0, t = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const c = control.current!;
      if (c.playing) t += dt;
      fpsAcc += dt; fpsFrames++;
      if (fpsAcc >= 0.5) { if (c.stress) cbs.current.onFps?.(Math.round(fpsFrames / fpsAcc)); fpsAcc = 0; fpsFrames = 0; }
      const { selected: selId, order: ordId, candidates: cand } = live.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (still) ctx.drawImage(still, 0, 0, W, H);
      const cl = fleet.closure;
      if (cl) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = colors.accent; ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.1;
        ctx.beginPath(); ctx.arc(px(cl.x), py(cl.y), cl.r * scale, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.restore();
      }
      const sv = selId ? fleet.vehicle(selId) : undefined;
      /* every waiting or planned order */
      for (const o of fleet.orders) {
        if (o.status === 'delivered') continue;
        const x = px(o.x), y = py(o.y), mine = sv && o.vehicle === sv.id;
        if (o.status === 'new') {
          ctx.lineWidth = 1.6; ctx.strokeStyle = colors.accent; diamond(x, y, o.rush ? 6.5 : 5);
          if (o.rush) { ctx.fillStyle = colors.accent; ctx.fill(); } else { ctx.fillStyle = colors.panel; ctx.fill(); ctx.stroke(); }
        } else if (!sv || mine) {
          ctx.lineWidth = 1.4; ctx.strokeStyle = mine ? colors.ink : colors.muted; ctx.fillStyle = colors.panel; ctx.beginPath(); ctx.rect(x - 3, y - 3, 6, 6); ctx.fill(); ctx.stroke();
        }
      }
      if (sv) {
        ctx.save(); ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.55; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px(sv.x), py(sv.y));
        sv.jobs.forEach((id) => { const o = fleet.order(id); if (o) ctx.lineTo(px(o.x), py(o.y)); });
        ctx.stroke(); ctx.restore();
        ctx.font = mono; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        sv.jobs.forEach((id, k) => { const o = fleet.order(id); if (!o) return; ctx.fillStyle = colors.ink; ctx.fillText(String(k + 1), px(o.x), py(o.y) - 11); });
        ctx.textAlign = 'start';
      }
      const so = ordId ? fleet.order(ordId) : undefined;
      if (so && so.status !== 'delivered') {
        const x = px(so.x), y = py(so.y);
        if (cand) cand.forEach((vid, k) => {
          const v = fleet.vehicle(vid); if (!v) return;
          ctx.save(); ctx.strokeStyle = colors.accent; ctx.globalAlpha = k === 0 ? 0.95 : 0.4; ctx.lineWidth = k === 0 ? 2 : 1.2; ctx.setLineDash(k === 0 ? [] : [4, 4]);
          ctx.beginPath(); ctx.moveTo(px(v.x), py(v.y)); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
        });
        ctx.strokeStyle = colors.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 12 + Math.sin(t * 4) * 1.2, 0, 6.2832); ctx.stroke();
      }
      if (c.stress) {
        let k = 0;
        for (let b = 0; b < 5; b++) {
          ctx.fillStyle = colors[STATUSES[b]]; ctx.globalAlpha = 0.85;
          ctx.beginPath();
          for (; k < bandEnd[b]; k++) {
            let u = (ph[k] + t * sp[k]) % 2; if (u > 1) u = 2 - u;
            ctx.rect(px(ax[k] + (bx[k] - ax[k]) * u) - 1, py(ay[k] + (by[k] - ay[k]) * u) - 1, 2, 2);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      for (const v of fleet.vehicles) {
        const x = px(v.x), y = py(v.y), isSel = v.id === selId, r = (v.type === 'truck' ? 5.4 : v.type === 'van' ? 4.6 : 3.8) + (isSel ? 1.6 : 0);
        ctx.fillStyle = colors[v.status]; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = colors.panel; ctx.stroke();
        if (v.status === 'down') { ctx.strokeStyle = colors.panel; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 2.4, y - 2.4); ctx.lineTo(x + 2.4, y + 2.4); ctx.moveTo(x + 2.4, y - 2.4); ctx.lineTo(x - 2.4, y + 2.4); ctx.stroke(); }
        if (isSel) { ctx.lineWidth = 2; ctx.strokeStyle = colors.ink; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.2832); ctx.stroke(); }
      }
      if (hover.kind) {
        let text = '';
        if (hover.kind === 'v') { const v = fleet.vehicle(hover.id); if (v) text = v.id + '  ' + Math.round(v.speed) + ' km/h  ' + VT[v.type].cap + ' kg'; }
        else { const o = fleet.order(hover.id); if (o) text = o.id + '  ' + o.customer; }
        if (text) {
          ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
          const w = ctx.measureText(text).width + 14, tx = Math.min(W - w - 4, Math.max(4, hover.x + 12)), ty = Math.max(4, hover.y - 30);
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
    <div className={'fl-map' + (className ? ' ' + className : '')} ref={box}>
      <canvas ref={cv} role="img" aria-label={label} />
    </div>
  );
}

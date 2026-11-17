/* Sample fleet for the dashboard demo. Everything here is invented: no real vehicles, drivers or places.
   The sim is deterministic (seeded) so the prerendered HTML and the first client render match. */

export type Status = 'moving' | 'delayed' | 'loading' | 'idle' | 'offline';
export const STATUSES: Status[] = ['moving', 'delayed', 'loading', 'idle', 'offline'];

/* Map space: x 0..1.6, y 0..1. One unit is about 20 km. */
export const MAP_W = 1.6, MAP_H = 1;
const KM_PER_UNIT = 20;

export interface Stop { name: string; x: number; y: number; depot: boolean }
export const STOPS: Stop[] = [
  { name: 'North Depot', x: 0.62, y: 0.14, depot: true },
  { name: 'East Depot', x: 1.38, y: 0.5, depot: true },
  { name: 'South Depot', x: 0.5, y: 0.88, depot: true },
  { name: 'Market Hall', x: 0.28, y: 0.3, depot: false },
  { name: 'Grand Pharmacy', x: 0.9, y: 0.3, depot: false },
  { name: 'Harbour Warehouse', x: 1.2, y: 0.12, depot: false },
  { name: 'City Mall', x: 0.8, y: 0.55, depot: false },
  { name: 'Textile Yard', x: 0.12, y: 0.62, depot: false },
  { name: 'Cold Store', x: 1.05, y: 0.72, depot: false },
  { name: 'Tech Park', x: 1.5, y: 0.2, depot: false },
  { name: 'Hospital Annex', x: 0.4, y: 0.52, depot: false },
  { name: 'Fuel Terminal', x: 1.28, y: 0.86, depot: false },
  { name: 'School Canteens', x: 0.7, y: 0.74, depot: false },
  { name: 'Bakery Row', x: 0.2, y: 0.9, depot: false },
  { name: 'Airport Cargo', x: 1.52, y: 0.68, depot: false },
];

const FIRST = ['Budi', 'Sari', 'Agus', 'Dewi', 'Rudi', 'Lina', 'Hadi', 'Maya', 'Eko', 'Rina', 'Joko', 'Tika', 'Dani', 'Nia', 'Fajar', 'Ayu', 'Bayu', 'Citra', 'Dimas', 'Putri'];
const LAST = ['S.', 'W.', 'P.', 'H.', 'K.', 'R.', 'T.', 'N.', 'A.', 'M.'];

export interface Vehicle {
  id: string; driver: string; route: number[]; leg: number; u: number; /* progress 0..1 along the current leg */
  x: number; y: number; status: Status; speed: number; fuel: number; delay: number; /* minutes */
  dwell: number; idleFor: number; /* sim seconds */ cargo: string; speeds: number[];
  alerted: { late: boolean; idle: boolean; fuel: boolean };
}
export interface Alert { id: number; kind: 'late' | 'idle' | 'fuel' | 'offline' | 'closure' | 'cleared'; vehicle: string; at: number }
export interface Closure { x: number; y: number; r: number; until: number }

export interface Kpis { onTime: number; active: number; delayed: number; idle: number; avgDelay: number }

const CARGO = ['Fresh produce', 'Pharmacy', 'Parcels', 'Cold chain', 'Textiles', 'Electronics', 'Bakery', 'Fuel'];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Fleet {
  vehicles: Vehicle[] = [];
  alerts: Alert[] = [];
  closure: Closure | null = null;
  clock = 6 * 3600 + 30 * 60; /* sim seconds since midnight, starts 06:30 */
  private r = rng(7);
  private alertId = 0;

  constructor(public count = 48) { this.reset(); }

  reset() {
    this.r = rng(7);
    this.alertId = 0; this.alerts = []; this.closure = null; this.clock = 6 * 3600 + 30 * 60;
    const r = this.r;
    this.vehicles = Array.from({ length: this.count }, (_, i) => {
      const depot = i % 3, route = [depot];
      const n = 3 + Math.floor(r() * 3);
      while (route.length < n + 1) { const s = 3 + Math.floor(r() * (STOPS.length - 3)); if (route[route.length - 1] !== s) route.push(s); }
      route.push(depot);
      const leg = Math.floor(r() * (route.length - 1)), u = r();
      const a = STOPS[route[leg]], b = STOPS[route[leg + 1]];
      const v: Vehicle = {
        id: 'JKT-' + String(i + 1).padStart(3, '0'), driver: FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)],
        route, leg, u, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u,
        status: 'moving', speed: 0, fuel: 35 + Math.floor(r() * 60), delay: Math.floor(r() * 7) + (i % 11 === 3 ? 8 : 0), dwell: 0, idleFor: 0,
        cargo: CARGO[Math.floor(r() * CARGO.length)], speeds: [], alerted: { late: false, idle: false, fuel: false },
      };
      v.speed = 28 + Math.floor(r() * 24);
      for (let k = 0; k < 40; k++) v.speeds.push(v.speed + Math.round((r() - 0.5) * 8));
      if (i % 17 === 5) { v.status = 'offline'; v.speed = 0; v.speeds.fill(0); }
      this.classify(v);
      return v;
    });
  }

  private push(kind: Alert['kind'], vehicle: string) {
    this.alerts.unshift({ id: ++this.alertId, kind, vehicle, at: this.clock });
    if (this.alerts.length > 40) this.alerts.length = 40;
  }

  private classify(v: Vehicle) {
    if (v.status === 'offline') return;
    if (v.dwell > 0) v.status = 'loading';
    else if (v.speed < 3 && v.idleFor > 0) v.status = 'idle';
    else v.status = v.delay >= 10 ? 'delayed' : 'moving';
  }

  closeRoad(near?: { x: number; y: number }) {
    const r = this.r, p = near ?? { x: 0.35 + r() * 0.9, y: 0.25 + r() * 0.5 };
    this.closure = { x: p.x, y: p.y, r: 0.2, until: this.clock + 25 * 60 };
    this.push('closure', '');
  }
  clearClosure() { if (this.closure) { this.closure = null; this.push('cleared', ''); } }

  /* Advance by `dt` simulated seconds. */
  step(dt: number) {
    this.clock += dt;
    if (this.closure && this.clock >= this.closure.until) this.clearClosure();
    const c = this.closure, r = this.r;
    for (const v of this.vehicles) {
      if (v.status === 'offline') continue;
      if (v.dwell > 0) {
        v.dwell -= dt; v.speed = 0;
        if (v.dwell <= 0) { v.dwell = 0; v.leg = (v.leg + 1) % (v.route.length - 1); v.u = 0; v.speed = 30 + Math.floor(r() * 20); v.idleFor = 0; }
      } else if (v.idleFor > 0 || (r() < dt / 90000 && v.fuel > 20)) {
        /* a rare breakdown or break: stand still for a while */
        v.idleFor += dt; v.speed = 0;
        if (v.idleFor > 1500 + (v.id.charCodeAt(5) % 5) * 300) v.idleFor = 0;
      } else {
        let factor = 1;
        if (c && Math.hypot(v.x - c.x, v.y - c.y) < c.r) factor = 0.22;
        const target = (30 + (v.id.charCodeAt(6) % 20)) * factor;
        v.speed += (target - v.speed) * Math.min(1, dt / 40);
        const a = STOPS[v.route[v.leg]], b = STOPS[v.route[v.leg + 1]];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 0.01;
        v.u += (v.speed / 3600 / KM_PER_UNIT) * dt / len;
        if (factor < 1) v.delay += (dt / 60) * (1 - factor) * 0.6; else v.delay = Math.max(0, v.delay - dt / 60 * 0.03);
        v.fuel = Math.max(0, v.fuel - dt / 3600 * 6);
        if (v.u >= 1) { v.u = 1; v.dwell = 120 + Math.floor(r() * 180); v.speed = 0; }
        v.x = a.x + (b.x - a.x) * v.u; v.y = a.y + (b.y - a.y) * v.u;
      }
      this.classify(v);
      if (v.delay >= 10 && !v.alerted.late) { v.alerted.late = true; this.push('late', v.id); }
      if (v.delay < 6) v.alerted.late = false;
      if (v.idleFor > 900 && !v.alerted.idle) { v.alerted.idle = true; this.push('idle', v.id); }
      if (v.idleFor === 0) v.alerted.idle = false;
      if (v.fuel < 15 && !v.alerted.fuel) { v.alerted.fuel = true; this.push('fuel', v.id); }
      if (v.fuel >= 15) v.alerted.fuel = false;
    }
  }

  /* Call about twice a second: the per-vehicle speed trace for the detail panel. */
  sample() { for (const v of this.vehicles) { v.speeds.push(Math.round(v.speed)); if (v.speeds.length > 40) v.speeds.shift(); } }

  kpis(): Kpis {
    const active = this.vehicles.filter((v) => v.status !== 'offline');
    const late = active.filter((v) => v.delay >= 10);
    const idle = active.filter((v) => v.idleFor > 900);
    const avg = active.length ? active.reduce((s, v) => s + v.delay, 0) / active.length : 0;
    return { onTime: active.length ? Math.round(((active.length - late.length) / active.length) * 1000) / 10 : 100, active: active.length, delayed: late.length, idle: idle.length, avgDelay: Math.round(avg * 10) / 10 };
  }
}

export const clockText = (s: number) => {
  const m = Math.floor(s / 60) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

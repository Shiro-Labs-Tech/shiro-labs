/* Sample dispatch engine for the Shiro Dispatch demo.
   Everything here is invented: no real vehicles, drivers, customers or places.
   The engine is deterministic (seeded) so the prerendered HTML and the first client render match. */

export type Status = 'moving' | 'delayed' | 'loading' | 'idle' | 'offline' | 'down' | 'maintenance';
export const STATUSES: Status[] = ['moving', 'delayed', 'loading', 'idle', 'offline', 'down', 'maintenance'];

/* Map space: x 0..1.6, y 0..1. One unit is 20 km. */
export const MAP_W = 1.6, MAP_H = 1, KM = 20;
export const DAY_START = 6 * 3600 + 30 * 60;

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

export type VType = 'motor' | 'van' | 'truck';
/* cap in kg, speed in km/h, fuelPerKm in tank percent, kmCost in rupiah (fuel plus wear), interval in km between services */
export const VT: Record<VType, { cap: number; speed: number; fuelPerKm: number; kmCost: number; interval: number }> = {
  motor: { cap: 60, speed: 38, fuelPerKm: 0.35, kmCost: 900, interval: 4000 },
  van: { cap: 900, speed: 34, fuelPerKm: 0.5, kmCost: 1800, interval: 10000 },
  truck: { cap: 3000, speed: 28, fuelPerKm: 0.8, kmCost: 3200, interval: 12000 },
};

const FIRST = ['Budi', 'Sari', 'Agus', 'Dewi', 'Rudi', 'Lina', 'Hadi', 'Maya', 'Eko', 'Rina', 'Joko', 'Tika', 'Dani', 'Nia', 'Fajar', 'Ayu', 'Bayu', 'Citra'];
const LAST = ['S.', 'W.', 'P.', 'H.', 'K.', 'R.', 'T.', 'N.', 'A.', 'M.'];
const CUSTOMERS = ['Warung Mawar', 'Toko Sinar Baru', 'Apotek Sehat', 'Kopi Tepi Kali', 'Roti Hangat', 'Mini Mart Sentosa', 'Klinik Pratama Asri', 'Resto Laut Biru', 'Toko Bangunan Jaya', 'Salon Dewi', 'Bengkel Mandiri', 'Katering Ibu Sari', 'Toko Buku Pelita', 'Kedai Nusantara', 'Laundry Bersih', 'Grosir Makmur', 'Studio Lensa', 'Toko Mas Permata', 'Dapur Rasa', 'Koperasi Tani Makmur', 'Kafe Senja', 'Toko Kain Sutra', 'Depot Es Segar', 'Pasar Mini Raya', 'Optik Terang', 'Toko Elektronik Maju', 'Warung Padang Sederhana', 'Pusat Kue Manis'];
export const CARGO = ['Fresh produce', 'Pharmacy', 'Parcels', 'Cold chain', 'Textiles', 'Electronics', 'Bakery'] as const;
export type Cargo = typeof CARGO[number];
export const FAIL_REASONS = ['Customer not available', 'Address not found', 'Delivery refused'] as const;
export const POD_KINDS = ['Signature', 'Photo', 'PIN code'] as const;

export type OrderStatus = 'new' | 'planned' | 'enroute' | 'serving' | 'delivered';
export interface Order {
  id: string; customer: string; area: number; x: number; y: number; weight: number; cargo: Cargo; rush: boolean;
  winStart: number; winEnd: number; service: number; created: number;
  status: OrderStatus; vehicle: string; eta: number; predLate: number; /* minutes, predicted */
  attempts: number; failReason: string; doneAt: number; late: number; pod: string;
  sent: ('ontheway' | 'delay' | 'delivered')[];
}

export type Phase = 'park' | 'drive' | 'service' | 'return' | 'toshop' | 'shop';
export interface Vehicle {
  id: string; type: VType; driver: string; depot: number; x: number; y: number; phase: Phase;
  jobs: string[]; svc: number; hold: number; holdKind: '' | 'break' | 'refuel'; brk: number;
  speed: number; fuel: number; odo: number; lastSvc: number; signalBackAt: number; fault: boolean;
  status: Status; risk: boolean; speeds: number[]; km: number; runSec: number; idleSec: number; done: number; onTimeDone: number;
}

export type AlertKind = 'risk' | 'down' | 'offline' | 'idle' | 'fuel' | 'service' | 'closure' | 'rush' | 'queue' | 'failed' | 'weather';
export type Severity = 'critical' | 'warn' | 'info';
export interface Alert { id: number; key: string; kind: AlertKind; sev: Severity; vehicle: string; order: string; n: number; m: number; at: number; at2: number; state: 'open' | 'ack' | 'resolved' }
export interface Closure { x: number; y: number; r: number; until: number }
export interface WorkOrder { id: string; vehicle: string; kind: ServiceKind; state: 'open' | 'inshop' | 'done'; opened: number; cost: number; doneAt: number }
export const SERVICE_KINDS = ['Scheduled service', 'Brake inspection', 'Tyre replacement', 'Oil and filters'] as const;
export type ServiceKind = typeof SERVICE_KINDS[number];
export interface Notif { id: number; at: number; order: string; customer: string; kind: 'ontheway' | 'delay' | 'delivered'; eta: number }
export interface Settings { autoAssign: boolean; autoNotify: boolean; lateMin: number; idleMin: number; fuelPct: number }
export interface Suggestion { vehicle: string; pos: number; eta: number; lateMin: number; addedKm: number; loadPct: number; lateJobs: number; blocked: '' | 'capacity' | 'cold' | 'unavailable' }

export interface Kpis {
  onTime: number; firstAttempt: number; active: number; total: number; atRisk: number; unassigned: number; delivered: number; orders: number;
  utilization: number; notified: number; pmCompliance: number; overdue: number; openAlerts: number; km: number; idlePct: number; costPerKm: number;
}

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

/* Length of the segment (x0,y0)-(x1,y1) that lies inside the circle c, in map units. */
function chord(x0: number, y0: number, x1: number, y1: number, c: { x: number; y: number; r: number }) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  if (L < 1e-9) return 0;
  const fx = x0 - c.x, fy = y0 - c.y, a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), k = fx * fx + fy * fy - c.r * c.r;
  let disc = b * b - 4 * a * k;
  if (disc <= 0) return 0;
  disc = Math.sqrt(disc);
  const t0 = Math.max(0, (-b - disc) / (2 * a)), t1 = Math.min(1, (-b + disc) / (2 * a));
  return t1 > t0 ? (t1 - t0) * L : 0;
}

const DEFAULTS: Settings = { autoAssign: true, autoNotify: true, lateMin: 10, idleMin: 15, fuelPct: 15 };

export class Fleet {
  vehicles: Vehicle[] = [];
  orders: Order[] = [];
  alerts: Alert[] = [];
  workOrders: WorkOrder[] = [];
  notifs: Notif[] = [];
  closure: Closure | null = null;
  settings: Settings = { ...DEFAULTS };
  clock = DAY_START;
  slowUntil = 0;
  failed = 0; delivered = 0; onTime = 0; firstTry = 0; notifCount = 0; fuelSpent = 0;
  flags = { closure: false, assign: false, breakdown: false, reassign: false, shop: false, exported: false };
  private r = rng(7);
  private alertId = 0; private orderNo = 0; private woNo = 1040; private notifId = 0;
  nextPlan = 0; planEvery = 600;
  private nextArrival = 0; private evalAcc = 0; private slow = 1;
  private O = new Map<string, Order>();
  private V = new Map<string, Vehicle>();

  constructor(public count = 18) { this.reset(); }

  order(id: string) { return this.O.get(id); }
  vehicle(id: string) { return this.V.get(id); }

  reset() {
    this.r = rng(7);
    this.alertId = 0; this.orderNo = 0; this.woNo = 1040; this.notifId = 0;
    this.alerts = []; this.workOrders = []; this.notifs = []; this.orders = []; this.closure = null; this.settings = { ...DEFAULTS };
    this.clock = DAY_START - 5 * 60; this.slowUntil = 0; this.slow = 1;
    this.failed = 0; this.delivered = 0; this.onTime = 0; this.firstTry = 0; this.notifCount = 0; this.fuelSpent = 0;
    this.flags = { closure: false, assign: false, breakdown: false, reassign: false, shop: false, exported: false };
    this.O = new Map(); this.V = new Map();
    const r = this.r;
    this.vehicles = Array.from({ length: this.count }, (_, i) => {
      const type: VType = i < 6 ? 'motor' : i < 14 ? 'van' : 'truck', d = i % 3, dep = STOPS[d];
      const interval = VT[type].interval;
      /* a few vehicles start overdue or close to service so the maintenance views have something to show */
      const toService = i === 2 ? -180 : i === 9 ? -420 : i === 15 ? -60 : i === 5 ? 22 : i === 11 ? 340 : i === 7 ? 18 : Math.floor(600 + r() * (interval - 800));
      const odo = 18000 + Math.floor(r() * 60000);
      const v: Vehicle = {
        id: 'HC-' + String(i + 1).padStart(2, '0'), type, driver: FIRST[i % FIRST.length] + ' ' + LAST[Math.floor(r() * LAST.length)], depot: d, x: dep.x, y: dep.y, phase: 'park',
        jobs: [], svc: 0, hold: 0, holdKind: '', brk: 0, speed: 0, fuel: 38 + Math.floor(r() * 58), odo, lastSvc: odo + toService - interval, signalBackAt: 0, fault: false,
        status: 'idle', risk: false, speeds: [], km: 0, runSec: 0, idleSec: 0, done: 0, onTimeDone: 0,
      };
      this.V.set(v.id, v);
      return v;
    });
    /* the morning's orders, most already planned */
    for (let i = 0; i < 52; i++) this.addOrder(false, i % 3 === 0);
    const todo = this.orders.slice().sort((a, b) => a.winEnd - b.winEnd);
    for (let i = 0; i < 46; i++) { const s = this.suggest(todo[i].id).find((x) => !x.blocked); if (s) this.assign(todo[i].id, s.vehicle, s.pos); }
    this.syncStatuses();
    this.nextArrival = 120; this.nextPlan = 420;
    /* run the first half hour so the board starts mid-morning, not empty */
    for (let k = 0; k < 150; k++) this.step(20);
    this.alerts = []; this.alertId = 0; this.flags.assign = false; this.flags.closure = false;
    this.nextPlan = 420; this.evalAcc = 0;
    for (let i = 0; i < 5; i++) this.addOrder(true, false, i === 4);
    /* one vehicle has lost signal with jobs on board: the first story of the day */
    const lost = this.vehicles.find((v) => v.jobs.length >= 2 && v.type === 'van');
    if (lost) { lost.signalBackAt = this.clock + 40 * 60; lost.speed = 0; }
    this.workOrders.push({ id: 'WO-' + ++this.woNo, vehicle: 'HC-02', kind: 'Brake inspection', state: 'open', opened: this.clock - 3 * 3600, cost: 650000, doneAt: 0 });
    this.workOrders.push({ id: 'WO-' + ++this.woNo, vehicle: 'HC-16', kind: 'Oil and filters', state: 'open', opened: this.clock - 26 * 3600, cost: 420000, doneAt: 0 });
    const shop = this.vehicles[12];
    shop.jobs.forEach((id) => { const o = this.O.get(id)!; o.status = 'new'; o.vehicle = ''; });
    shop.jobs = []; shop.phase = 'shop'; shop.hold = 70 * 60; shop.x = STOPS[shop.depot].x; shop.y = STOPS[shop.depot].y;
    this.workOrders.push({ id: 'WO-' + ++this.woNo, vehicle: shop.id, kind: 'Tyre replacement', state: 'inshop', opened: this.clock - 50 * 60, cost: 1850000, doneAt: 0 });
    this.syncStatuses(); this.evaluate();
  }

  /* ---------- orders ---------- */
  private addOrder(live: boolean, tight = false, rush = false): Order {
    const r = this.r, id = 'ORD-' + (4800 + ++this.orderNo);
    const area = 3 + Math.floor(r() * (STOPS.length - 3)), s = STOPS[area];
    const roll = r(), weight = roll < 0.55 ? 5 + Math.floor(r() * 40) : roll < 0.9 ? 80 + Math.floor(r() * 270) : 600 + Math.floor(r() * 800);
    const cargo = CARGO[Math.floor(r() * CARGO.length)];
    const now = this.clock;
    let winStart: number, winEnd: number;
    if (live) { winStart = now + (10 + Math.floor(r() * 50)) * 60; winEnd = winStart + (45 + Math.floor(r() * 75)) * 60; }
    else if (tight) { winStart = DAY_START; winEnd = DAY_START + (45 + Math.floor(r() * 60)) * 60; }
    else { winStart = DAY_START + (20 + Math.floor(r() * 180)) * 60; winEnd = winStart + (60 + Math.floor(r() / 0.5) * 30) * 60; }
    if (rush) { winStart = now; winEnd = now + 45 * 60; }
    const o: Order = {
      id, customer: CUSTOMERS[Math.floor(r() * CUSTOMERS.length)], area, x: s.x + (r() - 0.5) * 0.12, y: s.y + (r() - 0.5) * 0.12, weight, cargo, rush,
      winStart, winEnd, service: Math.min(900, 240 + Math.floor(weight * 0.6) + Math.floor(r() * 120)), created: live ? now : DAY_START - Math.floor(r() * 3600),
      status: 'new', vehicle: '', eta: 0, predLate: 0, attempts: 0, failReason: '', doneAt: 0, late: 0, pod: '', sent: [],
    };
    this.O.set(id, o); this.orders.push(o);
    if (this.orders.length > 360) { const gone = this.orders.filter((x) => x.status === 'delivered').slice(0, 80); gone.forEach((g) => this.O.delete(g.id)); this.orders = this.orders.filter((x) => this.O.has(x.id)); }
    return o;
  }

  unassigned() { return this.orders.filter((o) => o.status === 'new'); }

  /* ---------- planning ---------- */
  /* Projected arrival times for `ids` as if this vehicle drove them in order from where it is now. */
  plan(v: Vehicle, ids: string[]) {
    const out: { id: string; eta: number; km: number }[] = [];
    let t = this.clock, x = v.x, y = v.y, i = 0;
    const sp = VT[v.type].speed * this.slow;
    if (v.fault) t = Infinity;
    else if (v.signalBackAt) t += Math.max(0, v.signalBackAt - this.clock);
    if (v.hold > 0) t += v.hold;
    if (v.phase === 'toshop' || v.phase === 'shop') t = Infinity;
    if (v.phase === 'service' && ids.length && ids[0] === v.jobs[0]) {
      const o = this.O.get(ids[0])!; out.push({ id: o.id, eta: this.clock, km: 0 }); t += v.svc; x = o.x; y = o.y; i = 1;
    }
    for (; i < ids.length; i++) {
      const o = this.O.get(ids[i])!, d = Math.hypot(o.x - x, o.y - y), inside = this.closure ? chord(x, y, o.x, o.y, this.closure) : 0;
      t += ((d - inside) * KM / sp + inside * KM / (sp * 0.22)) * 3600;
      out.push({ id: o.id, eta: t, km: d * KM }); t += o.service; x = o.x; y = o.y;
    }
    return out;
  }

  private cost(v: Vehicle, ids: string[]) {
    const p = this.plan(v, ids);
    let late = 0, lateMin = 0, km = 0;
    for (const s of p) { const o = this.O.get(s.id)!, l = (s.eta - o.winEnd) / 60; if (l > 0) { late++; lateMin += Math.min(l, 600); } km += s.km; }
    return { late, lateMin, km };
  }

  load(v: Vehicle) { return v.jobs.reduce((s, id) => s + (this.O.get(id)?.weight ?? 0), 0); }
  available(v: Vehicle) { return !v.fault && !v.signalBackAt && v.phase !== 'toshop' && v.phase !== 'shop'; }

  /* Rank every vehicle for an order: cheapest insertion point, lateness, added distance, capacity and cargo rules. */
  suggest(orderId: string): Suggestion[] {
    const o = this.O.get(orderId);
    if (!o) return [];
    const out: Suggestion[] = [];
    for (const v of this.vehicles) {
      const cap = VT[v.type].cap, loadPct = Math.round(((this.load(v) + o.weight) / cap) * 100);
      let blocked: Suggestion['blocked'] = '';
      if (!this.available(v)) blocked = 'unavailable';
      else if (this.load(v) + o.weight > cap) blocked = 'capacity';
      else if (o.cargo === 'Cold chain' && v.type === 'motor') blocked = 'cold';
      const base = this.cost(v, v.jobs);
      let best = { pos: v.jobs.length, ...this.cost(v, [...v.jobs, o.id]), eta: 0 };
      const first = v.phase === 'service' ? 1 : 0;
      for (let p = first; p <= v.jobs.length; p++) {
        const ids = [...v.jobs.slice(0, p), o.id, ...v.jobs.slice(p)], c = this.cost(v, ids);
        if (p === first || c.late * 1e6 + c.lateMin * 100 + c.km < best.late * 1e6 + best.lateMin * 100 + best.km) best = { pos: p, ...c, eta: 0 };
      }
      const ids = [...v.jobs.slice(0, best.pos), o.id, ...v.jobs.slice(best.pos)], mine = this.plan(v, ids).find((s) => s.id === o.id);
      const eta = mine ? mine.eta : Infinity;
      out.push({ vehicle: v.id, pos: best.pos, eta, lateMin: Math.round((eta - o.winEnd) / 60), addedKm: Math.max(0, Math.round((best.km - base.km) * 10) / 10), loadPct, lateJobs: Math.max(0, best.late - base.late), blocked });
    }
    return out.sort((a, b) => {
      const ab = a.blocked ? 1 : 0, bb = b.blocked ? 1 : 0;
      if (ab !== bb) return ab - bb;
      const al = a.lateJobs * 1e6 + Math.max(0, a.lateMin) * 100 + a.addedKm, bl = b.lateJobs * 1e6 + Math.max(0, b.lateMin) * 100 + b.addedKm;
      return al - bl || (a.vehicle < b.vehicle ? -1 : 1);
    });
  }

  assign(orderId: string, vehicleId: string, pos?: number): { ok: boolean; reason: '' | 'capacity' | 'cold' | 'unavailable' | 'missing' } {
    const o = this.O.get(orderId), v = this.V.get(vehicleId);
    if (!o || !v) return { ok: false, reason: 'missing' };
    if (!this.available(v)) return { ok: false, reason: 'unavailable' };
    if (this.load(v) + o.weight > VT[v.type].cap) return { ok: false, reason: 'capacity' };
    if (o.cargo === 'Cold chain' && v.type === 'motor') return { ok: false, reason: 'cold' };
    if (o.vehicle) this.unassignOne(o);
    const at = pos === undefined ? v.jobs.length : Math.max(v.phase === 'service' ? 1 : 0, Math.min(pos, v.jobs.length));
    v.jobs.splice(at, 0, o.id); o.vehicle = v.id; o.status = 'planned';
    if (v.phase === 'park' || v.phase === 'return') v.phase = 'drive';
    this.syncStatuses();
    return { ok: true, reason: '' };
  }

  private unassignOne(o: Order) {
    const v = this.V.get(o.vehicle);
    if (v) { const i = v.jobs.indexOf(o.id); if (i >= 0) v.jobs.splice(i, 1); if (!v.jobs.length && v.phase === 'drive') v.phase = 'return'; if (!v.jobs.length && v.phase === 'service') v.phase = 'return'; }
    o.vehicle = ''; o.status = 'new';
  }
  unassign(orderId: string) { const o = this.O.get(orderId); if (o && o.status !== 'delivered' && o.vehicle) { this.unassignOne(o); this.syncStatuses(); } }

  /* Assign every waiting order to its best vehicle, rush orders and tight windows first. */
  autoAssign() {
    let assigned = 0, left = 0;
    const queue = this.unassigned().sort((a, b) => (a.rush === b.rush ? a.winEnd - b.winEnd : a.rush ? -1 : 1));
    for (const o of queue) {
      const s = this.suggest(o.id).find((x) => !x.blocked);
      if (s && this.assign(o.id, s.vehicle, s.pos).ok) assigned++; else left++;
    }
    this.evaluate();
    return { assigned, left };
  }

  /* Reorder one vehicle's stops to cut lateness first, distance second. */
  optimize(vehicleId: string) {
    const v = this.V.get(vehicleId);
    if (!v || v.jobs.length < 2) return { changed: false, kmSaved: 0, lateBefore: 0, lateAfter: 0 };
    const fixed = v.phase === 'service' ? v.jobs.slice(0, 1) : [], rest = v.jobs.slice(fixed.length);
    const before = this.cost(v, v.jobs);
    let best = { ids: v.jobs, ...before };
    const score = (c: { late: number; lateMin: number; km: number }) => c.late * 1e6 + c.lateMin * 100 + c.km;
    const tryIds = (ids: string[]) => { const c = this.cost(v, [...fixed, ...ids]); if (score(c) < score(best)) best = { ids: [...fixed, ...ids], ...c }; };
    if (rest.length <= 6) {
      const perm = (a: string[], k: number) => { if (k === a.length) { tryIds(a.slice()); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
      perm(rest.slice(), 0);
    } else {
      const left = rest.slice(), seq: string[] = []; let x = v.x, y = v.y;
      while (left.length) { let bi = 0, bd = Infinity; left.forEach((id, i) => { const o = this.O.get(id)!, d = Math.hypot(o.x - x, o.y - y) + (o.winEnd - this.clock) / 3600 * 0.05; if (d < bd) { bd = d; bi = i; } }); const o = this.O.get(left[bi])!; seq.push(o.id); x = o.x; y = o.y; left.splice(bi, 1); }
      tryIds(seq);
    }
    if (score(best) < score(before) - 1e-6) { v.jobs = best.ids.slice(); this.syncStatuses(); this.evaluate(); return { changed: true, kmSaved: Math.max(0, Math.round((before.km - best.km) * 10) / 10), lateBefore: before.late, lateAfter: best.late }; }
    return { changed: false, kmSaved: 0, lateBefore: before.late, lateAfter: before.late };
  }

  /* Move a vehicle's open jobs to the best of the others. */
  reassignJobs(vehicleId: string) {
    const v = this.V.get(vehicleId);
    if (!v) return { moved: 0, left: 0 };
    const ids = v.jobs.slice(v.phase === 'service' && this.available(v) ? 1 : 0);
    ids.forEach((id) => { const o = this.O.get(id)!; this.unassignOne(o); });
    let moved = 0, left = 0;
    for (const id of ids) {
      const s = this.suggest(id).find((x) => !x.blocked && x.vehicle !== vehicleId);
      if (s && this.assign(id, s.vehicle, s.pos).ok) moved++; else left++;
    }
    if (moved) this.flags.reassign = true;
    this.evaluate();
    return { moved, left };
  }

  /* ---------- scenarios ---------- */
  closeRoad(near?: { x: number; y: number }) {
    const r = this.r, p = near ?? { x: 0.35 + r() * 0.9, y: 0.25 + r() * 0.5 };
    this.closure = { x: p.x, y: p.y, r: 0.2, until: this.clock + 35 * 60 };
    this.flags.closure = true; this.evaluate();
  }
  clearClosure() { if (this.closure) { this.closure = null; this.evaluate(); } }
  breakdown(vehicleId?: string) {
    const v = (vehicleId ? this.V.get(vehicleId) : undefined) ?? this.vehicles.find((x) => x.phase === 'drive' && x.jobs.length >= 2 && !x.fault && !x.signalBackAt) ?? this.vehicles.find((x) => x.jobs.length && !x.fault);
    if (!v) return null;
    v.fault = true; v.speed = 0; this.flags.breakdown = true; this.evaluate();
    return v.id;
  }
  rushOrder() { const o = this.addOrder(true, false, true); if (this.settings.autoAssign) this.autoAssign(); this.evaluate(); return o; }
  signalLoss(vehicleId?: string) {
    const v = (vehicleId ? this.V.get(vehicleId) : undefined) ?? this.vehicles.find((x) => x.phase === 'drive' && !x.fault && !x.signalBackAt);
    if (!v) return null;
    v.signalBackAt = this.clock + 25 * 60; v.speed = 0; this.evaluate();
    return v.id;
  }
  rain() { this.slowUntil = this.clock + 45 * 60; this.slow = 0.7; this.evaluate(); }
  get raining() { return this.slowUntil > this.clock; }
  refuel(vehicleId: string) { const v = this.V.get(vehicleId); if (v && !v.fault) { v.hold = 600; v.holdKind = 'refuel'; v.speed = 0; this.evaluate(); } }
  acknowledge(id: number) { const a = this.alerts.find((x) => x.id === id); if (a && a.state === 'open') a.state = 'ack'; }
  dismiss(id: number) { const a = this.alerts.find((x) => x.id === id); if (a && a.state !== 'resolved') { a.state = 'resolved'; a.at2 = this.clock; } }

  /* ---------- maintenance ---------- */
  kmToService(v: Vehicle) { return Math.round(v.lastSvc + VT[v.type].interval - v.odo); }
  serviceState(v: Vehicle): 'ok' | 'soon' | 'overdue' { const k = this.kmToService(v); return k <= 0 ? 'overdue' : k <= 500 ? 'soon' : 'ok'; }
  openWorkOrder(vehicleId: string) { return this.workOrders.find((w) => w.vehicle === vehicleId && w.state !== 'done'); }
  createWorkOrder(vehicleId: string, kind: ServiceKind = 'Scheduled service') {
    const ex = this.openWorkOrder(vehicleId);
    if (ex) return ex;
    const w: WorkOrder = { id: 'WO-' + ++this.woNo, vehicle: vehicleId, kind, state: 'open', opened: this.clock, cost: kind === 'Tyre replacement' ? 1850000 : kind === 'Brake inspection' ? 650000 : kind === 'Oil and filters' ? 420000 : 900000, doneAt: 0 };
    this.workOrders.unshift(w);
    return w;
  }
  /* Hand the vehicle's jobs to others, send it to its depot workshop. */
  sendToShop(vehicleId: string) {
    const v = this.V.get(vehicleId);
    if (!v || v.phase === 'shop' || v.phase === 'toshop') return { moved: 0, left: 0 };
    const w = this.createWorkOrder(vehicleId), res = this.reassignJobs(vehicleId);
    v.fault = false; v.signalBackAt = 0; v.hold = 0; v.holdKind = ''; v.phase = 'toshop'; w.state = 'inshop';
    this.flags.shop = true; this.syncStatuses(); this.evaluate();
    return res;
  }
  finishWorkOrder(vehicleId: string) {
    const v = this.V.get(vehicleId);
    if (v && v.phase === 'shop') this.finishShop(v);
  }
  private finishShop(v: Vehicle) {
    v.lastSvc = v.odo; v.fault = false; v.phase = 'park'; v.hold = 0; v.speed = 0; v.fuel = 100;
    const w = this.openWorkOrder(v.id);
    if (w) { w.state = 'done'; w.doneAt = this.clock; }
    this.syncStatuses(); this.evaluate();
  }

  /* ---------- simulation ---------- */
  step(dt: number) {
    this.clock += dt;
    if (this.closure && this.clock >= this.closure.until) this.closure = null;
    if (this.slow < 1 && this.clock >= this.slowUntil) this.slow = 1;
    this.nextArrival -= dt;
    while (this.nextArrival <= 0) { this.addOrder(true, false, this.r() < 0.1); this.nextArrival += 240 + Math.floor(this.r() * 300); }
    if (this.settings.autoAssign) { this.nextPlan -= dt; if (this.nextPlan <= 0) { this.nextPlan = this.planEvery; if (this.unassigned().length) this.autoAssign(); } }
    for (const v of this.vehicles) this.advance(v, dt);
    this.evalAcc += dt;
    if (this.evalAcc >= 30) { this.evalAcc = 0; this.evaluate(); }
  }

  private moveToward(v: Vehicle, tx: number, ty: number, dt: number): boolean {
    const c = this.closure, inC = c ? Math.hypot(v.x - c.x, v.y - c.y) < c.r : false;
    const base = VT[v.type].speed * this.slow * (inC ? 0.22 : 1) * (0.92 + (v.id.charCodeAt(4) % 5) * 0.03);
    v.speed += (base - v.speed) * Math.min(1, dt / 40);
    const step = (v.speed / 3600) * dt / KM, d = Math.hypot(tx - v.x, ty - v.y), km = Math.min(step, d) * KM;
    v.odo += km; v.km += km; v.fuel = Math.max(0, v.fuel - km * VT[v.type].fuelPerKm); v.runSec += dt; this.fuelSpent += km * VT[v.type].kmCost;
    if (step >= d) { v.x = tx; v.y = ty; v.speed = 0; return true; }
    v.x += ((tx - v.x) / d) * step; v.y += ((ty - v.y) / d) * step;
    return false;
  }

  private advance(v: Vehicle, dt: number) {
    if (v.signalBackAt) { if (this.clock >= v.signalBackAt) v.signalBackAt = 0; else { v.speed = 0; return; } }
    if (v.fault) { v.speed = 0; return; }
    if (v.phase === 'shop') { v.hold -= dt; v.speed = 0; if (v.hold <= 0) this.finishShop(v); return; }
    if (v.hold > 0) {
      v.hold -= dt; v.speed = 0;
      if (v.holdKind === 'break') { v.idleSec += dt; v.runSec += dt; v.brk += dt; }
      if (v.hold <= 0) { v.hold = 0; if (v.holdKind === 'refuel') v.fuel = 100; v.holdKind = ''; v.brk = 0; }
      return;
    }
    if (v.phase === 'park') { v.speed = 0; if (v.jobs.length) v.phase = 'drive'; else return; }
    if (v.fuel <= 0) { v.speed = 0; return; }
    if (v.phase === 'drive') {
      const o = this.O.get(v.jobs[0]);
      if (!o) { v.phase = 'return'; return; }
      if (this.r() < dt / (3600 * 6)) { v.hold = 600 + Math.floor(this.r() * 1500); v.holdKind = 'break'; v.brk = 0; v.speed = 0; return; }
      if (this.moveToward(v, o.x, o.y, dt)) { v.phase = 'service'; v.svc = o.service; }
    } else if (v.phase === 'service') {
      v.speed = 0; v.svc -= dt; v.runSec += dt;
      if (v.svc <= 0) this.complete(v);
    } else if (v.phase === 'return' || v.phase === 'toshop') {
      const dep = STOPS[v.depot];
      if (this.moveToward(v, dep.x, dep.y, dt)) {
        if (v.phase === 'toshop') { v.phase = 'shop'; v.hold = 90 * 60; } else v.phase = v.jobs.length ? 'drive' : 'park';
      }
    }
  }

  private complete(v: Vehicle) {
    const id = v.jobs.shift()!, o = this.O.get(id);
    if (o) {
      if (this.r() < 0.035) {
        o.attempts++; o.failReason = FAIL_REASONS[Math.floor(this.r() * FAIL_REASONS.length)]; o.status = 'new'; o.vehicle = ''; o.winStart = this.clock + 45 * 60; o.winEnd = this.clock + 150 * 60; o.sent = [];
        this.failed++; this.raise('failed:' + o.id + ':' + o.attempts, 'failed', 'warn', v.id, o.id, o.attempts, 0);
      } else {
        o.status = 'delivered'; o.doneAt = this.clock; o.late = Math.max(0, Math.round((this.clock - o.winEnd) / 60)); o.pod = POD_KINDS[(o.id.charCodeAt(6) + o.weight) % POD_KINDS.length];
        this.delivered++; v.done++; if (o.late === 0) { this.onTime++; v.onTimeDone++; } if (o.attempts === 0) this.firstTry++;
        this.notify(o, 'delivered');
      }
    }
    v.phase = v.jobs.length ? 'drive' : 'return';
  }

  private notify(o: Order, kind: Notif['kind']) {
    if (o.sent.includes(kind)) return;
    o.sent.push(kind); this.notifCount++;
    this.notifs.unshift({ id: ++this.notifId, at: this.clock, order: o.id, customer: o.customer, kind, eta: o.eta });
    if (this.notifs.length > 60) this.notifs.length = 60;
  }
  /* The dispatcher can send an update by hand, even with automatic updates off. */
  notifyNow(orderId: string) {
    const o = this.O.get(orderId);
    if (!o || o.status === 'delivered') return false;
    const kind: Notif['kind'] = o.predLate > 0 ? 'delay' : 'ontheway';
    o.sent = o.sent.filter((k) => k !== kind); this.notify(o, kind);
    return true;
  }

  syncStatuses() {
    for (const o of this.orders) if (o.status !== 'delivered' && !o.vehicle) o.status = 'new';
    for (const v of this.vehicles) v.jobs.forEach((id, i) => {
      const o = this.O.get(id);
      if (o) o.status = i === 0 ? (v.phase === 'service' ? 'serving' : v.phase === 'drive' ? 'enroute' : 'planned') : 'planned';
    });
  }

  private classify(v: Vehicle): Status {
    if (v.signalBackAt) return 'offline';
    if (v.fault) return 'down';
    if (v.phase === 'shop' || v.phase === 'toshop') return 'maintenance';
    if (v.phase === 'service') return 'loading';
    if (v.holdKind === 'break' || v.holdKind === 'refuel' || v.fuel <= 0) return 'idle';
    if (v.phase === 'park') return 'idle';
    return v.risk ? 'delayed' : 'moving';
  }

  /* Re-read ETAs, set statuses and raise or clear alerts. Runs every 30 simulated seconds and after every action. */
  evaluate() {
    this.syncStatuses();
    const s = this.settings;
    let queueRisk = 0;
    for (const v of this.vehicles) {
      const plan = this.plan(v, v.jobs);
      let risky = 0, worst = 0;
      for (const p of plan) {
        const o = this.O.get(p.id)!;
        o.eta = p.eta; o.predLate = Number.isFinite(p.eta) ? Math.max(0, Math.round((p.eta - o.winEnd) / 60)) : 999;
        if (o.predLate >= s.lateMin) { risky++; worst = Math.max(worst, o.predLate === 999 ? 999 : o.predLate); }
        if (s.autoNotify && Number.isFinite(p.eta)) {
          if (o.predLate > 0 && o.predLate >= s.lateMin) this.notify(o, 'delay');
          else if (p.eta - this.clock <= 30 * 60 && v.phase !== 'park') this.notify(o, 'ontheway');
        }
      }
      v.risk = plan.some((p) => (this.O.get(p.id)!.predLate) > 0);
      v.status = this.classify(v);
      const k = (x: string) => x + ':' + v.id;
      if (risky && v.status !== 'maintenance') this.raise(k('risk'), 'risk', worst >= 30 ? 'critical' : 'warn', v.id, '', risky, worst); else this.clear(k('risk'));
      if (v.signalBackAt) this.raise(k('offline'), 'offline', 'warn', v.id, '', v.jobs.length, Math.ceil((v.signalBackAt - this.clock) / 60)); else this.clear(k('offline'));
      if (v.fault) this.raise(k('down'), 'down', 'critical', v.id, '', v.jobs.length, 0); else this.clear(k('down'));
      const stalled = v.holdKind === 'break' && v.brk >= s.idleMin * 60;
      if (stalled) this.raise(k('idle'), 'idle', 'info', v.id, '', Math.round(v.brk / 60), 0); else this.clear(k('idle'));
      if (v.fuel < s.fuelPct && v.phase !== 'shop') this.raise(k('fuel'), 'fuel', v.fuel <= 0 ? 'critical' : 'warn', v.id, '', Math.round(v.fuel), 0); else this.clear(k('fuel'));
      if (this.serviceState(v) === 'overdue' && v.phase !== 'shop' && v.phase !== 'toshop') this.raise(k('service'), 'service', 'warn', v.id, '', -this.kmToService(v), 0); else this.clear(k('service'));
    }
    for (const o of this.orders) {
      if (o.status === 'new') { if (o.winEnd - this.clock < 30 * 60) queueRisk++; if (o.rush) this.raise('rush:' + o.id, 'rush', 'critical', '', o.id, 0, Math.round((o.winEnd - this.clock) / 60)); }
      else this.clear('rush:' + o.id);
    }
    for (const a of this.alerts) if (a.kind === 'failed' && a.state !== 'resolved') { const o = this.O.get(a.order); if (o && o.status !== 'new') { a.state = 'resolved'; a.at2 = this.clock; } }
    if (queueRisk) this.raise('queue', 'queue', 'warn', '', '', queueRisk, 0); else this.clear('queue');
    if (this.closure) { let n = 0; for (const v of this.vehicles) { const p = this.plan(v, v.jobs); let x = v.x, y = v.y; for (const q of p) { const o = this.O.get(q.id)!; if (chord(x, y, o.x, o.y, this.closure) > 0) n++; x = o.x; y = o.y; } } this.raise('closure', 'closure', 'warn', '', '', n, Math.ceil((this.closure.until - this.clock) / 60)); } else this.clear('closure');
    if (this.slow < 1) this.raise('weather', 'weather', 'info', '', '', 0, Math.ceil((this.slowUntil - this.clock) / 60)); else this.clear('weather');
  }

  private raise(key: string, kind: AlertKind, sev: Severity, vehicle: string, order: string, n: number, m: number) {
    const a = this.alerts.find((x) => x.key === key && x.state !== 'resolved');
    if (a) { a.n = n; a.m = m; a.sev = sev; return; }
    this.alerts.unshift({ id: ++this.alertId, key, kind, sev, vehicle, order, n, m, at: this.clock, at2: 0, state: 'open' });
    if (this.alerts.length > 70) { const i = this.alerts.map((x) => x.state).lastIndexOf('resolved'); this.alerts.splice(i >= 0 ? i : this.alerts.length - 1, 1); }
  }
  private clear(key: string) { for (const a of this.alerts) if (a.key === key && a.state !== 'resolved') { a.state = 'resolved'; a.at2 = this.clock; } }

  /* About twice a second: the per-vehicle speed trace. */
  sample() { for (const v of this.vehicles) { v.speeds.push(Math.round(v.speed)); if (v.speeds.length > 40) v.speeds.shift(); } }

  kpis(): Kpis {
    const inService = this.vehicles.filter((v) => v.status !== 'maintenance'), active = this.vehicles.filter((v) => v.status !== 'offline' && v.status !== 'down' && v.status !== 'maintenance');
    const working = inService.filter((v) => v.phase === 'drive' || v.phase === 'service' || v.phase === 'return').length;
    const atRisk = this.orders.filter((o) => o.status !== 'delivered' && o.status !== 'new' && o.predLate >= this.settings.lateMin).length;
    const overdue = this.vehicles.filter((v) => this.serviceState(v) === 'overdue').length;
    const km = this.vehicles.reduce((s, v) => s + v.km, 0), run = this.vehicles.reduce((s, v) => s + v.runSec, 0), idle = this.vehicles.reduce((s, v) => s + v.idleSec, 0);
    return {
      onTime: this.delivered ? Math.round((this.onTime / this.delivered) * 1000) / 10 : 100,
      firstAttempt: this.delivered + this.failed ? Math.round((this.firstTry / (this.delivered + this.failed)) * 1000) / 10 : 100,
      active: active.length, total: this.vehicles.length, atRisk, unassigned: this.unassigned().length, delivered: this.delivered,
      orders: this.orders.length, utilization: inService.length ? Math.round((working / inService.length) * 100) : 0, notified: this.notifCount,
      pmCompliance: Math.round(((this.vehicles.length - overdue) / this.vehicles.length) * 100), overdue,
      openAlerts: this.alerts.filter((a) => a.state === 'open').length, km: Math.round(km), idlePct: run > 0 ? Math.round((idle / run) * 1000) / 10 : 0,
      costPerKm: km > 5 ? Math.round(this.fuelSpent / km) : 0,
    };
  }
}

export const clockText = (s: number) => {
  const m = ((Math.floor(s / 60) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

/* ---------- fourteen days of history for the reports view (seeded, not live) ---------- */
export interface DayStat { label: string; orders: number; onTime: number; firstAttempt: number; km: number; costPerKm: number; utilization: number; idle: number }
export function makeHistory(): DayStat[] {
  const r = rng(1234), out: DayStat[] = [], names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 14; i++) {
    const dow = (i + 1) % 7, weekend = dow === 5 || dow === 6, trend = i * 0.12;
    out.push({
      label: names[dow], orders: Math.round((weekend ? 96 : 134) + r() * 22), onTime: Math.round((91.5 + trend + r() * 3.2 - (weekend ? 1.2 : 0)) * 10) / 10,
      firstAttempt: Math.round((92 + r() * 3.5 + trend * 0.4) * 10) / 10, km: Math.round((weekend ? 540 : 760) + r() * 90), costPerKm: Math.round(1960 - trend * 14 + r() * 120),
      utilization: Math.round(63 + r() * 12 + trend), idle: Math.round((16.5 - trend * 0.6 + r() * 2.5) * 10) / 10,
    });
  }
  return out;
}

/* Fourteen-day driver base figures so the scorecard has history behind today's live numbers. */
export function driverBase(index: number) {
  const r = rng(900 + index * 13);
  return { deliveries: 120 + Math.floor(r() * 130), onTime: 90 + Math.round(r() * 80) / 10, idle: Math.round((9 + r() * 9) * 10) / 10, score: 72 + Math.floor(r() * 26) };
}

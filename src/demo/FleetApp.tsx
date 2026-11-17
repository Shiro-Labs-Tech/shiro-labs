import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLang, useT } from '../i18n';
import { useToast } from '../components/Toast';
import { rt } from '../folio/runtime';
import { Fleet, clockText, FAIL_REASONS, type Alert, type Order, type Status } from './fleetSim';
import type { MapControl } from './FleetMap';
import { DemoContext, VIEWS, useDemo, type Actions, type Demo, type ViewId } from './store';
import { Dialog } from './ui';
import Live from './views/Live';
import Dispatch from './views/Dispatch';
import Vehicles from './views/Vehicles';
import Alerts from './views/Alerts';
import Maintenance from './views/Maintenance';
import Reports from './views/Reports';
import Settings from './views/Settings';

const ICON: Record<ViewId, ReactNode> = {
  live: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.4" fill="currentColor" /></>,
  dispatch: <><path d="M4 7h10M4 12h10M4 17h6" /><path d="M17 9l3 3-3 3" /></>,
  vehicles: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  alerts: <><path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 004 0" /></>,
  maintenance: <><path d="M14.5 6.5a4 4 0 00-5.2 5L4 16.8 7.2 20l5.3-5.3a4 4 0 005-5.2l-2.7 2.7-2.3-2.3z" /></>,
  reports: <><path d="M5 20V11M12 20V4M19 20v-6" /></>,
  settings: <><path d="M4 8h9M17 8h3M4 16h3M11 16h9" /><circle cx="15" cy="8" r="2" /><circle cx="9" cy="16" r="2" /></>,
};

export default function FleetApp() {
  const t = useT(), lang = useLang(), toast = useToast();
  const fleet = useMemo(() => new Fleet(18), []);
  const control = useRef<MapControl>({ playing: true, rate: 1, stress: false });
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true), [rate, setRateS] = useState(1), [stress, setStress] = useState(false), [fps, setFps] = useState(0);
  const [view, setView] = useState<ViewId>('live'), [sel, setSel] = useState<string | null>(null), [ord, setOrd] = useState<string | null>(null);
  const [pal, setPal] = useState(false), [track, setTrack] = useState<string | null>(null);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const tf = useCallback((s: string, vars: Record<string, string | number>) => t(s).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')), [t]);
  const loc = lang === 'id' ? 'id-ID' : 'en-US';
  const num = useCallback((n: number) => Math.round(n).toLocaleString(loc), [loc]);
  const money = useCallback((n: number) => 'Rp ' + Math.round(n).toLocaleString(loc), [loc]);

  /* One simulation clock for the whole app. The maps only draw. */
  useEffect(() => {
    if (rt.reduce) { control.current.playing = false; setPlaying(false); }
    let raf = 0, last = performance.now(), acc = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const c = control.current;
      if (c.playing) {
        let left = dt * 60 * c.rate;
        while (left > 0) { const s = Math.min(20, left); fleet.step(s); left -= s; }
        acc += dt; if (acc > 0.5) { acc = 0; fleet.sample(); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const id = setInterval(refresh, 400);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
  }, [fleet, refresh]);

  /* The open view lives in the hash, so a view can be linked to. Written with the router's own history state kept intact. */
  useEffect(() => {
    const h = window.location.hash.replace('#view-', '') as ViewId;
    if (VIEWS.includes(h)) setView(h);
  }, []);
  const go = useCallback((v: ViewId) => {
    setView(v);
    try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + '#view-' + v); } catch { /* the hash is a convenience only */ }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(true); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setPlay = (p: boolean) => { control.current.playing = p; setPlaying(p); };
  const setRate = (r: number) => { control.current.rate = r; setRateS(r); };
  const toggleStress = () => { const s = !stress; control.current.stress = s; setStress(s); if (!s) setFps(0); };

  const statusLabel = (s: Status) => ({ moving: t('Moving'), delayed: t('Running late'), loading: t('At a stop'), idle: t('Idle'), offline: t('No signal'), down: t('Broken down'), maintenance: t('In workshop') }[s]);
  const failText = (o: Order) => ({ 'Customer not available': t('Customer not available'), 'Address not found': t('Address not found'), 'Delivery refused': t('Delivery refused') }[o.failReason as typeof FAIL_REASONS[number]] ?? '');
  const alertTitle = (a: Alert) => ({
    risk: t('Delivery at risk'), down: t('Vehicle broken down'), offline: t('Signal lost'), idle: t('Long stop'), fuel: t('Low fuel'), service: t('Service overdue'),
    closure: t('Road closure'), rush: t('Rush order waiting'), queue: t('Orders waiting'), failed: t('Delivery failed'), weather: t('Heavy rain'),
  }[a.kind]);
  const alertText = (a: Alert) => {
    const o = a.order ? fleet.order(a.order) : undefined;
    switch (a.kind) {
      case 'risk': return a.m >= 999 ? tf('{n} stops cannot be reached while this vehicle is stopped', { n: a.n }) : tf('{n} stops predicted late, the worst by {m} min', { n: a.n, m: a.m });
      case 'down': return tf('Broken down with {n} stops on board', { n: a.n });
      case 'offline': return tf('No GPS signal, {n} stops on board, expected back in about {m} min', { n: a.n, m: a.m });
      case 'idle': return tf('Stopped for {n} min away from the depot', { n: a.n });
      case 'fuel': return a.n <= 0 ? t('Out of fuel: the vehicle has stopped') : tf('Fuel at {n}%', { n: a.n });
      case 'service': return tf('{n} km past the service interval', { n: num(a.n) });
      case 'closure': return tf('{n} stops are routed through the closed area, clears in about {m} min', { n: a.n, m: a.m });
      case 'rush': return tf('{order} is waiting for a vehicle and its window closes in {m} min', { order: a.order, m: a.m });
      case 'queue': return tf('{n} waiting orders have under 30 min left in their window', { n: a.n });
      case 'failed': return tf('{order} was not delivered: {reason}. It is back in the queue with a new window', { order: a.order, reason: o ? failText(o) : '' });
      case 'weather': return tf('Travel times are about 40% longer, clears in about {m} min', { m: a.m });
    }
  };

  const act: Actions = {
    replan: (vid) => { const r = fleet.optimize(vid); refresh(); toast(r.changed ? tf('Route re-planned: {km} km saved, late stops {a} to {b}', { km: r.kmSaved, a: r.lateBefore, b: r.lateAfter }) : t('This route is already in the best order for its stops')); },
    reassign: (vid) => { const r = fleet.reassignJobs(vid); refresh(); toast(r.moved || r.left ? tf('{n} stops moved to other vehicles, {m} still waiting', { n: r.moved, m: r.left }) : t('Nothing to reassign')); },
    notifyRisk: (vid) => { const v = fleet.vehicle(vid); let n = 0; v?.jobs.forEach((id) => { const o = fleet.order(id); if (o && o.predLate > 0 && fleet.notifyNow(id)) n++; }); refresh(); toast(tf('{n} customers told about the new arrival time', { n })); },
    toShop: (vid) => { const r = fleet.sendToShop(vid); refresh(); toast(tf('Sent to the workshop. {n} stops handed over, {m} waiting', { n: r.moved, m: r.left })); },
    refuel: (vid) => { fleet.refuel(vid); refresh(); toast(t('Refuelling for about 10 min')); },
    autoAssign: () => { const r = fleet.autoAssign(); fleet.flags.assign = true; refresh(); toast(r.assigned ? tf('{n} orders assigned, {m} could not be placed', { n: r.assigned, m: r.left }) : t('No waiting orders')); },
    assign: (oid, vid, pos) => { const r = fleet.assign(oid, vid, pos); if (r.ok) { fleet.flags.assign = true; fleet.evaluate(); toast(tf('{o} assigned to {v}', { o: oid, v: vid })); } refresh(); return r.ok; },
    message: () => toast(t('Sample action: nothing was sent')),
    reopenRoad: () => { fleet.clearClosure(); refresh(); },
    closeRoad: () => { const v = sel ? fleet.vehicle(sel) : undefined; fleet.closeRoad(v ? { x: v.x, y: v.y } : undefined); refresh(); },
    reset: () => { fleet.reset(); setSel(null); setOrd(null); refresh(); toast(t('Demo data reset')); },
    scenario: (k) => {
      if (k === 'closure') { if (fleet.closure) fleet.clearClosure(); else act.closeRoad(); }
      else if (k === 'breakdown') { const id = fleet.breakdown(sel ?? undefined); if (id) setSel(id); else toast(t('No vehicle on the road to break down')); }
      else if (k === 'signal') { const id = fleet.signalLoss(sel ?? undefined); if (id) setSel(id); }
      else if (k === 'rush') { const o = fleet.rushOrder(); setOrd(o.id); }
      else fleet.rain();
      refresh();
    },
  };

  const demo: Demo = {
    fleet, tick, refresh, control, playing, setPlay, rate, setRate, stress, toggleStress, fps, setFps, view, go, sel, setSel, ord, setOrd, t, tf, lang, toast, num, money,
    time: clockText, statusLabel, alertText, alertTitle, failText, openPalette: () => setPal(true), openTracking: (id) => setTrack(id), act,
  };

  const k = fleet.kpis(), open = k.openAlerts, waiting = k.unassigned;
  const label: Record<ViewId, string> = { live: t('Live'), dispatch: t('Dispatch'), vehicles: t('Vehicles'), alerts: t('Alerts'), maintenance: t('Maintenance'), reports: t('Reports'), settings: t('Settings') };
  const badge: Partial<Record<ViewId, number>> = { alerts: open, dispatch: waiting, maintenance: k.overdue };
  const body = view === 'live' ? <Live /> : view === 'dispatch' ? <Dispatch /> : view === 'vehicles' ? <Vehicles /> : view === 'alerts' ? <Alerts /> : view === 'maintenance' ? <Maintenance /> : view === 'reports' ? <Reports /> : <Settings />;

  return (
    <DemoContext.Provider value={demo}>
      <section className="app" id="app" aria-label={t('Shiro Dispatch demo app')}>
        <header className="app-top">
          <div className="app-brand"><span className="app-mark" aria-hidden="true">白</span><span><b>Shiro Dispatch</b><small className="mono">{t('Sample tenant')}: Harbour &amp; Co.</small></span></div>
          <button type="button" className="app-search" onClick={() => setPal(true)}><span>{t('Search vehicles, orders, actions')}</span><kbd className="mono">Ctrl K</kbd></button>
          <div className="app-ctl" role="toolbar" aria-label={t('Simulation controls')}>
            <button type="button" className="fl-chip" aria-pressed={playing} onClick={() => setPlay(!playing)}>{playing ? t('Pause') : t('Play')}</button>
            <span className="fl-group" role="group" aria-label={t('Speed')}>{[1, 4, 16].map((r) => <button key={r} type="button" className="fl-chip" aria-pressed={rate === r} onClick={() => setRate(r)}>{r}x</button>)}</span>
            <span className="mono app-clock" aria-label={t('Sim time')}><time>{clockText(fleet.clock)}</time></span>
            <details className="app-menu" onToggle={(e) => { if (!(e.currentTarget as HTMLDetailsElement).open) return; }}>
              <summary className="fl-chip">{t('Simulate')}</summary>
              <ul role="menu" onClick={(e) => { (e.currentTarget.parentElement as HTMLDetailsElement).open = false; }}>
                <li role="none"><button role="menuitem" type="button" onClick={() => act.scenario('closure')}>{fleet.closure ? t('Reopen the road') : t('Close a road')}</button></li>
                <li role="none"><button role="menuitem" type="button" onClick={() => act.scenario('breakdown')}>{t('Break a vehicle down')}</button></li>
                <li role="none"><button role="menuitem" type="button" onClick={() => act.scenario('signal')}>{t('Lose a vehicle signal')}</button></li>
                <li role="none"><button role="menuitem" type="button" onClick={() => act.scenario('rush')}>{t('Add a rush order')}</button></li>
                <li role="none"><button role="menuitem" type="button" onClick={() => act.scenario('rain')}>{t('Heavy rain')}</button></li>
              </ul>
            </details>
          </div>
        </header>
        <div className="app-body">
          <nav className="app-nav" aria-label={t('Shiro Dispatch demo app')}>
            {VIEWS.map((v) => (
              <button key={v} type="button" className="app-nav-i" aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[v]}</svg>
                <span>{label[v]}</span>
                {badge[v] ? <b className={'app-badge' + (v === 'alerts' ? ' hot' : '')}>{badge[v]}</b> : null}
              </button>
            ))}
            <p className="app-nav-note mono">{t('Sample data. Nothing leaves your browser.')}</p>
          </nav>
          <div className="app-main" id="app-main" tabIndex={-1}>{body}</div>
        </div>
      </section>
      <Palette open={pal} onClose={() => setPal(false)} demo={demo} />
      <Dialog open={!!track} onClose={() => setTrack(null)} title={t('Customer tracking page')}>{track ? <Tracking id={track} /> : null}</Dialog>
    </DemoContext.Provider>
  );
}

function Tracking({ id }: { id: string }) {
  const { fleet, t, tf, time } = useDemo(), o = fleet.order(id);
  if (!o) return null;
  const v = o.vehicle ? fleet.vehicle(o.vehicle) : undefined, ahead = v ? Math.max(0, v.jobs.indexOf(o.id)) : 0;
  const step = o.status === 'delivered' ? 3 : o.status === 'enroute' || o.status === 'serving' ? 2 : o.status === 'planned' ? 1 : 0;
  const steps = [t('Order received'), t('Assigned to a driver'), t('On the way'), t('Delivered')];
  const win = Number.isFinite(o.eta) && o.eta > 0 ? tf('Arriving between {a} and {b}', { a: time(o.eta - 10 * 60), b: time(o.eta + 15 * 60) }) : t('We are updating your arrival time');
  const sms = (k: 'ontheway' | 'delay' | 'delivered') => k === 'ontheway' ? tf('Your order {id} is on its way. Estimated arrival {time}.', { id: o.id, time: time(o.eta) }) : k === 'delay' ? tf('Your order {id} is running late. New estimated arrival {time}.', { id: o.id, time: time(o.eta) }) : tf('Your order {id} was delivered at {time}. Thank you.', { id: o.id, time: time(o.doneAt) });
  return (
    <div className="trk">
      <div className="trk-card">
        <p className="mono trk-brand">Harbour &amp; Co.</p>
        <h3 className="trk-h">{o.status === 'delivered' ? t('Delivered') : win}</h3>
        <p className="trk-sub mono">{o.id} &middot; {o.customer}</p>
        <ol className="trk-steps">{steps.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{s}</li>)}</ol>
        {v && o.status !== 'delivered' ? <p className="trk-meta">{tf('Driver {d}, vehicle {v}', { d: v.driver, v: v.id })}<br />{ahead > 0 ? tf('{n} stops before yours', { n: ahead }) : t('You are the next stop')}</p> : null}
        {o.status === 'delivered' ? <p className="trk-meta">{tf('Proof of delivery: {p}', { p: o.pod === 'Signature' ? t('Signature') : o.pod === 'Photo' ? t('Photo') : t('PIN code') })}</p> : null}
      </div>
      <div className="trk-msgs">
        <h3 className="label">{t('Messages sent to the customer')}</h3>
        {o.sent.length === 0 ? <p className="fl-empty">{t('Nothing sent yet. Updates go out automatically when the vehicle is within 30 min or the arrival slips.')}</p> : (
          <ul>{o.sent.map((k) => <li key={k} className="trk-sms">{sms(k)}</li>)}</ul>
        )}
      </div>
    </div>
  );
}

type PaletteItem = { id: string; label: string; hint: string; run: () => void };
function Palette({ open, onClose, demo }: { open: boolean; onClose: () => void; demo: Demo }) {
  const { t, fleet, go, setSel, setOrd, act } = demo;
  const [q, setQ] = useState(''), [i, setI] = useState(0);
  useEffect(() => { if (open) { setQ(''); setI(0); } }, [open]);
  const viewLabel: Record<ViewId, string> = { live: t('Live'), dispatch: t('Dispatch'), vehicles: t('Vehicles'), alerts: t('Alerts'), maintenance: t('Maintenance'), reports: t('Reports'), settings: t('Settings') };
  const items: PaletteItem[] = [
    ...VIEWS.map((v) => ({ id: 'v-' + v, label: t('Go to') + ' ' + viewLabel[v], hint: t('View'), run: () => go(v) })),
    { id: 'a-auto', label: t('Auto-assign waiting orders'), hint: t('Action'), run: () => act.autoAssign() },
    { id: 'a-road', label: fleet.closure ? t('Reopen the road') : t('Close a road'), hint: t('Action'), run: () => act.scenario('closure') },
    { id: 'a-rush', label: t('Add a rush order'), hint: t('Action'), run: () => act.scenario('rush') },
    ...fleet.vehicles.map((v) => ({ id: 've-' + v.id, label: v.id + ' ' + v.driver, hint: t('Vehicle'), run: () => { setSel(v.id); go('vehicles'); } })),
    ...fleet.orders.filter((o) => o.status !== 'delivered').map((o) => ({ id: 'o-' + o.id, label: o.id + ' ' + o.customer, hint: t('Order'), run: () => { setOrd(o.id); go('dispatch'); } })),
  ];
  const needle = q.trim().toLowerCase(), list = (needle ? items.filter((x) => x.label.toLowerCase().includes(needle)) : items.slice(0, 11)).slice(0, 9);
  const cur = Math.min(i, Math.max(0, list.length - 1));
  const run = (x: PaletteItem | undefined) => { if (x) { onClose(); x.run(); } };
  return (
    <Dialog open={open} onClose={onClose} title={t('Search vehicles, orders, actions')}>
      <input className="pal-input" autoFocus role="combobox" aria-expanded="true" aria-controls="pal-list" aria-activedescendant={list[cur] ? 'pal-' + list[cur].id : undefined} value={q} placeholder={t('Type a vehicle, an order or an action')}
        onChange={(e) => { setQ(e.target.value); setI(0); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(list.length - 1, cur + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, cur - 1)); } else if (e.key === 'Enter') { e.preventDefault(); run(list[cur]); } }} />
      <ul className="pal-list" id="pal-list" role="listbox">
        {list.length === 0 ? <li className="fl-empty">{t('No results.')}</li> : list.map((x, n) => (
          <li key={x.id} id={'pal-' + x.id} role="option" aria-selected={n === cur}><button type="button" tabIndex={-1} className={n === cur ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => run(x)}><span>{x.label}</span><small className="mono">{x.hint}</small></button></li>
        ))}
      </ul>
    </Dialog>
  );
}

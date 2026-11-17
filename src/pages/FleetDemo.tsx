import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLang, useT, homePath } from '../i18n';
import Footer from '../components/Footer';
import { useToast } from '../components/Toast';
import { rt } from '../folio/runtime';
import { Fleet, STOPS, STATUSES, clockText, type Status, type Vehicle } from '../demo/fleetSim';
import FleetMap, { type MapControl } from '../demo/FleetMap';

type SortKey = 'id' | 'status' | 'delay' | 'speed' | 'fuel';
const STRESS = 5000;
const RANK: Record<Status, number> = { delayed: 0, idle: 1, loading: 2, moving: 3, offline: 4 };
const RATES = [1, 4, 16];

function Spark({ data }: { data: number[] }) {
  const w = 220, h = 44, max = Math.max(60, ...data);
  const pts = data.map((d, i) => `${((i / Math.max(1, data.length - 1)) * w).toFixed(1)},${(h - 2 - (d / max) * (h - 4)).toFixed(1)}`).join(' ');
  return <svg className="fl-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

export default function FleetDemo() {
  const t = useT(), lang = useLang(), toast = useToast();
  const fleet = useMemo(() => new Fleet(48), []);
  const control = useRef<MapControl>({ playing: true, rate: 1, stress: false });
  const [, setTick] = useState(0);
  const [playing, setPlaying] = useState(true), [rate, setRate] = useState(1), [stress, setStress] = useState(false), [fps, setFps] = useState(0);
  const [sel, setSel] = useState<string | null>(null), [filter, setFilter] = useState<Status | 'all'>('all'), [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'delay', dir: -1 });
  const refresh = () => setTick((n) => n + 1);
  /* While the pointer or focus is in the table the row order is held, so rows do not move under the cursor. */
  const [hold, setHold] = useState(false), order = useRef<{ key: string; ids: string[] }>({ key: '', ids: [] });

  useEffect(() => {
    if (rt.reduce) { control.current.playing = false; setPlaying(false); }
    const id = setInterval(refresh, 400);
    return () => clearInterval(id);
  }, []);

  const setPlay = (p: boolean) => { control.current.playing = p; setPlaying(p); };
  const setSpeed = (r: number) => { control.current.rate = r; setRate(r); };
  const toggleStress = () => { const s = !stress; control.current.stress = s; setStress(s); if (!s) setFps(0); };
  const closeRoad = () => {
    if (fleet.closure) fleet.clearClosure();
    else { const v = sel ? fleet.vehicles.find((x) => x.id === sel) : undefined; fleet.closeRoad(v ? { x: v.x, y: v.y } : undefined); }
    refresh();
  };
  const reset = () => { fleet.reset(); setSel(null); setFilter('all'); setQ(''); refresh(); };

  const kp = fleet.kpis();
  const counts = Object.fromEntries(STATUSES.map((s) => [s, fleet.vehicles.filter((v) => v.status === s).length])) as Record<Status, number>;
  const orderKey = `${sort.key}${sort.dir}${filter}${q}`;
  let rows: Vehicle[];
  if (hold && order.current.key === orderKey) {
    const byId = new Map(fleet.vehicles.map((x) => [x.id, x]));
    rows = order.current.ids.map((id) => byId.get(id)!);
  } else {
    rows = fleet.vehicles
      .filter((x) => (filter === 'all' || x.status === filter) && (!q.trim() || (x.id + ' ' + x.driver).toLowerCase().includes(q.trim().toLowerCase())))
      .sort((a, b) => {
        const k = sort.key;
        const av = k === 'id' ? a.id : k === 'status' ? RANK[a.status] : a[k], bv = k === 'id' ? b.id : k === 'status' ? RANK[b.status] : b[k];
        return (av < bv ? -1 : av > bv ? 1 : a.id < b.id ? -1 : 1) * sort.dir;
      });
    order.current = { key: orderKey, ids: rows.map((x) => x.id) };
  }
  const v: Vehicle | undefined = sel ? fleet.vehicles.find((x) => x.id === sel) : undefined;
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: key === 'id' ? 1 : -1 }));
  const aria = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none') as 'ascending' | 'descending' | 'none';
  const delayText = (d: number) => (d < 1 ? t('On time') : '+' + Math.round(d) + ' min');
  const sample = () => toast(t('Sample action: nothing was sent'));
  const kinds: Record<string, string> = { late: t('running late'), idle: t('idle for over 15 min'), fuel: t('low fuel'), offline: t('went offline'), closure: t('Road closure opened'), cleared: t('Road closure cleared') };

  const th = (k: SortKey, label: string) => (
    <th scope="col" aria-sort={aria(k)}><button type="button" onClick={() => sortBy(k)}>{label}{sort.key === k ? <i aria-hidden="true">{sort.dir === 1 ? ' ↑' : ' ↓'}</i> : null}</button></th>
  );

  return (
    <>
      <main id="main" className="fl">
        <section className="svc-hero fl-head" aria-labelledby="fl-title">
          <p className="mono svc-crumb"><Link to={homePath(lang)}>Shiro Labs</Link><span aria-hidden="true"> / </span><Link to={{ pathname: homePath(lang), hash: '#work' }}>{t('Case files')}</Link><span aria-hidden="true"> / </span><span>{t('Fleet dashboard')}</span></p>
          <h1 className="svc-title" id="fl-title">{t('Fleet dashboard')}</h1>
          <p className="svc-lede">{t('A working version of the dispatcher screen from the case file. Everything is sample data: no real vehicles, drivers or places. Click a dot, sort the table, or close a road and watch the numbers react.')}</p>
          <p className="cta">
            <span className="mono tag-live">{t('Live demo')}</span>
            <Link className="pill" to={{ pathname: homePath(lang), hash: '#case-dash' }} data-magnet>{t('Read the case file')}</Link>
          </p>
        </section>

        <section className="fl-app" aria-label={t('Fleet dashboard')}>
          <div className="fl-bar" role="toolbar" aria-label={t('Simulation controls')}>
            <button type="button" className="pill" onClick={() => setPlay(!playing)}>{playing ? t('Pause') : t('Play')}</button>
            <span className="fl-group" role="group" aria-label={t('Speed')}>
              {RATES.map((r) => <button key={r} type="button" className="fl-chip" aria-pressed={rate === r} onClick={() => setSpeed(r)}>{r}x</button>)}
            </span>
            <button type="button" className="pill" aria-pressed={!!fleet.closure} onClick={closeRoad}>{fleet.closure ? t('Reopen the road') : t('Close a road')}</button>
            <button type="button" className="pill" aria-pressed={stress} onClick={toggleStress}>{t('Stress test')}: {STRESS.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} {t('routes')}</button>
            <button type="button" className="pill" onClick={reset}>{t('Reset')}</button>
            <span className="mono fl-clock">{t('Sim time')} <time>{clockText(fleet.clock)}</time>{stress && fps > 0 ? <> &middot; <b>{fps}</b> fps</> : null}</span>
          </div>

          <dl className="fl-kpis">
            <div><dt>{t('On-time rate')}</dt><dd>{kp.onTime.toFixed(1)}<small>%</small></dd></div>
            <div><dt>{t('Vehicles active')}</dt><dd>{kp.active}<small>/ {fleet.count}</small></dd></div>
            <div className={kp.delayed ? 'bad' : ''}><dt>{t('Delayed')}</dt><dd>{kp.delayed}</dd></div>
            <div><dt>{t('Idle over 15 min')}</dt><dd>{kp.idle}</dd></div>
            <div><dt>{t('Average delay')}</dt><dd>{kp.avgDelay.toFixed(1)}<small>min</small></dd></div>
          </dl>

          <div className="fl-grid">
            <div className="fl-left">
              <FleetMap fleet={fleet} control={control} selected={sel} onSelect={setSel} onFps={setFps} stressCount={STRESS}
                label={t('Map of the sample fleet. The table below has the same information.')} />
              <ul className="fl-legend mono" aria-label={t('Status colours')}>
                {STATUSES.map((s) => <li key={s}><i className={'dot st-' + s} aria-hidden="true"></i>{t(s[0].toUpperCase() + s.slice(1))}</li>)}
                {fleet.closure ? <li><i className="dot st-closure" aria-hidden="true"></i>{t('Road closure')}</li> : null}
              </ul>
            </div>

            <aside className="fl-side">
              <section className="fl-card" aria-labelledby="fl-sel">
                <h2 className="label" id="fl-sel">{t('Selected vehicle')}</h2>
                {v ? (
                  <div className="fl-detail">
                    <p className="fl-id">{v.id} <span className={'fl-status st-' + v.status}>{t(v.status[0].toUpperCase() + v.status.slice(1))}</span></p>
                    <dl className="fl-facts mono">
                      <div><dt>{t('Driver')}</dt><dd>{v.driver}</dd></div>
                      <div><dt>{t('Cargo')}</dt><dd>{t(v.cargo)}</dd></div>
                      <div><dt>{t('Speed')}</dt><dd>{Math.round(v.speed)} km/h</dd></div>
                      <div><dt>{t('Fuel')}</dt><dd>{Math.round(v.fuel)}%</dd></div>
                      <div><dt>{t('Delay')}</dt><dd>{delayText(v.delay)}</dd></div>
                    </dl>
                    <p className="label">{t('Route')}</p>
                    <ol className="fl-route">
                      {v.route.map((si, k) => <li key={k} className={k === v.leg + 1 ? 'next' : k <= v.leg ? 'done' : ''}>{t(STOPS[si].name)}</li>)}
                    </ol>
                    <p className="label">{t('Speed trace')}</p>
                    <Spark data={v.speeds} />
                    <p className="cta fl-actions">
                      <button type="button" className="pill" onClick={sample}>{t('Message driver')}</button>
                      <button type="button" className="pill" onClick={sample}>{t('Reassign route')}</button>
                      <button type="button" className="pill" onClick={sample}>{t('Send to service')}</button>
                    </p>
                  </div>
                ) : <p className="fl-empty">{t('Select a vehicle on the map or in the table.')}</p>}
              </section>

              <section className="fl-card" aria-labelledby="fl-alerts">
                <h2 className="label" id="fl-alerts">{t('Alerts')}</h2>
                <ul className="fl-alerts" role="log" aria-live="off" data-lenis-prevent="">
                  {fleet.alerts.length === 0 ? <li className="fl-empty">{t('No alerts yet.')}</li> : fleet.alerts.slice(0, 12).map((a) => (
                    <li key={a.id}>
                      <time className="mono">{clockText(a.at)}</time>
                      {a.vehicle ? <button type="button" onClick={() => setSel(a.vehicle)}>{a.vehicle}</button> : null}
                      <span>{kinds[a.kind]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          <section className="fl-table" aria-labelledby="fl-vehicles">
            <div className="fl-tools">
              <h2 className="label" id="fl-vehicles">{t('Vehicles')} ({rows.length})</h2>
              <span className="fl-group" role="group" aria-label={t('Filter by status')}>
                <button type="button" className="fl-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('All')} {fleet.count}</button>
                {STATUSES.map((s) => <button key={s} type="button" className="fl-chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>{t(s[0].toUpperCase() + s.slice(1))} {counts[s]}</button>)}
              </span>
              <label className="fl-search"><span className="sr-only">{t('Search vehicles')}</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search by vehicle or driver')} />
              </label>
            </div>
            <div className="fl-scroll" data-lenis-prevent="" tabIndex={0} onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)} role="region" aria-label={t('Vehicles')}>
              <table>
                <thead><tr>{th('id', t('Vehicle'))}<th scope="col">{t('Driver')}</th>{th('status', t('Status'))}<th scope="col">{t('Next stop')}</th>{th('delay', t('Delay'))}{th('speed', t('Speed'))}{th('fuel', t('Fuel'))}</tr></thead>
                <tbody>
                  {rows.length === 0 ? <tr><td colSpan={7} className="fl-empty">{t('No vehicles match.')}</td></tr> : rows.map((r) => (
                    <tr key={r.id} className={r.id === sel ? 'sel' : ''}>
                      <th scope="row"><button type="button" aria-pressed={r.id === sel} onClick={() => setSel(r.id === sel ? null : r.id)}>{r.id}</button></th>
                      <td>{r.driver}</td>
                      <td><span className={'fl-status st-' + r.status}>{t(r.status[0].toUpperCase() + r.status.slice(1))}</span></td>
                      <td>{t(STOPS[r.route[r.leg + 1]].name)}</td>
                      <td className={r.delay >= 10 ? 'bad' : ''}>{delayText(r.delay)}</td>
                      <td>{Math.round(r.speed)} km/h</td>
                      <td className={r.fuel < 15 ? 'bad' : ''}>{Math.round(r.fuel)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mono fl-note">{t('How it is built: a React and TypeScript front end with the map drawn on canvas. The simulation runs in your browser and nothing is sent anywhere.')}</p>
        </section>
      </main>
      <Footer variant="service" />
    </>
  );
}

import { useState } from 'react';
import { STATUSES, VT, type Status, type Vehicle } from '../fleetSim';
import { useDemo, type Demo } from '../store';
import { Empty, StatusTag, useHold } from '../ui';
import VehicleCard from './VehicleCard';

type SortKey = 'id' | 'status' | 'stops' | 'delay' | 'fuel' | 'service';
const RANK: Record<Status, number> = { down: 0, delayed: 1, offline: 2, idle: 3, loading: 4, moving: 5, maintenance: 6 };
const delayOf = (d: Demo, v: Vehicle) => v.jobs.reduce((m, id) => Math.max(m, d.fleet.order(id)?.predLate ?? 0), 0);

export default function Vehicles() {
  const d = useDemo(), { t, tf, fleet } = d;
  const [filter, setFilter] = useState<Status | 'all'>('all'), [q, setQ] = useState(''), [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'status', dir: 1 });
  const counts = Object.fromEntries(STATUSES.map((s) => [s, fleet.vehicles.filter((v) => v.status === s).length])) as Record<Status, number>;
  const val = (v: Vehicle) => { const k = sort.key; return k === 'id' ? v.id : k === 'status' ? RANK[v.status] : k === 'stops' ? v.jobs.length : k === 'delay' ? delayOf(d, v) : k === 'fuel' ? v.fuel : fleet.kmToService(v); };
  const rows = fleet.vehicles
    .filter((v) => (filter === 'all' || v.status === filter) && (!q.trim() || (v.id + ' ' + v.driver).toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => { const av = val(a), bv = val(b); return (av < bv ? -1 : av > bv ? 1 : a.id < b.id ? -1 : 1) * sort.dir; });
  const h = useHold(rows, `${sort.key}${sort.dir}${filter}${q}`);
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: key === 'delay' || key === 'stops' ? -1 : 1 }));
  const aria = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none') as 'ascending' | 'descending' | 'none';
  const th = (k: SortKey, label: string) => <th scope="col" aria-sort={aria(k)}><button type="button" onClick={() => sortBy(k)}>{label}{sort.key === k ? <i aria-hidden="true">{sort.dir === 1 ? ' ↑' : ' ↓'}</i> : null}</button></th>;
  const dl = (v: Vehicle) => { const m = delayOf(d, v); return !v.jobs.length ? '' : m >= 999 ? t('Unknown') : m < 1 ? t('On time') : '+' + m + ' min'; };
  return (
    <div className="view vehicles">
      <div className="view-head"><h2 className="view-title">{t('Vehicles')}</h2></div>
      <div className="veh-grid">
        <section className="fl-table" aria-labelledby="v-h">
          <div className="fl-tools">
            <h3 className="label" id="v-h">{t('Fleet')} ({h.rows.length})</h3>
            <span className="fl-group" role="group" aria-label={t('Filter by status')}>
              <button type="button" className="fl-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('All')} {fleet.vehicles.length}</button>
              {STATUSES.filter((s) => counts[s] > 0 || filter === s).map((s) => <button key={s} type="button" className="fl-chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>{d.statusLabel(s)} {counts[s]}</button>)}
            </span>
            <label className="fl-search"><span className="sr-only">{t('Search vehicles')}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search by vehicle or driver')} /></label>
          </div>
          <div className="fl-scroll" data-lenis-prevent="" tabIndex={0} role="region" aria-label={t('Fleet')} {...h.bind}>
            <table>
              <thead><tr>{th('id', t('Vehicle'))}<th scope="col">{t('Type')}</th>{th('status', t('Status'))}{th('stops', t('Stops'))}{th('delay', t('Delay'))}{th('fuel', t('Fuel'))}{th('service', t('Next service'))}</tr></thead>
              <tbody>
                {h.rows.length === 0 ? <tr><td colSpan={7}><Empty title={t('No vehicles match')} text={t('Try another status or clear the search.')} /></td></tr> : h.rows.map((v) => {
                  const km = fleet.kmToService(v), m = delayOf(d, v);
                  return (
                    <tr key={v.id} className={v.id === d.sel ? 'sel' : ''}>
                      <th scope="row"><button type="button" aria-pressed={v.id === d.sel} className="fl-link" onClick={() => d.setSel(v.id === d.sel ? null : v.id)}>{v.id}</button><br /><small>{v.driver}</small></th>
                      <td>{v.type === 'motor' ? t('Motorbike') : v.type === 'van' ? t('Van') : t('Truck')} <small>{d.num(VT[v.type].cap)} kg</small></td>
                      <td><StatusTag s={v.status} /></td>
                      <td>{v.jobs.length}</td>
                      <td className={m >= d.fleet.settings.lateMin ? 'bad' : ''}>{dl(v)}</td>
                      <td className={v.fuel < fleet.settings.fuelPct ? 'bad' : ''}>{Math.round(v.fuel)}%</td>
                      <td className={km <= 0 ? 'bad' : ''}>{km <= 0 ? tf('{n} km overdue', { n: d.num(-km) }) : tf('in {n} km', { n: d.num(km) })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="fl-card sticky" aria-labelledby="vc-h"><h3 className="label" id="vc-h">{t('Selected vehicle')}</h3><VehicleCard id={d.sel} /></aside>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { STOPS, VT, type Order, type OrderStatus } from '../fleetSim';
import FleetMap from '../FleetMap';
import { downloadCsv, ordersCsv } from '../csv';
import { useDemo, type Demo } from '../store';
import { Bar, Empty, Kpi, StatusTag, useHold } from '../ui';

type Tab = 'queue' | 'orders' | 'board';
const STRESS = 5000;
const orderStatus = (d: Demo, s: OrderStatus) => ({ new: d.t('Waiting'), planned: d.t('Planned'), enroute: d.t('On the way'), serving: d.t('At the stop'), delivered: d.t('Delivered') }[s]);
const left = (d: Demo, o: Order) => { const m = Math.round((o.winEnd - d.fleet.clock) / 60); return m <= 0 ? d.t('Window passed') : d.tf('closes in {n} min', { n: m }); };
const winText = (d: Demo, o: Order) => d.time(o.winStart) + '-' + d.time(o.winEnd);
const reason = (d: Demo, b: string) => b === 'capacity' ? d.t('Over the vehicle load limit (Zero ODOL)') : b === 'cold' ? d.t('Cold chain needs a van or truck') : b === 'unavailable' ? d.t('Not available right now') : '';

export default function Dispatch() {
  const d = useDemo(), { t, tf, fleet, act } = d, [tab, setTab] = useState<Tab>('queue'), [flt, setFlt] = useState<'all' | 'rush' | 'tight'>('all');
  const k = fleet.kpis(), queue = fleet.unassigned().sort((a, b) => (a.rush === b.rush ? a.winEnd - b.winEnd : a.rush ? -1 : 1));
  const shown = queue.filter((o) => flt === 'all' || (flt === 'rush' ? o.rush : o.winEnd - fleet.clock < 45 * 60));
  const o = d.ord ? fleet.order(d.ord) : undefined;
  return (
    <div className="view dispatch">
      <div className="view-head">
        <h2 className="view-title">{t('Dispatch')}</h2>
        <div className="view-tools">
          <span className="fl-group" role="tablist" aria-label={t('Dispatch')}>
            {([['queue', t('Queue')], ['orders', t('All orders')], ['board', t('Route board')]] as [Tab, string][]).map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className="fl-chip" onClick={() => setTab(id)}>{l}</button>)}
          </span>
          <button type="button" className="fl-act solid" disabled={!queue.length} onClick={() => act.autoAssign()}>{t('Auto-assign')} ({queue.length})</button>
        </div>
      </div>
      <dl className="kpis small">
        <Kpi label={t('Waiting for a vehicle')} value={k.unassigned} tone={k.unassigned > 8 ? 'bad' : undefined} />
        <Kpi label={t('Orders at risk')} value={k.atRisk} tone={k.atRisk ? 'bad' : 'good'} />
        <Kpi label={t('Auto-plan')} value={fleet.settings.autoAssign ? Math.max(1, Math.ceil(fleet.nextPlan / 60)) : t('Off')} unit={fleet.settings.autoAssign ? t('min') : undefined} hint={t('Next automatic assignment run')} />
        <Kpi label={t('Delivered today')} value={k.delivered} hint={tf('{n} orders in total', { n: k.orders })} />
      </dl>
      {tab === 'queue' ? <Queue d={d} shown={shown} flt={flt} setFlt={setFlt} total={queue.length} o={o} /> : tab === 'orders' ? <AllOrders d={d} /> : <Board d={d} />}
    </div>
  );
}

function Queue({ d, shown, flt, setFlt, total, o }: { d: Demo; shown: Order[]; flt: string; setFlt: (f: 'all' | 'rush' | 'tight') => void; total: number; o?: Order }) {
  const { t, tf, fleet, act } = d;
  const sugg = o && o.status === 'new' ? fleet.suggest(o.id) : [];
  return (
    <div className="disp-grid">
      <section className="fl-card" aria-labelledby="q-h">
        <div className="q-head"><h3 className="label" id="q-h">{t('Waiting orders')} ({total})</h3>
          <span className="fl-group" role="group" aria-label={t('Filter orders')}>
            {([['all', t('All')], ['rush', t('Rush')], ['tight', t('Tight window')]] as ['all' | 'rush' | 'tight', string][]).map(([id, l]) => <button key={id} type="button" className="fl-chip" aria-pressed={flt === id} onClick={() => setFlt(id)}>{l}</button>)}
          </span>
        </div>
        {shown.length === 0 ? <Empty title={total ? t('No orders match this filter') : t('Every order has a vehicle')} text={total ? undefined : t('New orders appear here as they come in. Auto-plan assigns them in batches, or you can assign them yourself.')} /> : (
          <ul className="q-list" data-lenis-prevent="">
            {shown.map((x) => {
              const mins = (x.winEnd - fleet.clock) / 60;
              return (
                <li key={x.id}>
                  <button type="button" className={'q-row' + (d.ord === x.id ? ' on' : '')} aria-pressed={d.ord === x.id} onClick={() => d.setOrd(d.ord === x.id ? null : x.id)}>
                    <span className="q-top"><b className="mono">{x.id}</b>{x.rush ? <em className="chip hot">{t('Rush')}</em> : null}<em className={'chip' + (mins < 20 ? ' hot' : '')}>{left(d, x)}</em></span>
                    <span className="q-c">{x.customer}</span>
                    <span className="q-m mono">{t(STOPS[x.area].name)} &middot; {x.weight} kg &middot; {t(x.cargo)} &middot; {winText(d, x)}</span>
                    {x.attempts ? <span className="q-m mono bad">{tf('Attempt {n}', { n: x.attempts + 1 })}: {d.failText(x)}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className="disp-right">
        <FleetMap fleet={fleet} control={d.control} selected={d.sel} onSelect={d.setSel} order={d.ord} onSelectOrder={d.setOrd} candidates={sugg.filter((s) => !s.blocked).slice(0, 3).map((s) => s.vehicle)} stressCount={STRESS} label={t('Map of waiting orders and the vehicles that could take them.')} />
        <section className="fl-card" aria-labelledby="as-h">
          <h3 className="label" id="as-h">{o ? t('Assign') + ' ' + o.id : t('Assign an order')}</h3>
          {!o ? <p className="fl-empty">{t('Pick an order in the queue or on the map. The best vehicles are ranked by arrival time, extra distance and load.')}</p> : (
            <>
              <dl className="fl-facts mono">
                <div><dt>{t('Customer')}</dt><dd>{o.customer}</dd></div>
                <div><dt>{t('Area')}</dt><dd>{t(STOPS[o.area].name)}</dd></div>
                <div><dt>{t('Cargo')}</dt><dd>{t(o.cargo)} &middot; {o.weight} kg</dd></div>
                <div><dt>{t('Time window')}</dt><dd>{winText(d, o)}</dd></div>
                <div><dt>{t('Status')}</dt><dd>{orderStatus(d, o.status)}{o.vehicle ? ' · ' + o.vehicle : ''}</dd></div>
              </dl>
              {o.status === 'new' ? (
                sugg.length === 0 ? null : (
                  <div className="fl-scroll short" data-lenis-prevent="" tabIndex={0} role="region" aria-label={t('Ranked vehicles')}>
                    <table>
                      <thead><tr><th scope="col">{t('Vehicle')}</th><th scope="col">{t('Arrives')}</th><th scope="col">{t('Extra km')}</th><th scope="col">{t('Load')}</th><th scope="col"><span className="sr-only">{t('Assign')}</span></th></tr></thead>
                      <tbody>
                        {sugg.slice(0, 6).map((s, n) => {
                          const v = fleet.vehicle(s.vehicle)!, ok = !s.blocked && Number.isFinite(s.eta), late = s.lateMin > 0;
                          return (
                            <tr key={s.vehicle} className={n === 0 && ok ? 'best' : ''}>
                              <th scope="row"><b className="mono">{v.id}</b><br /><small>{v.driver} &middot; {v.type === 'motor' ? t('Motorbike') : v.type === 'van' ? t('Van') : t('Truck')}</small></th>
                              <td>{ok ? <>{d.time(s.eta)} <em className={'chip' + (late ? ' hot' : ' ok')}>{late ? tf('{n} min late', { n: s.lateMin }) : t('In window')}</em></> : <span className="fl-empty">{reason(d, s.blocked)}</span>}</td>
                              <td>{ok ? '+' + s.addedKm : ''}</td>
                              <td className={s.loadPct > 100 ? 'bad' : ''}>{s.loadPct}% <small>/ {d.num(VT[v.type].cap)} kg</small></td>
                              <td><button type="button" className="fl-act" disabled={!!s.blocked} onClick={() => { act.assign(o.id, v.id, s.pos); }}>{t('Assign')}</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <p className="fl-actions">
                  {o.status !== 'delivered' ? <button type="button" className="fl-act" onClick={() => { fleet.unassign(o.id); fleet.evaluate(); d.refresh(); }} disabled={o.status === 'serving'}>{t('Unassign')}</button> : null}
                  {o.status !== 'delivered' ? <button type="button" className="fl-act" onClick={() => { d.toast(fleet.notifyNow(o.id) ? t('Customer notified') : ''); d.refresh(); }}>{t('Notify customer')}</button> : null}
                </p>
              )}
              <p className="fl-actions"><button type="button" className="fl-act ghost" onClick={() => d.openTracking(o.id)}>{t('Preview the customer tracking page')}</button></p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function AllOrders({ d }: { d: Demo }) {
  const { t, fleet } = d, [st, setSt] = useState<'all' | OrderStatus>('all'), [q, setQ] = useState('');
  const all = fleet.orders.slice().sort((a, b) => (a.id < b.id ? 1 : -1)).filter((o) => (st === 'all' || o.status === st) && (!q.trim() || (o.id + o.customer + o.vehicle).toLowerCase().includes(q.trim().toLowerCase())));
  const h = useHold(all, st + q);
  return (
    <section className="fl-table" aria-labelledby="ao-h">
      <div className="fl-tools">
        <h3 className="label" id="ao-h">{t('All orders')} ({h.rows.length})</h3>
        <span className="fl-group" role="group" aria-label={t('Filter by status')}>
          {(['all', 'new', 'planned', 'enroute', 'serving', 'delivered'] as const).map((s) => <button key={s} type="button" className="fl-chip" aria-pressed={st === s} onClick={() => setSt(s)}>{s === 'all' ? t('All') : orderStatus(d, s)}</button>)}
        </span>
        <label className="fl-search"><span className="sr-only">{t('Search orders')}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search by order, customer or vehicle')} /></label>
        <button type="button" className="fl-act" onClick={() => { downloadCsv('shiro-dispatch-orders.csv', ordersCsv(fleet)); fleet.flags.exported = true; d.toast(t('Downloaded the orders as CSV')); d.refresh(); }}>{t('Export CSV')}</button>
      </div>
      <div className="fl-scroll" data-lenis-prevent="" tabIndex={0} role="region" aria-label={t('All orders')} {...h.bind}>
        <table>
          <thead><tr><th scope="col">{t('Order')}</th><th scope="col">{t('Customer')}</th><th scope="col">{t('Weight')}</th><th scope="col">{t('Time window')}</th><th scope="col">{t('Status')}</th><th scope="col">{t('Vehicle')}</th><th scope="col">{t('ETA or delivered')}</th><th scope="col"><span className="sr-only">{t('Tracking')}</span></th></tr></thead>
          <tbody>
            {h.rows.length === 0 ? <tr><td colSpan={8} className="fl-empty">{t('No orders match.')}</td></tr> : h.rows.map((o) => (
              <tr key={o.id} className={o.id === d.ord ? 'sel' : ''}>
                <th scope="row"><button type="button" className="fl-link" onClick={() => { d.setOrd(o.id); setSt('all'); }}>{o.id}</button></th>
                <td>{o.customer}</td><td>{o.weight} kg</td><td>{winText(d, o)}</td>
                <td>{orderStatus(d, o.status)}{o.status === 'delivered' && o.late ? <em className="chip hot">{d.tf('{n} min late', { n: o.late })}</em> : null}</td>
                <td>{o.vehicle || ''}</td>
                <td className={o.status !== 'delivered' && o.predLate >= fleet.settings.lateMin ? 'bad' : ''}>{o.status === 'delivered' ? d.time(o.doneAt) : Number.isFinite(o.eta) && o.eta ? d.time(o.eta) : ''}</td>
                <td><button type="button" className="fl-link" onClick={() => d.openTracking(o.id)}>{t('Tracking')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Board({ d }: { d: Demo }) {
  const { t, fleet } = d;
  const rows = fleet.vehicles.map((v) => ({ id: v.id, v })).sort((a, b) => b.v.jobs.length - a.v.jobs.length || (a.id < b.id ? -1 : 1));
  const h = useHold(rows, 'board');
  return (
    <section className="fl-table" aria-labelledby="rb-h">
      <h3 className="label" id="rb-h">{t('Route board')}</h3>
      <div className="fl-scroll" data-lenis-prevent="" tabIndex={0} role="region" aria-label={t('Route board')} {...h.bind}>
        <table>
          <thead><tr><th scope="col">{t('Vehicle')}</th><th scope="col">{t('Status')}</th><th scope="col">{t('Stops')}</th><th scope="col">{t('Load')}</th><th scope="col">{t('Next stop')}</th><th scope="col">{t('Finishes at')}</th><th scope="col">{t('Late stops')}</th></tr></thead>
          <tbody>
            {h.rows.map(({ v }) => {
              const plan = fleet.plan(v, v.jobs), last = plan[plan.length - 1], lateN = plan.filter((p) => Number.isFinite(p.eta) && p.eta > fleet.order(p.id)!.winEnd).length, cap = VT[v.type].cap, ld = fleet.load(v);
              const next = v.jobs[0] ? fleet.order(v.jobs[0]) : undefined;
              return (
                <tr key={v.id} className={v.id === d.sel ? 'sel' : ''}>
                  <th scope="row"><button type="button" className="fl-link" onClick={() => d.setSel(v.id === d.sel ? null : v.id)}>{v.id}</button><br /><small>{v.driver}</small></th>
                  <td><StatusTag s={v.status} /></td>
                  <td>{v.jobs.length}</td>
                  <td className="loadc"><Bar parts={[Math.round((ld / cap) * 100)]} className="mini" /><small className="mono">{Math.round((ld / cap) * 100)}%</small></td>
                  <td>{next ? next.customer : <span className="fl-empty">{t('None')}</span>}</td>
                  <td>{last && Number.isFinite(last.eta) ? d.time(last.eta + fleet.order(last.id)!.service) : ''}</td>
                  <td className={lateN ? 'bad' : ''}>{lateN}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

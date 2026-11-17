import { useState } from 'react';
import { STATUSES } from '../fleetSim';
import FleetMap from '../FleetMap';
import { useDemo } from '../store';
import { AlertRow, Bar, Kpi } from '../ui';
import VehicleCard from './VehicleCard';

const STRESS = 5000;

export default function Live() {
  const d = useDemo(), { t, tf, fleet, act } = d, k = fleet.kpis();
  const [hideTour, setHideTour] = useState(false);
  const open = fleet.alerts.filter((a) => a.state !== 'resolved').sort((a, b) => (a.sev === b.sev ? b.at - a.at : a.sev === 'critical' ? -1 : b.sev === 'critical' ? 1 : a.sev === 'warn' ? -1 : 1));
  const f = fleet.flags;
  const steps = [
    { done: f.closure, label: t('Close a road and watch which routes slip'), btn: fleet.closure ? t('Reopen the road') : t('Close a road'), run: () => act.scenario('closure') },
    { done: f.assign, label: t('Send the waiting orders to their best vehicles'), btn: t('Open Dispatch'), run: () => d.go('dispatch') },
    { done: f.breakdown && f.reassign, label: t('Break a vehicle down, then move its stops to other drivers'), btn: t('Break a vehicle down'), run: () => act.scenario('breakdown') },
    { done: f.shop, label: t('Send an overdue vehicle to the workshop'), btn: t('Open Maintenance'), run: () => d.go('maintenance') },
    { done: f.exported, label: t('Export the day to a CSV file'), btn: t('Open Reports'), run: () => d.go('reports') },
  ];
  const doneN = steps.filter((s) => s.done).length;
  const all = k.orders, delivered = fleet.orders.filter((o) => o.status === 'delivered').length, enroute = fleet.orders.filter((o) => o.status === 'enroute' || o.status === 'serving').length, planned = fleet.orders.filter((o) => o.status === 'planned').length, waiting = k.unassigned;
  const pct = (n: number) => (all ? Math.round((n / all) * 100) : 0);
  return (
    <div className="view live">
      {hideTour ? null : (
        <section className="tour" aria-labelledby="tour-h">
          <div className="tour-head"><h2 className="label" id="tour-h">{t('Try it')} <span className="mono">{doneN} / {steps.length}</span></h2><button type="button" className="fl-x" aria-label={t('Hide this checklist')} onClick={() => setHideTour(true)}>&times;</button></div>
          <ol>{steps.map((s) => <li key={s.label} className={s.done ? 'done' : ''}><span className="tour-box" aria-hidden="true">{s.done ? '✓' : ''}</span><span>{s.label}<span className="sr-only">{s.done ? ' (' + t('done') + ')' : ''}</span></span><button type="button" className="fl-act" onClick={s.run}>{s.btn}</button></li>)}</ol>
        </section>
      )}

      <dl className="kpis">
        <Kpi label={t('On-time today')} value={k.onTime.toFixed(1)} unit="%" tone={k.onTime < 90 ? 'bad' : undefined} hint={t('Target 95% or better')} />
        <Kpi label={t('Orders at risk')} value={k.atRisk} tone={k.atRisk ? 'bad' : 'good'} hint={t('Predicted late right now')} />
        <Kpi label={t('Waiting for a vehicle')} value={k.unassigned} tone={k.unassigned > 8 ? 'bad' : undefined} hint={fleet.settings.autoAssign ? tf('Auto-plan in {n} min', { n: Math.max(1, Math.ceil(fleet.nextPlan / 60)) }) : t('Auto-assign is off')} />
        <Kpi label={t('Vehicles active')} value={k.active} unit={'/ ' + k.total} hint={tf('Utilisation {n}%', { n: k.utilization })} />
        <Kpi label={t('First-attempt delivery')} value={k.firstAttempt.toFixed(1)} unit="%" hint={tf('{n} delivered today', { n: k.delivered })} />
        <Kpi label={t('Customer updates sent')} value={d.num(k.notified)} hint={t('Automatic, no calls needed')} />
      </dl>

      <div className="live-grid">
        <div className="live-left">
          <FleetMap fleet={fleet} control={d.control} selected={d.sel} onSelect={d.setSel} order={d.ord} onSelectOrder={d.setOrd} onFps={d.setFps} stressCount={STRESS} label={t('Map of the sample fleet. The Vehicles view has the same information as a table.')} />
          <div className="live-under">
            <ul className="fl-legend mono" aria-label={t('Status colours')}>
              {STATUSES.map((s) => <li key={s}><i className={'dot st-' + s} aria-hidden="true"></i>{d.statusLabel(s)}</li>)}
              <li><i className="dot sq" aria-hidden="true"></i>{t('Planned stop')}</li>
              <li><i className="dot dia" aria-hidden="true"></i>{t('Waiting order')}</li>
              {fleet.closure ? <li><i className="dot st-closure" aria-hidden="true"></i>{t('Road closure')}</li> : null}
            </ul>
            <button type="button" className="fl-chip" aria-pressed={d.stress} onClick={d.toggleStress}>{t('Stress test')}: {d.num(STRESS)} {t('routes')}{d.stress && d.fps > 0 ? ' · ' + d.fps + ' fps' : ''}</button>
          </div>
          <div className="prog" role="img" aria-label={tf('{a} delivered, {b} on the road, {c} planned, {d} waiting', { a: delivered, b: enroute, c: planned, d: waiting })}>
            <Bar parts={[pct(delivered), pct(enroute), pct(planned), pct(waiting)]} />
            <p className="mono prog-l"><span>{t('Delivered')} {delivered}</span><span>{t('On the road')} {enroute}</span><span>{t('Planned')} {planned}</span><span>{t('Waiting')} {waiting}</span></p>
          </div>
        </div>

        <aside className="live-side">
          <section className="fl-card" aria-labelledby="l-att">
            <h2 className="label" id="l-att">{t('Needs attention')} ({open.length})</h2>
            {open.length === 0 ? <p className="fl-empty">{t('All clear. Nothing needs a decision right now.')}</p> : <ul className="fl-alerts" data-lenis-prevent="">{open.slice(0, 6).map((a) => <AlertRow key={a.id} a={a} compact />)}</ul>}
            {open.length > 6 ? <button type="button" className="fl-act ghost" onClick={() => d.go('alerts')}>{t('See all alerts')}</button> : null}
          </section>
          <section className="fl-card" aria-labelledby="l-sel">
            <h2 className="label" id="l-sel">{t('Selected vehicle')}</h2>
            <VehicleCard id={d.sel} />
          </section>
        </aside>
      </div>
    </div>
  );
}

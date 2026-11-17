import { SERVICE_KINDS, VT, type ServiceKind } from '../fleetSim';
import { useDemo } from '../store';
import { Bar, Empty, Kpi, useHold } from '../ui';

export default function Maintenance() {
  const d = useDemo(), { t, tf, fleet, act } = d, k = fleet.kpis();
  const soon = fleet.vehicles.filter((v) => fleet.serviceState(v) === 'soon').length, shop = fleet.vehicles.filter((v) => v.phase === 'shop' || v.phase === 'toshop').length;
  const wos = fleet.workOrders.filter((w) => w.state !== 'done'), doneWos = fleet.workOrders.filter((w) => w.state === 'done');
  const rows = fleet.vehicles.slice().sort((a, b) => fleet.kmToService(a) - fleet.kmToService(b));
  const h = useHold(rows, 'maint');
  const kindLabel = (kd: ServiceKind) => ({ 'Scheduled service': t('Scheduled service'), 'Brake inspection': t('Brake inspection'), 'Tyre replacement': t('Tyre replacement'), 'Oil and filters': t('Oil and filters') }[kd]);
  void SERVICE_KINDS;
  const total = wos.reduce((s, w) => s + w.cost, 0);
  return (
    <div className="view maint">
      <div className="view-head"><h2 className="view-title">{t('Maintenance')}</h2></div>
      <p className="view-lede">{t('Services are triggered by distance on the odometer, so a vehicle is never driven past its interval by accident. Overdue vehicles raise an alert and can be sent to the workshop in one click.')}</p>
      <dl className="kpis small">
        <Kpi label={t('Within service interval')} value={k.pmCompliance} unit="%" tone={k.pmCompliance < 90 ? 'bad' : 'good'} hint={t('Benchmark: 95% or better')} />
        <Kpi label={t('Overdue')} value={k.overdue} tone={k.overdue ? 'bad' : 'good'} />
        <Kpi label={t('Due within 500 km')} value={soon} />
        <Kpi label={t('In the workshop')} value={shop} />
        <Kpi label={t('Open work orders')} value={wos.length} hint={d.money(total)} />
      </dl>
      <div className="maint-grid">
        <section className="fl-table" aria-labelledby="ms-h">
          <h3 className="label" id="ms-h">{t('Service schedule')}</h3>
          <div className="fl-scroll" data-lenis-prevent="" tabIndex={0} role="region" aria-label={t('Service schedule')} {...h.bind}>
            <table>
              <thead><tr><th scope="col">{t('Vehicle')}</th><th scope="col">{t('Odometer')}</th><th scope="col">{t('Interval used')}</th><th scope="col">{t('Next service')}</th><th scope="col"><span className="sr-only">{t('Action')}</span></th></tr></thead>
              <tbody>
                {h.rows.map((v) => {
                  const km = fleet.kmToService(v), st = fleet.serviceState(v), used = Math.round(((VT[v.type].interval - km) / VT[v.type].interval) * 100), w = fleet.openWorkOrder(v.id), inShop = v.phase === 'shop' || v.phase === 'toshop';
                  return (
                    <tr key={v.id} className={d.sel === v.id ? 'sel' : ''}>
                      <th scope="row"><button type="button" className="fl-link" onClick={() => { d.setSel(v.id); d.go('vehicles'); }}>{v.id}</button><br /><small>{v.driver}</small></th>
                      <td>{d.num(v.odo)} km</td>
                      <td className="loadc"><Bar parts={[Math.min(100, used)]} className={'mini ' + st} /><small className="mono">{Math.max(0, used)}%</small></td>
                      <td className={st === 'overdue' ? 'bad' : ''}>{st === 'overdue' ? tf('{n} km overdue', { n: d.num(-km) }) : tf('in {n} km', { n: d.num(km) })} {st === 'soon' ? <em className="chip hot">{t('Due soon')}</em> : null}</td>
                      <td>{inShop ? <span className="fl-empty">{t('In the workshop')}</span> : w ? <button type="button" className="fl-act" onClick={() => act.toShop(v.id)}>{t('Send to workshop')}</button> : <button type="button" className={'fl-act' + (st === 'ok' ? ' ghost' : '')} onClick={() => { fleet.createWorkOrder(v.id, 'Scheduled service'); d.refresh(); d.toast(t('Work order created')); }}>{t('Create work order')}</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="fl-card" aria-labelledby="wo-h">
          <h3 className="label" id="wo-h">{t('Work orders')} ({wos.length})</h3>
          {wos.length === 0 ? <Empty title={t('No open work orders')} text={t('Create one from the schedule when a vehicle is due.')} /> : (
            <ul className="wo-list" data-lenis-prevent="">
              {wos.map((w) => {
                const v = fleet.vehicle(w.vehicle)!;
                return (
                  <li key={w.id}>
                    <p className="wo-top"><b className="mono">{w.id}</b><em className={'chip' + (w.state === 'inshop' ? ' ok' : '')}>{w.state === 'inshop' ? t('In the workshop') : t('Open')}</em></p>
                    <p>{kindLabel(w.kind)} &middot; <button type="button" className="fl-link" onClick={() => { d.setSel(v.id); d.go('vehicles'); }}>{w.vehicle}</button></p>
                    <p className="mono wo-m">{d.money(w.cost)} &middot; {t('Opened')} {d.time(w.opened)}</p>
                    <p className="fl-actions">
                      {w.state === 'open' ? <button type="button" className="fl-act" onClick={() => act.toShop(w.vehicle)}>{t('Send to workshop')}</button> : v.phase === 'shop' ? <><span className="mono wo-m">{tf('Ready in about {n} min', { n: Math.max(1, Math.ceil(v.hold / 60)) })}</span><button type="button" className="fl-act" onClick={() => { fleet.finishWorkOrder(w.vehicle); d.refresh(); d.toast(t('Work order closed')); }}>{t('Finish now')}</button></> : <span className="mono wo-m">{t('Driving to the workshop')}</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {doneWos.length ? <p className="mono wo-m">{tf('{n} closed today', { n: doneWos.length })}</p> : null}
        </aside>
      </div>
    </div>
  );
}

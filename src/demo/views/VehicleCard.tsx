import { VT, STOPS } from '../fleetSim';
import { useDemo } from '../store';
import { Spark, StatusTag, Empty } from '../ui';

/* The detail card for one vehicle, used in the Live and Vehicles views. */
export default function VehicleCard({ id }: { id: string | null }) {
  const d = useDemo(), { t, tf, fleet, act } = d, v = id ? fleet.vehicle(id) : undefined;
  if (!v) return <Empty title={t('No vehicle selected')} text={t('Select a vehicle on the map or in the table.')} />;
  const plan = fleet.plan(v, v.jobs), cap = VT[v.type].cap, load = fleet.load(v), km = fleet.kmToService(v);
  const type = v.type === 'motor' ? t('Motorbike') : v.type === 'van' ? t('Van') : t('Truck');
  return (
    <div className="fl-detail">
      <p className="fl-id">{v.id} <StatusTag s={v.status} /></p>
      <dl className="fl-facts mono">
        <div><dt>{t('Driver')}</dt><dd>{v.driver}</dd></div>
        <div><dt>{t('Type')}</dt><dd>{type}</dd></div>
        <div><dt>{t('Speed')}</dt><dd>{Math.round(v.speed)} km/h</dd></div>
        <div><dt>{t('Load')}</dt><dd>{d.num(load)} / {d.num(cap)} kg</dd></div>
        <div><dt>{t('Fuel')}</dt><dd className={v.fuel < d.fleet.settings.fuelPct ? 'bad' : ''}>{Math.round(v.fuel)}%</dd></div>
        <div><dt>{t('Next service')}</dt><dd className={km <= 0 ? 'bad' : ''}>{km <= 0 ? tf('{n} km overdue', { n: d.num(-km) }) : tf('in {n} km', { n: d.num(km) })}</dd></div>
        <div><dt>{t('Depot')}</dt><dd>{t(STOPS[v.depot].name)}</dd></div>
      </dl>
      <p className="label">{t('Stops')} ({v.jobs.length})</p>
      {v.jobs.length === 0 ? <p className="fl-empty">{t('No stops assigned.')}</p> : (
        <ol className="fl-stops">
          {plan.map((p, k) => {
            const o = fleet.order(p.id)!, late = Number.isFinite(p.eta) && p.eta > o.winEnd;
            return (
              <li key={o.id}>
                <button type="button" className="fl-link" onClick={() => { d.setOrd(o.id); d.go('dispatch'); }}>{o.id}</button>
                <span className="fl-stop-c">{o.customer}</span>
                <span className={'mono fl-stop-t' + (late ? ' bad' : '')}>{Number.isFinite(p.eta) ? (k === 0 && v.phase === 'service' ? t('Now') : d.time(p.eta)) : t('Unknown')}<i> / {d.time(o.winEnd)}</i></span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="label">{t('Speed trace')}</p>
      <Spark data={v.speeds.length ? v.speeds : [0, 0]} />
      <p className="fl-actions">
        <button type="button" className="fl-act" onClick={() => act.message()}>{t('Message driver')}</button>
        <button type="button" className="fl-act" disabled={v.jobs.length < 2} onClick={() => act.replan(v.id)}>{t('Re-plan route')}</button>
        <button type="button" className="fl-act" disabled={!v.jobs.length} onClick={() => act.reassign(v.id)}>{t('Reassign stops')}</button>
        <button type="button" className="fl-act" disabled={v.phase === 'shop' || v.phase === 'toshop'} onClick={() => act.toShop(v.id)}>{t('Send to workshop')}</button>
      </p>
    </div>
  );
}

import { useMemo } from 'react';
import { downloadCsv, ordersCsv } from '../csv';
import { driverBase, makeHistory } from '../fleetSim';
import { useDemo, type Demo } from '../store';
import { Kpi } from '../ui';

interface ChartProps { d: Demo; values: number[]; labels: string[]; min: number; max: number; target?: number; label: string; bars?: boolean; unit?: string }
function Chart({ d, values, labels, min, max, target, label, bars, unit }: ChartProps) {
  const W = 640, H = 220, L = 40, R = 12, T = 14, B = 26, n = values.length, iw = W - L - R, ih = H - T - B;
  const x = (i: number) => L + (bars ? (i + 0.5) * (iw / n) : (i / (n - 1)) * iw), y = (v: number) => T + ih - ((v - min) / (max - min)) * ih;
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((tk) => <g key={tk}><line className="ch-grid" x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} /><text className="ch-t" x={L - 6} y={y(tk) + 4} textAnchor="end">{Math.round(tk * 10) / 10}</text></g>)}
        {target !== undefined ? <line className="ch-target" x1={L} x2={W - R} y1={y(target)} y2={y(target)} /> : null}
        {bars ? values.map((v, i) => <rect key={i} className={'ch-bar' + (i === n - 1 ? ' today' : '')} x={x(i) - iw / n / 2 + 4} width={iw / n - 8} y={y(v)} height={T + ih - y(v)} />) : (
          <>
            <polyline className="ch-line" points={values.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ')} />
            {values.map((v, i) => <circle key={i} className={'ch-dot' + (i === n - 1 ? ' today' : '')} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4.5 : 2.6} />)}
          </>
        )}
        {labels.map((l, i) => (i % 2 === 0 || i === n - 1) ? <text key={i} className="ch-t" x={x(i)} y={H - 7} textAnchor="middle">{l}</text> : null)}
      </svg>
      <details className="chart-data">
        <summary>{d.t('View the data')}</summary>
        <table><tbody>{values.map((v, i) => <tr key={i}><th scope="row">{labels[i]}</th><td>{v}{unit ?? ''}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

export default function Reports() {
  const d = useDemo(), { t, tf, fleet } = d, k = fleet.kpis(), hist = useMemo(() => makeHistory(), []);
  const avg = (f: (x: typeof hist[number]) => number) => Math.round((hist.reduce((s, x) => s + f(x), 0) / hist.length) * 10) / 10;
  const dn: Record<string, string> = { Mon: t('Mon'), Tue: t('Tue'), Wed: t('Wed'), Thu: t('Thu'), Fri: t('Fri'), Sat: t('Sat'), Sun: t('Sun') };
  const labels = [...hist.map((x) => dn[x.label]), t('Today')];
  const todayOrders = k.orders;
  const drivers = fleet.vehicles.map((v, i) => {
    const b = driverBase(i), deliveries = b.deliveries + v.done, on = Math.round(((b.onTime / 100) * b.deliveries + v.onTimeDone) / deliveries * 1000) / 10;
    return { v, deliveries, on, idle: b.idle, score: b.score };
  }).sort((a, b) => b.score - a.score);
  const exportDaily = () => {
    const rows: (string | number)[][] = [['day', 'orders', 'on_time_pct', 'first_attempt_pct', 'km', 'cost_per_km_idr', 'utilisation_pct', 'idle_pct']];
    hist.forEach((x, i) => rows.push([i + 1, x.orders, x.onTime, x.firstAttempt, x.km, x.costPerKm, x.utilization, x.idle]));
    rows.push(['today_live', todayOrders, k.onTime, k.firstAttempt, k.km, k.costPerKm, k.utilization, k.idlePct]);
    downloadCsv('shiro-dispatch-daily.csv', rows); fleet.flags.exported = true; d.toast(t('Downloaded the daily report as CSV')); d.refresh();
  };
  const exportOrders = () => { downloadCsv('shiro-dispatch-orders.csv', ordersCsv(fleet)); fleet.flags.exported = true; d.toast(t('Downloaded the orders as CSV')); d.refresh(); };
  const vs = (today: number, a: number, unit: string, better: 'up' | 'down') => { const diff = Math.round((today - a) * 10) / 10, good = better === 'up' ? diff >= 0 : diff <= 0; return { text: tf('14-day average {n}', { n: a + unit }), tone: (Math.abs(diff) < 0.05 ? undefined : good ? 'good' : 'bad') as 'good' | 'bad' | undefined }; };
  const ot = vs(k.onTime, avg((x) => x.onTime), '%', 'up'), ut = vs(k.utilization, avg((x) => x.utilization), '%', 'up'), id = vs(k.idlePct, avg((x) => x.idle), '%', 'down'), fa = vs(k.firstAttempt, avg((x) => x.firstAttempt), '%', 'up');
  const cpk = vs(k.costPerKm, avg((x) => x.costPerKm), '', 'down');
  return (
    <div className="view reports">
      <div className="view-head">
        <h2 className="view-title">{t('Reports')}</h2>
        <div className="view-tools"><button type="button" className="fl-act" onClick={exportDaily}>{t('Export daily report (CSV)')}</button><button type="button" className="fl-act" onClick={exportOrders}>{t('Export orders (CSV)')}</button></div>
      </div>
      <p className="view-lede">{t('Fourteen days of sample history, with today live at the end. History is generated for the demo; today comes from the simulation.')}</p>
      <dl className="kpis small">
        <Kpi label={t('On-time delivery')} value={k.onTime.toFixed(1)} unit="%" tone={ot.tone} hint={ot.text} />
        <Kpi label={t('First-attempt delivery')} value={k.firstAttempt.toFixed(1)} unit="%" tone={fa.tone} hint={fa.text} />
        <Kpi label={t('Utilisation')} value={k.utilization} unit="%" tone={ut.tone} hint={ut.text} />
        <Kpi label={t('Idle time')} value={k.idlePct.toFixed(1)} unit="%" tone={id.tone} hint={id.text} />
        <Kpi label={t('Cost per km')} value={k.costPerKm ? d.money(k.costPerKm) : '-'} tone={k.costPerKm ? cpk.tone : undefined} hint={tf('14-day average {n}', { n: d.money(avg((x) => x.costPerKm)) })} />
      </dl>
      <div className="rep-grid">
        <section className="fl-card"><h3 className="label">{t('On-time delivery, last 14 days and today')}</h3>
          <Chart d={d} values={[...hist.map((x) => x.onTime), k.onTime]} labels={labels} min={85} max={100} target={95} unit="%" label={t('Line chart of the on-time delivery rate per day, with a 95% target line.')} />
          <p className="mono chart-note">{t('Dashed line: 95% target')}</p></section>
        <section className="fl-card"><h3 className="label">{t('Orders per day')}</h3>
          <Chart d={d} values={[...hist.map((x) => x.orders), todayOrders]} labels={labels} min={0} max={180} bars label={t('Bar chart of orders per day. The last bar is today so far.')} />
          <p className="mono chart-note">{t('Last bar: today so far')}</p></section>
      </div>
      <section className="fl-table" aria-labelledby="dr-h">
        <h3 className="label" id="dr-h">{t('Driver scorecard')}</h3>
        <div className="fl-scroll" data-lenis-prevent="" tabIndex={0} role="region" aria-label={t('Driver scorecard')}>
          <table>
            <thead><tr><th scope="col">{t('Driver')}</th><th scope="col">{t('Vehicle')}</th><th scope="col">{t('Deliveries, 14 days')}</th><th scope="col">{t('On time')}</th><th scope="col">{t('Idle time')}</th><th scope="col">{t('Driving score')}</th></tr></thead>
            <tbody>{drivers.map((r) => <tr key={r.v.id}><th scope="row">{r.v.driver}</th><td>{r.v.id}</td><td>{d.num(r.deliveries)}</td><td className={r.on < 90 ? 'bad' : ''}>{r.on}%</td><td>{r.idle}%</td><td className={r.score < 78 ? 'bad' : ''}>{r.score}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mono fl-note">{t('Driving scores are sample figures. This demo does not simulate harsh braking or speeding events.')}</p>
      </section>
    </div>
  );
}

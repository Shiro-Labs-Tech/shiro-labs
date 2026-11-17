import { useDemo } from '../store';

function Choice({ legend, hint, value, options, onChange }: { legend: string; hint: string; value: number; options: number[]; onChange: (n: number) => void }) {
  return (
    <fieldset className="set-row"><legend>{legend}</legend><p className="set-hint">{hint}</p>
      <span className="fl-group">{options.map((o) => <button key={o} type="button" className="fl-chip" aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>)}</span>
    </fieldset>
  );
}

export default function Settings() {
  const d = useDemo(), { t, fleet } = d, s = fleet.settings;
  const set = (patch: Partial<typeof s>) => { Object.assign(fleet.settings, patch); fleet.evaluate(); d.refresh(); };
  return (
    <div className="view settings">
      <div className="view-head"><h2 className="view-title">{t('Settings')}</h2></div>
      <p className="view-lede">{t('These rules are live. Change one and the alerts, the dispatch plan and the customer messages follow straight away.')}</p>
      <div className="set-grid">
        <section className="fl-card"><h3 className="label">{t('Dispatch')}</h3>
          <label className="switch"><input type="checkbox" checked={s.autoAssign} onChange={(e) => set({ autoAssign: e.target.checked })} /><span><b>{t('Auto-assign waiting orders')}</b><small>{t('Every 10 minutes the planner gives each waiting order to its best vehicle. Rush orders go first.')}</small></span></label>
          <label className="switch"><input type="checkbox" checked={s.autoNotify} onChange={(e) => set({ autoNotify: e.target.checked })} /><span><b>{t('Tell customers automatically')}</b><small>{t('A message goes out when the vehicle is within 30 min, and again if the arrival slips past the window.')}</small></span></label>
        </section>
        <section className="fl-card"><h3 className="label">{t('Alert rules')}</h3>
          <Choice legend={t('Warn when a stop is predicted late by (min)')} hint={t('Lower catches problems sooner and raises more alerts.')} value={s.lateMin} options={[5, 10, 15]} onChange={(n) => set({ lateMin: n })} />
          <Choice legend={t('Warn when a vehicle stops for (min)')} hint={t('Applies to stops away from the depot.')} value={s.idleMin} options={[10, 15, 30]} onChange={(n) => set({ idleMin: n })} />
          <Choice legend={t('Warn when fuel drops below (%)')} hint={t('A vehicle that runs dry stops until it is refuelled.')} value={s.fuelPct} options={[10, 15, 25]} onChange={(n) => set({ fuelPct: n })} />
        </section>
        <section className="fl-card"><h3 className="label">{t('About this demo')}</h3>
          <p>{t('Shiro Dispatch is a sample product made by Shiro Labs. Every vehicle, driver, customer and place is invented, and the simulation runs in your browser. Nothing is sent anywhere.')}</p>
          <p className="fl-actions"><button type="button" className="fl-act" onClick={() => d.act.reset()}>{t('Reset demo data')}</button></p>
        </section>
      </div>
    </div>
  );
}

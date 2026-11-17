import { useState } from 'react';
import { useDemo } from '../store';
import { AlertRow, Empty } from '../ui';

export default function Alerts() {
  const d = useDemo(), { t, fleet } = d, [tab, setTab] = useState<'active' | 'resolved'>('active');
  const rank = { critical: 0, warn: 1, info: 2 } as const;
  const active = fleet.alerts.filter((a) => a.state !== 'resolved').sort((a, b) => rank[a.sev] - rank[b.sev] || b.at - a.at);
  const done = fleet.alerts.filter((a) => a.state === 'resolved').sort((a, b) => b.at2 - a.at2);
  const list = tab === 'active' ? active : done;
  return (
    <div className="view alerts">
      <div className="view-head">
        <h2 className="view-title">{t('Alerts')}</h2>
        <span className="fl-group" role="tablist" aria-label={t('Alerts')}>
          <button type="button" role="tab" aria-selected={tab === 'active'} className="fl-chip" onClick={() => setTab('active')}>{t('Active')} {active.length}</button>
          <button type="button" role="tab" aria-selected={tab === 'resolved'} className="fl-chip" onClick={() => setTab('resolved')}>{t('Resolved')} {done.length}</button>
        </span>
      </div>
      <p className="view-lede">{t('Alerts are raised from the rules in Settings and clear themselves when the problem goes away. Each one comes with the fix that usually works.')}</p>
      {list.length === 0 ? (
        <Empty title={tab === 'active' ? t('All clear') : t('Nothing resolved yet')} text={tab === 'active' ? t('No open alerts. Try Simulate in the top bar to create a problem.') : t('Resolved alerts are listed here.')} />
      ) : <ul className="fl-alerts big" data-lenis-prevent="">{list.slice(0, 40).map((a) => <AlertRow key={a.id} a={a} />)}</ul>}
    </div>
  );
}

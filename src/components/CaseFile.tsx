import { useT } from '../i18n';
import { pad } from '../folio/runtime';
import type { CaseFile as Case } from '../content';

/* One case file. It opens as a full screen layer; without JS it still works through :target. */
export default function CaseFile({ c, i, n }: { c: Case; i: number; n: number }) {
  const t = useT();
  return (
    <article className="case" id={'case-' + c.id} role="dialog" aria-modal="true" aria-labelledby={'t-' + c.id} data-project={c.id} data-lenis-prevent="">
      <div className="case-bar">
        <button className="case-close mono" type="button" data-case-close>{t('Close')}</button>
        <span className="mono case-no">{t('Case')} {pad(i + 1)} / {pad(n)}</span>
        <span className="case-nav mono"><button type="button" data-case-prev>{t('Prev')}</button><button type="button" data-case-next>{t('Next')}</button></span>
      </div>
      <div className="case-body">
        <div className="case-side">
          <p className="label" data-in>{c.label}</p>
          <h2 id={'t-' + c.id} data-in>{c.title}</h2>
          <p className="lede" data-in>{c.lede}</p>
          <dl className="case-meta mono" data-in>
            <div><dt>{t('Role')}</dt><dd>{c.role}</dd></div>
            <div><dt>{t('Timeline')}</dt><dd>{c.time}</dd></div>
            <div><dt>{t('Stack')}</dt><dd>{c.stack}</dd></div>
          </dl>
          <div className="case-metrics" data-in>
            {c.metrics.map((m) => (
              <div key={m.label}><strong data-count={m.value} data-dec={m.dec ? m.dec : undefined} data-suffix={m.suffix}>0</strong><span>{m.label}</span></div>
            ))}
          </div>
        </div>
        <div className="case-main">
          <div className="case-stage"></div>
          <div className="case-copy" data-in>
            <p className="mono case-tag">{t('Sample case file. Replace with a real engagement.')}</p>
            <h3>{t('The question')}</h3><p>{c.q}</p>
            <h3>{t('What we found and did')}</h3><p>{c.a}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

import { Link } from 'react-router';
import { useLang, useT } from '../i18n';
import { pad } from '../folio/runtime';
import type { CaseFile as Case } from '../content';

/* One case file. It opens as a full screen layer; without JS it still works through :target. */
export default function CaseFile({ c, i, n }: { c: Case; i: number; n: number }) {
  const t = useT(), lang = useLang();
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
            <p className="mono case-tag">{c.id === 'gym' ? t('Concept project. A live site, not a client engagement.') : t('Sample case file. Replace with a real engagement.')}</p>
            <h3>{t('The question')}</h3><p>{c.q}</p>
            <h3>{t('What we found and did')}</h3><p>{c.a}</p>
            {c.id === 'gym' && (
              <div className="case-demo">
                <p className="mono case-tag">{t('Live site')}</p>
                <p>{t('See the whole page, in three languages. It is a concept, not a real business.')}</p>
                <a className="pill pill-solid" href="https://gym.shiro-labs.tech" target="_blank" rel="noopener noreferrer">{t('Open the live site')}</a>
              </div>
            )}
            {c.id === 'dash' && (
              <div className="case-demo">
                <p className="mono case-tag">{t('Live demo')}</p>
                <p>{t('Try it as a product, on invented data: assign orders, close a road, break a vehicle down, export a report.')}</p>
                <Link className="pill pill-solid" to={(lang === 'id' ? '/id' : '') + '/demo/fleet'}>{t('Open Shiro Dispatch')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

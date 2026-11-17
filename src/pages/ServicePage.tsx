import { Link } from 'react-router';
import { useLang, useT, homePath, servicePath } from '../i18n';
import { EMAIL, getService, getServices } from '../content';
import CopyButton from '../components/CopyButton';
import Footer from '../components/Footer';

const no = (i: number) => String(i + 1).padStart(2, '0');

export default function ServicePage({ slug }: { slug: string }) {
  const t = useT(), lang = useLang();
  const sv = getService(lang, slug)!;
  const by = Object.fromEntries(getServices(lang).map((s) => [s.slug, s]));
  const home = homePath(lang), toServices = { pathname: home, hash: '#services' };
  const subject = encodeURIComponent(sv.name).replace(/%2C/g, ',');
  const mailto = `mailto:${EMAIL}?subject=${subject}`;
  return (
    <>
      <main id="main">
        <section className="svc-hero" aria-labelledby="svc-title">
          <p className="mono svc-crumb"><Link to={home}>Shiro Labs</Link><span aria-hidden="true"> / </span><Link to={toServices}>{t('Services')}</Link><span aria-hidden="true"> / </span><span>{sv.no}</span></p>
          <h1 className="svc-title" id="svc-title">{sv.title}</h1>
          <p className="svc-name label">{sv.name}</p>
          <p className="svc-lede">{sv.lede}</p>
          <p className="cta">
            <a className="pill pill-solid" href={mailto} data-magnet data-scramble>{t('Book a call')}</a>
            <Link className="pill" to={toServices} data-magnet data-scramble>{t('All services')}</Link>
          </p>
          <dl className="facts mono">{sv.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>

        <section className="exp" aria-labelledby="helps-label">
          <div className="sec-head">
            <h2 className="label" id="helps-label">{t('(01) Where this helps')}</h2>
            <p className="label">{t('Problems we are usually called for')}</p>
          </div>
          <ol className="exp-list">{sv.helps.map(([a, d], i) => <li key={a}><span className="mono">{no(i)}</span><div><h3>{a}</h3><p>{d}</p></div></li>)}</ol>
        </section>

        <section className="caps" aria-labelledby="does-label">
          <div className="sec-head">
            <h2 className="label" id="does-label">{t('(02) What we do')}</h2>
            <p className="label">{t('Pick what applies, skip what does not')}</p>
          </div>
          <div className="caps-grid svc-does">{sv.does.map(([a, d], i) => <article key={a}><p className="mono cap-no">{no(i)}</p><h3>{a}</h3><p>{d}</p></article>)}</div>
        </section>

        <section className="method" id="method" aria-labelledby="method-label">
          <div className="sec-head">
            <h2 className="label" id="method-label">{t('(03) How it runs')}</h2>
            <p className="label">{t('Four steps, written down as we go')}</p>
          </div>
          <div className="method-rail" aria-hidden="true"><i id="method-fill"></i></div>
          <ol className="method-list" id="method-list">{sv.runs.map(([a, d], i) => <li key={a}><span className="mono">{no(i)}</span><h3>{a}</h3><p>{d}</p></li>)}</ol>
        </section>

        <section className="exp" aria-labelledby="tools-label">
          <div className="sec-head">
            <h2 className="label" id="tools-label">{t('(04) Tools')}</h2>
            <p className="label">{t('What we usually reach for')}</p>
          </div>
          <ul className="chips chips-static">{sv.tools.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>

        <section className="exp" aria-labelledby="faq-label">
          <div className="sec-head">
            <h2 className="label" id="faq-label">{t('(05) Questions')}</h2>
            <p className="label">{t('Short answers')}</p>
          </div>
          <div className="faq">{sv.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>

        <section className="caps" aria-labelledby="rel-label">
          <div className="sec-head">
            <h2 className="label" id="rel-label">{t('(06) Related services')}</h2>
            <p className="label"><Link to={toServices}>{t('All six')}</Link></p>
          </div>
          <div className="caps-grid svc-related">
            {sv.related.map((r) => (
              <article key={r}>
                <p className="mono cap-no">{by[r].no}</p>
                <h3><Link to={servicePath(lang, r)}>{by[r].name}</Link></h3>
                <p>{by[r].card}</p>
                <span className="mono cap-more" aria-hidden="true">{t('View service')}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="contact svc-contact" id="contact" aria-labelledby="contact-label">
          <p className="label" id="contact-label">{t('(07) Contact')}</p>
          <h2 className="contact-line" id="contact-line">{t('Tell us what you are trying to ship.')}</h2>
          <p className="contact-mail"><a href={mailto} data-magnet>{EMAIL}</a>
            <CopyButton /></p>
          <p className="mono svc-note">{t('Working hours are 09:00 to 18:00 WIB (UTC+7).')} <Link to={{ pathname: home, hash: '#contact' }}>{t('See the overlap with your time zone')}</Link>.</p>
        </section>
      </main>
      <Footer variant="service" />
    </>
  );
}

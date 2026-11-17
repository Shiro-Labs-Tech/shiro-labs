import { Link, useLocation } from 'react-router';
import { useLang, useT, homePath } from '../i18n';
import Footer from '../components/Footer';
import FleetApp from '../demo/FleetApp';

const SOURCES: { href: string; name: string }[] = [
  { href: 'https://www.upperinc.com/?p=29569', name: 'Upper' },
  { href: 'https://www.nexdigm.com/market-research/insights/blog/vehicle-utilization-benchmarking/', name: 'Nexdigm' },
  { href: 'https://oxmaint.com/article/fleet-maintenance-software-buyers-guide-2026', name: 'Oxmaint' },
  { href: 'https://www.dispatchtrack.com/?p=2632', name: 'DispatchTrack' },
];

export default function FleetDemo() {
  const t = useT(), lang = useLang(), { pathname } = useLocation();
  const feats = [
    { h: t('A live control tower'), p: t('Dispatchers learn about trouble when customers call.'), s: t('Every vehicle, stop and delay on one map, with alerts that name the fix.') },
    { h: t('Dispatch that does the sums'), p: t('Hand assignment is slow and ignores load limits.'), s: t('Vehicles are ranked by arrival time, extra distance and load. Overloads are blocked.') },
    { h: t('Exceptions, not map-watching'), p: t('A closure, a breakdown or rain hits many stops at once.'), s: t('Predicted-late alerts with one-click re-plan or reassign.') },
    { h: t('Customer updates'), p: t('"Where is my order?" calls eat the day.'), s: t('Automatic messages and a tracking page with an arrival window.') },
    { h: t('Maintenance by the odometer'), p: t('Missed services turn into breakdowns.'), s: t('Service intervals by distance, work orders and a workshop hand-over.') },
    { h: t('Reports you can export'), p: t('Nobody fixes what the numbers hide.'), s: t('On-time rate, utilisation, idle time, cost per km, driver scorecards and CSV.') },
  ];
  const stats = [
    { n: '45%', p: t('of failed deliveries trace back to address errors.'), s: t('Failed attempts are logged with a reason and re-queued with a new window.'), src: SOURCES[0] },
    { n: '60-70% / 85%', p: t('Typical commercial fleet utilisation, against what strong delivery fleets aim for.'), s: t('Utilisation sits on the Live view and in Reports.'), src: SOURCES[1] },
    { n: '~40%', p: t('of unplanned breakdowns are linked to missed preventive maintenance (vendor claim).'), s: t('Service intervals follow the odometer and overdue vehicles raise an alert.'), src: SOURCES[2] },
    { n: '40-50%', p: t('fewer customer service calls with accurate arrival times and tracking links (vendor claim).'), s: t('Customers get automatic messages and a tracking page.'), src: SOURCES[3] },
  ];
  return (
    <>
      <main id="main" className="fl">
        <section className="svc-hero fl-head" aria-labelledby="fl-title">
          <p className="mono svc-crumb"><Link to={homePath(lang)}>Shiro Labs</Link><span aria-hidden="true"> / </span><Link to={{ pathname: homePath(lang), hash: '#work' }}>{t('Case files')}</Link><span aria-hidden="true"> / </span><span>Shiro Dispatch</span></p>
          <h1 className="svc-title" id="fl-title">Shiro Dispatch</h1>
          <p className="svc-lede">{t('A fleet and dispatch product for delivery operators: live map, order assignment, route re-planning, maintenance and reports. It is a working sample on invented data. Use it.')}</p>
          <p className="cta">
            <span className="mono tag-live">{t('Live demo')}</span>
            <Link className="pill" to={{ pathname, hash: '#app' }} data-magnet>{t('Open the app')}</Link>
            <Link className="pill" to={{ pathname: homePath(lang), hash: '#case-dash' }} data-magnet>{t('Read the case file')}</Link>
          </p>
        </section>

        <FleetApp />

        <section className="prod" id="features" aria-labelledby="prod-f">
          <h2 className="prod-h" id="prod-f">{t('What it does for an operator')}</h2>
          <ul className="prod-grid">
            {feats.map((f) => <li key={f.h}><h3>{f.h}</h3><p className="prod-p">{f.p}</p><p>{f.s}</p></li>)}
          </ul>
        </section>

        <section className="prod" id="research" aria-labelledby="prod-r">
          <h2 className="prod-h" id="prod-r">{t('Built from what operators report')}</h2>
          <p className="prod-lede">{t('Before designing this we read the product pages, buyer guides and benchmark articles of the main fleet and dispatch tools, among them Onfleet, Routific, Samsara, Geotab and Fleetio. These figures shaped it. Most come from vendors, so read them as direction, not proof.')}</p>
          <ul className="prod-grid stats">
            {stats.map((s) => <li key={s.n}><p className="prod-n">{s.n}</p><p>{s.p}</p><p className="prod-s">{s.s}</p><a className="mono prod-src" href={s.src.href} target="_blank" rel="noopener noreferrer">{t('Source')}: {s.src.name}</a></li>)}
          </ul>
          <p className="prod-lede">{t('In Indonesia the government is continuing its Zero ODOL (over dimension, overload) policy for freight, and trucking firms say they are pressed to overload. So assignment here refuses any order that would put a vehicle over its load limit.')} <a className="mono prod-src" href="https://www.pwc.com/id/en/media-centre/infrastructure-news/june-2025/land-transport-government-continues-zero-odol-policy.html" target="_blank" rel="noopener noreferrer">PwC Indonesia</a> <a className="mono prod-src" href="https://www.asia-pacific-solidarity.net/news/2025-06-28/truckers-forced-overload-or-lose-orders-indonesia-cracks-down-odol.html" target="_blank" rel="noopener noreferrer">Jakarta Globe</a></p>
        </section>

        <section className="prod" id="scope" aria-labelledby="prod-s">
          <h2 className="prod-h" id="prod-s">{t('What is real here, and what a live deployment adds')}</h2>
          <div className="prod-two">
            <div><h3>{t('In this demo')}</h3><ul><li>{t('The planning engine: ranking, insertion, re-planning, time windows, load limits.')}</li><li>{t('A seeded fleet simulation that runs in your browser.')}</li><li>{t('Alert rules, customer messages, work orders and CSV export.')}</li><li>{t('English and Indonesian, light and dark.')}</li></ul></div>
            <div><h3>{t('A live deployment adds')}</h3><ul><li>{t('GPS trackers or a driver app feeding real positions.')}</li><li>{t('Road-network routing and live traffic, not straight lines.')}</li><li>{t('Accounts, roles, a database and an audit trail.')}</li><li>{t('Real SMS or WhatsApp messages and links to your order and accounting systems.')}</li></ul></div>
          </div>
          <p className="cta"><Link className="pill" to={{ pathname: homePath(lang), hash: '#contact' }} data-magnet>{t('Need something like this? Talk to us')}</Link></p>
        </section>
      </main>
      <Footer variant="service" />
    </>
  );
}

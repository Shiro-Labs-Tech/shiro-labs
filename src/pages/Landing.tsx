import { useState } from 'react';
import { useLang, useT } from '../i18n';
import { getCases, getServices } from '../content';
import { pad } from '../folio/runtime';
import Loader from '../components/Loader';
import Clock from '../components/Clock';
import Overlap from '../components/Overlap';
import CopyButton from '../components/CopyButton';
import Footer from '../components/Footer';
import ServiceCard from '../components/ServiceCard';
import CaseFile from '../components/CaseFile';
import UpBars from '../components/UpBars';
import { useBoot } from '../components/Layout';

export default function Landing() {
  const t = useT();
  const lang = useLang();
  const services = getServices(lang);
  const cases = getCases(lang);
  const [loading, setLoading] = useState(useBoot());
  return (
    <>
      {loading && <Loader onDone={() => setLoading(false)} />}
    <main>
  
      <section className="hero" aria-labelledby="hero-title">
        <canvas className="orb" id="orb" aria-hidden="true"></canvas>
        <div className="hero-meta mono">
          <span>{t("Shiro Labs / IT consulting")}</span>
          <span className="status"><i aria-hidden="true"></i>{t("Taking projects from Q1 2027")}</span>
          <span>Jakarta <Clock id="local-time" /></span>
        </div>
        <div className="hero-main">
          <div className="hero-copy">
            <h1 className="hero-title" id="hero-title">{t("Technology your business can rely on.")}</h1>
            <p className="role">{t("Shiro Labs is an independent IT consultancy. We help businesses plan, build, connect and run the technology they depend on.")}</p>
            <p className="cta">
              <a className="pill pill-solid" href="mailto:hello@shiro-labs.tech" data-magnet data-scramble>{t("Book a call")}</a>
              <a className="pill" href="#work" data-magnet data-scramble>{t("See case files")}</a>
            </p>
          </div>
          <figure className="mark" id="mark">
            <svg className="mark-glyph" id="mark-glyph" viewBox="0 0 780 939" role="img" aria-label={t("Shiro Labs mark, the kanji for white")}><use href="#g" className="g-ink"/><use href="#g" className="g-acc" clipPath="url(#tick-clip)"/></svg>
            <figcaption className="mark-cap mono" aria-hidden="true">Labs</figcaption>
          </figure>
        </div>
      </section>

      <div className="marquee" aria-hidden="true" data-speed="0.6">
        <div className="marquee-track"><span>{t("Strategy")}</span><span>{t("Custom software")}</span><span>{t("Integration")}</span><span>Cloud</span><span>AI</span><span>{t("Audits")}</span></div>
      </div>

  
      <section className="statement-wrap" id="about" aria-labelledby="about-label">
        <p className="label" id="about-label">{t("(00) About")}</p>
        <p className="statement" id="statement">{t("Shiro means white: a blank page, a clean result. We work the same way. Every engagement starts with understanding the system, ends with something written down, and leaves your team with fewer surprises than before.")}</p>
        <dl className="facts mono">
          <div><dt>{t("Based")}</dt><dd>Indonesia, WIB (UTC+7)</dd></div>
          <div><dt>{t("Works with")}</dt><dd>{t("Startups and growing businesses")}</dd></div>
          <div><dt>{t("Booking")}</dt><dd>Q1 2027</dd></div>
        </dl>
      </section>

  
      <section className="caps" id="services" aria-labelledby="caps-label">
        <div className="sec-head">
          <h2 className="label" id="caps-label">{t("(01) Services")}</h2>
          <p className="label">{t("Six services, each with its own page")}</p>
        </div>
        <div className="caps-grid">
          {services.map((sv) => <ServiceCard key={sv.slug} sv={sv} />)}
        </div>
        <div className="toybox" id="toybox">
          <p className="label toybox-label">{t("Tools we use")}</p>
          <ul className="chips" id="chips">
            <li>TypeScript</li><li>React</li><li>Node</li><li>Python</li><li>Rust</li><li>Postgres</li><li>Docker</li><li>AWS</li><li>Terraform</li><li>Linux</li><li>Actions</li><li>Grafana</li><li>REST</li><li>Webhooks</li><li>Playwright</li><li>Figma</li>
          </ul>
        </div>
      </section>

  
      <section className="method" id="method" aria-labelledby="method-label">
        <div className="sec-head">
          <h2 className="label" id="method-label">{t("(02) Method")}</h2>
          <p className="label">{t("Discover, plan, deliver, hand over")}</p>
        </div>
        <div className="method-rail" aria-hidden="true"><i id="method-fill"></i></div>
        <ol className="method-list" id="method-list">
          <li><span className="mono">01</span><h3>{t("Discover")}</h3><p>{t("We talk to the people who use the system and read what exists: contracts, tools, data and past incidents. No changes yet.")}</p></li>
          <li><span className="mono">02</span><h3>{t("Plan")}</h3><p>{t("We write down the options, costs and risks in plain language and agree an order of work that fits your budget.")}</p></li>
          <li><span className="mono">03</span><h3>{t("Deliver")}</h3><p>{t("Small increments, shipped and visible every week, so you can steer before money goes in the wrong place.")}</p></li>
          <li><span className="mono">04</span><h3>{t("Hand over")}</h3><p>{t("Documentation, training and a short list of next steps. You keep everything; nothing depends on us staying.")}</p></li>
        </ol>
      </section>

  
      <section className="work" id="work" aria-labelledby="work-label">
        <div className="work-pin" id="work-pin">
          <div className="work-head">
            <p className="label" id="work-label">{t("(03) Case files. Samples, replace with real work")}</p>
            <p className="label work-count" aria-hidden="true"><span id="work-now">01</span> / {pad(cases.length)}</p>
          </div>
          <div className="work-track" id="work-track" tabIndex={0} role="region" aria-label={t("Case files, scroll horizontally")}>

            <a className="panel" href="#case-gym" data-project="gym" data-cursor={t("View case")} aria-label={`${t("Landing page")}, ${t("open case file")}`}>
              <p className="mono panel-label">{t("2026 / Landing pages")}</p>
              <div className="frame-slot"><div className="frame"><div className="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span className="frame-url">gym.shiro-labs.tech</span></div>
                <div className="shot s-gym" aria-hidden="true">
                  <svg className="gring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><circle className="gt" cx="50" cy="50" r="41"/><circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="10"/></svg>
                  <div className="gtp"><b><i></i>SHIRO GYM</b><em>{t("Open now")}</em><u>{t("Free week")}</u></div>
                  <div className="ghe">
                    <h4>START<span>STRONG.</span></h4>
                    <p>{t("Small classes, real coaches and a free first week.")}</p>
                    <div className="gbn"><span className="gcta">{t("Find my first class")}</span><span className="gcta gc2">{t("See the schedule")}</span></div>
                  </div>
                  <div className="gbt"><strong>062<small>BPM</small></strong><svg viewBox="0 0 100 20" preserveAspectRatio="none"><polyline pathLength="1" points="0,11 14,11 17,11 19,4 22,17 25,11 44,11 47,11 49,2 52,18 55,11 74,11 77,11 79,5 82,16 85,11 100,11"/></svg></div>
                </div></div></div>
              <h3>{t("Landing page")}</h3>
              <p className="panel-role">{t("A free first week, and a page built to get it claimed.")}</p>
              <p className="tags mono"><span className="tag-sample">{t("Concept")}</span><span>{t("Three languages")}</span><span>{t("No framework")}</span></p>
            </a>

            <a className="panel" href="#case-plan" data-project="plan" data-cursor={t("View case")} aria-label={`${t("Technology roadmap")}, ${t("open case file")}`}>
              <p className="mono panel-label">{t("2026 / Technology strategy")}</p>
              <div className="frame-slot"><div className="frame"><div className="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span className="frame-url">plan.example/roadmap</span></div>
                <div className="shot s-road" aria-hidden="true">
                  <div className="rtp"><b>{t("Technology roadmap")}</b><span className="rok">{t("Approved")}</span><em>2026</em></div>
                  <div className="rbd">
                    <div className="rcol"><p><span>{t("Now")}</span><span>Q1</span></p><ul><li><b>Single sign-on</b><small>{t("Effort S")}</small></li><li><b>{t("Retire four unused tools")}</b><small>{t("Effort S")}</small></li><li><b>{t("Test the backups")}</b><small>{t("Effort S")}</small></li></ul></div>
                    <div className="rcol"><p><span>{t("Next")}</span><span>Q2</span></p><ul><li><b>{t("Connect store and ERP")}</b><small>{t("Effort M")}</small></li><li><b>{t("Customer portal")}</b><small>{t("Effort L")}</small></li><li><b>{t("Security basics")}</b><small>{t("Effort M")}</small></li></ul></div>
                    <div className="rcol"><p><span>{t("Later")}</span><span>Q3</span></p><ul><li><b>{t("One reporting layer")}</b><small>{t("Effort M")}</small></li><li><b>{t("Replace legacy admin")}</b><small>{t("Effort L")}</small></li><li><b>Data warehouse</b><small>{t("Effort L")}</small></li></ul></div>
                  </div>
                </div></div></div>
              <h3>{t("Technology roadmap")}</h3>
              <p className="panel-role">{t("A costed plan leadership approved in one meeting.")}</p>
              <p className="tags mono"><span className="tag-sample">{t("Sample")}</span><span>{t("Workshops")}</span><span>{t("Cost model")}</span></p>
            </a>

            <a className="panel" href="#case-dash" data-project="dash" data-cursor={t("View case")} aria-label={`${t("Fleet dashboard")}, ${t("open case file")}`}>
              <p className="mono panel-label">{t("2025 / Custom software")}</p>
              <div className="frame-slot"><div className="frame"><div className="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span className="frame-url">dispatch.example</span></div>
                <div className="shot s-north" aria-hidden="true">
                  <div className="nsd"><b></b><i className="on"></i><i></i><i></i><i></i></div>
                  <div className="nmn">
                    <div className="ntp"><span>{t("Fleet overview")}</span><em>{t("Last 30 days")}</em></div>
                    <div className="nkp">
                      <div><small>{t("On-time rate")}</small><strong>{t("94.2%")}</strong><u>{t("+2.1 pts")}</u></div>
                      <div><small>{t("Active routes")}</small><strong>{t("1,284")}</strong><u>{t("+86 this week")}</u></div>
                      <div><small>{t("CO2 per load")}</small><strong>-12%</strong><u>vs 2025</u></div>
                    </div>
                    <svg className="nch" viewBox="0 0 330 120" preserveAspectRatio="none">
                      <defs><linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2dd4a0" stopOpacity=".32"/><stop offset="1" stopColor="#2dd4a0" stopOpacity="0"/></linearGradient></defs>
                      <path d="M0 30H330M0 60H330M0 90H330" stroke="#fff" strokeOpacity=".06" fill="none"/>
                      <path className="ar" d="M0 96L27 88L55 92L82 74L110 80L137 58L165 64L192 44L220 50L247 30L275 36L302 18L330 10V120H0Z" fill="url(#ng)"/>
                      <path className="ln" pathLength="1" d="M0 96L27 88L55 92L82 74L110 80L137 58L165 64L192 44L220 50L247 30L275 36L302 18L330 10" fill="none" stroke="#2dd4a0" strokeWidth="2" strokeLinejoin="round"/>
                      <circle className="pt" cx="330" cy="10" r="3.5" fill="#2dd4a0"/>
                    </svg>
                  </div>
                  <div className="nmp">
                    <svg viewBox="0 0 160 220" preserveAspectRatio="xMidYMid slice">
                      <path className="rt" pathLength="1" d="M24 188C48 150 40 120 78 104S128 70 132 34" fill="none" stroke="#2dd4a0" strokeWidth="1.4"/>
                      <path className="rt r2" pathLength="1" d="M24 188C70 176 96 150 112 128S146 100 146 78" fill="none" stroke="#ffb347" strokeWidth="1.4"/>
                      <g fill="#0d1620" stroke="#8aa0b4" strokeWidth="1.2"><circle cx="24" cy="188" r="4"/><circle cx="78" cy="104" r="3.5"/><circle cx="132" cy="34" r="4"/><circle cx="112" cy="128" r="3.5"/><circle cx="146" cy="78" r="3.5"/></g>
                      <circle className="pl" cx="132" cy="34" r="4" fill="#2dd4a0"/><circle className="pl p2" cx="146" cy="78" r="4" fill="#ffb347"/>
                    </svg>
                  </div>
                </div></div></div>
              <h3>{t("Fleet dashboard")}</h3>
              <p className="panel-role">{t("An operations screen rebuilt to read at a glance.")}</p>
              <p className="tags mono"><span className="tag-live">{t("Live demo")}</span><span className="tag-sample">{t("Sample")}</span><span>React</span><span>TypeScript</span></p>
            </a>


            <a className="panel" href="#case-sync" data-project="sync" data-cursor={t("View case")} aria-label={`${t("Order-to-cash sync")}, ${t("open case file")}`}>
              <p className="mono panel-label">{t("2025 / Integration")}</p>
              <div className="frame-slot"><div className="frame"><div className="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span className="frame-url">sync.example/orders</span></div>
                <div className="shot s-flow" aria-hidden="true">
                  <div className="ftp"><b>Order-to-cash</b><span className="fok"><i></i>{t("In sync")}</span><em>{t("last run 02:00")}</em></div>
                  <div className="fbd">
                    <svg className="fgr" viewBox="0 0 300 70" preserveAspectRatio="xMidYMid meet">
                      <path className="fl" d="M92 35H108"/><path className="fl" d="M192 35H208"/>
                      <g className="fn"><rect x="6" y="12" width="86" height="46" rx="6"/><text x="49" y="39" textAnchor="middle">{t("Web store")}</text></g>
                      <g className="fn"><rect x="108" y="12" width="84" height="46" rx="6"/><text x="150" y="39" textAnchor="middle">ERP</text></g>
                      <g className="fn"><rect x="208" y="12" width="86" height="46" rx="6"/><text x="251" y="39" textAnchor="middle">{t("Accounting")}</text></g>
                    </svg>
                    <div className="fkp"><div><small>{t("Orders today")}</small><strong>482</strong></div><div><small>{t("Synced first time")}</small><strong>{t("99.4%")}</strong></div><div><small>{t("Needs review")}</small><strong className="w">3</strong></div></div>
                    <ul className="fls"><li><span>{t("#10482 order to ERP")}</span><u>ok</u></li><li><span>{t("#10481 invoice to accounting")}</span><u>ok</u></li><li><span>{t("#10478 invoice to accounting")}</span><u className="w">{t("retry 1")}</u></li><li><span>{t("#10470 customer mismatch")}</span><u className="r">{t("review")}</u></li></ul>
                  </div>
                </div></div></div>
              <h3>{t("Order-to-cash sync")}</h3>
              <p className="panel-role">{t("Store, ERP and accounting joined into one flow.")}</p>
              <p className="tags mono"><span className="tag-sample">{t("Sample")}</span><span>Node</span><span>Postgres</span></p>
            </a>

            <a className="panel" href="#case-status" data-project="status" data-cursor={t("View case")} aria-label={`${t("Status page")}, ${t("open case file")}`}>
              <p className="mono panel-label">{t("2025 / Cloud and reliability")}</p>
              <div className="frame-slot"><div className="frame"><div className="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span className="frame-url">status.example</span></div>
                <div className="shot s-up" aria-hidden="true">
                  <div className="utp"><b><i></i>{t("Example status")}</b><span className="uok"><i></i>{t("All systems operational")}</span></div>
                  <div className="ubd">
                    <div className="urow"><div className="uh"><span>API</span><em>{t("99.99%")}</em></div><svg className="ubars" viewBox="0 0 90 10" preserveAspectRatio="none"><UpBars warn={[28]} /></svg></div>
                    <div className="urow"><div className="uh"><span>{t("Web app")}</span><em>{t("99.97%")}</em></div><svg className="ubars" viewBox="0 0 90 10" preserveAspectRatio="none"><UpBars warn={[12, 31, 40]} /></svg></div>
                    <div className="urow"><div className="uh"><span>Checkout</span><em>{t("99.92%")}</em></div><svg className="ubars" viewBox="0 0 90 10" preserveAspectRatio="none"><UpBars warn={[8, 33]} red={[34]} /></svg></div>
                    <div className="urow"><div className="uh"><span>{t("Background jobs")}</span><em>100%</em></div><svg className="ubars" viewBox="0 0 90 10" preserveAspectRatio="none"><UpBars warn={[]} /></svg></div>
                  </div>
                  <div className="uin"><p>{t("Past incidents")}</p><ul><li><span>{t("14 Oct")}</span>{t("Elevated latency on checkout")}<u>{t("12 min")}</u></li><li><span>{t("02 Oct")}</span>{t("Delayed email delivery")}<u>{t("31 min")}</u></li></ul></div>
                </div></div></div>
              <h3>{t("Status page")}</h3>
              <p className="panel-role">{t("Monitoring and a public page that tells customers first.")}</p>
              <p className="tags mono"><span className="tag-sample">{t("Sample")}</span><span>Node</span><span>Grafana</span></p>
            </a>


            <a className="panel" href="#case-assist" data-project="assist" data-cursor={t("View case")} aria-label={`${t("Support assistant")}, ${t("open case file")}`}>
              <p className="mono panel-label">{t("2026 / AI adoption")}</p>
              <div className="frame-slot"><div className="frame"><div className="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span className="frame-url">support.example/queue</span></div>
                <div className="shot s-ai" aria-hidden="true">
                  <div className="asd"><p>{t("Queue")}</p><ul><li className="on"><b>{t("Refund for a late order")}</b><small>{t("2 min")}</small></li><li><b>{t("Change delivery address")}</b><small>{t("6 min")}</small></li><li><b>{t("Invoice copy")}</b><small>{t("9 min")}</small></li><li><b>{t("Reset password")}</b><small>{t("14 min")}</small></li></ul></div>
                  <div className="amn">
                    <div className="amsg"><small>{t("Customer")}</small><p>{t("My order is a week late. Can I get a refund?")}</p></div>
                    <div className="adr"><small>{t("Suggested reply")} <i>{t("Draft")}</i></small><p>{t("Sorry for the delay. Because the order is more than five days late, you can choose a full refund or a new delivery date. Which would you prefer?")}</p><div className="asrc"><span>{t("Refund policy")}</span><span>{t("Order 10482")}</span></div></div>
                    <div className="abt"><span className="go">{t("Approve and send")}</span><span>{t("Edit")}</span></div>
                  </div>
                </div></div></div>
              <h3>{t("Support assistant")}</h3>
              <p className="panel-role">{t("Drafted replies, with a person approving each one.")}</p>
              <p className="tags mono"><span className="tag-sample">{t("Sample")}</span><span>LLM API</span><span>Python</span></p>
            </a>

            <a className="panel" href="#case-audit" data-project="audit" data-cursor={t("View case")} aria-label={`${t("Platform review")}, ${t("open case file")}`}>
              <p className="mono panel-label">{t("2024 / Quality and audits")}</p>
              <div className="frame-slot"><div className="frame"><div className="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span className="frame-url">review.example/report</span></div>
                <div className="shot s-audit" aria-hidden="true">
                  <div className="atp"><b>{t("Platform review")}</b><em>{t("Sample company, 14 Oct")}</em></div>
                  <div className="arings">
                    <div className="ring"><svg viewBox="0 0 36 36"><circle className="rb" cx="18" cy="18" r="15.9155"/><circle className="rf r1" pathLength="100" cx="18" cy="18" r="15.9155"/></svg><strong>72</strong><small>{t("Security")}</small></div>
                    <div className="ring"><svg viewBox="0 0 36 36"><circle className="rb" cx="18" cy="18" r="15.9155"/><circle className="rf r2" pathLength="100" cx="18" cy="18" r="15.9155"/></svg><strong>81</strong><small>{t("Reliability")}</small></div>
                    <div className="ring"><svg viewBox="0 0 36 36"><circle className="rb" cx="18" cy="18" r="15.9155"/><circle className="rf r3" pathLength="100" cx="18" cy="18" r="15.9155"/></svg><strong>64</strong><small>{t("Delivery")}</small></div>
                    <div className="ring"><svg viewBox="0 0 36 36"><circle className="rb" cx="18" cy="18" r="15.9155"/><circle className="rf r4" pathLength="100" cx="18" cy="18" r="15.9155"/></svg><strong>88</strong><small>{t("Cost")}</small></div>
                  </div>
                  <ul className="afd"><li><i className="hi">{t("High")}</i><span>{t("Admin accounts share a password, no two-factor")}</span></li><li><i className="md">{t("Medium")}</i><span>{t("Backups exist, a restore was never tested")}</span></li><li><i className="lo">{t("Low")}</i><span>{t("Three dependencies are two majors behind")}</span></li></ul>
                </div></div></div>
              <h3>{t("Platform review")}</h3>
              <p className="panel-role">{t("A written review ranked by effect and effort.")}</p>
              <p className="tags mono"><span className="tag-sample">{t("Sample")}</span><span>{t("Review")}</span><span>{t("Scanners")}</span></p>
            </a>
          </div>
          <div className="work-bar" aria-hidden="true"><i id="work-bar"></i></div>
        </div>
      </section>

  
      <section className="index" id="index" aria-labelledby="index-label">
        <div className="sec-head">
          <h2 className="label" id="index-label">{t("(04) Engagement log")}</h2>
          <p className="label">{t("Newest first. Samples")}</p>
        </div>
        <div className="table-wrap">
          <table className="spec">
            <thead>
              <tr><th scope="col">No.</th><th scope="col">{t("Engagement")}</th><th scope="col">{t("Discipline")}</th><th scope="col">{t("Stack")}</th><th scope="col" className="r">{t("Year")}</th></tr>
            </thead>
            <tbody>
              <tr data-project="gym" data-cursor={t("View case")}><td className="mono">09</td><td className="proj"><a href="#case-gym">{t("Landing page")}</a></td><td>{t("Landing pages")}</td><td className="mono">HTML, CSS, JS</td><td className="mono r">2026</td></tr>
              <tr data-project="assist" data-cursor={t("View case")}><td className="mono">08</td><td className="proj"><a href="#case-assist">{t("Support assistant")}</a></td><td>{t("AI adoption")}</td><td className="mono">LLM API, Python</td><td className="mono r">2026</td></tr>
              <tr data-project="plan" data-cursor={t("View case")}><td className="mono">07</td><td className="proj"><a href="#case-plan">{t("Technology roadmap")}</a></td><td>{t("Strategy")}</td><td className="mono">{t("Workshops, cost model")}</td><td className="mono r">2026</td></tr>
              <tr data-project="sync" data-cursor={t("View case")}><td className="mono">06</td><td className="proj"><a href="#case-sync">{t("Order-to-cash sync")}</a></td><td>{t("Integration")}</td><td className="mono">Node, Postgres</td><td className="mono r">2025</td></tr>
              <tr data-project="dash" data-cursor={t("View case")}><td className="mono">05</td><td className="proj"><a href="#case-dash">{t("Fleet dashboard")}</a></td><td>{t("Custom software")}</td><td className="mono">React, TypeScript</td><td className="mono r">2025</td></tr>
              <tr data-project="status" data-cursor={t("View case")}><td className="mono">04</td><td className="proj"><a href="#case-status">{t("Status page")}</a></td><td>{t("Cloud and reliability")}</td><td className="mono">Node, Grafana</td><td className="mono r">2025</td></tr>
              <tr data-project="audit" data-cursor={t("View case")}><td className="mono">03</td><td className="proj"><a href="#case-audit">{t("Platform review")}</a></td><td>{t("Quality and audits")}</td><td className="mono">{t("Review, scanners")}</td><td className="mono r">2024</td></tr>
              <tr className="is-archive"><td className="mono">02</td><td className="proj">{t("Regression test suite")}</td><td>{t("Quality and audits")}</td><td className="mono">Playwright</td><td className="mono r">2023</td></tr>
              <tr className="is-archive"><td className="mono">01</td><td className="proj">{t("Company website")}</td><td>{t("Custom software")}</td><td className="mono">Nuxt</td><td className="mono r">2021</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="marquee marquee-alt" aria-hidden="true" data-speed="-0.8">
        <div className="marquee-track"><span>{t("Taking projects from Q1 2027")}</span><span>{t("Book a call")}</span><span>{t("Say hello")}</span><span>hello@shiro-labs.tech</span></div>
      </div>

  
      <section className="exp" id="principles" aria-labelledby="exp-label">
        <div className="sec-head">
          <h2 className="label" id="exp-label">{t("(05) Principles")}</h2>
          <p className="label">{t("How every engagement runs")}</p>
        </div>
        <ol className="exp-list">
          <li><span className="mono">01</span><div><h3>{t("Measure first")}</h3><p>{t("No guesses. Every recommendation traces back to something we observed.")}</p></div></li>
          <li><span className="mono">02</span><div><h3>{t("Write it down")}</h3><p>{t("Findings are written, dated and ranked by effect and effort.")}</p></div></li>
          <li><span className="mono">03</span><div><h3>{t("Fix the small things first")}</h3><p>{t("A short list of shippable fixes beats a long report nobody acts on.")}</p></div></li>
          <li><span className="mono">04</span><div><h3>{t("No black boxes")}</h3><p>{t("You keep the code, documents and runbooks. Nothing depends on us staying.")}</p></div></li>
        </ol>
      </section>

  
      <section className="contact" id="contact" aria-labelledby="contact-label">
        <p className="label" id="contact-label">{t("(06) Contact")}</p>
        <h2 className="contact-line" id="contact-line">{t("Have something to plan, build or fix?")}</h2>
        <p className="contact-mail"><a href="mailto:hello@shiro-labs.tech" data-magnet>hello@shiro-labs.tech</a>
          <CopyButton /></p>

        <Overlap />

        <ul className="socials mono">
          <li><a href="https://github.com/" target="_blank" rel="noopener" data-scramble>GitHub</a></li>
          <li><a href="https://www.linkedin.com/" target="_blank" rel="noopener" data-scramble>LinkedIn</a></li>
        </ul>
      </section>
    </main>
      <Footer variant="home" />
      <div className="cases" id="cases">
        {cases.map((c, i) => <CaseFile key={c.id} c={c} i={i} n={cases.length} />)}
      </div>
    </>
  );
}

import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useLang, useT, homePath } from '../i18n';
import { altPath, type Route } from '../routes';
import Clock from './Clock';

const LANG_KEY = 'shiro-lang';

function NavLink({ home, hash, current, children }: { home: boolean; hash: string; current?: boolean; children: string }): ReactNode {
  const lang = useLang();
  const aria = current ? { 'aria-current': 'page' as const } : {};
  return home
    ? <a href={hash} data-scramble {...aria}>{children}</a>
    : <Link to={{ pathname: homePath(lang), hash }} data-scramble {...aria}>{children}</Link>;
}

export default function Nav({ route }: { route: Route }) {
  const t = useT(), lang = useLang(), loc = useLocation();
  const [ink, setInk] = useState(false);
  const isHome = route.kind === 'home';
  const altLang = lang === 'en' ? 'id' : 'en';
  const altName = altLang === 'id' ? 'Bahasa Indonesia' : 'English';
  const keepHash = loc.hash && loc.hash.indexOf('#case-') !== 0 ? loc.hash : '';

  const toggleTheme = () => {
    const root = document.documentElement, next = !ink;
    root.setAttribute('data-palette', next ? 'ink' : 'paper');
    setInk(next);
    const meta = document.head.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    window.dispatchEvent(new Event('palettechange'));
  };

  return (
    <header className="nav" id="top">
      {isHome
        ? <a className="nav-name" href="#top" aria-label={t('Shiro Labs, back to top')}><Mark /><span className="mono">Shiro Labs</span></a>
        : <Link className="nav-name" to={homePath(lang)} aria-label={t('Shiro Labs, home')}><Mark /><span className="mono">Shiro Labs</span></Link>}
      <nav className="nav-links" aria-label={t('Sections')}>
        <NavLink home={isHome} hash="#services" current={route.kind === 'service'}>{t('Services')}</NavLink>
        <NavLink home={isHome} hash="#method">{t('Method')}</NavLink>
        <NavLink home={isHome} hash="#work">{t('Cases')}</NavLink>
        <NavLink home={isHome} hash="#contact">{t('Contact')}</NavLink>
      </nav>
      <div className="nav-right">
        <span className="mono nav-time">WIB <Clock id="nav-time" /></span>
        <Link className="mono lang-btn" to={{ pathname: altPath(route), hash: keepHash }} hrefLang={altLang} lang={altLang} data-lang={altLang} data-magnet
          aria-label={altName} title={altName}
          onClick={() => { try { localStorage.setItem(LANG_KEY, altLang); } catch { /* storage can be blocked */ } }}>
          <span className={lang === 'en' ? 'on' : undefined} aria-hidden="true">EN</span><span className={lang === 'id' ? 'on' : undefined} aria-hidden="true">ID</span>
        </Link>
        <button className="mono theme-btn" id="theme-btn" type="button" data-magnet onClick={toggleTheme}
          aria-label={ink ? t('Switch to light theme') : t('Switch to dark theme')}>{ink ? t('Paper') : t('Ink')}</button>
      </div>
      <div className="progress" aria-hidden="true"><i id="progress"></i></div>
    </header>
  );
}

function Mark() {
  return (
    <svg className="nav-mark" viewBox="0 0 780 939" aria-hidden="true" focusable="false"><use href="#g" className="g-ink" /><use href="#g" className="g-acc" clipPath="url(#tick-clip)" /></svg>
  );
}

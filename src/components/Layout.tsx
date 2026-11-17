import { createContext, Fragment, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router';
import { LangContext, useT } from '../i18n';
import { matchRoute } from '../routes';
import { getHead, applyHead } from '../head';
import { glyph } from '../content';
import Nav from './Nav';
import PageTransition from './PageTransition';
import { ToastProvider } from './Toast';
import Landing from '../pages/Landing';
import ServicePage from '../pages/ServicePage';
import NotFound from '../pages/NotFound';
import FleetDemo from '../pages/FleetDemo';
import { createPageCtx, introDone, holdIntro, isIntroHeld, rt, ScrollTrigger } from '../folio/runtime';
import { startCursor, startSmooth, scrollToHash, scrollToY } from '../folio/global';
import { magnet, scramble, progress, marquee, reveals, method } from '../folio/page';
import { heroGL, heroReveal } from '../folio/hero';
import { work, type WorkApi } from '../folio/work';
import { physics } from '../folio/physics';

/* True while the first page of the visit is mounting: only then does the landing page play its loader. */
const BootContext = createContext(false);
export const useBoot = () => useContext(BootContext);

function Sprite() {
  return (
    <svg className="sprite" aria-hidden="true" focusable="false">
      <symbol id="g" viewBox="0 0 780 939"><path id="g-path" fillRule="evenodd" pathLength={1} d={glyph.d} /></symbol>
      <clipPath id="tick-clip"><rect x="200" y="-2" width="290" height="216" /></clipPath>
    </svg>
  );
}

function Skip({ kind }: { kind: 'home' | 'service' | 'demo' | 'notfound' }) {
  const t = useT();
  return kind === 'home'
    ? <a className="skip" href="#work">{t('Skip to case files')}</a>
    : <a className="skip" href="#main">{t('Skip to content')}</a>;
}

export default function Layout() {
  const location = useLocation(), navType = useNavigationType(), navigate = useNavigate();
  const route = useMemo(() => matchRoute(location.pathname), [location.pathname]);
  const boot = useRef(true);
  const bootNow = boot.current;
  const nav = useRef(navigate), loc = useRef(location), api = useRef<WorkApi | null>(null), prevPath = useRef<string | null>(null);
  nav.current = navigate; loc.current = location;

  useEffect(() => { boot.current = false; }, []);

  /* Page transition: the first-load animation plays between pages. `busy` guards against overlapping runs. */
  const [tx, setTx] = useState<{ id: number; instant: boolean; to: string } | null>(null);
  const busy = useRef(false), txId = useRef(0), firstPath = useRef(true);
  const startTx = useCallback((instant: boolean, to: string) => {
    if (busy.current || rt.reduce) return false;
    busy.current = true; holdIntro();
    setTx({ id: ++txId.current, instant, to });
    return true;
  }, []);

  /* A path change nobody intercepted (back, forward, programmatic) is covered at once. Runs before the page modules mount. */
  useLayoutEffect(() => {
    if (firstPath.current) { firstPath.current = false; return; }
    startTx(true, '');
  }, [location.pathname, startTx]);

  /* App-lifetime pieces: cursor, smooth scroll, in-page anchors, scroll memory. */
  useEffect(() => {
    try { history.scrollRestoration = 'manual'; } catch { /* not supported */ }
    const stopCursor = startCursor(), stopSmooth = startSmooth();
    const onClick = (e: MouseEvent) => {
      if (!rt.lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href') || '';
      if (id.length < 2 || id.indexOf('#case-') === 0 || !document.getElementById(id.slice(1))) return;
      e.preventDefault();
      nav.current({ hash: id }, { replace: true });
    };
    /* A link to another page plays the transition first, then navigates. */
    const onLink = (e: MouseEvent) => {
      if (rt.reduce || busy.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.origin !== window.location.origin) return;
      const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, '') : p);
      if (norm(a.pathname) === norm(loc.current.pathname)) return;
      e.preventDefault(); e.stopPropagation();
      if (a.hasAttribute('data-lang')) { try { localStorage.setItem('shiro-lang', a.getAttribute('data-lang') || ''); } catch { /* storage can be blocked */ } }
      startTx(false, a.pathname + a.search + a.hash);
    };
    let raf = 0;
    const save = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { try { sessionStorage.setItem('scroll:' + loc.current.key, String(Math.round(window.scrollY))); } catch { /* storage can be blocked */ } }); };
    document.addEventListener('click', onClick);
    document.addEventListener('click', onLink, true);
    window.addEventListener('scroll', save, { passive: true });
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('click', onLink, true); window.removeEventListener('scroll', save); cancelAnimationFrame(raf); stopCursor(); stopSmooth(); };
  }, [startTx]);

  /* Page modules: one set per mounted page, all released when the path changes. */
  useEffect(() => {
    const { ctx, dispose } = createPageCtx({
      open: (hash, replace, state) => { nav.current({ hash }, { replace, state }); },
      back: () => { nav.current(-1); },
      locationState: () => loc.current.state,
    });
    const undo = [magnet(), scramble()];
    progress(ctx); marquee(ctx); reveals(ctx);
    heroGL(ctx); heroReveal(ctx);
    api.current = work(ctx);
    physics(ctx); method(ctx);
    api.current?.sync(loc.current.hash);
    if (!document.getElementById('loader') && !isIntroHeld()) introDone();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => { api.current = null; undo.forEach((u) => u()); dispose(); };
  }, [location.pathname]);

  /* The hash opens and closes case files. */
  useEffect(() => { api.current?.sync(location.hash); }, [location.hash, location.key]);

  /* Scroll: top on a new page, the saved spot on back and forward, the target for #anchors. */
  useEffect(() => {
    const { pathname, hash, key } = location;
    const newPage = prevPath.current !== pathname;
    prevPath.current = pathname;
    if (hash.indexOf('#case-') === 0) return;
    rt.lenis?.resize(); /* the document just changed height: let the scroller measure it first */
    let again = 0;
    if (newPage) {
      let saved = NaN;
      if (navType === 'POP') { try { saved = Number(sessionStorage.getItem('scroll:' + key)); } catch { /* storage can be blocked */ } }
      const go = () => { rt.lenis?.resize(); if (hash && scrollToHash(hash, true)) return; scrollToY(Number.isFinite(saved) ? saved : 0, true); };
      go();
      if (hash || Number.isFinite(saved)) again = requestAnimationFrame(() => { again = requestAnimationFrame(go); }); /* once more after layout settles */
    } else if (hash) scrollToHash(hash, false);
    return () => cancelAnimationFrame(again);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  /* Head tags, html lang and the service-page body class follow the route. */
  useEffect(() => {
    applyHead(getHead(route));
    document.body.classList.toggle('page-service', route.kind !== 'home');
  }, [route]);

  return (
    <LangContext.Provider value={route.lang}>
      <BootContext.Provider value={bootNow}>
        <ToastProvider>
          <Sprite />
          <Skip kind={route.kind} />
          <Nav route={route} />
          <Fragment key={location.pathname}>
            {route.kind === 'home' && <Landing />}
            {route.kind === 'service' && <ServicePage slug={route.slug} />}
            {route.kind === 'demo' && <FleetDemo />}
            {route.kind === 'notfound' && <NotFound />}
          </Fragment>
          {tx && <PageTransition key={tx.id} instant={tx.instant}
            onSwap={() => { if (tx.to) nav.current(tx.to); }}
            onDone={() => { busy.current = false; setTx(null); }} />}
        </ToastProvider>
      </BootContext.Provider>
    </LangContext.Provider>
  );
}

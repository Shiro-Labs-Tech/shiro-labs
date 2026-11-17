import { useEffect, useRef } from 'react';
import { useT } from '../i18n';
import { gsap, rt, pad, introDone } from '../folio/runtime';

/* Fills the block grid and returns the pieces both the first-load loader and the page transition animate. */
export function fillGrid(el: HTMLElement) {
  const grid = el.querySelector<HTMLElement>('.loader-grid')!;
  const small = window.innerWidth < 700, cols = small ? 6 : 12, rows = small ? 10 : 7;
  grid.style.setProperty('--c', String(cols)); grid.style.setProperty('--r', String(rows));
  const blocks: HTMLDivElement[] = [];
  for (let i = 0; i < cols * rows; i++) { const b = document.createElement('div'); grid.appendChild(b); blocks.push(b); }
  el.style.background = 'transparent';
  return blocks;
}

export function loaderParts(el: HTMLElement) {
  const blocks = fillGrid(el), count = el.querySelector<HTMLElement>('.loader-count')!,
    lg = el.querySelector('.loader-glyph use')!, mid = el.querySelector('.loader-mid')!, inner = el.querySelector('.loader-inner')!;
  return { blocks, count, lg, mid, inner };
}

export function LoaderMarkup({ forwardRef, id }: { forwardRef: React.RefObject<HTMLDivElement | null>; id?: string }) {
  const t = useT();
  return (
    <div className="loader" id={id} aria-hidden="true" ref={forwardRef}>
      <div className="loader-grid"></div>
      <div className="loader-mid"><svg className="loader-glyph" viewBox="0 0 780 939"><use href="#g" /></svg></div>
      <div className="loader-inner"><span className="loader-count">000</span><span className="mono loader-name">{t('Shiro Labs / IT consulting')}</span></div>
    </div>
  );
}

/* The mark draws itself while the counter runs, then a block wipe uncovers the page. */
export default function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current!;
    let seen = false;
    try { seen = sessionStorage.getItem('folio-seen') === '1'; sessionStorage.setItem('folio-seen', '1'); } catch { /* storage can be blocked */ }
    let removed = false;
    const remove = () => { if (removed) return; removed = true; onDone(); introDone(); };
    if (rt.reduce || seen) { remove(); return; }

    const { blocks, count, lg, mid, inner } = loaderParts(el);
    const n = { v: 0 };
    const tl = gsap.timeline({ onComplete: remove });
    tl.to(n, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { count.textContent = pad(Math.round(n.v), 3); } }, 0)
      .to(lg, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
      .to(lg, { fillOpacity: 1, duration: 0.3, ease: 'power1.out' }, '>-0.15')
      .to([inner, mid], { opacity: 0, y: -16, duration: 0.3, ease: 'power2.in' }, '+=0.1')
      .add(() => { introDone(); }, '>-0.1')
      .to(blocks, { scale: 0, duration: 0.45, ease: 'power3.in', stagger: { amount: 0.7, from: 'random' } }, '<');
    const failsafe = setTimeout(remove, 3300);
    return () => { clearTimeout(failsafe); tl.kill(); removed = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <LoaderMarkup forwardRef={root} id="loader" />;
}

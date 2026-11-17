import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap, introDone } from '../folio/runtime';
import { fillGrid } from './Loader';

/* The first-load block wipe, replayed between pages (tiles only, no mark or counter).
   Link click: tiles cover the page, the route swaps underneath, tiles uncover the new page.
   Back, forward and other navigations (instant): the new page is already showing, so it is covered at once and then uncovered. */
export default function PageTransition({ instant, onSwap, onDone }: { instant: boolean; onSwap: () => void; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLDivElement[]>([]);

  useLayoutEffect(() => {
    tiles.current = fillGrid(root.current!);
    gsap.set(tiles.current, { scale: instant ? 1 : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = root.current!, blocks = tiles.current;
    let swapped = false, finished = false;
    const swap = () => { if (swapped) return; swapped = true; onSwap(); };
    const finish = () => { if (finished) return; finished = true; swap(); introDone(); onDone(); };
    /* The page underneath must not scroll while it is covered. */
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    el.addEventListener('wheel', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });

    const tl = gsap.timeline({ onComplete: finish });
    if (!instant) tl.to(blocks, { scale: 1, duration: 0.3, ease: 'power3.out', stagger: { amount: 0.35, from: 'random' } });
    tl.add(swap)
      .to({}, { duration: 0.15 })
      .add(() => { introDone(); })
      .to(blocks, { scale: 0, duration: 0.4, ease: 'power3.in', stagger: { amount: 0.5, from: 'random' } }, '<');
    const failsafe = setTimeout(finish, 2500);
    return () => {
      clearTimeout(failsafe); tl.kill();
      el.removeEventListener('wheel', stop); el.removeEventListener('touchmove', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="loader" aria-hidden="true" ref={root}><div className="loader-grid"></div></div>;
}

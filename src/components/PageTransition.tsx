import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap, pad, introDone } from '../folio/runtime';
import { LoaderMarkup, loaderParts } from './Loader';

/* The first-load loader, replayed between pages.
   Link click: blocks cover the page, the route swaps underneath, the mark draws itself, blocks uncover the new page.
   Back, forward and other navigations (instant): the new page is already showing, so it is covered at once and the rest plays. */
export default function PageTransition({ instant, onSwap, onDone }: { instant: boolean; onSwap: () => void; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const parts = useRef<ReturnType<typeof loaderParts> | null>(null);

  useLayoutEffect(() => {
    const p = parts.current = loaderParts(root.current!);
    gsap.set(p.blocks, { scale: instant ? 1 : 0 });
    gsap.set([p.inner, p.mid], { opacity: instant ? 1 : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = root.current!, { blocks, count, lg, mid, inner } = parts.current!;
    let swapped = false, finished = false;
    const swap = () => { if (swapped) return; swapped = true; onSwap(); };
    const finish = () => { if (finished) return; finished = true; swap(); introDone(); onDone(); };
    /* The page underneath must not scroll while it is covered. */
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    el.addEventListener('wheel', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });

    const n = { v: 0 };
    const tl = gsap.timeline({ onComplete: finish });
    if (!instant) tl.to(blocks, { scale: 1, duration: 0.3, ease: 'power3.out', stagger: { amount: 0.35, from: 'random' } });
    tl.add(swap)
      .set([inner, mid], { opacity: 1 })
      .addLabel('draw')
      .to(n, { v: 100, duration: 0.9, ease: 'power2.inOut', onUpdate: () => { count.textContent = pad(Math.round(n.v), 3); } }, 'draw')
      .to(lg, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 'draw')
      .to(lg, { fillOpacity: 1, duration: 0.25, ease: 'power1.out' }, '>-0.12')
      .to([inner, mid], { opacity: 0, y: -16, duration: 0.25, ease: 'power2.in' }, '+=0.05')
      .add(() => { introDone(); }, '>-0.1')
      .to(blocks, { scale: 0, duration: 0.4, ease: 'power3.in', stagger: { amount: 0.5, from: 'random' } }, '<');
    const failsafe = setTimeout(finish, 3000);
    return () => {
      clearTimeout(failsafe); tl.kill();
      el.removeEventListener('wheel', stop); el.removeEventListener('touchmove', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LoaderMarkup forwardRef={root} />;
}

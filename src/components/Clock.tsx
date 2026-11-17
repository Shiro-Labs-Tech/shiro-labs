import { useEffect, useState } from 'react';

/* Jakarta time. Renders "--:--" on the server and until the first tick, so prerendered markup always matches. */
export default function Clock({ id }: { id: string }) {
  const [now, setNow] = useState<{ text: string; iso: string } | null>(null);
  useEffect(() => {
    let fmt: Intl.DateTimeFormat | null;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }); } catch { fmt = null; }
    const tick = () => {
      const d = new Date();
      let text: string;
      if (fmt) text = fmt.format(d);
      else { const j = new Date(d.getTime() + (d.getTimezoneOffset() + 420) * 60000); text = String(j.getHours()).padStart(2, '0') + ':' + String(j.getMinutes()).padStart(2, '0'); }
      setNow({ text, iso: d.toISOString() });
    };
    tick();
    const h = setInterval(tick, 20000);
    return () => clearInterval(h);
  }, []);
  return <time id={id} dateTime={now ? now.iso : ''}>{now ? now.text : '--:--'}</time>;
}

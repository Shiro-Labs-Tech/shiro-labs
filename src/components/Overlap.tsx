import { useEffect, useState } from 'react';
import { useLang, useT } from '../i18n';
import { pad } from '../folio/runtime';

const LAB_TZ = 'Asia/Jakarta', START = 9, END = 18; /* EDIT: working hours on both sides */
const ZONES: [string, string][] = [
  ['Europe/London', 'London'], ['Europe/Berlin', 'Berlin'], ['America/New_York', 'New York'], ['America/Los_Angeles', 'Los Angeles'],
  ['Asia/Dubai', 'Dubai'], ['Asia/Singapore', 'Singapore'], ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney'],
];

function offsetMin(tz: string, date: Date): number | null {
  try {
    const t = Math.floor(date.getTime() / 1000) * 1000, o: Record<string, string> = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(t)).forEach((p) => { o[p.type] = p.value; });
    return Math.round((Date.UTC(+o.year, +o.month - 1, +o.day, (+o.hour) % 24, +o.minute, +o.second) - t) / 60000);
  } catch { return null; }
}

/* Working hours overlap between Jakarta and a visitor time zone, hour by hour. Empty until mounted. */
export default function Overlap() {
  const t = useT(), lang = useLang();
  const [zone, setZone] = useState('Europe/Berlin');
  const [mine, setMine] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && offsetMin(tz, new Date()) !== null) {
        if (!ZONES.some(([v]) => v === tz)) setMine(tz);
        setZone(tz);
      }
    } catch { /* keep the default zone */ }
    setReady(true);
  }, []);

  const rows = { you: Array<boolean>(24).fill(false), lab: Array<boolean>(24).fill(false), both: Array<boolean>(24).fill(false) };
  let out = t('Working hours are 09:00 to 18:00 WIB (UTC+7).');
  if (ready) {
    const now = new Date(), you = offsetMin(zone, now), lab = offsetMin(LAB_TZ, now);
    if (you !== null && lab !== null) {
      const delta = (lab - you) / 60, both: number[] = [];
      for (let h = 0; h < 24; h++) {
        const a = h >= START && h < END, lh = ((Math.floor(h + delta) % 24) + 24) % 24, b = lh >= START && lh < END;
        rows.you[h] = a; rows.lab[h] = b; rows.both[h] = a && b;
        if (a && b) both.push(h);
      }
      if (both.length) {
        let a = both[0], b = both[0];
        for (let i = 1; i < both.length && both[i] === b + 1; i++) b = both[i];
        const range = pad(a) + ':00' + (lang === 'id' ? ' sampai ' : ' to ') + pad(b + 1) + ':00';
        a = 0;
        out = lang === 'id' ? 'Irisan: ' + both.length + ' jam, ' + range + ' waktu Anda.'
          : 'Overlap: ' + both.length + (both.length === 1 ? ' hour' : ' hours') + ', ' + range + ' your time.';
      } else {
        out = lang === 'id' ? 'Tidak ada irisan di jam kerja standar. Kami bisa bekerja secara asinkron, atau menjadwalkan panggilan lebih awal atau lebih malam.'
          : 'No overlap in standard hours. We can work async, or book an early or late call.';
      }
    }
  }
  const cells = (r: boolean[]) => r.map((on, i) => <i key={i} className={on ? 'on' : undefined} />);

  return (
    <div className="overlap" id="overlap">
      <div className="ov-head">
        <p className="label">{t('Working hours overlap')}</p>
        <label className="mono" htmlFor="ov-zone">{t('Your time zone')}</label>
        <select className="mono" id="ov-zone" value={zone} onChange={(e) => setZone(e.target.value)}>
          {mine && <option value={mine}>{(lang === 'id' ? 'Zona waktu Anda (' : 'Your time zone (') + mine.split('/').pop()!.replace(/_/g, ' ') + ')'}</option>}
          {ZONES.map(([v, name]) => <option key={v} value={v}>{v === 'Asia/Singapore' ? t('Singapore') : name}</option>)}
        </select>
      </div>
      <div className="ov-grid">
        <div className="ov-row"><span className="mono">{t('You')}</span><div className="ov-cells" data-row="you" aria-hidden="true">{cells(rows.you)}</div></div>
        <div className="ov-row"><span className="mono">Shiro Labs</span><div className="ov-cells" data-row="lab" aria-hidden="true">{cells(rows.lab)}</div></div>
        <div className="ov-row"><span className="mono">{t('Overlap')}</span><div className="ov-cells is-both" data-row="both" aria-hidden="true">{cells(rows.both)}</div></div>
        <div className="ov-axis mono" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
      </div>
      <p className="ov-out mono" id="ov-out" role="status">{out}</p>
    </div>
  );
}

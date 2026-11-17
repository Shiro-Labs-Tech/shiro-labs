import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Alert, Status } from './fleetSim';
import { useDemo } from './store';

export function Kpi({ label, value, unit, tone, hint }: { label: string; value: ReactNode; unit?: string; tone?: 'bad' | 'good'; hint?: string }) {
  return (
    <div className={'kpi' + (tone ? ' ' + tone : '')}>
      <dt>{label}</dt>
      <dd>{value}{unit ? <small>{unit}</small> : null}</dd>
      {hint ? <p className="kpi-hint">{hint}</p> : null}
    </div>
  );
}

export function StatusTag({ s }: { s: Status }) {
  const { statusLabel } = useDemo();
  return <span className={'fl-status st-' + s}>{statusLabel(s)}</span>;
}

export function Spark({ data, max = 60 }: { data: number[]; max?: number }) {
  const w = 220, h = 44, m = Math.max(max, ...data);
  const pts = data.map((d, i) => `${((i / Math.max(1, data.length - 1)) * w).toFixed(1)},${(h - 2 - (d / m) * (h - 4)).toFixed(1)}`).join(' ');
  return <svg className="fl-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="fl-emptybox">
      <p className="fl-empty-title">{title}</p>
      {text ? <p className="fl-empty">{text}</p> : null}
      {children}
    </div>
  );
}

/* Native <dialog>: focus is trapped and Escape closes it without extra code. Content mounts only while open. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null), { t } = useDemo();
  useEffect(() => {
    const d = ref.current;
    if (!d || !open) return;
    if (!d.open) d.showModal();
    const close = () => onClose();
    d.addEventListener('close', close);
    return () => { d.removeEventListener('close', close); if (d.open) d.close(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <dialog ref={ref} className={'fl-dialog' + (wide ? ' wide' : '')} aria-label={title} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="fl-dialog-in">
        <div className="fl-dialog-head"><h2 className="label">{title}</h2><button type="button" className="fl-x" onClick={onClose} aria-label={t('Close')}>&times;</button></div>
        {children}
      </div>
    </dialog>
  );
}

export function AlertRow({ a, compact }: { a: Alert; compact?: boolean }) {
  const d = useDemo(), { t, fleet, act } = d, v = a.vehicle ? fleet.vehicle(a.vehicle) : undefined;
  const btns: { label: string; run: () => void }[] = [];
  if (a.state !== 'resolved') {
    if (a.kind === 'risk') { btns.push({ label: t('Re-plan route'), run: () => act.replan(a.vehicle) }, { label: t('Reassign stops'), run: () => act.reassign(a.vehicle) }, { label: t('Notify customers'), run: () => act.notifyRisk(a.vehicle) }); }
    else if (a.kind === 'down') { btns.push({ label: t('Reassign stops'), run: () => act.reassign(a.vehicle) }, { label: t('Tow to workshop'), run: () => act.toShop(a.vehicle) }); }
    else if (a.kind === 'offline') { btns.push({ label: t('Reassign stops'), run: () => act.reassign(a.vehicle) }); }
    else if (a.kind === 'idle') { btns.push({ label: t('Message driver'), run: () => act.message() }); }
    else if (a.kind === 'fuel') { btns.push({ label: t('Refuel now'), run: () => act.refuel(a.vehicle) }); }
    else if (a.kind === 'service') { btns.push({ label: t('Send to workshop'), run: () => act.toShop(a.vehicle) }); }
    else if (a.kind === 'closure') { btns.push({ label: t('Re-plan affected routes'), run: () => { fleet.vehicles.filter((x) => x.risk).forEach((x) => act.replan(x.id)); } }, { label: t('Reopen the road'), run: () => act.reopenRoad() }); }
    else if (a.kind === 'rush') { btns.push({ label: t('Auto-assign'), run: () => act.autoAssign() }, { label: t('Open in Dispatch'), run: () => { d.setOrd(a.order); d.go('dispatch'); } }); }
    else if (a.kind === 'queue' || a.kind === 'failed') { btns.push({ label: t('Open in Dispatch'), run: () => { if (a.order) d.setOrd(a.order); d.go('dispatch'); } }); }
  }
  return (
    <li className={'fl-alert sev-' + a.sev + (a.state !== 'open' ? ' ' + a.state : '')}>
      <div className="fl-alert-main">
        <span className="fl-sev mono">{a.sev === 'critical' ? t('Critical') : a.sev === 'warn' ? t('Warning') : t('Info')}</span>
        <time className="mono">{d.time(a.at)}</time>
        <span className="fl-alert-title">{d.alertTitle(a)}</span>
        {v ? <button type="button" className="fl-link" onClick={() => { d.setSel(v.id); if (!compact) d.go('vehicles'); }}>{v.id}</button> : null}
      </div>
      <p className="fl-alert-text">{d.alertText(a)}</p>
      {a.state === 'resolved' ? <p className="fl-alert-text mono">{t('Resolved')} {d.time(a.at2)}</p> : (
        <p className="fl-alert-actions">
          {btns.map((b) => <button key={b.label} type="button" className="fl-act" onClick={b.run}>{b.label}</button>)}
          {a.state === 'open' ? <button type="button" className="fl-act ghost" onClick={() => { fleet.acknowledge(a.id); d.refresh(); }}>{t('Acknowledge')}</button> : <span className="mono fl-ackd">{t('Acknowledged')}</span>}
          {a.kind === 'failed' || a.kind === 'idle' || a.kind === 'weather' ? <button type="button" className="fl-act ghost" onClick={() => { fleet.dismiss(a.id); d.refresh(); }}>{t('Dismiss')}</button> : null}
        </p>
      )}
    </li>
  );
}

/* Stacked bar whose widths are set through the CSSOM: inline style attributes are blocked by the site's CSP. */
export function Bar({ parts, className }: { parts: number[]; className?: string }) {
  return (
    <div className={'prog-bar' + (className ? ' ' + className : '')} aria-hidden="true">
      {parts.map((p, i) => <i key={i} className={'p' + (i + 1)} ref={(el) => { if (el) el.style.width = Math.max(0, Math.min(100, p)) + '%'; }}></i>)}
    </div>
  );
}

/* While the pointer or focus is inside a table its row order is held, so rows never move under the cursor. */
export function useHold<T extends { id: string }>(rows: T[], key: string) {
  const [hold, setHold] = useState(false), ref = useRef<{ key: string; ids: string[] }>({ key: '', ids: [] });
  let out = rows;
  if (hold && ref.current.key === key) {
    const m = new Map(rows.map((r) => [r.id, r]));
    out = ref.current.ids.map((i) => m.get(i)).filter((r): r is T => !!r);
  } else ref.current = { key, ids: rows.map((r) => r.id) };
  return { rows: out, bind: { onPointerEnter: () => setHold(true), onPointerLeave: () => setHold(false), onFocus: () => setHold(true), onBlur: () => setHold(false) } };
}

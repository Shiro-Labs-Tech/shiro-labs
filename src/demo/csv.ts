import type { Fleet } from './fleetSim';
import { clockText } from './fleetSim';

const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

/* A real download, built in the browser from the sample data. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ordersCsv(fleet: Fleet) {
  const rows: (string | number)[][] = [['order', 'customer', 'cargo', 'weight_kg', 'window_start', 'window_end', 'status', 'vehicle', 'eta_or_delivered', 'minutes_late', 'attempts', 'proof_of_delivery']];
  for (const o of fleet.orders) rows.push([o.id, o.customer, o.cargo, o.weight, clockText(o.winStart), clockText(o.winEnd), o.status, o.vehicle, o.status === 'delivered' ? clockText(o.doneAt) : Number.isFinite(o.eta) && o.eta ? clockText(o.eta) : '', o.status === 'delivered' ? o.late : o.predLate >= 999 ? '' : o.predLate, o.attempts, o.pod]);
  return rows;
}

import { createContext, useContext } from 'react';
import type { Fleet, Status, Alert, Order } from './fleetSim';
import { clockText } from './fleetSim';
import type { MapControl } from './FleetMap';

export type ViewId = 'live' | 'dispatch' | 'vehicles' | 'alerts' | 'maintenance' | 'reports' | 'settings';
export const VIEWS: ViewId[] = ['live', 'dispatch', 'vehicles', 'alerts', 'maintenance', 'reports', 'settings'];

export interface Demo {
  fleet: Fleet; tick: number; refresh: () => void; control: React.RefObject<MapControl>;
  playing: boolean; setPlay: (p: boolean) => void; rate: number; setRate: (r: number) => void; stress: boolean; toggleStress: () => void; fps: number; setFps: (n: number) => void;
  view: ViewId; go: (v: ViewId) => void; sel: string | null; setSel: (id: string | null) => void; ord: string | null; setOrd: (id: string | null) => void;
  t: (s: string) => string; tf: (s: string, vars: Record<string, string | number>) => string; lang: 'en' | 'id'; toast: (s: string) => void;
  num: (n: number) => string; money: (n: number) => string; time: (s: number) => string;
  statusLabel: (s: Status) => string; alertText: (a: Alert) => string; alertTitle: (a: Alert) => string; failText: (o: Order) => string;
  openPalette: () => void; openTracking: (orderId: string) => void;
  act: Actions;
}

export interface Actions {
  replan: (vid: string) => void; reassign: (vid: string) => void; notifyRisk: (vid: string) => void; toShop: (vid: string) => void; refuel: (vid: string) => void;
  autoAssign: () => void; assign: (oid: string, vid: string, pos: number) => boolean; message: () => void; reopenRoad: () => void; closeRoad: () => void; reset: () => void;
  scenario: (k: 'closure' | 'breakdown' | 'signal' | 'rush' | 'rain') => void;
}

export const DemoContext = createContext<Demo | null>(null);
export function useDemo(): Demo {
  const d = useContext(DemoContext);
  if (!d) throw new Error('useDemo outside the demo');
  return d;
}
export { clockText };

# Shiro Dispatch: research and product scope

Shiro Dispatch is a sample product (invented data, runs in the browser) that shows what a finished fleet and dispatch tool needs. This note records the problems it targets and what each module does about them.

## Problems and where the demo answers them

| Problem | Evidence | Module |
| --- | --- | --- |
| Failed first attempts, mostly bad addresses | About 45% of failed deliveries trace to address errors (Upper) | Dispatch: failure reasons, re-queue with a new window |
| Low utilisation | Typical fleets 60-70%, strong ones aim for 85% (Nexdigm) | Live and Reports: utilisation, idle time |
| Breakdowns from missed servicing | About 40% of unplanned breakdowns linked to missed preventive maintenance, vendor claim (Oxmaint) | Maintenance: odometer intervals, work orders, workshop |
| Customer calls asking where the driver is | 40-50% fewer calls with accurate ETAs and tracking links, vendor claim (DispatchTrack) | Automatic customer messages, tracking page preview |
| Overloaded trucks (Indonesia, Zero ODOL policy) | PwC Indonesia, Jakarta Globe | Dispatch refuses assignment above a vehicle's load limit |

Vendor claims are marked as such on the page. Treat them as directional.

## Modules

- Live: map, KPIs, needs-attention list, guided "Try it" checklist.
- Dispatch: order queue, ranked vehicle suggestions (arrival, extra km, load), manual or automatic assignment, route board, CSV export.
- Vehicles: sortable, filterable fleet table with vehicle detail.
- Alerts: severity, acknowledge, one-click fix per alert type.
- Maintenance: service schedule, work orders, workshop flow.
- Reports: 14-day history, driver scorecard, CSV exports.
- Settings: auto-assign, auto-notify, lateness, idle and fuel thresholds.

## What is simulated

Deterministic seeded simulation (`src/demo/fleetSim.ts`): orders with time windows and cargo rules (no cold chain on motorbikes), three vehicle types with load caps, cheapest-insertion suggestions, ETA projection, road closures, breakdowns, signal loss, rush orders, rain, failed deliveries. History and driver scores are generated sample figures.

## What a live deployment adds

Real GPS and telematics ingestion, road-network routing, accounts and roles, a database, SMS or WhatsApp delivery, proof-of-delivery capture in a driver app, and integrations with the client's order system.

## Sources

- Upper: https://www.upperinc.com/?p=29569
- Nexdigm: https://www.nexdigm.com/market-research/insights/blog/vehicle-utilization-benchmarking/
- Oxmaint: https://oxmaint.com/article/fleet-maintenance-software-buyers-guide-2026
- DispatchTrack: https://www.dispatchtrack.com/?p=2632
- PwC Indonesia: https://www.pwc.com/id/en/media-centre/infrastructure-news/june-2025/land-transport-government-continues-zero-odol-policy.html
- Jakarta Globe: https://www.asia-pacific-solidarity.net/news/2025-06-28/truckers-forced-overload-or-lose-orders-indonesia-cracks-down-odol.html

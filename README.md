# Shiro Labs site

Bilingual (English and Bahasa Indonesia) site for Shiro Labs, an IT consultancy: https://shiro-labs.tech

Vite + React + TypeScript single page application. Every route is prerendered to real HTML at build time (SEO, link previews, works without JS), then hydrated on the client with client-side routing.

## Develop
```
npm ci
npm run dev        # dev server
npm run build      # typecheck, client build, SSR build, prerender into dist/
npm run preview    # serve dist/
```
Node 22 or newer.

## Layout
- `src/content/*.json`: services and case files (EN and ID), the glyph outline. Edit copy here.
- `src/content/tr.id.json`: Indonesian translations of UI text, keyed by the English string. A missing key fails the build.
- `src/pages/`: Landing, ServicePage, NotFound. `src/components/`: Layout, Nav, Footer, Loader, CaseFile and others.
- `src/folio/`: GSAP animation modules (hero WebGL, reveals, method, work and case files, physics). GSAP and Lenis are bundled.
- `src/routes.ts`: route matching (`/`, `/id`, `/services/<slug>`, `/id/services/<slug>`). `src/head.ts`: title, canonical, hreflang and og tags.
- `scripts/prerender.mjs`: renders each route to `dist/`. It fails the build on leftover placeholders or em dashes.
- `public/`: favicon, robots.txt, `lang.js` (applies a saved language choice before first paint).
- `vercel.json`: build settings, clean URLs, redirects, security headers (CSP allows only self and Google Fonts, no inline styles).

## Add a service
Add an entry to `services.en.json` and `services.id.json` (same slug). The route, landing card and prerendered page follow.

## Replace before launch
- All case files and numbers are labelled Sample (`cases.*.json`). Swap in real engagements.
- Contact email, social links, services wording and the availability line.
- The site is `noindex`. Set `NOINDEX = false` in `src/head.ts` when the content is real.
- Indonesian copy is a draft: have a native speaker review `tr.id.json` and the `*.id.json` files.

## Notes
- HSTS is set without `includeSubDomains`, because other subdomains of shiro-labs.tech are hosted elsewhere.
- The language is chosen by the URL. A saved choice (localStorage `shiro-lang`) redirects on later visits. Nothing is guessed from the browser language.

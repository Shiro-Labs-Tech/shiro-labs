# Shiro Labs site

Single-page site for Shiro Labs, an IT consultancy: https://shiro-labs.tech

Static files, no build step. Pushes to `main` deploy to Vercel (project `shiro-labs`, output directory `public`).

## Layout
- `public/` is what gets served. `public/index.html` is generated, do not hand-edit it.
- `tools/index.tpl.html` is the page template, `tools/glyph.json` is the outline of the mark, `tools/gen.py` builds `public/index.html`, `public/services/*.html` and `public/favicon.svg`.
- Services live in `tools/services.py` (one entry each: copy, FAQ, related). `tools/service.tpl.html` is the sub-page template. Each entry becomes `/services/<slug>`, and the landing cards are generated from the same data. To add a service, add an entry and regenerate.
- `vercel.json` holds the output directory, clean URLs and the security headers (CSP, HSTS and others).

## Edit and regenerate
```
python3 tools/gen.py
```
Edit the template or `gen.py` (case files live in `gen.py`), run it, commit `public/`.

## What is in it
- Hero: the Noto Serif CJK Bold glyph 白 (U+767D, SIL Open Font License) over a WebGL topographic shader that piles contour lines around the glyph. The pointer bends the terrain and a click sends a ripple.
- Glyph-drawing loader, six services, method, case files that open full screen, engagement log, working-hours overlap widget (Jakarta vs the visitor), paper and ink themes.
- Works without JS (case files via `:target`), with the CDN blocked, on touch and with reduced motion.

## Replace before launch
- All five case files and their numbers are labelled Sample (`tools/gen.py` and the tags in `tools/index.tpl.html`). Swap in real engagements.
- Contact email (`hello@example.com`), social links, services wording and the availability line.
- The page is `noindex` on purpose. When the content is real, remove the `<meta name="robots" content="noindex">` line from `tools/index.tpl.html` and regenerate.

- Service page copy in `tools/services.py` is a draft, including the typical lengths. Edit it to match what you sign. Remove `noindex` in `tools/service.tpl.html` too when launching.

## Notes
- CSP allows only self, cdn.jsdelivr.net (GSAP and Lenis, with SRI) and Google Fonts. No inline style attributes.
- HSTS is set without `includeSubDomains`, because other subdomains of shiro-labs.tech are hosted elsewhere.

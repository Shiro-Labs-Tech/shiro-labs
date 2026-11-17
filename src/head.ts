import type { Route } from './routes';
import { altPath } from './routes';
import { getService, SITE } from './content';
import { translate } from './i18n';

export interface Head {
  title: string; description: string; canonical: string | null;
  altEn: string | null; altId: string | null; locale: string; ogTitle: string; ogDescription: string; noindex: boolean;
}

/* Launch switch: set to false when the content is real. */
export const NOINDEX = true;

const pathFor = (route: Route, lang: 'en' | 'id') => {
  if (route.kind === 'service') return (lang === 'id' ? '/id' : '') + '/services/' + route.slug;
  if (route.kind === 'demo') return (lang === 'id' ? '/id' : '') + '/demo/' + route.slug;
  return lang === 'id' ? '/id' : '/';
};

export function getHead(route: Route): Head {
  const t = (s: string) => translate(route.lang, s);
  const locale = route.lang === 'id' ? 'id_ID' : 'en_US';
  if (route.kind === 'service') {
    const sv = getService(route.lang, route.slug)!;
    const title = `${sv.name} | Shiro Labs`;
    return { title, description: sv.meta, canonical: SITE + pathFor(route, route.lang), altEn: SITE + pathFor(route, 'en'), altId: SITE + pathFor(route, 'id'),
      locale, ogTitle: title, ogDescription: sv.meta, noindex: NOINDEX };
  }
  if (route.kind === 'demo') {
    const title = t('Fleet dashboard') + ' | ' + t('Live demo') + ' | Shiro Labs', description = t('A working sample of a dispatcher dashboard: live map, five key numbers, sortable vehicle table and alerts. Sample data only.');
    return { title, description, canonical: SITE + pathFor(route, route.lang), altEn: SITE + pathFor(route, 'en'), altId: SITE + pathFor(route, 'id'),
      locale, ogTitle: title, ogDescription: description, noindex: NOINDEX };
  }
  if (route.kind === 'notfound') {
    return { title: t('Page not found') + ' | Shiro Labs', description: t('This page does not exist.'), canonical: null, altEn: null, altId: null, locale, ogTitle: 'Shiro Labs', ogDescription: t('This page does not exist.'), noindex: NOINDEX };
  }
  const description = t('Shiro Labs is an independent IT consultancy in Jakarta. We help businesses plan, build, connect and run the technology they depend on: strategy, custom software, integration, cloud, AI and technical audits.');
  return { title: t('Shiro Labs | Independent IT consultancy'), description, canonical: SITE + pathFor(route, route.lang), altEn: SITE + '/', altId: SITE + '/id',
    locale, ogTitle: 'Shiro Labs', ogDescription: t('Independent IT consultancy in Jakarta: strategy, custom software, integration, cloud, AI and technical audits.'), noindex: NOINDEX };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* <head> markup for the prerenderer. Every tag the client updates carries data-h. */
export function headHtml(h: Head): string {
  const out = [
    `<title data-h="title">${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" data-h="description">`,
    `<meta name="robots" content="${h.noindex ? 'noindex' : 'index,follow'}" data-h="robots">`,
    `<meta name="theme-color" content="#f5f4ef" data-h="theme">`,
  ];
  if (h.canonical) out.push(`<link rel="canonical" href="${h.canonical}" data-h="canonical">`);
  if (h.altEn && h.altId) {
    out.push(`<link rel="alternate" hreflang="en" href="${h.altEn}" data-h="alt-en">`,
      `<link rel="alternate" hreflang="id" href="${h.altId}" data-h="alt-id">`,
      `<link rel="alternate" hreflang="x-default" href="${h.altEn}" data-h="alt-x">`);
  }
  out.push(`<meta property="og:locale" content="${h.locale}" data-h="og-locale">`, `<script src="/lang.js"></script>`,
    `<meta property="og:type" content="website">`, `<meta property="og:title" content="${esc(h.ogTitle)}" data-h="og-title">`,
    `<meta property="og:description" content="${esc(h.ogDescription)}" data-h="og-description">`, `<meta name="twitter:card" content="summary">`);
  return out.join('\n');
}

function el(key: string, tag: string, attrs: Record<string, string>): HTMLElement {
  let n = document.head.querySelector<HTMLElement>(`[data-h="${key}"]`);
  if (!n) { n = document.createElement(tag); n.setAttribute('data-h', key); document.head.appendChild(n); }
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

/* Client-side navigation: keep title, description, canonical, hreflang and og tags in step with the route. */
export function applyHead(h: Head): void {
  document.title = h.title;
  el('description', 'meta', { name: 'description', content: h.description });
  el('robots', 'meta', { name: 'robots', content: h.noindex ? 'noindex' : 'index,follow' });
  const drop = (key: string) => document.head.querySelector(`[data-h="${key}"]`)?.remove();
  if (h.canonical) el('canonical', 'link', { rel: 'canonical', href: h.canonical }); else drop('canonical');
  if (h.altEn && h.altId) {
    el('alt-en', 'link', { rel: 'alternate', hreflang: 'en', href: h.altEn });
    el('alt-id', 'link', { rel: 'alternate', hreflang: 'id', href: h.altId });
    el('alt-x', 'link', { rel: 'alternate', hreflang: 'x-default', href: h.altEn });
  } else { drop('alt-en'); drop('alt-id'); drop('alt-x'); }
  el('og-locale', 'meta', { property: 'og:locale', content: h.locale });
  el('og-title', 'meta', { property: 'og:title', content: h.ogTitle });
  el('og-description', 'meta', { property: 'og:description', content: h.ogDescription });
  document.documentElement.lang = h.locale.slice(0, 2);
}

export { altPath };

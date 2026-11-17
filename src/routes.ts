import type { Lang } from './content';
import { getService } from './content';

export type Route =
  | { kind: 'home'; lang: Lang }
  | { kind: 'service'; lang: Lang; slug: string }
  | { kind: 'demo'; lang: Lang; slug: 'fleet' }
  | { kind: 'notfound'; lang: Lang };

/* Maps a pathname to what the page is. Used by the router, the head manager and the prerenderer. */
export function matchRoute(pathname: string): Route {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const lang: Lang = p === '/id' || p.startsWith('/id/') ? 'id' : 'en';
  const rest = lang === 'id' ? p.slice(3) || '/' : p;
  if (rest === '/') return { kind: 'home', lang };
  if (rest === '/demo/fleet') return { kind: 'demo', lang, slug: 'fleet' };
  const m = /^\/services\/([a-z0-9-]+)$/.exec(rest);
  if (m && getService(lang, m[1])) return { kind: 'service', lang, slug: m[1] };
  return { kind: 'notfound', lang };
}

/* The same page in the other language. */
export function altPath(route: Route): string {
  const alt: Lang = route.lang === 'en' ? 'id' : 'en';
  if (route.kind === 'service') return (alt === 'id' ? '/id' : '') + '/services/' + route.slug;
  if (route.kind === 'demo') return (alt === 'id' ? '/id' : '') + '/demo/' + route.slug;
  return alt === 'id' ? '/id' : '/';
}

import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { matchRoute } from './routes';
import { getHead, headHtml } from './head';
import { getServices } from './content';

/* Used by scripts/prerender.mjs: markup and head tags for one URL. */
export function render(url: string) {
  const route = matchRoute(url);
  const app = renderToString(<StaticRouter location={url}><App /></StaticRouter>);
  return { app, head: headHtml(getHead(route)), route };
}

export const urls = () => {
  const out = ['/', '/id'];
  for (const lang of ['en', 'id'] as const) for (const s of getServices(lang)) out.push((lang === 'id' ? '/id' : '') + '/services/' + s.slug);
  out.push('/demo/fleet', '/id/demo/fleet');
  return out;
};

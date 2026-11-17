/* Prerender every route into static HTML next to the client bundle.
   Run after `vite build` (client, into dist/) and `vite build --ssr` (server, into dist-ssr/). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const template = readFileSync(join(dist, 'index.html'), 'utf8');
const { render, urls } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href);

if (!template.includes('<!--head-->') || !template.includes('<!--app-->')) throw new Error('index.html is missing its placeholders');

function outPath(url) {
  if (url === '/') return join(dist, 'index.html');
  if (url === '/id') return join(dist, 'id', 'index.html');
  return join(dist, url.slice(1) + '.html');
}

function page(url) {
  const { app, head, route } = render(url);
  let html = template.replace('<!--head-->', () => head).replace('<!--app-->', () => app);
  html = html.replace('<html lang="en"', `<html lang="${route.lang}"`);
  if (route.kind !== 'home') html = html.replace('<body>', '<body class="page-service">');
  if (html.includes('—')) throw new Error('em dash in ' + url);
  if (/<!--(head|app)-->/.test(html)) throw new Error('placeholder left in ' + url);
  return html;
}

let n = 0;
for (const url of urls()) {
  const file = outPath(url);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(url));
  n++;
}
/* 404.html: Vercel serves it for unknown paths. */
writeFileSync(join(dist, '404.html'), page('/not-found'));
console.log(`prerendered ${n} routes + 404 into dist/`);

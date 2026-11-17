import { createContext, useContext } from 'react';
import trId from './content/tr.id.json';
import type { Lang } from './content';

const TR = trId as Record<string, string>;

/* English text is the key. Indonesian comes from content/tr.id.json.
   A missing key throws while prerendering and in dev, so a string can never ship untranslated. */
export function translate(lang: Lang, s: string): string {
  if (lang === 'en') return s;
  const v = TR[s];
  if (v === undefined) {
    if (import.meta.env.SSR || import.meta.env.DEV) throw new Error('missing Indonesian translation: ' + JSON.stringify(s));
    return s;
  }
  return v;
}

export const LangContext = createContext<Lang>('en');
export const useLang = () => useContext(LangContext);
export function useT() {
  const lang = useLang();
  return (s: string) => translate(lang, s);
}

export const homePath = (lang: Lang) => (lang === 'id' ? '/id' : '/');
export const servicePath = (lang: Lang, slug: string) => (lang === 'id' ? '/id' : '') + '/services/' + slug;

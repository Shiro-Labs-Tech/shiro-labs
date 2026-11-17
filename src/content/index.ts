import servicesEn from './services.en.json';
import servicesId from './services.id.json';
import casesEn from './cases.en.json';
import casesId from './cases.id.json';
import glyphJson from './glyph.json';

export type Lang = 'en' | 'id';

export interface Service {
  slug: string; no: string; name: string; card: string; bullets: string[]; title: string; meta: string; lede: string;
  facts: [string, string][]; helps: [string, string][]; does: [string, string][]; runs: [string, string][];
  tools: string[]; faq: [string, string][]; related: string[];
}
export interface CaseMetric { value: string; dec: number; suffix: string; label: string }
export interface CaseFile {
  id: string; label: string; title: string; lede: string; role: string; time: string; stack: string;
  metrics: CaseMetric[]; q: string; a: string;
}

const SERVICES: Record<Lang, Service[]> = { en: servicesEn as unknown as Service[], id: servicesId as unknown as Service[] };
const CASES: Record<Lang, CaseFile[]> = { en: casesEn as CaseFile[], id: casesId as CaseFile[] };

export const getServices = (lang: Lang) => SERVICES[lang];
export const getCases = (lang: Lang) => CASES[lang];
export const getService = (lang: Lang, slug: string) => SERVICES[lang].find((s) => s.slug === slug);
export const glyph = glyphJson as { d: string; w: number; h: number };

export const SITE = 'https://shiro-labs.tech';
export const EMAIL = 'hello@shiro-labs.tech';

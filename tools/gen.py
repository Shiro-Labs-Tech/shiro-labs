#!/usr/bin/env python3
"""Assembles the site into public/ from tools/*.tpl.html, tools/services.py and the extracted glyph (tools/glyph.json).
English is the source language (public/), Bahasa Indonesia is generated from the same templates into public/id/.
In the templates, text wrapped in {{ }} is translated through tools/lang_id.py; the build fails if a string has no translation.
Run: python3 tools/gen.py"""
import json, html, os, re, sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from services import SERVICES as SERVICES_EN
import lang_id

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "public") + os.sep
G = json.load(open(os.path.join(HERE, "glyph.json")))
D = G["d"]

# ---------- generated fragments ----------
def bars(warn=(), red=()):
    out = []
    for i in range(45):
        cls = ' class="r"' if i in red else (' class="w"' if i in warn else "")
        out.append(f'<rect x="{i * 2}" y="0" width="1.4" height="10"{cls}/>')
    return "".join(out)

UP = {
    "@@UP_API@@": bars(warn=(28,)),
    "@@UP_WEB@@": bars(warn=(12, 31, 40)),
    "@@UP_CHK@@": bars(warn=(8, 33), red=(34,)),
    "@@UP_JOB@@": bars(),
}

# ---------- case files (all sample content) ----------
CASES_EN = [
    dict(id="plan", label="2026 / Technology strategy", title="Technology roadmap",
         lede="A founder-led company with a dozen tools and no plan, given a costed roadmap that leadership approved in one meeting.",
         role="Advisory, roadmap", time="4 weeks", stack="Workshops, cost model, vendor review",
         metrics=[("12", "", "", "tools reviewed"), ("31", "", "%", "lower yearly software spend"), ("3", "", "", "quarters of work, ordered")],
         q="Every team had bought its own tools. Nobody could say what was used, what it cost or what depended on what, so each new request turned into an argument.",
         a="We mapped what ran, who used it and what it cost, then ranked the options by effect and effort. The roadmap retired four tools, kept the rest and set an order of work with owners. Leadership approved it in a single meeting."),
    dict(id="dash", label="2025 / Custom software", title="Fleet dashboard",
         lede="A cramped operations screen rebuilt as a fast interface that dispatchers can read at a glance.",
         role="Front end, design system", time="10 weeks", stack="React, TypeScript, Canvas",
         metrics=[("38", "", "%", "faster dispatch decisions"), ("1.1", "1", "s", "largest paint, laptop"), ("98", "", "", "Lighthouse performance")],
         q="Dispatchers worked from a dense table that took seconds to load and hid the one number they needed. Training new staff took weeks.",
         a="We interviewed the dispatchers, cut the screen down to the five numbers they actually used, and rebuilt the charts on canvas so they stay fast with thousands of routes. A small design system keeps new screens consistent."),
    dict(id="sync", label="2025 / Integration", title="Order-to-cash sync",
         lede="A web store, an ERP and an accounting tool that disagreed every month-end, joined into one flow that reconciles itself.",
         role="Integration, automation", time="7 weeks", stack="Node, Postgres, webhooks",
         metrics=[("5", "", "", "days faster month-end close"), ("99.4", "1", "%", "orders synced first time"), ("0", "", "", "re-keyed invoices")],
         q="Orders were copied by hand from the store into the ERP, and invoices from the ERP into accounting. Month-end took a week of hunting for mismatches.",
         a="We drew the real flow, made one system the source of truth for each record and connected them with retried, logged jobs. A daily list shows anything that failed to sync, so exceptions are handled in minutes instead of found at month-end."),
    dict(id="status", label="2025 / Cloud and reliability", title="Status page",
         lede="Customers learned about outages from social media. We built monitoring and a public page that tells them first.",
         role="Monitoring, front end", time="5 weeks", stack="Node, Grafana, Alerts",
         metrics=[("3", "", "min", "mean time to detect"), ("99.97", "2", "%", "measured uptime"), ("0", "", "", "outages found by customers")],
         q="The team had logs but no clear picture of health. Support heard about incidents from customers, often an hour after they began.",
         a="We defined what healthy means for each service, added checks and alerts that page the right person, and published a plain status page fed by the same checks, so the public view and the internal one never disagree."),
    dict(id="assist", label="2026 / AI adoption", title="Support assistant",
         lede="An assistant that drafts replies for a support queue, with a person approving every one before it is sent.",
         role="AI workflow, evaluation", time="6 weeks", stack="LLM API, Python, Postgres",
         metrics=[("41", "", "%", "less time per ticket"), ("92", "", "%", "drafts accepted after review"), ("0", "", "", "replies sent unreviewed")],
         q="Support answered the same twenty questions all day. The team had tried a chatbot and switched it off after it invented a refund policy.",
         a="We started with drafts, not autonomy: the assistant proposes a reply with the sources it used, and an agent approves or edits it. A set of real past tickets scores every change, and the share of drafts accepted is the one number we track."),
    dict(id="audit", label="2024 / Quality and audits", title="Platform review",
         lede="Before a funding round, a written review of security, delivery and reliability, ranked by effect and effort.",
         role="Audit, written report", time="2 weeks", stack="Code review, scanners, interviews",
         metrics=[("14", "", "", "findings, ranked"), ("4", "", "", "high-risk items fixed in a week"), ("2", "", "", "weeks from kickoff to written report")],
         q="An investor's technical review was coming and nobody inside the company knew what it would find. Access, backups and delivery had never been checked together.",
         a="We reviewed access, backups, dependencies and the release process, and wrote up fourteen findings with an estimated effort for each. The team fixed the four high-risk items before the investor's review and planned the rest."),
]

BASE = "https://shiro-labs.tech"
LANGS = {
    "en": dict(code="en", sub="", home="/", svc="/services", locale="en_US", alt="id", name="English"),
    "id": dict(code="id", sub="id/", home="/id", svc="/id/services", locale="id_ID", alt="en", name="Bahasa Indonesia"),
}

# English strings that the case data also produces (panel labels and titles in the landing template)
TR = dict(lang_id.TR)
for _c in CASES_EN:
    TR[_c["label"]] = lang_id.CASES_ID[_c["id"]]["label"]
    TR[_c["title"]] = lang_id.CASES_ID[_c["id"]]["title"]

def translate(lang):
    """Return t(s): identity for English, a checked lookup for Indonesian."""
    if lang == "en":
        return lambda s: s
    def t(s):
        assert s in TR, f"missing Indonesian translation: {s!r}"
        return TR[s]
    return t

def cases_for(lang):
    if lang == "en":
        return CASES_EN
    out = []
    for c in CASES_EN:
        d = lang_id.CASES_ID[c["id"]]
        assert len(d["metrics"]) == len(c["metrics"]), c["id"]
        mets = [(v, dec, d["suffixes"][k] if d["suffixes"][k] is not None else suf, d["metrics"][k])
                for k, (v, dec, suf, _lab) in enumerate(c["metrics"])]
        m = dict(c); m.update({k: d[k] for k in ("label", "title", "lede", "role", "time", "stack", "q", "a")}); m["metrics"] = mets
        out.append(m)
    return out

def services_for(lang):
    if lang == "en":
        return SERVICES_EN
    out = []
    for sv in SERVICES_EN:
        d = lang_id.SERVICES_ID[sv["slug"]]
        fields = ("name", "card", "bullets", "title", "meta", "lede", "facts", "helps", "does", "runs", "tools", "faq")
        assert set(d) == set(fields), sv["slug"] + ": fields differ"
        for k in ("bullets", "facts", "helps", "does", "runs", "tools", "faq"):
            assert len(d[k]) == len(sv[k]), f"{sv['slug']}.{k}: length differs from English"
        m = dict(sv); m.update(d); out.append(m)
    return out

def render(tpl, lang):
    """Resolve {{ }} markers: English text as written, or its Indonesian translation."""
    t = translate(lang)
    out = re.sub(r"\{\{(.+?)\}\}", lambda m: html.escape(t(m.group(1)), quote=False) if lang != "en" else m.group(1), tpl)
    assert "{{" not in out and "}}" not in out, "unresolved marker"
    return out

def head_links(lang, path_en, path_id):
    """canonical, hreflang alternates, og:locale, and the blocking language-preference script."""
    own = path_en if lang == "en" else path_id
    return (f'<link rel="canonical" href="{BASE}{own}">\n'
            f'<link rel="alternate" hreflang="en" href="{BASE}{path_en}">\n'
            f'<link rel="alternate" hreflang="id" href="{BASE}{path_id}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{BASE}{path_en}">\n'
            f'<meta property="og:locale" content="{LANGS[lang]["locale"]}">\n'
            f'<script src="/js/lang.js"></script>')

def toggle(lang, alt_path):
    """One link: the current language is highlighted, a click goes to the same page in the other language."""
    alt = LANGS[lang]["alt"]; name = LANGS[alt]["name"]
    on = lambda code: ' class="on"' if code == lang else ""
    return (f'<a class="mono lang-btn" href="{alt_path}" hreflang="{alt}" lang="{alt}" data-lang="{alt}" data-magnet '
            f'aria-label="{name}" title="{name}"><span{on("en")} aria-hidden="true">EN</span><span{on("id")} aria-hidden="true">ID</span></a>')

def case_html(i, c, lang, CASES):
    t = translate(lang)
    n = len(CASES)
    mets = "".join(
        f'<div><strong data-count="{v}"' + (f' data-dec="{dec}"' if dec else "") + f' data-suffix="{suf}">0</strong><span>{html.escape(lab)}</span></div>'
        for v, dec, suf, lab in c["metrics"])
    return f'''<article class="case" id="case-{c["id"]}" role="dialog" aria-modal="true" aria-labelledby="t-{c["id"]}" data-project="{c["id"]}" data-lenis-prevent>
  <div class="case-bar"><button class="case-close mono" type="button" data-case-close>{t("Close")}</button><span class="mono case-no">{t("Case")} {i + 1:02d} / {n:02d}</span><span class="case-nav mono"><button type="button" data-case-prev>{t("Prev")}</button><button type="button" data-case-next>{t("Next")}</button></span></div>
  <div class="case-body">
    <div class="case-side">
      <p class="label" data-in>{html.escape(c["label"])}</p>
      <h2 id="t-{c["id"]}" data-in>{html.escape(c["title"])}</h2>
      <p class="lede" data-in>{html.escape(c["lede"])}</p>
      <dl class="case-meta mono" data-in><div><dt>{t("Role")}</dt><dd>{html.escape(c["role"])}</dd></div><div><dt>{t("Timeline")}</dt><dd>{html.escape(c["time"])}</dd></div><div><dt>{t("Stack")}</dt><dd>{html.escape(c["stack"])}</dd></div></dl>
      <div class="case-metrics" data-in>{mets}</div>
    </div>
    <div class="case-main">
      <div class="case-stage"></div>
      <div class="case-copy" data-in><p class="mono case-tag">{t("Sample case file. Replace with a real engagement.")}</p><h3>{t("The question")}</h3><p>{html.escape(c["q"])}</p><h3>{t("What we found and did")}</h3><p>{html.escape(c["a"])}</p></div>
    </div>
  </div>
</article>'''

def esc(x): return html.escape(x, quote=True)

def card_html(sv, lang, t):
    lis = "".join(f"<li>{esc(b)}</li>" for b in sv["bullets"])
    return (f'<article>\n        <p class="mono cap-no">{sv["no"]}</p>\n'
            f'        <h3><a href="{LANGS[lang]["svc"]}/{sv["slug"]}">{esc(sv["name"])}</a></h3>\n'
            f'        <p>{esc(sv["card"])}</p>\n'
            f'        <ul class="mono">{lis}</ul>\n'
            f'        <span class="mono cap-more" aria-hidden="true">{t("View service")}</span>\n      </article>')

def svc_page(sv, lang, SERVICES, BY_SLUG):
    t = translate(lang); L = LANGS[lang]
    tpl = open(os.path.join(HERE, "service.tpl.html")).read()
    facts = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in sv["facts"])
    helps = "".join(f'<li><span class="mono">{i + 1:02d}</span><div><h3>{esc(a)}</h3><p>{esc(d)}</p></div></li>' for i, (a, d) in enumerate(sv["helps"]))
    does = "".join(f'<article><p class="mono cap-no">{i + 1:02d}</p><h3>{esc(a)}</h3><p>{esc(d)}</p></article>' for i, (a, d) in enumerate(sv["does"]))
    runs = "".join(f'<li><span class="mono">{i + 1:02d}</span><h3>{esc(a)}</h3><p>{esc(d)}</p></li>' for i, (a, d) in enumerate(sv["runs"]))
    tools = "".join(f"<li>{esc(x)}</li>" for x in sv["tools"])
    faq = "".join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in sv["faq"])
    rel = "".join(
        f'<article><p class="mono cap-no">{BY_SLUG[r]["no"]}</p><h3><a href="{L["svc"]}/{r}">{esc(BY_SLUG[r]["name"])}</a></h3><p>{esc(BY_SLUG[r]["card"])}</p><span class="mono cap-more" aria-hidden="true">{t("View service")}</span></article>'
        for r in sv["related"])
    subj = esc(quote(sv["name"], safe=","))
    p_en, p_id = f"/services/{sv['slug']}", f"/id/services/{sv['slug']}"
    rep = {"@@G@@": D, "@@LANG@@": lang, "@@HOME@@": L["home"], "@@NAME@@": esc(sv["name"]), "@@META@@": esc(sv["meta"]), "@@SLUG@@": sv["slug"], "@@NO@@": sv["no"],
           "@@TITLE@@": esc(sv["title"]), "@@LEDE@@": esc(sv["lede"]), "@@FACTS@@": facts, "@@HELPS@@": helps, "@@DOES@@": does,
           "@@RUNS@@": runs, "@@TOOLS@@": tools, "@@FAQ@@": faq, "@@RELATED@@": rel, "@@MAILSUBJ@@": subj,
           "@@HEAD_LINKS@@": head_links(lang, p_en, p_id),
           "@@TOGGLE@@": toggle(lang, p_id if lang == "en" else p_en)}
    tpl = render(tpl, lang)
    for k, v in rep.items():
        tpl = tpl.replace(k, v)
    assert "@@" not in tpl, "unreplaced placeholder in " + sv["slug"]
    assert "—" not in tpl, "em dash in " + sv["slug"]
    return tpl

def build(lang):
    L = LANGS[lang]; t = translate(lang)
    out_dir = ROOT + L["sub"]
    CASES = cases_for(lang); SERVICES = services_for(lang); BY_SLUG = {x["slug"]: x for x in SERVICES}
    os.makedirs(out_dir + "services", exist_ok=True)

    # landing page
    cases = "\n\n".join(case_html(i, c, lang, CASES) for i, c in enumerate(CASES))
    cards = "\n      ".join(card_html(sv, lang, t) for sv in SERVICES)
    tpl = render(open(os.path.join(HERE, "index.tpl.html")).read(), lang)
    out = (tpl.replace("@@G@@", D).replace("@@NCASES@@", f"{len(CASES):02d}").replace("@@CASES@@", cases).replace("@@CARDS@@", cards)
              .replace("@@LANG@@", lang).replace("@@HEAD_LINKS@@", head_links(lang, "/", "/id"))
              .replace("@@TOGGLE@@", toggle(lang, "/id" if lang == "en" else "/")))
    for k, v in UP.items():
        out = out.replace(k, v)
    assert "@@" not in out, "unreplaced placeholder"
    assert "—" not in out, "em dash found"
    open(out_dir + "index.html", "w").write(out)

    # service sub-pages: <out>/services/<slug>.html (served at /services/<slug> and /id/services/<slug>)
    for _f in os.listdir(out_dir + "services"):
        if _f.endswith(".html") and _f[:-5] not in BY_SLUG:
            os.remove(out_dir + "services/" + _f)
    for sv in SERVICES:
        page = svc_page(sv, lang, SERVICES, BY_SLUG)
        open(out_dir + "services/" + sv["slug"] + ".html", "w").write(page)
        print(f"{lang}: {L['sub']}services/{sv['slug']}.html", len(page), "bytes")
    print(f"{lang}: {L['sub']}index.html", len(out), "bytes")

for _lang in LANGS:
    build(_lang)

# ---------- favicon: the glyph, light on near-black, accent top stroke via clip ----------
s = 44 / G["h"]
w = G["w"] * s
fx, fy = (64 - w) / 2, 10
fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0c0d0c"/>'
       f'<defs><clipPath id="t"><rect x="200" y="-2" width="290" height="216"/></clipPath></defs>'
       f'<g transform="translate({fx:.2f} {fy}) scale({s:.5f})"><path fill="#ecebe5" fill-rule="evenodd" d="{D}"/>'
       f'<path fill="#ff6b45" fill-rule="evenodd" clip-path="url(#t)" d="{D}"/></g></svg>')
open(ROOT + "favicon.svg", "w").write(fav)
print("favicon", len(fav), "bytes")

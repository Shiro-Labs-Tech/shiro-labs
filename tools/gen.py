#!/usr/bin/env python3
"""Assembles public/index.html and public/favicon.svg from tools/index.tpl.html and the extracted glyph (tools/glyph.json).
Run: python3 tools/gen.py"""
import json, html, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from services import SERVICES, BY_SLUG

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "public") + os.sep
G = json.load(open(os.path.join(HERE, "glyph.json")))
D = G["d"]

# ---------- generated fragments ----------
WARN = {14, 37, 52, 60, 66}
qa_cells = "".join('<i class="w"></i>' if i in WARN else "<i></i>" for i in range(72))

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
CASES = [
    dict(id="qa", label="2026 / QA automation", title="Regression suite",
         lede="A flaky end-to-end suite nobody trusted, rebuilt into a release gate the team respects.",
         role="Test architecture, CI", time="8 weeks", stack="Playwright, Docker, Actions",
         metrics=[("94", "", "%", "fewer flaky reruns"), ("4.2", "1", "min", "full suite run"), ("1482", "", "", "automated checks")],
         q="Releases waited on a nightly end-to-end run that failed for reasons nobody could explain. Developers reran it until it turned green, so a green run meant little.",
         a="Most failures came from shared test data and timing, not product bugs. We isolated data per test, replaced fixed sleeps with waits on real signals, and split the suite so the critical path runs on every pull request."),
    dict(id="dash", label="2025 / Web interface", title="Fleet dashboard",
         lede="A cramped operations screen rebuilt as a fast interface that dispatchers can read at a glance.",
         role="Front end, design system", time="10 weeks", stack="React, TypeScript, Canvas",
         metrics=[("38", "", "%", "faster dispatch decisions"), ("1.1", "1", "s", "largest paint, laptop"), ("98", "", "", "Lighthouse performance")],
         q="Dispatchers worked from a dense table that took seconds to load and hid the one number they needed. Training new staff took weeks.",
         a="We interviewed the dispatchers, cut the screen down to the five numbers they actually used, and rebuilt the charts on canvas so they stay fast with thousands of routes. A small design system keeps new screens consistent."),
    dict(id="status", label="2025 / Reliability", title="Status page",
         lede="Customers learned about outages from social media. We built monitoring and a public page that tells them first.",
         role="Monitoring, front end", time="5 weeks", stack="Node, Grafana, Alerts",
         metrics=[("3", "", "min", "mean time to detect"), ("99.97", "2", "%", "measured uptime"), ("0", "", "", "outages found by customers")],
         q="The team had logs but no clear picture of health. Support heard about incidents from customers, often an hour after they began.",
         a="We defined what healthy means for each service, added checks and alerts that page the right person, and published a plain status page fed by the same checks, so the public view and the internal one never disagree."),
    dict(id="audit", label="2024 / Technical audit", title="Performance audit",
         lede="A marketing site that lost visitors before it loaded. A written audit ranked every problem by effect and effort.",
         role="Audit, written report", time="2 weeks", stack="Lighthouse, WebPageTest, axe",
         metrics=[("62", "", "%", "less page weight"), ("94", "", "", "performance score, up from 41"), ("12", "", "", "findings, ranked")],
         q="Traffic was paid for and then lost: the site took over six seconds to show anything on a mid-range phone, and nobody agreed on why.",
         a="We measured real devices, traced the weight to three causes, and wrote up twelve findings with an estimated effort for each. The team shipped the top four in a week and saw most of the gain."),
    dict(id="ops", label="2024 / Web interface", title="Ops console",
         lede="Runbooks, deploy checks and on-call handover in one keyboard-first tool, replacing a folder of wiki pages.",
         role="Front end, product design", time="3 months", stack="React, Radix, Zustand",
         metrics=[("4.8", "1", "x", "faster runbook lookup"), ("100", "", "%", "keyboard reachable"), ("62", "", "", "shared components")],
         q="During incidents, engineers searched a wiki for the right runbook while the clock ran. Handovers between shifts lived in chat threads.",
         a="We built a console where every action sits behind one shortcut: open a runbook, run a smoke test, page the on-call. The checklists are code, so they can be tested like everything else."),
]

def case_html(i, c):
    n = len(CASES)
    mets = "".join(
        f'<div><strong data-count="{v}"' + (f' data-dec="{dec}"' if dec else "") + f' data-suffix="{suf}">0</strong><span>{html.escape(lab)}</span></div>'
        for v, dec, suf, lab in c["metrics"])
    return f'''<article class="case" id="case-{c["id"]}" role="dialog" aria-modal="true" aria-labelledby="t-{c["id"]}" data-project="{c["id"]}" data-lenis-prevent>
  <div class="case-bar"><button class="case-close mono" type="button" data-case-close>Close</button><span class="mono case-no">Case {i + 1:02d} / {n:02d}</span><span class="case-nav mono"><button type="button" data-case-prev>Prev</button><button type="button" data-case-next>Next</button></span></div>
  <div class="case-body">
    <div class="case-side">
      <p class="label" data-in>{html.escape(c["label"])}</p>
      <h2 id="t-{c["id"]}" data-in>{html.escape(c["title"])}</h2>
      <p class="lede" data-in>{html.escape(c["lede"])}</p>
      <dl class="case-meta mono" data-in><div><dt>Role</dt><dd>{html.escape(c["role"])}</dd></div><div><dt>Timeline</dt><dd>{html.escape(c["time"])}</dd></div><div><dt>Stack</dt><dd>{html.escape(c["stack"])}</dd></div></dl>
      <div class="case-metrics" data-in>{mets}</div>
    </div>
    <div class="case-main">
      <div class="case-stage"></div>
      <div class="case-copy" data-in><p class="mono case-tag">Sample case file. Replace with a real engagement.</p><h3>The question</h3><p>{html.escape(c["q"])}</p><h3>What we found and did</h3><p>{html.escape(c["a"])}</p></div>
    </div>
  </div>
</article>'''

cases = "\n\n".join(case_html(i, c) for i, c in enumerate(CASES))

# ---------- landing: service cards link to /services/<slug> ----------
def card_html(sv):
    e = html.escape
    lis = "".join(f"<li>{e(b)}</li>" for b in sv["bullets"])
    return (f'<article>\n        <p class="mono cap-no">{sv["no"]}</p>\n'
            f'        <h3><a href="/services/{sv["slug"]}">{e(sv["name"])}</a></h3>\n'
            f'        <p>{e(sv["card"])}</p>\n'
            f'        <ul class="mono">{lis}</ul>\n'
            f'        <span class="mono cap-more" aria-hidden="true">View service</span>\n      </article>')

cards = "\n      ".join(card_html(sv) for sv in SERVICES)

tpl = open(os.path.join(HERE, "index.tpl.html")).read()
out = tpl.replace("@@G@@", D).replace("@@QA_CELLS@@", qa_cells).replace("@@CASES@@", cases).replace("@@CARDS@@", cards)
for k, v in UP.items():
    out = out.replace(k, v)
assert "@@" not in out, "unreplaced placeholder"
assert "—" not in out, "em dash found"
open(ROOT + "index.html", "w").write(out)

# ---------- service sub-pages: public/services/<slug>.html (served at /services/<slug>) ----------
def esc(x): return html.escape(x, quote=True)

def svc_page(sv):
    tpl = open(os.path.join(HERE, "service.tpl.html")).read()
    facts = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in sv["facts"])
    helps = "".join(f'<li><span class="mono">{i + 1:02d}</span><div><h3>{esc(t)}</h3><p>{esc(d)}</p></div></li>' for i, (t, d) in enumerate(sv["helps"]))
    does = "".join(f'<article><p class="mono cap-no">{i + 1:02d}</p><h3>{esc(t)}</h3><p>{esc(d)}</p></article>' for i, (t, d) in enumerate(sv["does"]))
    runs = "".join(f'<li><span class="mono">{i + 1:02d}</span><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for i, (t, d) in enumerate(sv["runs"]))
    tools = "".join(f"<li>{esc(t)}</li>" for t in sv["tools"])
    faq = "".join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in sv["faq"])
    rel = "".join(
        f'<article><p class="mono cap-no">{BY_SLUG[r]["no"]}</p><h3><a href="/services/{r}">{esc(BY_SLUG[r]["name"])}</a></h3><p>{esc(BY_SLUG[r]["card"])}</p><span class="mono cap-more" aria-hidden="true">View service</span></article>'
        for r in sv["related"])
    subj = esc(sv["name"]).replace(" ", "%20")
    rep = {"@@G@@": D, "@@NAME@@": esc(sv["name"]), "@@META@@": esc(sv["meta"]), "@@SLUG@@": sv["slug"], "@@NO@@": sv["no"],
           "@@TITLE@@": esc(sv["title"]), "@@LEDE@@": esc(sv["lede"]), "@@FACTS@@": facts, "@@HELPS@@": helps, "@@DOES@@": does,
           "@@RUNS@@": runs, "@@TOOLS@@": tools, "@@FAQ@@": faq, "@@RELATED@@": rel, "@@MAILSUBJ@@": subj}
    for k, v in rep.items():
        tpl = tpl.replace(k, v)
    assert "@@" not in tpl, "unreplaced placeholder in " + sv["slug"]
    assert "\u2014" not in tpl, "em dash in " + sv["slug"]
    return tpl

os.makedirs(ROOT + "services", exist_ok=True)
for sv in SERVICES:
    page = svc_page(sv)
    open(ROOT + "services/" + sv["slug"] + ".html", "w").write(page)
    print("services/" + sv["slug"] + ".html", len(page), "bytes")

# ---------- favicon: the glyph, light on near-black, accent top stroke via clip ----------
s = 44 / G["h"]
w = G["w"] * s
fx, fy = (64 - w) / 2, 10
fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0c0d0c"/>'
       f'<defs><clipPath id="t"><rect x="200" y="-2" width="290" height="216"/></clipPath></defs>'
       f'<g transform="translate({fx:.2f} {fy}) scale({s:.5f})"><path fill="#ecebe5" fill-rule="evenodd" d="{D}"/>'
       f'<path fill="#ff6b45" fill-rule="evenodd" clip-path="url(#t)" d="{D}"/></g></svg>')
open(ROOT + "favicon.svg", "w").write(fav)
print("index.html", len(out), "bytes; favicon", len(fav), "bytes")

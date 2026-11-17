/* Shiro Labs modules: theme, Jakarta time, glyph loader, hero reveals, method rail,
   working-hours overlap. Registered with Folio and started by main.js. */
(function () {
  'use strict';
  var F = window.Folio;
  if (!F) return;

  /* ---------- Theme: paper (default) or ink ---------- */
  F.register('theme', function () {
    var btn = F.$('theme-btn');
    if (!btn) return;
    var meta = document.querySelector('meta[name="theme-color"]');
    btn.addEventListener('click', function () {
      var dark = F.root.getAttribute('data-palette') !== 'ink';
      F.root.setAttribute('data-palette', dark ? 'ink' : 'paper');
      btn.textContent = dark ? F.t('Paper', 'Terang') : F.t('Ink', 'Gelap');
      btn.setAttribute('aria-label', dark ? F.t('Switch to light theme', 'Ganti ke tema terang') : F.t('Switch to dark theme', 'Ganti ke tema gelap'));
      if (meta) meta.setAttribute('content', getComputedStyle(F.root).getPropertyValue('--bg').trim());
      window.dispatchEvent(new Event('palettechange'));
    });
  });

  /* ---------- Jakarta time ---------- */
  F.register('time', function () {
    var els = ['local-time', 'nav-time', 'foot-time'].map(F.$).filter(Boolean), fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { fmt = null; }
    function tick() {
      var d = new Date(), s;
      if (fmt) s = fmt.format(d);
      else { var j = new Date(d.getTime() + (d.getTimezoneOffset() + 420) * 60000); s = F.pad(j.getHours()) + ':' + F.pad(j.getMinutes()); }
      els.forEach(function (el) { el.textContent = s; el.setAttribute('datetime', d.toISOString()); });
    }
    tick(); setInterval(tick, 20000);
  });

  /* ---------- Loader: the mark draws itself while the counter runs, then a block wipe ---------- */
  F.register('loader', function () {
    var el = F.$('loader');
    if (!el) { F.introDone(); return; }
    var seen = false;
    try { seen = sessionStorage.getItem('folio-seen') === '1'; sessionStorage.setItem('folio-seen', '1'); } catch (e) {}
    var removed = false;
    function remove() { if (removed) return; removed = true; el.remove(); F.introDone(); }
    if (F.reduce || seen || !window.gsap) { remove(); return; }

    var grid = F.$('loader-grid'), count = F.$('loader-count'), lg = F.$('lg'), mid = F.$('loader-mid');
    var small = window.innerWidth < 700, cols = small ? 6 : 12, rows = small ? 10 : 7;
    grid.style.setProperty('--c', cols); grid.style.setProperty('--r', rows);
    var blocks = [];
    for (var i = 0; i < cols * rows; i++) { var b = document.createElement('div'); grid.appendChild(b); blocks.push(b); }
    el.style.background = 'transparent';
    var inner = el.querySelector('.loader-inner'), n = { v: 0 };
    var tl = gsap.timeline({ onComplete: remove });
    tl.to(n, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: function () { count.textContent = F.pad(Math.round(n.v), 3); } }, 0)
      .to(lg, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
      .to(lg, { fillOpacity: 1, duration: 0.3, ease: 'power1.out' }, '>-0.15')
      .to([inner, mid], { opacity: 0, y: -16, duration: 0.3, ease: 'power2.in' }, '+=0.1')
      .add(function () { F.introDone(); }, '>-0.1')
      .to(blocks, { scale: 0, duration: 0.45, ease: 'power3.in', stagger: { amount: 0.7, from: 'random' } }, '<');
    setTimeout(remove, 3300);
  });

  /* ---------- Hero: headline lines and the mark reveal after the intro ---------- */
  F.register('hero-reveal', function () {
    if (F.reduce || !F.hasGsap) return;
    var h = F.$('hero-title'), mark = F.$('mark-glyph'), cap = document.querySelector('.mark-cap'), go = false, cur = null;
    if (mark) gsap.set(mark, { clipPath: 'inset(100% 0% 0% 0%)' });
    if (cap) gsap.set(cap, { opacity: 0 });
    F.onIntro(function () {
      go = true; if (cur) cur.play();
      if (mark) gsap.to(mark, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', delay: 0.1, clearProps: 'clipPath' });
      if (cap) gsap.to(cap, { opacity: 1, duration: 1, ease: 'power2.out', delay: 0.9 });
    });
    if (h && window.SplitText) {
      SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, onSplit: function (self) {
        cur = gsap.from(self.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.2, paused: !go });
        return cur;
      } });
    }
    var rest = document.querySelectorAll('.hero-copy .role, .hero-copy .cta, .hero-meta');
    if (rest.length) { gsap.set(rest, { opacity: 0, y: 16 }); F.onIntro(function () { gsap.to(rest, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.5, clearProps: 'transform,opacity' }); }); }
  });

  /* ---------- Method: the rail fills with scroll and lights each step ---------- */
  F.register('method', function () {
    var fill = F.$('method-fill'), list = F.$('method-list');
    if (!fill || !list || !F.hasGsap || F.reduce) return;
    var items = [].slice.call(list.children);
    gsap.to(fill, { scaleX: 1, ease: 'none', scrollTrigger: {
      trigger: list, start: 'top 78%', end: 'bottom 55%', scrub: true,
      onUpdate: function (self) { items.forEach(function (li, i) { li.classList.toggle('is-on', self.progress >= i / items.length + 0.02); }); }
    } });
  });

  /* ---------- Working hours overlap ---------- */
  F.register('overlap', function () {
    var sel = F.$('ov-zone'), out = F.$('ov-out'), rows = {};
    if (!sel || !out) return;
    [].forEach.call(document.querySelectorAll('#overlap .ov-cells'), function (c) {
      for (var i = 0; i < 24; i++) c.appendChild(document.createElement('i'));
      rows[c.getAttribute('data-row')] = [].slice.call(c.children);
    });
    var LAB_TZ = 'Asia/Jakarta', START = 9, END = 18; /* EDIT: working hours on both sides */

    function offsetMin(tz, date) {
      try {
        var t = Math.floor(date.getTime() / 1000) * 1000, o = {};
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
          .formatToParts(new Date(t)).forEach(function (p) { o[p.type] = p.value; });
        return Math.round((Date.UTC(+o.year, +o.month - 1, +o.day, (+o.hour) % 24, +o.minute, +o.second) - t) / 60000);
      } catch (e) { return null; }
    }
    function range(hs) {
      /* hs is a sorted list of hours; return "HH:00 to HH:00" for the first run */
      var a = hs[0], b = hs[0];
      for (var i = 1; i < hs.length && hs[i] === b + 1; i++) b = hs[i];
      return F.pad(a) + ':00' + F.t(' to ', ' sampai ') + F.pad(b + 1) + ':00';
    }
    function update() {
      var now = new Date(), you = offsetMin(sel.value, now), lab = offsetMin(LAB_TZ, now);
      if (you === null || lab === null) { out.textContent = F.t('Working hours are 09:00 to 18:00 WIB (UTC+7).', 'Jam kerja kami 09:00 sampai 18:00 WIB (UTC+7).'); return; }
      var delta = (lab - you) / 60, both = [];
      for (var h = 0; h < 24; h++) {
        var a = h >= START && h < END, lh = ((Math.floor(h + delta) % 24) + 24) % 24, b = lh >= START && lh < END;
        rows.you[h].classList.toggle('on', a); rows.lab[h].classList.toggle('on', b); rows.both[h].classList.toggle('on', a && b);
        if (a && b) both.push(h);
      }
      out.textContent = both.length
        ? (F.id ? 'Irisan: ' + both.length + ' jam, ' + range(both) + ' waktu Anda.'
                : 'Overlap: ' + both.length + (both.length === 1 ? ' hour' : ' hours') + ', ' + range(both) + ' your time.')
        : F.t('No overlap in standard hours. We can work async, or book an early or late call.',
              'Tidak ada irisan di jam kerja standar. Kami bisa bekerja secara asinkron, atau menjadwalkan panggilan lebih awal atau lebih malam.');
    }
    try {
      var mine = Intl.DateTimeFormat().resolvedOptions().timeZone, has = false;
      [].forEach.call(sel.options, function (o) { if (o.value === mine) has = true; });
      if (mine && !has && offsetMin(mine, new Date()) !== null) {
        var opt = document.createElement('option'); opt.value = mine; opt.textContent = F.t('Your time zone (', 'Zona waktu Anda (') + mine.split('/').pop().replace(/_/g, ' ') + ')';
        sel.insertBefore(opt, sel.firstChild);
      }
      if (mine) [].forEach.call(sel.options, function (o) { if (o.value === mine) sel.value = mine; });
    } catch (e) {}
    sel.addEventListener('change', update);
    update();
  });
})();

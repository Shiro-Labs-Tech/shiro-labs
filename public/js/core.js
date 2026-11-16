/* Portfolio template core. Plain JS, no build step.
   GSAP, ScrollTrigger, SplitText, Flip and Lenis are enhancements: if they fail to
   load, the page still reads and works with native scrolling. Modules register
   themselves with Folio.register and are started once by main.js. */
(function () {
  'use strict';

  var F = window.Folio = {
    root: document.documentElement,
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    fine: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    dark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    hasGsap: !!(window.gsap && window.ScrollTrigger),
    lenis: null,
    mods: [],
    pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0, moved: 0 }
  };
  F.root.classList.add('js');
  F.$ = function (id) { return document.getElementById(id); };
  F.pad = function (n, len) { var s = String(n); while (s.length < (len || 2)) s = '0' + s; return s; };
  F.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  F.lerp = function (a, b, t) { return a + (b - a) * t; };
  F.register = function (name, fn) { F.mods.push({ name: name, fn: fn }); };
  F.boot = function () {
    if (window.gsap) {
      var plugins = [window.ScrollTrigger, window.SplitText, window.Flip].filter(Boolean);
      if (plugins.length) gsap.registerPlugin.apply(gsap, plugins);
    }
    F.mods.forEach(function (m) { try { m.fn(); } catch (e) { console.error('[folio] ' + m.name, e); } });
  };

  /* One frame loop for everything. Uses the GSAP ticker when present. */
  var subs = [];
  F.tick = function (fn) { subs.push(fn); };
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (var i = 0; i < subs.length; i++) subs[i](now / 1000, dt);
    if (!window.gsap) requestAnimationFrame(frame);
  }
  F.startTicker = function () {
    if (window.gsap) gsap.ticker.add(function () { frame(performance.now()); });
    else requestAnimationFrame(frame);
  };

  /* Pointer state shared by the hero, wordmark and cursor. */
  window.addEventListener('pointermove', function (e) {
    var p = F.pointer;
    p.vx = e.clientX - p.x; p.vy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY; p.moved = performance.now();
  }, { passive: true });

  /* Intro hooks: the loader calls introDone, other modules wait on it. */
  var introCbs = [], introIsDone = false;
  F.onIntro = function (fn) { if (introIsDone) fn(); else introCbs.push(fn); };
  F.introDone = function () {
    if (introIsDone) return; introIsDone = true;
    introCbs.splice(0).forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  };
  setTimeout(F.introDone, 3600);

  /* Read a CSS color token as 0..1 floats. */
  F.color = function (name) {
    var v = getComputedStyle(F.root).getPropertyValue(name).trim();
    if (v.charAt(0) === '#') {
      if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      return [parseInt(v.slice(1, 3), 16) / 255, parseInt(v.slice(3, 5), 16) / 255, parseInt(v.slice(5, 7), 16) / 255];
    }
    return [0.5, 0.5, 0.5];
  };

  /* ---------- Custom cursor: dot, ring, and context labels ---------- */
  F.register('cursor', function () {
    if (!F.fine || F.reduce) return;
    var dot = document.createElement('div'), ring = document.createElement('div');
    dot.className = 'cur-dot'; ring.className = 'cur-ring'; ring.innerHTML = '<i></i><span></span>';
    document.body.appendChild(dot); document.body.appendChild(ring);
    F.root.classList.add('has-cursor');
    var label = ring.querySelector('span'), rx = F.pointer.x, ry = F.pointer.y;
    F.tick(function () {
      var p = F.pointer;
      dot.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
      rx += (p.x - rx) * 0.2; ry += (p.y - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    });
    window.addEventListener('pointermove', function () { F.root.classList.add('cur-on'); }, { once: true, passive: true });
    document.addEventListener('pointerleave', function () { F.root.classList.remove('cur-on'); });
    document.addEventListener('pointerenter', function () { F.root.classList.add('cur-on'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cursor]') : null;
      var l = e.target.closest ? e.target.closest('a,button,input,label,summary') : null;
      if (t) { label.textContent = t.getAttribute('data-cursor'); ring.classList.add('is-label'); ring.classList.remove('is-link'); dot.classList.add('is-hid'); }
      else { ring.classList.remove('is-label'); dot.classList.remove('is-hid'); ring.classList.toggle('is-link', !!l); }
    });
    document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
  });

  /* ---------- Magnetic buttons ---------- */
  F.register('magnet', function () {
    if (!F.fine || F.reduce || !window.gsap) return;
    var items = [].slice.call(document.querySelectorAll('[data-magnet]')).map(function (el) {
      return { el: el, x: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' }), on: false };
    });
    window.addEventListener('pointermove', function (e) {
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = e.clientX - cx, dy = e.clientY - cy, reach = Math.max(r.width, r.height) * 0.75 + 30;
        if (Math.hypot(dx, dy) < reach) { it.on = true; it.x(dx * 0.32); it.y(dy * 0.32); }
        else if (it.on) { it.on = false; it.x(0); it.y(0); }
      });
    }, { passive: true });
  });

  /* ---------- Text scramble on hover ---------- */
  F.register('scramble', function () {
    if (!F.fine || F.reduce) return;
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ+/<>#', running = new WeakMap();
    [].forEach.call(document.querySelectorAll('[data-scramble]'), function (el) {
      var original = el.textContent;
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', original);
      function run() {
        if (running.get(el)) return;
        var t0 = performance.now(), dur = 420 + original.length * 18;
        running.set(el, true);
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur), out = '';
          for (var i = 0; i < original.length; i++) {
            var c = original[i];
            out += (c === ' ' || i < k * original.length) ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          el.textContent = out;
          if (k < 1) requestAnimationFrame(step); else { el.textContent = original; running.set(el, false); }
        })(t0);
      }
      el.addEventListener('pointerenter', run);
      el.addEventListener('focus', run);
    });
  });

  /* ---------- Smooth scroll ---------- */
  F.register('smooth', function () {
    if (F.reduce || !window.Lenis) return;
    F.lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (F.hasGsap) {
      F.lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { F.lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function loop(t) { F.lenis.raf(t); requestAnimationFrame(loop); })(0);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id.length < 2 || id.indexOf('#case-') === 0) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      F.lenis.scrollTo(target, { offset: -56 });
      try { history.replaceState(null, '', id); } catch (err) {}
    });
  });

  /* ---------- Scroll progress bar ---------- */
  F.register('progress', function () {
    var bar = F.$('progress'); if (!bar) return;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? F.clamp(window.scrollY / max, 0, 1) : 0).toFixed(4) + ')';
    }
    window.addEventListener('scroll', update, { passive: true }); update();
  });

  /* ---------- Marquees: constant drift, pushed by scroll velocity ---------- */
  F.register('marquee', function () {
    var strips = [].slice.call(document.querySelectorAll('.marquee'));
    if (!strips.length) return;
    var data = strips.map(function (m) {
      var track = m.querySelector('.marquee-track'), base = track.innerHTML, copies = 1;
      while (copies < 14 && track.scrollWidth < window.innerWidth * 2.6) { track.innerHTML += base; copies++; }
      return { track: track, copies: copies, dir: parseFloat(m.getAttribute('data-speed')) || 0.6, x: 0, half: track.scrollWidth / copies };
    });
    function measure() { data.forEach(function (d) { d.half = d.track.scrollWidth / d.copies; }); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    if (F.reduce) return;
    var lastY = window.scrollY, boost = 0;
    F.tick(function (t, dt) {
      var y = window.scrollY, v = (y - lastY) / Math.max(dt, 0.001); lastY = y;
      boost += (F.clamp(v / 900, -6, 6) - boost) * 0.12;
      data.forEach(function (d) {
        var speed = d.dir * 60 + d.dir * Math.abs(boost) * 90 + boost * 40;
        d.x -= speed * dt;
        if (d.x <= -d.half) d.x += d.half; else if (d.x > 0) d.x -= d.half;
        d.track.style.transform = 'translate3d(' + d.x.toFixed(1) + 'px,0,0)';
      });
    });
  });

  /* ---------- Statement, headings and reveals ---------- */
  F.register('reveals', function () {
    if (F.reduce || !F.hasGsap) return;
    var el = F.$('statement');
    if (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      var spans = words.map(function (word, i) {
        var s = document.createElement('span'); s.className = 'w'; s.textContent = word; el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        return s;
      });
      gsap.fromTo(spans, { opacity: 0.16 }, { opacity: 1, ease: 'none', duration: 1, stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: true } });
    }
    var cl = F.$('contact-line');
    if (cl && window.SplitText) {
      SplitText.create(cl, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, onSplit: function (self) {
        return gsap.from(self.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: cl, start: 'top 85%', once: true } });
      } });
    }
    gsap.utils.toArray('.sec-head, .caps-grid article, .exp-list li, .contact-mail, .socials, .facts, .method-list li, .overlap').forEach(function (n) {
      gsap.from(n, { y: 28, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 92%', once: true } });
    });
  });

  /* ---------- Copy email ---------- */
  F.register('copy', function () {
    var btn = F.$('copy-mail'), toast = F.$('toast'); if (!btn) return;
    var timer;
    btn.addEventListener('click', function () {
      var mail = btn.getAttribute('data-email');
      function done(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(timer); timer = setTimeout(function () { toast.classList.remove('show'); }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(mail).then(function () { done('Copied ' + mail); }, function () { done(mail); });
      else done(mail);
    });
  });
})();

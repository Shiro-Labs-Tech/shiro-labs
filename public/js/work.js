/* Work: tilting project cards, a pinned horizontal row, case studies that open with a
   shared-element (Flip) transition, and a floating preview in the index table. */
(function () {
  'use strict';
  var F = window.Folio;
  if (!F) return;

  F.register('work', function () {
    var sec = F.$('work'), pin = F.$('work-pin'), track = F.$('work-track'), bar = F.$('work-bar'), now = F.$('work-now');
    if (!sec || !track) return;
    var panels = [].slice.call(track.querySelectorAll('.panel')), n = panels.length;

    /* ----- Progress counter ----- */
    function progress(p) {
      p = F.clamp(p, 0, 1);
      if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (now) now.textContent = F.pad(Math.min(n, Math.round(p * (n - 1)) + 1));
    }
    function nativeProgress() { var max = track.scrollWidth - track.clientWidth; progress(max > 0 ? track.scrollLeft / max : 0); }
    track.addEventListener('scroll', nativeProgress, { passive: true });
    nativeProgress();

    /* ----- Pinned horizontal row with velocity skew (desktop) ----- */
    var skew = 0, skewTarget = 0, pinned = false;
    if (F.hasGsap) {
      var mm = gsap.matchMedia();
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
        sec.classList.add('is-pinned'); pinned = true;
        var margin = parseFloat(getComputedStyle(F.root).getPropertyValue('--margin')) || 40;
        function dist() { var last = track.lastElementChild; return Math.max(0, last.offsetLeft + last.offsetWidth + margin - window.innerWidth); }
        gsap.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: {
            trigger: pin, start: 'top 56px', end: function () { return '+=' + dist(); },
            pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (self) { progress(self.progress); skewTarget = F.clamp(self.getVelocity() / -450, -5, 5); }
          }
        });
        return function () { pinned = false; sec.classList.remove('is-pinned'); gsap.set(panels, { clearProps: 'transform' }); nativeProgress(); };
      });
      F.tick(function () {
        if (!pinned) return;
        skewTarget *= 0.9; skew += (skewTarget - skew) * 0.14;
        if (Math.abs(skew) > 0.02) gsap.set(panels, { skewX: skew }); else if (skew !== 0) { skew = 0; gsap.set(panels, { skewX: 0 }); }
      });
    }

    /* ----- 3D tilt and glare on the project screens ----- */
    if (F.fine && !F.reduce && F.hasGsap) {
      panels.forEach(function (p) {
        var fr = p.querySelector('.frame');
        var rx = gsap.quickTo(fr, 'rotationX', { duration: 0.6, ease: 'power3.out' }), ry = gsap.quickTo(fr, 'rotationY', { duration: 0.6, ease: 'power3.out' }), sc = gsap.quickTo(fr, 'z', { duration: 0.6, ease: 'power3.out' });
        p.addEventListener('pointermove', function (e) {
          if (fr.classList.contains('is-expanded')) return;
          var r = fr.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
          ry(nx * 11); rx(-ny * 9);
          fr.style.setProperty('--gx', ((nx + 0.5) * 100).toFixed(1) + '%'); fr.style.setProperty('--gy', ((ny + 0.5) * 100).toFixed(1) + '%');
        });
        p.addEventListener('pointerenter', function () { if (!fr.classList.contains('is-expanded')) sc(28); });
        p.addEventListener('pointerleave', function () { rx(0); ry(0); sc(0); });
      });
    }

    initCases(panels);
    initPeek();
  });

  /* ---------- Case studies ---------- */
  function initCases(panels) {
    var els = [].slice.call(document.querySelectorAll('.case'));
    if (!els.length) return;
    var order = [], map = {};
    els.forEach(function (el) {
      var id = el.getAttribute('data-project'), panel = document.querySelector('.panel[data-project="' + id + '"]');
      if (!panel) return;
      map[id] = { id: id, el: el, panel: panel, frame: panel.querySelector('.frame'), slot: panel.querySelector('.frame-slot'), stage: el.querySelector('.case-stage') };
      order.push(id);
    });
    var current = null, busy = false, lastFocus = null;
    var inertEls = [document.querySelector('main'), document.querySelector('.nav'), document.querySelector('.foot')];
    function setInert(on) { inertEls.forEach(function (n) { if (!n) return; n.inert = on; if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden'); }); }
    function canFlip() { return F.hasGsap && window.Flip && !F.reduce; }

    function countUp(c) {
      [].forEach.call(c.el.querySelectorAll('[data-count]'), function (el) {
        var to = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-dec') || '0', 10), suf = el.getAttribute('data-suffix') || '';
        if (!F.hasGsap || F.reduce) { el.textContent = to.toFixed(dec) + suf; return; }
        var o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', delay: 0.6, onUpdate: function () { el.textContent = o.v.toFixed(dec) + suf; }, onComplete: function () { el.textContent = to.toFixed(dec) + suf; } });
      });
    }

    function open(id, opts) {
      opts = opts || {};
      var c = map[id];
      if (!c || current || busy) return;
      busy = true; current = c;
      if (!opts.keepFocus) lastFocus = document.activeElement;
      if (opts.history === 'push') { try { history.pushState({ case: id }, '', '#case-' + id); } catch (e) {} }
      else if (opts.history === 'replace') { try { history.replaceState({ case: id }, '', '#case-' + id); } catch (e) {} }
      if (F.lenis) F.lenis.stop();
      F.root.classList.add('case-open'); setInert(true);
      c.el.classList.add('is-entering', 'is-open'); c.el.scrollTop = 0;
      void c.el.offsetWidth; c.el.classList.remove('is-entering');
      var ins = c.el.querySelectorAll('[data-in]');
      var flip = canFlip() && !opts.noFlip;
      if (flip) { gsap.set(c.frame, { clearProps: 'transform' }); }
      var state = flip ? Flip.getState(c.frame) : null;
      c.frame.classList.add('is-expanded');
      c.stage.appendChild(c.frame);
      function ready() { busy = false; F.root.classList.add('case-live'); var cl = c.el.querySelector('.case-close'); if (cl) cl.focus({ preventScroll: true }); }
      if (F.hasGsap && !F.reduce) {
        gsap.from(ins, { y: 44, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: flip ? 0.45 : 0.15, clearProps: 'transform,opacity' });
        if (flip) Flip.from(state, { duration: 1, ease: 'expo.inOut', scale: false, onComplete: ready });
        else { gsap.from(c.frame, { opacity: 0, y: 30, duration: 0.7, ease: 'expo.out', clearProps: 'transform,opacity', onComplete: ready }); }
      } else { ready(); }
      countUp(c);
    }

    function finish(c) {
      c.frame.classList.remove('is-expanded');
      c.el.classList.remove('is-open', 'is-leaving', 'is-entering');
      F.root.classList.remove('case-open', 'case-live'); setInert(false);
      if (F.lenis) F.lenis.start();
      current = null; busy = false;
    }

    function close(opts) {
      opts = opts || {};
      var c = current;
      if (!c || busy) return;
      busy = true; F.root.classList.remove('case-live');
      function restoreFocus() { if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} } }
      if (!canFlip() || opts.instant) { c.slot.appendChild(c.frame); finish(c); restoreFocus(); return; }
      c.el.classList.add('is-leaving');
      gsap.delayedCall(0.3, function () {
        var state = Flip.getState(c.frame);
        c.slot.appendChild(c.frame);
        Flip.from(state, { duration: 0.85, ease: 'expo.inOut', scale: false, onComplete: function () { finish(c); restoreFocus(); } });
      });
    }

    function requestClose() {
      if (!current) return;
      if (history.state && history.state.case) history.back();
      else { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} close(); }
    }

    function go(dir) {
      if (!current || busy) return;
      var c = current, i = order.indexOf(c.id), next = order[(i + dir + order.length) % order.length];
      c.slot.appendChild(c.frame); finish(c);
      open(next, { noFlip: true, history: 'replace', keepFocus: true });
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#case-"]') : null;
      if (a) {
        var id = a.getAttribute('href').slice(6);
        if (!map[id]) return;
        e.preventDefault();
        var inPanel = !!a.closest('.panel'), r = a.getBoundingClientRect();
        var onScreen = r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
        open(id, { history: 'push', noFlip: !(inPanel && onScreen) });
        return;
      }
      if (e.target.closest && e.target.closest('[data-case-close]')) { requestClose(); return; }
      if (e.target.closest && e.target.closest('[data-case-prev]')) { go(-1); return; }
      if (e.target.closest && e.target.closest('[data-case-next]')) { go(1); }
    });

    document.addEventListener('keydown', function (e) {
      if (!current) return;
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
      if (e.key === 'Tab') {
        var f = [].filter.call(current.el.querySelectorAll('button, a[href]'), function (n) { return n.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    window.addEventListener('popstate', function () {
      var h = location.hash || '';
      var id = h.indexOf('#case-') === 0 ? h.slice(6) : '';
      if (current) {
        if (busy) return;
        if (id && map[id] && map[id] !== current) { close({ instant: true }); open(id, { history: 'none', noFlip: true }); }
        else if (!id) close();
        return;
      }
      if (id && map[id]) open(id, { history: 'none', noFlip: true });
    });

    F.onIntro(function () {
      var h = location.hash || '';
      if (h.indexOf('#case-') === 0 && map[h.slice(6)]) open(h.slice(6), { history: 'none', noFlip: true });
    });
  }

  /* ---------- Index table: a floating preview follows the pointer ---------- */
  function initPeek() {
    if (!F.fine || F.reduce || !F.hasGsap) return;
    var rows = [].slice.call(document.querySelectorAll('.spec tr[data-project]'));
    if (!rows.length) return;
    var peek = document.createElement('div'), inner = document.createElement('div');
    peek.className = 'peek'; inner.className = 'peek-in'; peek.setAttribute('aria-hidden', 'true'); peek.appendChild(inner); document.body.appendChild(peek);
    var clones = {};
    rows.forEach(function (r) {
      var id = r.getAttribute('data-project'), shot = document.querySelector('.panel[data-project="' + id + '"] .shot');
      if (shot) clones[id] = shot.cloneNode(true);
    });
    var x = 0, y = 0, shown = false, rot = 0;
    function show(id) {
      if (!clones[id]) return;
      inner.innerHTML = ''; inner.appendChild(clones[id]);
      if (!shown) { x = F.pointer.x; y = F.pointer.y; }
      shown = true;
      gsap.killTweensOf([peek, inner]);
      gsap.to(peek, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' });
      gsap.fromTo(inner, { scale: 0.82, rotation: -4 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'expo.out' });
    }
    function hide() { if (!shown) return; shown = false; active = null; gsap.to(peek, { autoAlpha: 0, duration: 0.2, ease: 'power2.in' }); gsap.to(inner, { scale: 0.9, duration: 0.3, ease: 'power2.in' }); }
    /* pointerenter/leave are unreliable when the page scrolls under a still cursor (smooth scroll, pinned
       sections), so the row under the pointer is re-checked while the preview is alive. */
    var active = null, frame = 0, inside = true;
    function rowUnder() {
      var el = document.elementFromPoint(F.pointer.x, F.pointer.y);
      return el && el.closest ? el.closest('.spec tr[data-project]') : null;
    }
    function sync() {
      var r = inside ? rowUnder() : null;
      if (!r) { hide(); return; }
      var id = r.getAttribute('data-project');
      if (id !== active) { active = id; show(id); }
    }
    rows.forEach(function (r) {
      r.addEventListener('pointerenter', function () { inside = true; active = r.getAttribute('data-project'); show(active); });
    });
    window.addEventListener('scroll', function () { if (shown) sync(); }, { passive: true });
    document.addEventListener('pointerleave', function () { inside = false; hide(); });
    document.addEventListener('pointerenter', function () { inside = true; });
    window.addEventListener('blur', function () { inside = false; hide(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) hide(); });
    F.tick(function () {
      if (shown && (++frame % 4 === 0)) sync();
      if (!shown && !parseFloat(gsap.getProperty(peek, 'opacity'))) return;
      var P = F.pointer, tx = P.x + 28, ty = P.y - peek.offsetHeight / 2;
      var nx = x + (tx - x) * 0.14, ny = y + (ty - y) * 0.14;
      rot += (F.clamp((tx - x) * 0.05, -9, 9) - rot) * 0.2;
      x = nx; y = ny;
      peek.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
    });
  }
})();

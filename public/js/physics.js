/* Toolbox: the skill chips become circles with real 2D physics (gravity, wall and
   circle collisions, pointer repel, drag and throw). Without JS or with reduced motion
   they stay a plain wrapped list. */
(function () {
  'use strict';
  var F = window.Folio;
  if (!F) return;

  F.register('physics', function () {
    var box = F.$('toybox'), list = F.$('chips');
    if (!box || !list || F.reduce) return;
    var items = [].slice.call(list.children), bodies = [], W = 0, H = 0;
    var small = window.innerWidth < 700;
    box.classList.add('is-physics');

    items.forEach(function (el, i) {
      var len = el.textContent.length, r = (small ? 30 : 42) + Math.min(small ? 12 : 22, len * (small ? 2.2 : 3.2));
      el.style.width = el.style.height = (r * 2) + 'px';
      el.style.fontSize = (small ? 10 : 12) + 'px';
      bodies.push({ el: el, r: r, x: 0, y: -999, vx: 0, vy: 0, a: 0, grab: false, tx: 0, ty: 0 });
    });

    function measure() {
      W = box.clientWidth; H = box.clientHeight;
      bodies.forEach(function (b) { b.x = F.clamp(b.x, b.r, Math.max(b.r, W - b.r)); if (b.y > H - b.r) b.y = H - b.r; });
    }
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(box); else window.addEventListener('resize', measure);

    var active = false, started = false, awake = 0, anyGrab = null, px = -999, py = -999, pIn = false;
    function spawn() {
      bodies.forEach(function (b, i) {
        b.x = b.r + Math.random() * Math.max(1, W - b.r * 2);
        b.y = -b.r - i * 64; b.vx = (Math.random() - 0.5) * 160; b.vy = 0;
      });
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        active = es[0].isIntersecting;
        if (active && !started) { started = true; spawn(); }
        if (active) awake = 2;
      }, { threshold: 0.3 }).observe(box);
    } else { active = started = true; spawn(); }

    function rel(e) { var r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    box.addEventListener('pointermove', function (e) {
      var p = rel(e); px = p.x; py = p.y; pIn = e.pointerType === 'mouse'; awake = 2;
      if (anyGrab) { anyGrab.tx = F.clamp(p.x, anyGrab.r, W - anyGrab.r); anyGrab.ty = F.clamp(p.y, anyGrab.r, H - anyGrab.r); }
    }, { passive: true });
    box.addEventListener('pointerleave', function () { pIn = false; });
    list.addEventListener('pointerdown', function (e) {
      var li = e.target.closest ? e.target.closest('li') : null;
      if (!li) return;
      var b = bodies.filter(function (o) { return o.el === li; })[0];
      if (!b) return;
      e.preventDefault();
      try { li.setPointerCapture(e.pointerId); } catch (err) {}
      var p = rel(e); b.grab = true; b.tx = p.x; b.ty = p.y; anyGrab = b; li.classList.add('is-grab'); awake = 3;
    });
    function release() {
      if (!anyGrab) return;
      anyGrab.grab = false; anyGrab.el.classList.remove('is-grab'); anyGrab = null; awake = 3;
    }
    list.addEventListener('pointerup', release); list.addEventListener('pointercancel', release);

    var acc = 0;
    function step(dt) {
      var g = 1500, i, j, b, o;
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        if (b.grab) { b.vx = F.clamp((b.tx - b.x) * 18, -3200, 3200); b.vy = F.clamp((b.ty - b.y) * 18, -3200, 3200); }
        else {
          b.vy += g * dt;
          if (pIn && !anyGrab) {
            var dx = b.x - px, dy = b.y - py, d = Math.sqrt(dx * dx + dy * dy), R = b.r + 80;
            if (d < R && d > 0.1) { var f = (1 - d / R) * 1400 * dt; b.vx += dx / d * f; b.vy += dy / d * f; }
          }
        }
        b.vx *= 0.999; b.vy *= 0.999;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.4; }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.4; }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.32; b.vx *= 0.985; }
        if (b.y < -600) { b.y = -600; b.vy = Math.abs(b.vy) * 0.3; }
      }
      for (var it = 0; it < 3; it++) {
        for (i = 0; i < bodies.length; i++) {
          for (j = i + 1; j < bodies.length; j++) {
            b = bodies[i]; o = bodies[j];
            var cx = o.x - b.x, cy = o.y - b.y, dist = Math.sqrt(cx * cx + cy * cy), min = b.r + o.r;
            if (dist >= min || dist === 0) continue;
            var nx = cx / dist, ny = cy / dist, ov = min - dist;
            var wb = b.grab ? 0 : (o.grab ? 1 : 0.5), wo = o.grab ? 0 : (b.grab ? 1 : 0.5);
            b.x -= nx * ov * wb; b.y -= ny * ov * wb; o.x += nx * ov * wo; o.y += ny * ov * wo;
            var vn = (o.vx - b.vx) * nx + (o.vy - b.vy) * ny;
            if (vn < 0) {
              var imp = -(1 + 0.3) * vn;
              if (!b.grab) { b.vx -= nx * imp * wb; b.vy -= ny * imp * wb; }
              if (!o.grab) { o.vx += nx * imp * wo; o.vy += ny * imp * wo; }
            }
          }
        }
      }
    }

    F.tick(function (t, dt) {
      if (!active || document.hidden || !started) return;
      if (awake <= 0 && !anyGrab) return;
      acc += Math.min(dt, 0.05);
      var h = 1 / 120;
      while (acc >= h) { step(h); acc -= h; }
      var moving = false;
      bodies.forEach(function (b) {
        b.a += (F.clamp(b.vx * 0.0012, -0.5, 0.5) - b.a) * 0.12;
        b.el.style.transform = 'translate3d(' + (b.x - b.r).toFixed(1) + 'px,' + (b.y - b.r).toFixed(1) + 'px,0) rotate(' + b.a.toFixed(3) + 'rad)';
        if (Math.abs(b.vx) + Math.abs(b.vy) > 14) moving = true;
      });
      awake = moving || anyGrab || pIn ? 2 : awake - dt;
    });
  });
})();

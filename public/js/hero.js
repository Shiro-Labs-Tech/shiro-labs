/* Hero: a WebGL2 contour field. The kanji is rasterized from its own outline into a mask,
   blurred with mipmaps and added to the terrain height, so the contour lines pile up around
   it like a summit. The pointer bends the field (lens), clicks send a ripple, and the left
   copy block dims the lines so text stays readable. Static under reduced motion. */
(function () {
  'use strict';
  var F = window.Folio;
  if (!F) return;

  var VS = '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uLens;',
    'uniform vec3 uRip; uniform float uRipAmp; uniform vec3 uBg; uniform vec3 uInk; uniform vec3 uAcc; uniform float uScroll;',
    'uniform sampler2D uMask; uniform float uMtn; uniform vec4 uCopy;',
    'out vec4 outColor;',
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}',
    'float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}',
    'void main(){',
    '  vec2 frag=gl_FragCoord.xy;',
    '  vec2 p=(frag-0.5*uRes)/uRes.y;',
    '  vec2 m=(uMouse*uRes-0.5*uRes)/uRes.y;',
    '  vec2 d=p-m; float r=length(d);',
    '  float lens=exp(-r*r*6.0)*uLens;',
    '  vec2 pl=p-d*lens*0.85;',
    '  vec2 pp=pl; pp.y+=uScroll*0.35;',
    '  vec2 uvm=(pl*uRes.y+0.5*uRes)/uRes;',
    '  float mk=textureLod(uMask,uvm,3.0).r*0.55+textureLod(uMask,uvm,5.5).r*0.45;',
    '  vec2 q=vec2(fbm(pp*0.9+vec2(0.0,uTime*0.04)),fbm(pp*0.9+vec2(5.2,1.3)-uTime*0.03));',
    '  vec2 dir=normalize(d+vec2(1e-4)); vec2 off=dir*lens*lens*0.03;',
    '  vec3 f;',
    '  for(int c=0;c<3;c++){vec2 pc=pp+off*float(c-1); f[c]=fbm(pc*0.9+2.0*q+vec2(uTime*0.02,0.0));}',
    '  f+=mk*uMtn;',
    '  vec2 rp=(uRip.xy*uRes-0.5*uRes)/uRes.y;',
    '  float rr=length(p-rp);',
    '  float wave=exp(-pow((rr-uRip.z*0.9)*8.0,2.0))*exp(-uRip.z*1.4)*uRipAmp;',
    '  f+=wave*0.12;',
    '  vec3 v=f*13.0;',
    '  vec2 q2=frag/uRes;',
    '  float cm=smoothstep(uCopy.x-0.05,uCopy.x+0.02,q2.x)*(1.0-smoothstep(uCopy.z-0.02,uCopy.z+0.05,q2.x))*smoothstep(uCopy.y-0.06,uCopy.y+0.02,q2.y)*(1.0-smoothstep(uCopy.w-0.02,uCopy.w+0.06,q2.y));',
    '  float fade=mix(0.3,1.0,smoothstep(0.08,0.55,q2.y))*smoothstep(1.0,0.94,q2.y)*(1.0-0.72*cm);',
    '  vec3 col;',
    '  for(int c=0;c<3;c++){',
    '    float w=fwidth(v[c])+1e-4;',
    '    float dist=abs(fract(v[c]+0.5)-0.5);',
    '    float idx=floor(v[c]+0.5);',
    '    float isA=1.0-step(0.5,mod(idx,6.0));',
    '    float line=1.0-clamp(dist/(w*(1.0+0.6*isA)),0.0,1.0);',
    '    float base=mix(uBg[c],uInk[c],0.05*f[c]);',
    '    float a=line*(0.5+0.5*isA)*fade;',
    '    col[c]=mix(base,mix(uInk[c],uAcc[c],isA),a);',
    '  }',
    '  outColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[folio] shader', gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  F.register('hero-gl', function () {
    var cv = F.$('orb');
    if (!cv) return;
    var hero = cv.parentElement, glyph = F.$('mark-glyph'), copy = hero.querySelector('.hero-copy');
    var gp = F.$('g-path'), D = gp ? gp.getAttribute('d') : '';
    var gl = null;
    try { gl = cv.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    if (!gl) { fallback2D(cv, hero, glyph); return; }

    var vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS), prog = gl.createProgram();
    if (!vs || !fs) { cv.style.display = 'none'; return; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('[folio] link', gl.getProgramInfoLog(prog)); cv.style.display = 'none'; return; }
    gl.useProgram(prog);
    var U = {};
    ['uRes', 'uTime', 'uMouse', 'uLens', 'uRip', 'uRipAmp', 'uBg', 'uInk', 'uAcc', 'uScroll', 'uMask', 'uMtn', 'uCopy'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    /* Mask texture: the glyph outline drawn where the DOM mark sits, then mipmapped for blur. */
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.uMask, 0);
    var mc = document.createElement('canvas'), mx = mc.getContext('2d'), path = (D && window.Path2D) ? new Path2D(D) : null;
    var cp = [0, 0, 0, 0];
    function refresh() {
      var r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var W = 512, H = Math.max(2, Math.round(W * r.height / r.width)), s = W / r.width;
      if (mc.width !== W) mc.width = W;
      if (mc.height !== H) mc.height = H;
      mx.setTransform(1, 0, 0, 1, 0, 0); mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
      if (path && glyph) {
        var g = glyph.getBoundingClientRect();
        if (g.width > 2) {
          mx.fillStyle = '#fff';
          mx.setTransform(g.width / 780 * s, 0, 0, g.height / 939 * s, (g.left - r.left) * s, (g.top - r.top) * s);
          mx.fill(path, 'evenodd'); mx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mc);
      gl.generateMipmap(gl.TEXTURE_2D);
      if (copy) {
        var c = copy.getBoundingClientRect();
        cp = [(c.left - r.left) / r.width, 1 - (c.bottom - r.top) / r.height, (c.right - r.left) / r.width, 1 - (c.top - r.top) / r.height];
      }
    }

    var bg = F.color('--bg'), ink = F.color('--ink'), acc = F.color('--accent');
    var tBg = bg.slice(), tInk = ink.slice(), tAcc = acc.slice();
    window.addEventListener('palettechange', function () { tBg = F.color('--bg'); tInk = F.color('--ink'); tAcc = F.color('--accent'); if (F.reduce) drawFrame(2.5, 0.016, true); });

    var quality = 1, w = 0, h = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
      w = Math.max(2, Math.round(cv.clientWidth * dpr)); h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
    }
    resize(); refresh();
    function relayout() { resize(); refresh(); if (F.reduce) drawFrame(2.5, 0.016, true); }
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(hero); else window.addEventListener('resize', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    window.addEventListener('load', relayout);

    var mxp = 0.5, myp = 0.5, lens = 0.4, rip = { x: 0.5, y: 0.5, age: 9, amp: 0 };
    hero.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect();
      rip.x = (e.clientX - r.left) / r.width; rip.y = 1 - (e.clientY - r.top) / r.height; rip.age = 0; rip.amp = 1;
    });

    var visible = true, slow = 0, frames = 0;
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); cv.style.display = 'none'; });

    function drawFrame(t, dt, instant) {
      var P = F.pointer, r = cv.getBoundingClientRect();
      var inside = P.x >= r.left && P.x <= r.right && P.y >= r.top && P.y <= r.bottom;
      var idle = performance.now() - P.moved > 2600 || !P.moved;
      var tx, ty, tl;
      if (F.reduce) { tx = 0.62; ty = 0.58; tl = 0.5; }
      else if (idle || !inside) { tx = 0.5 + 0.28 * Math.sin(t * 0.35); ty = 0.55 + 0.18 * Math.sin(t * 0.5 + 1.0); tl = 0.5; }
      else {
        tx = (P.x - r.left) / r.width; ty = 1 - (P.y - r.top) / r.height;
        tl = 1 + Math.min(0.45, Math.hypot(P.vx, P.vy) * 0.012);
      }
      var k = instant ? 1 : 1 - Math.exp(-dt * 6);
      mxp += (tx - mxp) * k; myp += (ty - myp) * k; lens += (tl - lens) * k;
      rip.age = Math.min(4, rip.age + dt); rip.amp = Math.max(0, rip.amp - dt * 0.35);
      var c = instant ? 1 : 1 - Math.exp(-dt * 5);
      for (var i = 0; i < 3; i++) { bg[i] += (tBg[i] - bg[i]) * c; ink[i] += (tInk[i] - ink[i]) * c; acc[i] += (tAcc[i] - acc[i]) * c; }
      gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uTime, t);
      gl.uniform2f(U.uMouse, mxp, myp); gl.uniform1f(U.uLens, lens);
      gl.uniform3f(U.uRip, rip.x, rip.y, rip.age); gl.uniform1f(U.uRipAmp, rip.amp);
      gl.uniform3f(U.uBg, bg[0], bg[1], bg[2]); gl.uniform3f(U.uInk, ink[0], ink[1], ink[2]); gl.uniform3f(U.uAcc, acc[0], acc[1], acc[2]);
      gl.uniform1f(U.uScroll, Math.min(2, window.scrollY / Math.max(1, window.innerHeight)));
      gl.uniform1f(U.uMtn, (window.innerWidth < 600 ? 0.8 : 1.15)); gl.uniform4f(U.uCopy, cp[0], cp[1], cp[2], cp[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (F.reduce) { drawFrame(2.5, 0.016, true); return; }
    if (F.hasGsap) { gsap.set(cv, { opacity: 0 }); F.onIntro(function () { relayout(); gsap.to(cv, { opacity: 1, duration: 1.6, ease: 'power2.out' }); }); }
    F.tick(function (t, dt) {
      if (!visible || document.hidden) return;
      drawFrame(t, Math.max(dt, 0.001));
      /* Adaptive quality: step the render scale down if frames run long. */
      slow += dt > 0.026 ? 1 : 0; frames++;
      if (frames >= 45) { if (slow > 30 && quality > 0.55) { quality *= 0.8; resize(); } slow = 0; frames = 0; }
    });
  });

  /* ---------- 2D fallback for browsers without WebGL2: rings around the mark ---------- */
  function fallback2D(cv, hero, glyph) {
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var w = 0, h = 0, ink = '#000', acc = '#c00', tx = 0.5, ty = 0.5, px = 0.5, py = 0.5, N = 140;
    function colors() { var cs = getComputedStyle(F.root); ink = cs.getPropertyValue('--ink').trim() || ink; acc = cs.getPropertyValue('--accent').trim() || acc; }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(t) {
      px += (tx - px) * 0.06; py += (ty - py) * 0.06;
      ctx.clearRect(0, 0, w, h);
      var r = cv.getBoundingClientRect(), g = glyph ? glyph.getBoundingClientRect() : null;
      var cx = g ? g.left - r.left + g.width / 2 : w * 0.7, cy = g ? g.top - r.top + g.height / 2 : h * 0.5;
      var gw = g ? g.width : w * 0.2, gh = g ? g.height : h * 0.4;
      for (var k = 1; k <= 14; k++) {
        ctx.beginPath();
        for (var i = 0; i <= N; i++) {
          var a = i / N * Math.PI * 2, m = 1 + 0.05 * Math.sin(3 * a + t * 0.5 + k * 0.4) + 0.03 * Math.sin(5 * a - t * 0.8) + 0.05 * (px - 0.5) * Math.cos(a) + 0.05 * (py - 0.5) * Math.sin(a);
          var x = cx + Math.cos(a) * gw * (0.62 + k * 0.17) * m, y = cy + Math.sin(a) * gh * (0.58 + k * 0.15) * m;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.strokeStyle = k % 6 === 0 ? acc : ink; ctx.globalAlpha = Math.max(0.08, 0.5 - k * 0.03); ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    colors(); size(); draw(F.reduce ? 0 : performance.now() / 1000);
    window.addEventListener('palettechange', function () { colors(); draw(0); });
    if (window.ResizeObserver) new ResizeObserver(function () { size(); draw(0); }).observe(cv);
    if (F.reduce) return;
    hero.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; }, { passive: true });
    F.tick(function (t) { draw(t); });
  }
})();

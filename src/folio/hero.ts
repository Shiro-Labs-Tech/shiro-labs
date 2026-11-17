/* Hero: a WebGL2 contour field. The kanji is rasterized from its own outline into a mask,
   blurred with mipmaps and added to the terrain height, so the contour lines pile up around
   it like a summit. The pointer bends the field (lens), clicks send a ripple, and the left
   copy block dims the lines so text stays readable. Static under reduced motion. */
import { gsap, SplitText, rt, onIntro, readColor } from './runtime';
import type { PageCtx } from './runtime';

const VS = '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';
const FS = [
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
  '}',
].join('\n');

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[shiro] shader', gl.getShaderInfoLog(s)); return null; }
  return s;
}

type RGB = [number, number, number];

export function heroGL(ctx: PageCtx) {
  const cv = document.getElementById('orb') as HTMLCanvasElement | null;
  if (!cv) return;
  const hero = cv.parentElement as HTMLElement, glyph = document.getElementById('mark-glyph'), copy = hero.querySelector('.hero-copy');
  const gp = document.getElementById('g-path'), D = gp ? gp.getAttribute('d') || '' : '';
  let gl: WebGL2RenderingContext | null = null;
  try { gl = cv.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch { gl = null; }
  if (!gl) { fallback2D(ctx, cv, hero, glyph); return; }
  const GL = gl;

  const vs = compile(GL, GL.VERTEX_SHADER, VS), fs = compile(GL, GL.FRAGMENT_SHADER, FS), prog = GL.createProgram()!;
  if (!vs || !fs) { cv.style.display = 'none'; return; }
  GL.attachShader(prog, vs); GL.attachShader(prog, fs); GL.linkProgram(prog);
  if (!GL.getProgramParameter(prog, GL.LINK_STATUS)) { console.error('[shiro] link', GL.getProgramInfoLog(prog)); cv.style.display = 'none'; return; }
  GL.useProgram(prog);
  const U: Record<string, WebGLUniformLocation | null> = {};
  ['uRes', 'uTime', 'uMouse', 'uLens', 'uRip', 'uRipAmp', 'uBg', 'uInk', 'uAcc', 'uScroll', 'uMask', 'uMtn', 'uCopy'].forEach((n) => { U[n] = GL.getUniformLocation(prog, n); });
  ctx.cleanup(() => { GL.getExtension('WEBGL_lose_context')?.loseContext(); });

  /* Mask texture: the glyph outline drawn where the DOM mark sits, then mipmapped for blur. */
  const tex = GL.createTexture();
  GL.activeTexture(GL.TEXTURE0); GL.bindTexture(GL.TEXTURE_2D, tex);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR_MIPMAP_LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
  GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
  GL.uniform1i(U.uMask, 0);
  const mc = document.createElement('canvas'), mx = mc.getContext('2d')!, path = (D && window.Path2D) ? new Path2D(D) : null;
  let cp = [0, 0, 0, 0];
  function refresh() {
    const r = cv!.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const W = 512, H = Math.max(2, Math.round(W * r.height / r.width)), s = W / r.width;
    if (mc.width !== W) mc.width = W;
    if (mc.height !== H) mc.height = H;
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
    if (path && glyph) {
      const g = glyph.getBoundingClientRect();
      if (g.width > 2) {
        mx.fillStyle = '#fff';
        mx.setTransform(g.width / 780 * s, 0, 0, g.height / 939 * s, (g.left - r.left) * s, (g.top - r.top) * s);
        mx.fill(path, 'evenodd'); mx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    GL.activeTexture(GL.TEXTURE0); GL.bindTexture(GL.TEXTURE_2D, tex);
    GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, mc);
    GL.generateMipmap(GL.TEXTURE_2D);
    if (copy) {
      const c = copy.getBoundingClientRect();
      cp = [(c.left - r.left) / r.width, 1 - (c.bottom - r.top) / r.height, (c.right - r.left) / r.width, 1 - (c.top - r.top) / r.height];
    }
  }

  const bg = readColor('--bg'), ink = readColor('--ink'), acc = readColor('--accent');
  let tBg: RGB = [...bg], tInk: RGB = [...ink], tAcc: RGB = [...acc];
  ctx.on(window, 'palettechange', () => { tBg = readColor('--bg'); tInk = readColor('--ink'); tAcc = readColor('--accent'); if (rt.reduce) drawFrame(2.5, 0.016, true); });

  let quality = 1, w = 0, h = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
    w = Math.max(2, Math.round(cv!.clientWidth * dpr)); h = Math.max(2, Math.round(cv!.clientHeight * dpr));
    if (cv!.width !== w || cv!.height !== h) { cv!.width = w; cv!.height = h; }
    GL.viewport(0, 0, w, h);
  }
  resize(); refresh();
  const relayout = () => { resize(); refresh(); if (rt.reduce) drawFrame(2.5, 0.016, true); };
  if (window.ResizeObserver) { const ro = new ResizeObserver(relayout); ro.observe(hero); ctx.cleanup(() => ro.disconnect()); } else ctx.on(window, 'resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  ctx.on(window, 'load', relayout);

  let mxp = 0.5, myp = 0.5, lens = 0.4;
  const rip = { x: 0.5, y: 0.5, age: 9, amp: 0 };
  ctx.on(hero, 'pointerdown', (e: PointerEvent) => {
    const r = cv.getBoundingClientRect();
    rip.x = (e.clientX - r.left) / r.width; rip.y = 1 - (e.clientY - r.top) / r.height; rip.age = 0; rip.amp = 1;
  });

  let visible = true, slow = 0, frames = 0;
  if (window.IntersectionObserver) { const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }); io.observe(hero); ctx.cleanup(() => io.disconnect()); }
  ctx.on(cv, 'webglcontextlost', (e: Event) => { e.preventDefault(); cv.style.display = 'none'; });

  function drawFrame(t: number, dt: number, instant?: boolean) {
    const P = rt.pointer, r = cv!.getBoundingClientRect();
    const inside = P.x >= r.left && P.x <= r.right && P.y >= r.top && P.y <= r.bottom;
    const idle = performance.now() - P.moved > 2600 || !P.moved;
    let tx: number, ty: number, tl: number;
    if (rt.reduce) { tx = 0.62; ty = 0.58; tl = 0.5; }
    else if (idle || !inside) { tx = 0.5 + 0.28 * Math.sin(t * 0.35); ty = 0.55 + 0.18 * Math.sin(t * 0.5 + 1.0); tl = 0.5; }
    else {
      tx = (P.x - r.left) / r.width; ty = 1 - (P.y - r.top) / r.height;
      tl = 1 + Math.min(0.45, Math.hypot(P.vx, P.vy) * 0.012);
    }
    const k = instant ? 1 : 1 - Math.exp(-dt * 6);
    mxp += (tx - mxp) * k; myp += (ty - myp) * k; lens += (tl - lens) * k;
    rip.age = Math.min(4, rip.age + dt); rip.amp = Math.max(0, rip.amp - dt * 0.35);
    const c = instant ? 1 : 1 - Math.exp(-dt * 5);
    for (let i = 0; i < 3; i++) { bg[i] += (tBg[i] - bg[i]) * c; ink[i] += (tInk[i] - ink[i]) * c; acc[i] += (tAcc[i] - acc[i]) * c; }
    GL.uniform2f(U.uRes, w, h); GL.uniform1f(U.uTime, t);
    GL.uniform2f(U.uMouse, mxp, myp); GL.uniform1f(U.uLens, lens);
    GL.uniform3f(U.uRip, rip.x, rip.y, rip.age); GL.uniform1f(U.uRipAmp, rip.amp);
    GL.uniform3f(U.uBg, bg[0], bg[1], bg[2]); GL.uniform3f(U.uInk, ink[0], ink[1], ink[2]); GL.uniform3f(U.uAcc, acc[0], acc[1], acc[2]);
    GL.uniform1f(U.uScroll, Math.min(2, window.scrollY / Math.max(1, window.innerHeight)));
    GL.uniform1f(U.uMtn, (window.innerWidth < 600 ? 0.8 : 1.15)); GL.uniform4f(U.uCopy, cp[0], cp[1], cp[2], cp[3]);
    GL.drawArrays(GL.TRIANGLES, 0, 3);
  }

  if (rt.reduce) { drawFrame(2.5, 0.016, true); return; }
  let alive = true;
  ctx.cleanup(() => { alive = false; });
  const g = gsap.context((self) => {
    gsap.set(cv, { opacity: 0 });
    onIntro(() => { if (!alive) return; relayout(); self.add(() => gsap.to(cv, { opacity: 1, duration: 1.6, ease: 'power2.out' })); });
  });
  ctx.cleanup(() => g.revert());
  ctx.tick((t, dt) => {
    if (!visible || document.hidden) return;
    drawFrame(t, Math.max(dt, 0.001));
    /* Adaptive quality: step the render scale down if frames run long. */
    slow += dt > 0.026 ? 1 : 0; frames++;
    if (frames >= 45) { if (slow > 30 && quality > 0.55) { quality *= 0.8; resize(); } slow = 0; frames = 0; }
  });
}

/* ---------- 2D fallback for browsers without WebGL2: rings around the mark ---------- */
function fallback2D(ctx: PageCtx, cv: HTMLCanvasElement, hero: HTMLElement, glyph: Element | null) {
  const c2 = cv.getContext('2d');
  if (!c2) return;
  const root = document.documentElement;
  let w = 0, h = 0, ink = '#000', acc = '#c00', tx = 0.5, ty = 0.5, px = 0.5, py = 0.5;
  const N = 140;
  const colors = () => { const cs = getComputedStyle(root); ink = cs.getPropertyValue('--ink').trim() || ink; acc = cs.getPropertyValue('--accent').trim() || acc; };
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
    w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = (t: number) => {
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    c2.clearRect(0, 0, w, h);
    const r = cv.getBoundingClientRect(), g = glyph ? glyph.getBoundingClientRect() : null;
    const cx = g ? g.left - r.left + g.width / 2 : w * 0.7, cy = g ? g.top - r.top + g.height / 2 : h * 0.5;
    const gw = g ? g.width : w * 0.2, gh = g ? g.height : h * 0.4;
    for (let k = 1; k <= 14; k++) {
      c2.beginPath();
      for (let i = 0; i <= N; i++) {
        const a = i / N * Math.PI * 2, m = 1 + 0.05 * Math.sin(3 * a + t * 0.5 + k * 0.4) + 0.03 * Math.sin(5 * a - t * 0.8) + 0.05 * (px - 0.5) * Math.cos(a) + 0.05 * (py - 0.5) * Math.sin(a);
        const x = cx + Math.cos(a) * gw * (0.62 + k * 0.17) * m, y = cy + Math.sin(a) * gh * (0.58 + k * 0.15) * m;
        if (i) c2.lineTo(x, y); else c2.moveTo(x, y);
      }
      c2.closePath(); c2.strokeStyle = k % 6 === 0 ? acc : ink; c2.globalAlpha = Math.max(0.08, 0.5 - k * 0.03); c2.lineWidth = 1; c2.stroke();
    }
    c2.globalAlpha = 1;
  };
  colors(); size(); draw(rt.reduce ? 0 : performance.now() / 1000);
  ctx.on(window, 'palettechange', () => { colors(); draw(0); });
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { size(); draw(0); }); ro.observe(cv); ctx.cleanup(() => ro.disconnect()); }
  if (rt.reduce) return;
  ctx.on(hero, 'pointermove', (e: PointerEvent) => { const r = cv.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; }, { passive: true });
  ctx.tick((t) => draw(t));
}

/* ---------- Hero: headline lines and the mark reveal after the intro ---------- */
export function heroReveal(ctx: PageCtx) {
  if (rt.reduce) return;
  let alive = true;
  ctx.cleanup(() => { alive = false; });
  const g = gsap.context((self) => {
    const h = document.getElementById('hero-title'), mark = document.getElementById('mark-glyph'), cap = document.querySelector('.mark-cap');
    let go = false, cur: gsap.core.Animation | null = null;
    if (mark) gsap.set(mark, { clipPath: 'inset(100% 0% 0% 0%)' });
    if (cap) gsap.set(cap, { opacity: 0 });
    onIntro(() => {
      if (!alive) return;
      go = true; if (cur) cur.play();
      self.add(() => {
        if (mark) gsap.to(mark, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', delay: 0.1, clearProps: 'clipPath' });
        if (cap) gsap.to(cap, { opacity: 1, duration: 1, ease: 'power2.out', delay: 0.9 });
      });
    });
    if (h) {
      SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, onSplit: (self) => {
        cur = gsap.from(self.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.2, paused: !go });
        return cur;
      } });
    }
    const rest = document.querySelectorAll('.hero-copy .role, .hero-copy .cta, .hero-meta');
    if (rest.length) {
      gsap.set(rest, { opacity: 0, y: 16 });
      onIntro(() => { if (alive) self.add(() => gsap.to(rest, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.5, clearProps: 'transform,opacity' })); });
    }
  });
  ctx.cleanup(() => g.revert());
}

/* Núcleo de vectorización: imagen en gris -> contornos cerrados (marching squares) */
(function (root) {
  'use strict';

  function toGray(rgba, w, h, invert) {
    const g = new Float32Array(w * h);
    for (let i = 0, p = 0; i < g.length; i++, p += 4) {
      const a = rgba[p + 3] / 255;
      // Transparencia = blanco
      const v = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) * a + 255 * (1 - a);
      g[i] = invert ? 255 - v : v;
    }
    return g;
  }

  function boxBlur(src, w, h, r) {
    if (r < 1) return src;
    const tmp = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const n = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let k = -r; k <= r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / n;
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / n;
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  function otsu(gray) {
    const hist = new Float64Array(256);
    for (let i = 0; i < gray.length; i++) hist[Math.max(0, Math.min(255, Math.round(gray[i])))]++;
    const total = gray.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const d = sumB / wB - (sum - sumB) / wF;
      const between = wB * wF * d * d;
      if (between > best) { best = between; thr = t; }
    }
    return thr;
  }

  // Segmentos (pares de aristas) por caso. Bits: tl=8 tr=4 br=2 bl=1. Aristas: T,R,B,L
  const CASES = [
    [], [['L', 'B']], [['B', 'R']], [['L', 'R']], [['T', 'R']], null, [['T', 'B']], [['T', 'L']],
    [['T', 'L']], [['T', 'B']], null, [['T', 'R']], [['L', 'R']], [['B', 'R']], [['L', 'B']], []
  ];

  /** Devuelve lazos cerrados [[x,y],...] donde field < t (zona "tinta"). */
  function traceContours(field, w, h, t) {
    const W = w + 2, H = h + 2;
    const f = new Float32Array(W * H).fill(255);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) f[(y + 1) * W + x + 1] = field[y * w + x];

    const segA = [], segB = [], link = new Map();
    const hid = (x, y) => (y * W + x) * 2, vid = (x, y) => (y * W + x) * 2 + 1;
    const addLink = (e, i) => { const l = link.get(e); if (l) l.push(i); else link.set(e, [i]); };
    const addSeg = (e1, e2) => { const i = segA.length; segA.push(e1); segB.push(e2); addLink(e1, i); addLink(e2, i); };

    for (let y = 0; y < H - 1; y++) {
      for (let x = 0; x < W - 1; x++) {
        const tl = f[y * W + x], tr = f[y * W + x + 1], br = f[(y + 1) * W + x + 1], bl = f[(y + 1) * W + x];
        const idx = (tl < t ? 8 : 0) | (tr < t ? 4 : 0) | (br < t ? 2 : 0) | (bl < t ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const e = { T: hid(x, y), B: hid(x, y + 1), L: vid(x, y), R: vid(x + 1, y) };
        let segs = CASES[idx];
        if (!segs) {
          const centerInside = (tl + tr + br + bl) / 4 < t;
          if (idx === 5) segs = centerInside ? [['T', 'L'], ['B', 'R']] : [['L', 'B'], ['T', 'R']];
          else segs = centerInside ? [['T', 'R'], ['L', 'B']] : [['T', 'L'], ['B', 'R']];
        }
        for (const [a, b] of segs) addSeg(e[a], e[b]);
      }
    }

    const edgePoint = (id) => {
      const idx = id >> 1, x = idx % W, y = (idx - x) / W;
      const va = f[y * W + x];
      const vb = id & 1 ? f[(y + 1) * W + x] : f[y * W + x + 1];
      const s = vb === va ? 0.5 : (t - va) / (vb - va);
      return id & 1 ? [x - 1, y - 1 + s] : [x - 1 + s, y - 1];
    };

    const used = new Uint8Array(segA.length);
    const loops = [];
    for (let i = 0; i < segA.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      let seg = i, edge = segB[i];
      const ids = [segA[i]];
      for (;;) {
        ids.push(edge);
        const l = link.get(edge);
        const nxt = l[0] === seg ? l[1] : l[0];
        if (nxt === undefined || used[nxt]) break;
        used[nxt] = 1;
        seg = nxt;
        edge = segA[nxt] === edge ? segB[nxt] : segA[nxt];
      }
      ids.pop(); // el último repite el primero
      if (ids.length >= 3) loops.push(ids.map(edgePoint));
    }
    return loops;
  }

  function polyArea(p) {
    let a = 0;
    for (let i = 0, n = p.length; i < n; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n];
      a += x1 * y2 - x2 * y1;
    }
    return a / 2;
  }

  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function dpOpen(pts, eps) {
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [s, e] = stack.pop();
      let md = 0, mi = -1;
      for (let i = s + 1; i < e; i++) {
        const d = distSeg(pts[i], pts[s], pts[e]);
        if (d > md) { md = d; mi = i; }
      }
      if (md > eps) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
    }
    return pts.filter((_, i) => keep[i]);
  }

  /** Douglas-Peucker sobre un polígono cerrado. */
  function simplifyClosed(pts, eps) {
    if (eps <= 0 || pts.length < 4) return pts;
    let far = 0, fd = -1;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
      if (d > fd) { fd = d; far = i; }
    }
    const a = dpOpen(pts.slice(0, far + 1), eps);
    const b = dpOpen(pts.slice(far).concat([pts[0]]), eps);
    return a.slice(0, -1).concat(b.slice(0, -1));
  }

  /**
   * opts: { threshold (0-255 | null=auto), invert, blur (px), tolerance (px), minArea (px²) }
   * Devuelve { loops, threshold, width, height }
   */
  function vectorize(rgba, w, h, opts) {
    const o = Object.assign({ threshold: null, invert: false, blur: 1, tolerance: 0.8, minArea: 16 }, opts);
    const gray = toGray(rgba, w, h, o.invert);
    const field = boxBlur(gray, w, h, Math.round(o.blur));
    const threshold = o.threshold == null ? otsu(field) : o.threshold;
    const loops = [];
    for (const raw of traceContours(field, w, h, threshold)) {
      if (Math.abs(polyArea(raw)) < o.minArea) continue;
      const s = simplifyClosed(raw, o.tolerance);
      if (s.length >= 3) loops.push(s);
    }
    return { loops, threshold, width: w, height: h };
  }

  const api = { vectorize, traceContours, simplifyClosed, polyArea, otsu, toGray, boxBlur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Vectorize = api;
})(typeof self !== 'undefined' ? self : this);

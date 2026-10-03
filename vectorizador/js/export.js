/* Exportadores DXF (R12, ASCII) y SVG a partir de lazos en píxeles */
(function (root) {
  'use strict';

  const num = (n) => (Math.round(n * 1000) / 1000).toString();

  const cleanName = (n) => (n || 'VECTOR').replace(/[^A-Za-z0-9_$-]/g, '_').toUpperCase() || 'VECTOR';

  /** Índice ACI (AutoCAD) más cercano a un color RGB. */
  let aciTable = null;
  function aciOf(rgb) {
    if (!aciTable) {
      aciTable = [null, [255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255], [255, 0, 255], [255, 255, 255], [65, 65, 65], [128, 128, 128]];
      const hsv = (h, s, v) => { // h en grados
        const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); };
        return [f(5), f(3), f(1)];
      };
      const sv = [[1, 1], [0.5, 1], [1, 0.65], [0.5, 0.65], [1, 0.5], [0.5, 0.5], [1, 0.3], [0.5, 0.3], [1, 0.15], [0.5, 0.15]];
      for (let h = 0; h < 24; h++) for (const [s, v] of sv) aciTable.push(hsv(h * 15, s, v));
      for (const g of [51, 91, 132, 173, 214, 255]) aciTable.push([g, g, g]);
    }
    let best = 7, bd = Infinity;
    for (let i = 1; i < aciTable.length; i++) {
      const c = aciTable[i], d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  const hex = (rgb) => rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

  /** Una capa DXF por color: LAYERS = [{name, color:[r,g,b], loops}] */
  function toDXF(loops, height, scale, layer) {
    return toDXFLayers([{ name: layer, color: [255, 255, 255], loops }], height, scale);
  }

  /** scale: unidades de dibujo por píxel. Y se invierte (DXF crece hacia arriba). */
  function toDXFLayers(layers, height, scale) {
    layers = layers.map((l) => ({ name: cleanName(l.name), aci: aciOf(l.color), loops: l.loops }));
    const out = [];
    const g = (code, val) => out.push(String(code), String(val));
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 4); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1);
    g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
    g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'LAYER'); g(70, layers.length);
    for (const l of layers) { g(0, 'LAYER'); g(2, l.name); g(70, 0); g(62, l.aci); g(6, 'CONTINUOUS'); }
    g(0, 'ENDTAB');
    g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'ENTITIES');
    for (const { name: L, loops } of layers) for (const loop of loops) {
      g(0, 'POLYLINE'); g(8, L); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, 1);
      for (const [x, y] of loop) {
        g(0, 'VERTEX'); g(8, L); g(10, num(x * scale)); g(20, num((height - y) * scale)); g(30, 0);
      }
      g(0, 'SEQEND'); g(8, L);
    }
    g(0, 'ENDSEC'); g(0, 'EOF');
    return out.join('\n') + '\n';
  }

  /** SVG con unidades de dibujo (mm si scale = mm/px). */
  function toSVG(loops, width, height, scale, stroke) {
    const w = width * scale, h = height * scale;
    const d = loops.map((l) =>
      'M' + l.map(([x, y]) => num(x * scale) + ' ' + num(y * scale)).join('L') + 'Z').join('');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${num(w)}mm" height="${num(h)}mm" viewBox="0 0 ${num(w)} ${num(h)}">\n` +
      `<path d="${d}" fill="${stroke ? 'none' : '#000'}" fill-rule="evenodd"${stroke ? ` stroke="#000" stroke-width="${num(0.2)}"` : ''}/>\n</svg>\n`;
  }

  /** SVG con un grupo (y relleno) por color. */
  function toSVGLayers(layers, width, height, scale, units) {
    const w = width * scale, h = height * scale, u = units === false ? '' : 'mm';
    const body = layers.filter((l) => l.loops.length).map((l) => {
      const d = l.loops.map((lp) => 'M' + lp.map(([x, y]) => num(x * scale) + ' ' + num(y * scale)).join('L') + 'Z').join('');
      return `<path id="${cleanName(l.name)}" d="${d}" fill="#${hex(l.color)}" fill-rule="evenodd"/>`;
    }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${num(w)}${u}" height="${num(h)}${u}" viewBox="0 0 ${num(w)} ${num(h)}">\n${body}\n</svg>\n`;
  }

  const api = { toDXF, toDXFLayers, toSVG, toSVGLayers, aciOf, hex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VectorExport = api;
})(typeof self !== 'undefined' ? self : this);

/* Exportadores DXF (R12, ASCII) y SVG a partir de lazos en píxeles */
(function (root) {
  'use strict';

  const num = (n) => (Math.round(n * 1000) / 1000).toString();

  /** scale: unidades de dibujo por píxel. Y se invierte (DXF crece hacia arriba). */
  function toDXF(loops, height, scale, layer) {
    const L = (layer || 'VECTOR').replace(/[^A-Za-z0-9_$-]/g, '_').toUpperCase() || 'VECTOR';
    const out = [];
    const g = (code, val) => out.push(String(code), String(val));
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 4); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1);
    g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
    g(0, 'ENDTAB');
    g(0, 'TABLE'); g(2, 'LAYER'); g(70, 1);
    g(0, 'LAYER'); g(2, L); g(70, 0); g(62, 7); g(6, 'CONTINUOUS');
    g(0, 'ENDTAB');
    g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'ENTITIES');
    for (const loop of loops) {
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

  const api = { toDXF, toSVG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VectorExport = api;
})(typeof self !== 'undefined' ? self : this);

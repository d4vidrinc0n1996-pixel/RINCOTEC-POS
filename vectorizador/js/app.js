/* Interfaz del vectorizador */
(function () {
  'use strict';
  const MAX_DIM = 1000; // lado máximo al procesar
  const $ = (id) => document.getElementById(id);
  const orig = $('orig'), octx = orig.getContext('2d', { willReadFrequently: true });
  let imageData = null, result = null, baseName = 'vector', timer = null;

  const ctl = { colors: $('colors'), ignoreBg: $('ignoreBg'), mode: $('mode'), auto: $('auto'), thr: $('thr'), invert: $('invert'), blur: $('blur'), tol: $('tol'), minArea: $('minArea') };
  const units = { colors: '', blur: ' px', tol: ' px', minArea: ' px²' };

  function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    baseName = file.name.replace(/\.[^.]+$/, '') || 'vector';
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      orig.width = Math.max(1, Math.round(img.width * k));
      orig.height = Math.max(1, Math.round(img.height * k));
      octx.fillStyle = '#fff';
      octx.fillRect(0, 0, orig.width, orig.height);
      octx.drawImage(img, 0, 0, orig.width, orig.height);
      imageData = octx.getImageData(0, 0, orig.width, orig.height);
      URL.revokeObjectURL(img.src);
      run();
    };
    img.onerror = () => { $('stats').textContent = 'No se pudo leer la imagen.'; };
    img.src = URL.createObjectURL(file);
  }

  function layerName(l, i) { return 'COLOR_' + (i + 1) + '_' + VectorExport.hex(l.color); }

  function run() {
    if (!imageData) return;
    const w = imageData.width, h = imageData.height;
    const common = { blur: +ctl.blur.value, tolerance: +ctl.tol.value, minArea: +ctl.minArea.value };
    const color = ctl.mode.value === 'color';
    $('layerLbl').hidden = color; $('bwOpts').hidden = color; $('colorOpts').hidden = !color;
    if (color) {
      const r = Vectorize.vectorizeColors(imageData.data, w, h,
        Object.assign({ colors: +ctl.colors.value, ignoreBg: ctl.ignoreBg.checked }, common));
      result = { width: w, height: h, layers: r.layers.map((l, i) => Object.assign(l, { name: layerName(l, i) })) };
      $('swatches').innerHTML = result.layers.map((l) =>
        `<li><i style="background:#${VectorExport.hex(l.color)}"></i><code>${l.name}</code>` +
        `<span>${l.isBg && ctl.ignoreBg ? 'fondo (omitido)' : l.loops.length + ' contornos'}</span></li>`).join('');
    } else {
      const r = Vectorize.vectorize(imageData.data, w, h, Object.assign({
        threshold: ctl.auto.checked ? null : +ctl.thr.value, invert: ctl.invert.checked }, common));
      if (ctl.auto.checked) ctl.thr.value = r.threshold;
      $('thrOut').textContent = '(' + r.threshold + ')';
      result = { width: w, height: h, layers: [{ name: $('layer').value, color: [0, 0, 0], loops: r.loops }] };
    }
    // Vista previa: capas apiladas, del color más frecuente al menos frecuente
    $('vec').innerHTML = VectorExport.toSVGLayers(result.layers, w, h, 1, false)
      .replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg /, '<svg style="background:#fff" ');
    const any = result.layers.some((l) => l.loops.length);
    $('dxf').disabled = $('svg').disabled = !any;
    updateStats();
  }

  function mmScale() { return Math.max(1, +$('widthMm').value || 100) / result.width; }

  function updateStats() {
    if (!result) return;
    const all = result.layers.flatMap((l) => l.loops);
    const verts = all.reduce((n, l) => n + l.length, 0);
    const wmm = result.width * mmScale(), hmm = result.height * mmScale();
    $('stats').textContent = all.length
      ? `${all.length} contornos · ${verts} vértices · ${result.layers.filter((l) => l.loops.length).length} capa(s) · ${wmm.toFixed(1)} × ${hmm.toFixed(1)} mm`
      : 'No se encontraron contornos: ajusta el umbral o usa "Invertir".';
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(run, 120); }

  Object.keys(ctl).forEach((k) => ctl[k].addEventListener('input', () => {
    if (k === 'auto') ctl.thr.disabled = ctl.auto.checked;
    const out = ctl[k].parentElement.querySelector('output:not(#thrOut)');
    if (out && k in units) out.textContent = ctl[k].value + units[k];
    schedule();
  }));
  Object.keys(units).forEach((k) => { ctl[k].parentElement.querySelector('output').textContent = ctl[k].value + units[k]; });
  $('widthMm').addEventListener('input', updateStats);

  $('layer').addEventListener('input', () => { if (ctl.mode.value === 'bw') schedule(); });
  $('dxf').onclick = () => download(baseName + '.dxf',
    VectorExport.toDXFLayers(result.layers.filter((l) => l.loops.length), result.height, mmScale()), 'application/dxf');
  $('svg').onclick = () => download(baseName + '.svg',
    VectorExport.toSVGLayers(result.layers, result.width, result.height, mmScale()), 'image/svg+xml');

  const drop = $('drop');
  $('file').addEventListener('change', (e) => loadImage(e.target.files[0]));
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => loadImage(e.dataTransfer.files[0]));
  document.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) loadImage(f);
  });
})();

/* Interfaz del vectorizador */
(function () {
  'use strict';
  const MAX_DIM = 1000; // lado máximo al procesar
  const $ = (id) => document.getElementById(id);
  const orig = $('orig'), octx = orig.getContext('2d', { willReadFrequently: true });
  let imageData = null, result = null, baseName = 'vector', timer = null;

  const ctl = { auto: $('auto'), thr: $('thr'), invert: $('invert'), blur: $('blur'), tol: $('tol'), minArea: $('minArea') };
  const units = { blur: ' px', tol: ' px', minArea: ' px²' };

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

  function run() {
    if (!imageData) return;
    result = Vectorize.vectorize(imageData.data, imageData.width, imageData.height, {
      threshold: ctl.auto.checked ? null : +ctl.thr.value,
      invert: ctl.invert.checked,
      blur: +ctl.blur.value,
      tolerance: +ctl.tol.value,
      minArea: +ctl.minArea.value,
    });
    if (ctl.auto.checked) ctl.thr.value = result.threshold;
    $('thrOut').textContent = '(' + result.threshold + ')';
    const w = result.width, h = result.height;
    $('vec').innerHTML = VectorExport.toSVG(result.loops, w, h, 1, false)
      .replace(/^<\?xml[^>]*>\s*/, '')
      .replace(/ width="[^"]*mm" height="[^"]*mm"/, '')
      .replace(/<svg /, '<svg style="background:#fff" ');
    $('dxf').disabled = $('svg').disabled = !result.loops.length;
    updateStats();
  }

  function mmScale() { return Math.max(1, +$('widthMm').value || 100) / result.width; }

  function updateStats() {
    if (!result) return;
    const verts = result.loops.reduce((n, l) => n + l.length, 0);
    const wmm = result.width * mmScale(), hmm = result.height * mmScale();
    $('stats').textContent = result.loops.length
      ? `${result.loops.length} contornos · ${verts} vértices · ${wmm.toFixed(1)} × ${hmm.toFixed(1)} mm`
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
    if (out && units[k]) out.textContent = ctl[k].value + units[k];
    schedule();
  }));
  Object.keys(units).forEach((k) => { ctl[k].parentElement.querySelector('output').textContent = ctl[k].value + units[k]; });
  $('widthMm').addEventListener('input', updateStats);

  $('dxf').onclick = () => download(baseName + '.dxf',
    VectorExport.toDXF(result.loops, result.height, mmScale(), $('layer').value), 'application/dxf');
  $('svg').onclick = () => download(baseName + '.svg',
    VectorExport.toSVG(result.loops, result.width, result.height, mmScale(), false), 'image/svg+xml');

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

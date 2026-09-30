/**
 * Interfaz de la app de patrones de mostacillas.
 */
(function (M) {
    const C = M.Color, P = M.Pattern, R = M.Render;
    const $ = id => document.getElementById(id);
    const fmt = new Intl.NumberFormat('es-CO');
    const fmt1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    const state = {
        image: null,          // imagen fuente (HTMLImageElement)
        imageData: null,      // copia reducida en dataURL (para guardar el proyecto)
        pattern: null,
        materials: null,
        steps: [],
        zoom: 8,              // píxeles por milímetro
        brush: false,
        brushColor: 0,
        highlightColor: null, // índice de color resaltado en el patrón
        activeStep: null,
        done: new Set(),
        undo: [],
        catalogEnabled: M.CATALOG.map(() => true)
    };

    // ---------- Configuración inicial de controles ----------
    function initControls() {
        const beadSel = $('beadType');
        Object.entries(M.BEAD_TYPES).forEach(([k, b]) => beadSel.add(new Option(b.name, k)));
        const stitchSel = $('stitch');
        Object.entries(M.STITCHES).forEach(([k, s]) => stitchSel.add(new Option(s.name, k)));
        $('stitchHint').textContent = M.STITCHES[stitchSel.value].description;

        const grid = $('catalogGrid');
        M.CATALOG.forEach((c, i) => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" checked data-i="${i}"><span class="sw" style="background:${c.hex}"></span>${c.name}`;
            grid.appendChild(label);
        });
        updateCatalogCount();
        updateOutputs();
    }

    function updateCatalogCount() {
        $('catalogCount').textContent = state.catalogEnabled.filter(Boolean).length + ' de ' + M.CATALOG.length;
    }

    function updateOutputs() {
        $('numColorsOut').textContent = $('numColors').value;
        ['brightness', 'contrast', 'saturation', 'waste'].forEach(id => {
            $(id + 'Out').textContent = $(id).value + ' %';
        });
        $('catalogBox').hidden = paletteMode() !== 'catalog';
    }

    function paletteMode() {
        return document.querySelector('input[name="paletteMode"]:checked').value;
    }

    function readSettings() {
        return {
            bead: $('beadType').value,
            stitch: $('stitch').value,
            cols: clampInt($('cols').value, 4, 400),
            rows: clampInt($('rows').value, 4, 600),
            numColors: +$('numColors').value,
            paletteMode: paletteMode(),
            catalogEnabled: state.catalogEnabled.slice(),
            dither: $('dither').checked,
            despeckle: $('despeckle').checked,
            background: $('background').value,
            brightness: +$('brightness').value,
            contrast: +$('contrast').value,
            saturation: +$('saturation').value
        };
    }

    function purchaseOptions() {
        return {
            waste: +$('waste').value,
            packGrams: Math.max(0, parseFloat($('packGrams').value) || 0),
            packPrice: Math.max(0, parseFloat($('packPrice').value) || 0)
        };
    }

    function clampInt(v, min, max) {
        const n = Math.round(Number(v));
        return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
    }

    /** Muestra el tamaño físico estimado antes de generar. */
    function updateSizeReadout() {
        const s = readSettings();
        const stitch = M.STITCHES[s.stitch];
        const cols = stitch.offset === 'col' && s.cols % 2 ? s.cols + 1 : s.cols;
        const cell = P.cellSize(s.bead, s.stitch);
        const w = cols * cell.w + (stitch.offset === 'row' ? cell.w / 2 : 0);
        const h = s.rows * cell.h + (stitch.offset === 'col' ? cell.h / 2 : 0);
        $('sizeReadout').innerHTML = `Tamaño final aprox.: <b>${fmt1.format(w / 10)} × ${fmt1.format(h / 10)} cm</b> · ` +
            `${fmt.format(cols * s.rows)} mostacillas` +
            (cols !== s.cols ? '<br><small>El peyote par usa un ancho par: ' + cols + ' columnas.</small>' : '');
    }

    function syncRatio(changed) {
        if (!$('keepRatio').checked || !state.image) return;
        const s = readSettings();
        const w = state.image.naturalWidth || state.image.width;
        const h = state.image.naturalHeight || state.image.height;
        if (changed === 'rows') $('cols').value = Math.min(400, P.autoCols(s.rows, w, h, s.bead, s.stitch));
        else $('rows').value = Math.min(600, P.autoRows(s.cols, w, h, s.bead, s.stitch));
    }

    // ---------- Carga de imágenes ----------
    function loadImageFromUrl(src, name) {
        const img = new Image();
        img.onload = () => {
            state.image = img;
            state.imageData = downscaledDataUrl(img, 800);
            $('thumb').src = src;
            $('thumb').hidden = false;
            $('thumb').alt = name || 'Imagen cargada';
            $('dropText').hidden = true;
            syncRatio('cols');
            updateSizeReadout();
            generate();
        };
        img.onerror = () => alert('No se pudo abrir la imagen. Prueba con un archivo JPG o PNG.');
        img.src = src;
    }

    function loadImageFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => loadImageFromUrl(reader.result, file.name);
        reader.readAsDataURL(file);
    }

    function downscaledDataUrl(img, max) {
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        const k = Math.min(1, max / Math.max(w, h));
        const c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/png');
    }

    /** Imagen de ejemplo dibujada en el navegador (sin archivos externos). */
    function demoImage() {
        const c = document.createElement('canvas');
        c.width = 320; c.height = 320;
        const g = c.getContext('2d');
        const sky = g.createLinearGradient(0, 0, 0, 320);
        sky.addColorStop(0, '#2f7fd1'); sky.addColorStop(1, '#bfe6ff');
        g.fillStyle = sky; g.fillRect(0, 0, 320, 320);
        g.fillStyle = '#ffd21f';
        g.beginPath(); g.arc(250, 70, 36, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2f9e44';
        g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(90, 190, 180, 245); g.quadraticCurveTo(250, 290, 320, 230); g.lineTo(320, 320); g.lineTo(0, 320); g.fill();
        g.strokeStyle = '#1b6b2d'; g.lineWidth = 8;
        g.beginPath(); g.moveTo(120, 280); g.quadraticCurveTo(115, 220, 125, 170); g.stroke();
        g.fillStyle = '#1b6b2d';
        g.beginPath(); g.ellipse(100, 230, 22, 9, -0.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8337c';
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            g.beginPath(); g.ellipse(125 + Math.cos(a) * 30, 140 + Math.sin(a) * 30, 24, 14, a, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(125, 140, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f08c00';
        g.beginPath(); g.arc(125, 140, 11, 0, Math.PI * 2); g.fill();
        return c.toDataURL('image/png');
    }

    // ---------- Generación ----------
    function generate() {
        if (!state.image) return;
        const hadEdits = state.undo.length > 0;
        state.pattern = P.generate(state.image, readSettings());
        state.undo = [];
        state.brushColor = 0;
        state.highlightColor = null;
        state.activeStep = null;
        afterPatternChange(true);
        fitZoom();
        renderCanvas();
        if (hadEdits) setStatus('Se regeneró el patrón: los retoques con el pincel se descartaron.');
    }

    /** Recalcula cantidades, instrucciones y vistas tras cualquier cambio. */
    function afterPatternChange(resetProgress) {
        const p = state.pattern;
        state.materials = P.materials(p, purchaseOptions());
        state.steps = P.instructions(p);
        if (resetProgress) loadProgress();
        $('emptyState').hidden = true;
        $('results').hidden = false;
        ['btnSaveProject', 'btnExportPng', 'btnExportCsv', 'btnPrint'].forEach(id => { $(id).disabled = false; });
        $('btnUndo').disabled = state.undo.length === 0;
        renderStats();
        renderPaletteStrip();
        renderColorTable();
        renderTools();
        renderSteps();
    }

    // ---------- Vistas ----------
    function renderStats() {
        const m = state.materials, p = state.pattern, opts = purchaseOptions();
        const cards = [
            ['Tamaño final', `${fmt1.format(m.widthMm / 10)} × ${fmt1.format(m.heightMm / 10)} cm`, m.stitch.name],
            ['Mostacillas', fmt.format(m.total), `${p.cols} de ancho × ${p.rows} de alto`],
            ['Colores', p.palette.length, m.bead.name],
            ['Peso a comprar', `${fmt1.format(m.totals.grams)} g`, `${fmt.format(m.totals.withWaste)} mostacillas con ${opts.waste} % de reserva`],
            opts.packPrice > 0
                ? ['Costo estimado', '$ ' + fmt.format(Math.round(m.totals.cost)), `${m.totals.packs} paquetes de ${opts.packGrams} g`]
                : ['Hilo aprox.', `${Math.ceil(m.threadM)} m`, `${m.totals.packs} paquetes de ${opts.packGrams} g`]
        ];
        $('stats').innerHTML = cards.map(([l, v, s]) =>
            `<div class="stat"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${escapeHtml(String(s))}</div></div>`
        ).join('');
    }

    function swatchStyle(rgb) {
        return `background:${C.rgbToHex(rgb)};color:${C.isDark(rgb) ? '#fff' : '#111'}`;
    }

    function colorLabel(i) {
        const p = state.pattern.palette[i];
        return p.name || '≈ ' + P.nearestCatalogName(p.rgb);
    }

    function renderPaletteStrip() {
        const counts = state.materials.colors;
        $('paletteStrip').innerHTML = state.pattern.palette.map((p, i) =>
            `<button type="button" class="chip${i === state.brushColor ? ' selected' : ''}" data-i="${i}" title="Seleccionar para el pincel y resaltar">` +
            `<span class="sw" style="${swatchStyle(p.rgb)}">${p.symbol}</span>` +
            `${escapeHtml(colorLabel(i))} · ${fmt.format(counts[i].count)}</button>`
        ).join('');
    }

    function renderColorTable() {
        const m = state.materials, opts = purchaseOptions();
        const tbody = $('colorTable').querySelector('tbody');
        tbody.innerHTML = state.pattern.palette.map((p, i) => {
            const c = m.colors[i];
            return `<tr>
                <td><div class="swatch-cell"><span class="symbol" style="${swatchStyle(p.rgb)}">${p.symbol}</span>
                    <input type="color" value="${C.rgbToHex(p.rgb)}" data-i="${i}" aria-label="Cambiar tono del color ${p.symbol}"></div></td>
                <td><input type="text" value="${escapeHtml(p.name || '')}" placeholder="${escapeHtml(colorLabel(i))}" data-i="${i}" aria-label="Nombre o código del color ${p.symbol}"></td>
                <td class="num">${fmt.format(c.count)}</td>
                <td class="num">${fmt.format(c.withWaste)}</td>
                <td class="num">${fmt1.format(c.grams)}</td>
                <td class="num">${c.packs}</td>
                <td class="num">${opts.packPrice > 0 ? '$ ' + fmt.format(Math.round(c.cost)) : '—'}</td>
            </tr>`;
        }).join('');
        $('colorTable').querySelector('tfoot').innerHTML = `<tr>
            <td colspan="2">Total</td>
            <td class="num">${fmt.format(m.total)}</td>
            <td class="num">${fmt.format(m.totals.withWaste)}</td>
            <td class="num">${fmt1.format(m.totals.grams)}</td>
            <td class="num">${m.totals.packs}</td>
            <td class="num">${opts.packPrice > 0 ? '$ ' + fmt.format(Math.round(m.totals.cost)) : '—'}</td>
        </tr>`;
    }

    function renderTools() {
        $('toolsList').innerHTML = state.materials.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    }

    const STEP_HINTS = {
        telar: 'En cada fila ensarta todas las mostacillas en el orden indicado (izquierda → derecha), pásalas por debajo de la urdimbre y regresa por encima. Empieza por la fila 1 (arriba).',
        cuadrado: 'Cada fila se teje en sentido contrario a la anterior (→ / ←), uniendo cada mostacilla con la de la fila de arriba.',
        peyote: 'Ensarta juntas las filas 1 y 2. Después, cada fila agrega una mostacilla sí y otra no, cambiando de sentido en cada fila. Las filas del peyote avanzan medio bloque.',
        ladrillo: 'Cada mostacilla se engancha al hilo entre dos mostacillas de la fila anterior. Alterna el sentido en cada fila.'
    };

    function renderSteps() {
        $('stepsHint').textContent = STEP_HINTS[state.pattern.settings.stitch];
        const html = state.steps.map((s, i) => {
            const runs = s.runs.map(r =>
                `<span class="run"><span class="sw" style="${swatchStyle(state.pattern.palette[r.color].rgb)}">${state.pattern.palette[r.color].symbol}</span>×${r.n}</span>`
            ).join('');
            const cls = [state.done.has(i) ? 'done' : '', state.activeStep === i ? 'active' : ''].join(' ');
            return `<li class="${cls}" data-i="${i}">
                <input type="checkbox" ${state.done.has(i) ? 'checked' : ''} aria-label="Marcar ${s.label} como terminada">
                <span class="step-label">${s.label} <small>${s.dir} ${s.cells.length}</small></span>
                <span class="runs">${runs}</span>
                <button type="button" class="icon-btn" data-show="${i}" title="Ver en el patrón"><i class="fa-solid fa-eye"></i></button>
            </li>`;
        }).join('');
        $('stepsList').innerHTML = html;
        updateProgress();
    }

    function updateProgress() {
        const pct = state.steps.length ? Math.round(state.done.size / state.steps.length * 100) : 0;
        $('progressBar').style.width = pct + '%';
        $('progressText').textContent = `${state.done.size} / ${state.steps.length} (${pct} %)`;
    }

    // ---------- Canvas ----------
    let layout = null, rafPending = false;

    function viewOptions() {
        const highlightCells = state.activeStep != null && state.steps[state.activeStep]
            ? new Set(state.steps[state.activeStep].cells.map(([r, c]) => r + ',' + c)) : null;
        const doneCells = new Set();
        state.done.forEach(i => state.steps[i] && state.steps[i].cells.forEach(([r, c]) => doneCells.add(r + ',' + c)));
        return {
            zoom: state.zoom,
            view: document.querySelector('input[name="view"]:checked').value,
            showSymbols: $('showSymbols').checked,
            showGrid: $('showGrid').checked,
            showNumbers: $('showNumbers').checked,
            highlightCells,
            highlightColor: state.highlightColor,
            doneCells
        };
    }

    function renderCanvas() {
        if (!state.pattern) return;
        layout = R.draw($('patternCanvas'), state.pattern, viewOptions());
        $('zoomValue').textContent = Math.round(state.zoom / 8 * 100) + ' %';
    }

    function scheduleCanvas() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => { rafPending = false; renderCanvas(); });
    }

    /** Limita el zoom para que el canvas no supere el tamaño que el navegador soporta. */
    function clampZoom(z) {
        const p = state.pattern;
        const cell = P.cellSize(p.settings.bead, p.settings.stitch);
        const maxSide = 12000;
        const maxZ = Math.min(maxSide / ((p.cols + 1) * cell.w), maxSide / ((p.rows + 1) * cell.h));
        return Math.max(1, Math.min(40, maxZ, z));
    }

    function fitZoom() {
        const p = state.pattern;
        const cell = P.cellSize(p.settings.bead, p.settings.stitch);
        const wrap = $('canvasWrap');
        const availW = (wrap.clientWidth || 800) - 80;
        const availH = Math.max(300, window.innerHeight * 0.7) - 80;
        const z = Math.min(availW / ((p.cols + 0.5) * cell.w), availH / ((p.rows + 0.5) * cell.h));
        // Si el patrón es muy alto, prioriza el ancho para que los símbolos se lean
        state.zoom = clampZoom(Math.max(z, Math.min(availW / ((p.cols + 0.5) * cell.w), 6)));
    }

    function canvasCell(ev) {
        const canvas = $('patternCanvas');
        const rect = canvas.getBoundingClientRect();
        const x = (ev.clientX - rect.left) * canvas.width / rect.width;
        const y = (ev.clientY - rect.top) * canvas.height / rect.height;
        return layout ? R.hitTest(state.pattern, layout, x, y) : null;
    }

    let painting = false;

    function paintAt(cell) {
        if (!cell) return;
        const i = cell.r * state.pattern.cols + cell.c;
        if (state.pattern.grid[i] === state.brushColor) return;
        state.pattern.grid[i] = state.brushColor;
        scheduleCanvas();
    }

    function describeCell(cell) {
        const p = state.pattern;
        const idx = p.grid[cell.r * p.cols + cell.c];
        const step = state.steps.findIndex(s => s.cells.some(([r, c]) => r === cell.r && c === cell.c));
        return `Fila ${cell.r + 1}, columna ${cell.c + 1} · Color ${p.palette[idx].symbol} (${colorLabel(idx)})` +
            (p.settings.stitch === 'peyote' && step >= 0 ? ` · se teje en ${state.steps[step].label.toLowerCase()}` : '');
    }

    function setStatus(text) {
        $('status').textContent = text;
    }

    // ---------- Progreso guardado en el navegador ----------
    function progressKey() {
        const p = state.pattern;
        let h = 2166136261;
        const feed = v => { h ^= v; h = Math.imul(h, 16777619); };
        feed(p.cols); feed(p.rows); p.settings.stitch.split('').forEach(ch => feed(ch.charCodeAt(0)));
        p.grid.forEach(feed);
        return 'mostacillas-progreso-' + (h >>> 0).toString(36);
    }

    function loadProgress() {
        state.done = new Set();
        try {
            const saved = JSON.parse(localStorage.getItem(progressKey()) || '[]');
            saved.forEach(i => { if (i < state.steps.length) state.done.add(i); });
        } catch (e) { /* almacenamiento no disponible */ }
    }

    function saveProgress() {
        try {
            localStorage.setItem(progressKey(), JSON.stringify([...state.done]));
        } catch (e) { /* almacenamiento no disponible */ }
    }

    // ---------- Exportar ----------
    function download(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    function exportOptions() {
        return Object.assign(viewOptions(), { view: 'chart', showSymbols: true, showGrid: true });
    }

    function exportPng() {
        R.exportCanvas(state.pattern, state.materials, exportOptions())
            .toBlob(b => download(b, 'patron-mostacillas.png'), 'image/png');
    }

    function exportCsv() {
        const p = state.pattern, m = state.materials;
        const dec = n => String(n).replace('.', ',');
        const q = v => '"' + String(v).replace(/"/g, '""') + '"';
        const lines = [
            ['Patrón de mostacillas'],
            ['Puntada', m.stitch.name], ['Mostacilla', m.bead.name],
            ['Tamaño (cm)', dec((m.widthMm / 10).toFixed(1)) + ' x ' + dec((m.heightMm / 10).toFixed(1))],
            ['Ancho x alto (mostacillas)', p.cols + ' x ' + p.rows],
            [],
            ['Símbolo', 'Color', 'Hex', 'En el patrón', 'Comprar', 'Gramos', 'Paquetes', 'Costo']
        ];
        p.palette.forEach((c, i) => {
            const x = m.colors[i];
            lines.push([c.symbol, colorLabel(i), C.rgbToHex(c.rgb), x.count, x.withWaste, dec(x.grams.toFixed(1)), x.packs, Math.round(x.cost)]);
        });
        lines.push(['', 'Total', '', m.total, m.totals.withWaste, dec(m.totals.grams.toFixed(1)), m.totals.packs, Math.round(m.totals.cost)]);
        lines.push([], ['Materiales']);
        m.tools.forEach(t => lines.push([t]));
        lines.push([], ['Paso', 'Sentido', 'Secuencia']);
        state.steps.forEach(s => lines.push([s.label, s.dir === '→' ? 'izq. a der.' : 'der. a izq.',
            s.runs.map(r => r.n + ' ' + p.palette[r.color].symbol).join(', ')]));
        const csv = '﻿' + lines.map(l => l.map(q).join(';')).join('\r\n');
        download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'patron-mostacillas.csv');
    }

    function buildPrintArea() {
        const p = state.pattern, m = state.materials;
        const chart = document.createElement('canvas');
        const cell = m.cell;
        const zoom = Math.max(3, Math.min(10, 700 / ((p.cols + 4) * cell.w)));
        R.draw(chart, p, Object.assign(exportOptions(), { zoom, showNumbers: true, highlightCells: null, highlightColor: null, doneCells: null }));
        const sw = i => `<span class="sw" style="${swatchStyle(p.palette[i].rgb)}">${p.palette[i].symbol}</span>`;
        $('printArea').innerHTML = `
            <h1>Patrón de mostacillas</h1>
            <p>${m.stitch.name} · ${m.bead.name} · ${p.cols} × ${p.rows} mostacillas ·
               ${fmt1.format(m.widthMm / 10)} × ${fmt1.format(m.heightMm / 10)} cm · ${fmt.format(m.total)} mostacillas</p>
            <img src="${chart.toDataURL('image/png')}" alt="Patrón">
            <h2>Mostacillas por color</h2>
            <table><thead><tr><th>Color</th><th>Nombre / código</th><th class="num">En el patrón</th><th class="num">Comprar</th><th class="num">Gramos</th><th class="num">Paquetes</th></tr></thead>
            <tbody>${p.palette.map((c, i) => `<tr><td>${sw(i)}</td><td>${escapeHtml(colorLabel(i))}</td><td class="num">${fmt.format(m.colors[i].count)}</td>
                <td class="num">${fmt.format(m.colors[i].withWaste)}</td><td class="num">${fmt1.format(m.colors[i].grams)}</td><td class="num">${m.colors[i].packs}</td></tr>`).join('')}</tbody></table>
            <h2>Materiales</h2>
            <ul>${m.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
            <h2 class="page-break">Paso a paso</h2>
            <p>${STEP_HINTS[p.settings.stitch]}</p>
            <ol class="steps-print">${state.steps.map(s => `<li><b>${s.label} ${s.dir}</b>: ${s.runs.map(r => r.n + ' ' + sw(r.color)).join(', ')}</li>`).join('')}</ol>`;
    }

    function saveProject() {
        const p = state.pattern;
        const data = {
            app: 'mostacillas', version: 1,
            settings: p.settings,
            purchase: purchaseOptions(),
            cols: p.cols, rows: p.rows,
            grid: Array.from(p.grid),
            palette: p.palette.map(c => ({ rgb: c.rgb, name: c.name, symbol: c.symbol })),
            done: [...state.done],
            image: state.imageData
        };
        download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'proyecto-mostacillas.json');
    }

    function openProject(file) {
        const reader = new FileReader();
        reader.onload = () => {
            let data;
            try {
                data = JSON.parse(reader.result);
                if (data.app !== 'mostacillas' || !Array.isArray(data.grid) || data.grid.length !== data.cols * data.rows) throw new Error();
            } catch (e) {
                alert('El archivo no es un proyecto de mostacillas válido.');
                return;
            }
            const s = data.settings;
            $('beadType').value = s.bead; $('stitch').value = s.stitch;
            $('stitchHint').textContent = M.STITCHES[s.stitch].description;
            $('cols').value = data.cols; $('rows').value = data.rows;
            $('numColors').value = s.numColors;
            document.querySelector(`input[name="paletteMode"][value="${s.paletteMode}"]`).checked = true;
            if (Array.isArray(s.catalogEnabled)) {
                state.catalogEnabled = M.CATALOG.map((_, i) => s.catalogEnabled[i] !== false);
                document.querySelectorAll('#catalogGrid input').forEach(el => { el.checked = state.catalogEnabled[+el.dataset.i]; });
                updateCatalogCount();
            }
            $('dither').checked = !!s.dither; $('despeckle').checked = !!s.despeckle;
            $('background').value = s.background || '#ffffff';
            ['brightness', 'contrast', 'saturation'].forEach(k => { $(k).value = s[k]; });
            if (data.purchase) {
                $('waste').value = data.purchase.waste; $('packGrams').value = data.purchase.packGrams; $('packPrice').value = data.purchase.packPrice;
            }
            updateOutputs();
            updateSizeReadout();

            state.pattern = {
                cols: data.cols, rows: data.rows,
                grid: Int32Array.from(data.grid),
                palette: data.palette.map((c, i) => ({ rgb: c.rgb, name: c.name || '', symbol: c.symbol || M.SYMBOLS[i % M.SYMBOLS.length] })),
                settings: Object.assign({}, s, { cols: data.cols, rows: data.rows })
            };
            state.undo = []; state.brushColor = 0; state.highlightColor = null; state.activeStep = null;
            afterPatternChange(true);
            if (Array.isArray(data.done)) {
                state.done = new Set(data.done.filter(i => i < state.steps.length));
                saveProgress();
                renderSteps();
            }
            fitZoom();
            renderCanvas();

            if (data.image) {
                const img = new Image();
                img.onload = () => {
                    state.image = img; state.imageData = data.image;
                    $('thumb').src = data.image; $('thumb').hidden = false; $('dropText').hidden = true;
                };
                img.src = data.image;
            }
        };
        reader.readAsText(file);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function pushUndo() {
        state.undo.push(Int32Array.from(state.pattern.grid));
        if (state.undo.length > 40) state.undo.shift();
    }

    function undo() {
        if (!state.undo.length) return;
        state.pattern.grid = state.undo.pop();
        afterPatternChange(false);
        renderCanvas();
    }

    function selectTab(id) {
        document.querySelectorAll('.tab').forEach(t => {
            const on = t.dataset.tab === id;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on);
        });
        document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = p.id !== id; });
        if (id === 'tabPattern') renderCanvas();
    }

    function scrollToStep(i) {
        const s = state.steps[i];
        if (!s || !layout) return;
        const [r, c] = s.cells[0];
        const { x, y } = R.cellRect(layout, r, c);
        const wrap = $('canvasWrap');
        const canvas = $('patternCanvas');
        const scale = canvas.getBoundingClientRect().width / canvas.width;
        wrap.scrollTop = Math.max(0, y * scale - wrap.clientHeight / 2);
        wrap.scrollLeft = Math.max(0, x * scale - wrap.clientWidth / 2);
    }

    // ---------- Eventos ----------
    let regenTimer = null;
    function regenerateSoon() {
        updateSizeReadout();
        clearTimeout(regenTimer);
        regenTimer = setTimeout(generate, 300);
    }

    function bindEvents() {
        const drop = $('dropzone');
        $('imageInput').addEventListener('change', e => loadImageFile(e.target.files[0]));
        drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('imageInput').click(); } });
        ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('dragover'); }));
        ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
        drop.addEventListener('drop', e => loadImageFile(e.dataTransfer.files[0]));
        window.addEventListener('paste', e => {
            const item = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/'));
            if (item) loadImageFile(item.getAsFile());
        });
        $('btnDemo').addEventListener('click', () => loadImageFromUrl(demoImage(), 'Imagen de ejemplo'));

        $('beadType').addEventListener('change', () => { syncRatio('cols'); regenerateSoon(); });
        $('stitch').addEventListener('change', () => {
            $('stitchHint').textContent = M.STITCHES[$('stitch').value].description;
            syncRatio('cols'); regenerateSoon();
        });
        $('cols').addEventListener('input', () => { syncRatio('cols'); regenerateSoon(); });
        $('rows').addEventListener('input', () => { syncRatio('rows'); regenerateSoon(); });
        $('keepRatio').addEventListener('change', () => { syncRatio('cols'); regenerateSoon(); });
        ['numColors', 'brightness', 'contrast', 'saturation'].forEach(id =>
            $(id).addEventListener('input', () => { updateOutputs(); regenerateSoon(); }));
        ['dither', 'despeckle', 'background'].forEach(id => $(id).addEventListener('change', regenerateSoon));
        document.querySelectorAll('input[name="paletteMode"]').forEach(el =>
            el.addEventListener('change', () => { updateOutputs(); regenerateSoon(); }));

        $('catalogGrid').addEventListener('change', e => {
            state.catalogEnabled[+e.target.dataset.i] = e.target.checked;
            updateCatalogCount(); regenerateSoon();
        });
        const setAll = v => {
            state.catalogEnabled = state.catalogEnabled.map(() => v);
            document.querySelectorAll('#catalogGrid input').forEach(el => { el.checked = v; });
            updateCatalogCount(); regenerateSoon();
        };
        $('catAll').addEventListener('click', () => setAll(true));
        $('catNone').addEventListener('click', () => setAll(false));

        // Compra: solo recalcula cantidades
        ['waste', 'packGrams', 'packPrice'].forEach(id => $(id).addEventListener('input', () => {
            updateOutputs();
            if (state.pattern) afterPatternChange(false);
        }));

        // Pestañas
        document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => selectTab(t.dataset.tab)));

        // Barra de herramientas
        document.querySelectorAll('input[name="view"]').forEach(el => el.addEventListener('change', renderCanvas));
        ['showSymbols', 'showGrid', 'showNumbers'].forEach(id => $(id).addEventListener('change', renderCanvas));
        $('zoomIn').addEventListener('click', () => { state.zoom = clampZoom(state.zoom * 1.25); renderCanvas(); });
        $('zoomOut').addEventListener('click', () => { state.zoom = clampZoom(state.zoom / 1.25); renderCanvas(); });
        $('zoomFit').addEventListener('click', () => { fitZoom(); renderCanvas(); });
        $('btnBrush').addEventListener('click', () => {
            state.brush = !state.brush;
            $('btnBrush').setAttribute('aria-pressed', state.brush);
            $('canvasWrap').classList.toggle('painting', state.brush);
            setStatus(state.brush ? 'Pincel activo: haz clic o arrastra sobre el patrón para pintar con el color seleccionado.' : 'Pincel desactivado.');
        });
        $('btnUndo').addEventListener('click', undo);
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
                e.preventDefault(); undo();
            }
        });

        $('paletteStrip').addEventListener('click', e => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            const i = +chip.dataset.i;
            // segundo clic sobre el mismo color quita el resaltado
            state.highlightColor = state.highlightColor === i ? null : i;
            state.brushColor = i;
            renderPaletteStrip();
            renderCanvas();
            setStatus(state.highlightColor != null
                ? `Color ${state.pattern.palette[i].symbol} (${colorLabel(i)}): ${fmt.format(state.materials.colors[i].count)} mostacillas resaltadas.`
                : 'Resaltado desactivado.');
        });

        // Canvas: ubicación, pincel
        const canvas = $('patternCanvas');
        canvas.addEventListener('pointermove', e => {
            if (!state.pattern) return;
            const cell = canvasCell(e);
            if (painting) paintAt(cell);
            if (cell) setStatus(describeCell(cell));
        });
        canvas.addEventListener('pointerdown', e => {
            if (!state.pattern || !state.brush) return;
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            pushUndo();
            painting = true;
            paintAt(canvasCell(e));
        });
        const endPaint = () => {
            if (!painting) return;
            painting = false;
            if (state.undo.length && state.undo[state.undo.length - 1].every((v, i) => v === state.pattern.grid[i])) state.undo.pop();
            afterPatternChange(false);
            renderCanvas();
        };
        canvas.addEventListener('pointerup', endPaint);
        canvas.addEventListener('pointercancel', endPaint);

        // Tabla de colores: nombre y tono
        $('colorTable').addEventListener('input', e => {
            const i = +e.target.dataset.i;
            if (Number.isNaN(i)) return;
            if (e.target.type === 'text') {
                state.pattern.palette[i].name = e.target.value.trim();
                renderPaletteStrip();
            } else if (e.target.type === 'color') {
                state.pattern.palette[i].rgb = C.hexToRgb(e.target.value);
                const sym = e.target.parentElement.querySelector('.symbol');
                sym.setAttribute('style', swatchStyle(state.pattern.palette[i].rgb));
                renderPaletteStrip();
                renderCanvas();
            }
        });
        $('colorTable').addEventListener('change', e => {
            if (e.target.type === 'color') renderSteps();
        });

        // Paso a paso
        $('stepsList').addEventListener('click', e => {
            const li = e.target.closest('li');
            if (!li) return;
            const i = +li.dataset.i;
            if (e.target.matches('input[type="checkbox"]')) {
                if (e.target.checked) state.done.add(i); else state.done.delete(i);
                li.classList.toggle('done', e.target.checked);
                saveProgress();
                updateProgress();
                if (e.target.checked && i + 1 < state.steps.length) setActiveStep(i + 1, false);
                return;
            }
            if (e.target.closest('[data-show]')) {
                setActiveStep(i, false);
                selectTab('tabPattern');
                scrollToStep(i);
            } else {
                setActiveStep(i, true);
            }
        });
        $('btnResetProgress').addEventListener('click', () => {
            if (!state.done.size || !confirm('¿Borrar el avance marcado?')) return;
            state.done.clear();
            saveProgress();
            renderSteps();
        });

        // Archivo / exportar
        $('btnSaveProject').addEventListener('click', saveProject);
        $('btnOpenProject').addEventListener('click', () => $('projectInput').click());
        $('projectInput').addEventListener('change', e => { if (e.target.files[0]) openProject(e.target.files[0]); e.target.value = ''; });
        $('btnExportPng').addEventListener('click', exportPng);
        $('btnExportCsv').addEventListener('click', exportCsv);
        $('btnPrint').addEventListener('click', () => { buildPrintArea(); window.print(); });
        window.addEventListener('beforeprint', () => { if (state.pattern) buildPrintArea(); });
    }

    function setActiveStep(i, toggle) {
        state.activeStep = toggle && state.activeStep === i ? null : i;
        document.querySelectorAll('#stepsList li').forEach(li => li.classList.toggle('active', +li.dataset.i === state.activeStep));
        const active = document.querySelector('#stepsList li.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
        renderCanvas();
    }

    initControls();
    bindEvents();
    updateSizeReadout();

    // Punto de acceso para pruebas y depuración
    M.app = { state, generate, loadImageFromUrl, demoImage };
})(window.Mostacillas);

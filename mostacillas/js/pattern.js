/**
 * Motor del patrón: convierte una imagen en una cuadrícula de mostacillas,
 * calcula cantidades, instrucciones fila por fila y lista de materiales.
 */
window.Mostacillas = window.Mostacillas || {};

(function (M) {
    const C = M.Color;
    const P = {};

    /** Tamaño físico (mm) de una celda según tipo de mostacilla y puntada. */
    P.cellSize = function (beadKey, stitchKey) {
        const bead = M.BEAD_TYPES[beadKey];
        const stitch = M.STITCHES[stitchKey];
        return stitch.holes === 'vertical'
            ? { w: bead.dia, h: bead.len }
            : { w: bead.len, h: bead.dia };
    };

    /** Alto en mostacillas que conserva la proporción de la imagen. */
    P.autoRows = function (cols, imgW, imgH, beadKey, stitchKey) {
        const cell = P.cellSize(beadKey, stitchKey);
        return Math.max(1, Math.round(cols * cell.w * (imgH / imgW) / cell.h));
    };

    P.autoCols = function (rows, imgW, imgH, beadKey, stitchKey) {
        const cell = P.cellSize(beadKey, stitchKey);
        return Math.max(1, Math.round(rows * cell.h * (imgW / imgH) / cell.w));
    };

    /** Ajusta la imagen (brillo, contraste, saturación) sobre un color rgb 0–255. */
    function adjust(rgb, s) {
        let [r, g, b] = rgb;
        const br = s.brightness / 100, ct = s.contrast / 100, sat = s.saturation / 100;
        r *= br; g *= br; b *= br;
        r = (r - 128) * ct + 128; g = (g - 128) * ct + 128; b = (b - 128) * ct + 128;
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
        return [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))));
    }

    /**
     * Muestrea la imagen: cada celda es el promedio (en luz lineal) de los
     * píxeles que cubre, respetando el desplazamiento de peyote y ladrillo.
     */
    P.sampleImage = function (img, cols, rows, stitchKey, settings) {
        const offset = M.STITCHES[stitchKey].offset;
        const S = Math.max(2, Math.min(8, Math.floor(2400 / Math.max(cols, rows))));
        const half = S / 2;
        const W = Math.round(cols * S + (offset === 'row' ? half : 0));
        const H = Math.round(rows * S + (offset === 'col' ? half : 0));

        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = settings.background || '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;

        const lin = C.LIN;
        const cellsRgb = new Array(cols * rows);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x0 = Math.floor(c * S + (offset === 'row' && r % 2 ? half : 0));
                const y0 = Math.floor(r * S + (offset === 'col' && c % 2 ? half : 0));
                let sr = 0, sg = 0, sb = 0, n = 0;
                for (let y = y0; y < y0 + S && y < H; y++) {
                    for (let x = x0; x < x0 + S && x < W; x++) {
                        const i = (y * W + x) * 4;
                        sr += lin[data[i]]; sg += lin[data[i + 1]]; sb += lin[data[i + 2]]; n++;
                    }
                }
                const rgb = [C.linearToSrgb(sr / n), C.linearToSrgb(sg / n), C.linearToSrgb(sb / n)];
                cellsRgb[r * cols + c] = adjust(rgb, settings);
            }
        }
        return cellsRgb;
    };

    /** Vecinos de una celda (4 o 6 según la geometría de la puntada). */
    P.neighbors = function (r, c, cols, rows, offset) {
        const list = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        if (offset === 'col') {
            // columnas impares van medio bloque más abajo
            const d = c % 2 ? 1 : -1;
            list.push([r + d, c - 1], [r + d, c + 1]);
        } else if (offset === 'row') {
            const d = r % 2 ? 1 : -1;
            list.push([r - 1, c + d], [r + 1, c + d]);
        }
        return list.filter(([rr, cc]) => rr >= 0 && rr < rows && cc >= 0 && cc < cols);
    };

    /** Reemplaza mostacillas aisladas por el color mayoritario de sus vecinos. */
    P.despeckle = function (grid, cols, rows, offset) {
        const out = Int32Array.from(grid);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const own = grid[r * cols + c];
                const nb = P.neighbors(r, c, cols, rows, offset).map(([rr, cc]) => grid[rr * cols + cc]);
                if (nb.length < 3 || nb.includes(own)) continue;
                const freq = new Map();
                nb.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
                let best = own, bestN = 0;
                freq.forEach((n, v) => { if (n > bestN) { bestN = n; best = v; } });
                out[r * cols + c] = best;
            }
        }
        return out;
    };

    /**
     * Genera el patrón completo.
     * @returns {{cols, rows, grid:Int32Array, palette:Array<{rgb,name}>, settings}}
     */
    P.generate = function (img, settings) {
        const stitch = M.STITCHES[settings.stitch];
        let cols = settings.cols, rows = settings.rows;
        if (stitch.offset === 'col' && cols % 2) cols++; // peyote par

        const cellsRgb = P.sampleImage(img, cols, rows, settings.stitch, settings);
        const cellsLab = cellsRgb.map(C.rgbToLab);

        let paletteLab = C.kmeans(cellsLab, settings.numColors);
        let names = paletteLab.map(() => '');

        if (settings.paletteMode === 'catalog') {
            const catalog = M.CATALOG.filter((_, i) => settings.catalogEnabled[i]);
            if (catalog.length) {
                const catLab = catalog.map(c => C.rgbToLab(C.hexToRgb(c.hex)));
                const chosen = [...new Set(paletteLab.map(p => C.nearestIndex(p, catLab)))];
                paletteLab = chosen.map(i => catLab[i]);
                names = chosen.map(i => catalog[i].name);
            }
        }

        let grid = C.mapToPalette(cellsLab, cols, rows, paletteLab, settings.dither);
        if (settings.despeckle) grid = P.despeckle(grid, cols, rows, stitch.offset);

        const palette = paletteLab.map((lab, i) => ({
            rgb: C.labToRgb(lab),
            name: names[i]
        }));
        return P.compact({ cols, rows, grid, palette, settings: Object.assign({}, settings, { cols, rows }) });
    };

    /**
     * Elimina colores sin uso, ordena la paleta de mayor a menor cantidad y
     * asigna símbolos. Se usa también después de editar el patrón a mano.
     */
    P.compact = function (pattern) {
        const counts = new Array(pattern.palette.length).fill(0);
        pattern.grid.forEach(i => counts[i]++);
        const order = counts.map((n, i) => i).filter(i => counts[i] > 0).sort((a, b) => counts[b] - counts[a]);
        const remap = new Int32Array(pattern.palette.length).fill(-1);
        order.forEach((old, i) => { remap[old] = i; });
        pattern.grid = pattern.grid.map(i => remap[i]);
        pattern.palette = order.map((old, i) => Object.assign({}, pattern.palette[old], {
            symbol: M.SYMBOLS[i % M.SYMBOLS.length]
        }));
        return pattern;
    };

    /** Nombre del color de catálogo más parecido (referencia para colores automáticos). */
    let catalogLab = null;
    P.nearestCatalogName = function (rgb) {
        if (!catalogLab) catalogLab = M.CATALOG.map(c => C.rgbToLab(C.hexToRgb(c.hex)));
        return M.CATALOG[C.nearestIndex(C.rgbToLab(rgb), catalogLab)].name;
    };

    P.counts = function (pattern) {
        const counts = new Array(pattern.palette.length).fill(0);
        pattern.grid.forEach(i => counts[i]++);
        return counts;
    };

    /** Agrupa colores consecutivos: [A,A,B] -> [{color:A,n:2},{color:B,n:1}] */
    function runs(values) {
        const out = [];
        values.forEach(v => {
            const last = out[out.length - 1];
            if (last && last.color === v) last.n++;
            else out.push({ color: v, n: 1 });
        });
        return out;
    }

    /**
     * Instrucciones de tejido en el orden en que se colocan las mostacillas.
     * Cada paso incluye las celdas que cubre para poder resaltarlas.
     */
    P.instructions = function (pattern) {
        const { cols, rows, grid, settings } = pattern;
        const steps = [];
        const at = (r, c) => grid[r * cols + c];
        const colRange = (from, to, step) => {
            const out = [];
            if (step > 0) for (let c = from; c <= to; c += step) out.push(c);
            else for (let c = from; c >= to; c += step) out.push(c);
            return out;
        };

        if (settings.stitch === 'peyote') {
            // Filas 1 y 2: se ensarta la primera fila de todas las columnas.
            const first = colRange(0, cols - 1, 1).map(c => [0, c]);
            steps.push({ label: 'Filas 1 y 2', dir: '→', cells: first });
            for (let k = 3; k <= rows * 2; k++) {
                const r = k % 2 ? (k - 1) / 2 : (k - 2) / 2;
                // filas impares: columnas pares de derecha a izquierda;
                // filas pares: columnas impares de izquierda a derecha
                const ltr = k % 2 === 0;
                const cs = ltr ? colRange(1, cols - 1, 2) : colRange(cols - 2, 0, -2);
                steps.push({ label: 'Fila ' + k, dir: ltr ? '→' : '←', cells: cs.map(c => [r, c]) });
            }
        } else {
            const alternate = settings.stitch !== 'telar';
            for (let r = 0; r < rows; r++) {
                const ltr = !alternate || r % 2 === 0;
                const cs = ltr ? colRange(0, cols - 1, 1) : colRange(cols - 1, 0, -1);
                steps.push({ label: 'Fila ' + (r + 1), dir: ltr ? '→' : '←', cells: cs.map(c => [r, c]) });
            }
        }
        steps.forEach(s => { s.runs = runs(s.cells.map(([r, c]) => at(r, c))); });
        return steps;
    };

    /** Medidas finales, cantidades por color y materiales necesarios. */
    P.materials = function (pattern, opts) {
        const { cols, rows, settings } = pattern;
        const bead = M.BEAD_TYPES[settings.bead];
        const stitch = M.STITCHES[settings.stitch];
        const cell = P.cellSize(settings.bead, settings.stitch);

        const widthMm = cols * cell.w + (stitch.offset === 'row' ? cell.w / 2 : 0);
        const heightMm = rows * cell.h + (stitch.offset === 'col' ? cell.h / 2 : 0);
        const counts = P.counts(pattern);
        const total = counts.reduce((a, b) => a + b, 0);
        const waste = opts.waste / 100;

        const colors = pattern.palette.map((p, i) => {
            const withWaste = Math.ceil(counts[i] * (1 + waste));
            const grams = withWaste / bead.perGram;
            const packs = opts.packGrams > 0 ? Math.ceil(grams / opts.packGrams) : 0;
            return { index: i, count: counts[i], withWaste, grams, packs, cost: packs * (opts.packPrice || 0) };
        });

        // Estimación de hilo (en metros, con 15 % extra para nudos y remates)
        let threadM, threadDetail;
        if (settings.stitch === 'telar') {
            const warpThreads = cols + 1;
            const warpM = warpThreads * (heightMm / 1000 + 0.6);
            const weftM = rows * (2 * widthMm / 1000 + 0.02) * 1.15;
            threadM = warpM + weftM;
            threadDetail = `Urdimbre: ${warpThreads} hilos de ${(heightMm / 10 + 60).toFixed(0)} cm (${warpM.toFixed(1)} m). ` +
                `Trama: ≈ ${weftM.toFixed(1)} m.`;
        } else {
            threadM = (total * cell.w * stitch.threadFactor + rows * 2 * cell.h * 4) / 1000 * 1.15;
            threadDetail = 'Trabaja con tramos de 1,2 a 1,5 m y empalma el hilo cuando queden unos 15 cm.';
        }

        const totals = colors.reduce((acc, c) => {
            acc.withWaste += c.withWaste; acc.grams += c.grams; acc.packs += c.packs; acc.cost += c.cost;
            return acc;
        }, { withWaste: 0, grams: 0, packs: 0, cost: 0 });

        const tools = [
            `Mostacilla ${bead.name}: ${pattern.palette.length} colores, ≈ ${totals.grams.toFixed(1).replace('.', ',')} g en total`,
            bead.needle,
            `${bead.thread}: ≈ ${Math.ceil(threadM)} m. ${threadDetail}`,
            'Tijeras pequeñas o cortahilos',
            'Cera de abejas o acondicionador para hilo',
            'Tapete de fieltro o bandeja para separar los colores',
            'Patrón impreso y un marcador para tachar las filas terminadas'
        ];
        if (settings.stitch === 'telar') {
            tools.splice(1, 0, `Telar para mostacilla de al menos ${Math.ceil(widthMm / 10 + 2)} cm de ancho útil ` +
                `y ${Math.ceil(heightMm / 10 + 10)} cm de largo (o uno con rodillos)`);
        }
        if (settings.stitch === 'ladrillo') {
            tools.push('Opcional: base de mostacillas en escalera (ladder stitch) para iniciar la primera fila');
        }
        tools.push('Opcional: cierres, terminales, argollas o broche según la pieza (pulsera, collar, aretes)');

        return { widthMm, heightMm, total, colors, totals, threadM, tools, bead, stitch, cell };
    };

    M.Pattern = P;
})(window.Mostacillas);

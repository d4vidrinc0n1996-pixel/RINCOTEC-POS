/**
 * Dibujo del patrón en canvas: vista de patrón (cuadrícula con símbolos) y
 * vista previa realista (mostacillas redondeadas).
 */
window.Mostacillas = window.Mostacillas || {};

(function (M) {
    const C = M.Color;
    const R = {};

    /** Geometría en píxeles para un patrón y un zoom (px por mm). */
    R.layout = function (pattern, zoom, showNumbers) {
        const cell = M.Pattern.cellSize(pattern.settings.bead, pattern.settings.stitch);
        const offset = M.STITCHES[pattern.settings.stitch].offset;
        const cw = cell.w * zoom, ch = cell.h * zoom;
        const margin = showNumbers ? Math.max(22, Math.min(34, ch * 1.6)) : 4;
        const width = margin * 2 + pattern.cols * cw + (offset === 'row' ? cw / 2 : 0);
        const height = margin * 2 + pattern.rows * ch + (offset === 'col' ? ch / 2 : 0);
        return { cw, ch, margin, offset, width: Math.ceil(width), height: Math.ceil(height) };
    };

    R.cellRect = function (L, r, c) {
        return {
            x: L.margin + c * L.cw + (L.offset === 'row' && r % 2 ? L.cw / 2 : 0),
            y: L.margin + r * L.ch + (L.offset === 'col' && c % 2 ? L.ch / 2 : 0)
        };
    };

    /** Celda bajo un punto (coordenadas del canvas) o null. */
    R.hitTest = function (pattern, L, x, y) {
        let c, r;
        if (L.offset === 'col') {
            c = Math.floor((x - L.margin) / L.cw);
            r = Math.floor((y - L.margin - (c % 2 ? L.ch / 2 : 0)) / L.ch);
        } else {
            r = Math.floor((y - L.margin) / L.ch);
            c = Math.floor((x - L.margin - (L.offset === 'row' && r % 2 ? L.cw / 2 : 0)) / L.cw);
        }
        if (r < 0 || c < 0 || r >= pattern.rows || c >= pattern.cols) return null;
        return { r, c };
    };

    function roundRect(ctx, x, y, w, h, rad) {
        rad = Math.min(rad, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + w, y, x + w, y + h, rad);
        ctx.arcTo(x + w, y + h, x, y + h, rad);
        ctx.arcTo(x, y + h, x, y, rad);
        ctx.arcTo(x, y, x + w, y, rad);
        ctx.closePath();
    }

    /**
     * opts: zoom, view ('chart'|'preview'), showSymbols, showGrid, showNumbers,
     * highlightCells (Set de "r,c"), highlightColor (índice), doneCells (Set).
     */
    R.draw = function (canvas, pattern, opts) {
        const L = R.layout(pattern, opts.zoom, opts.showNumbers);
        canvas.width = L.width;
        canvas.height = L.height;
        const ctx = canvas.getContext('2d');
        const { cols, rows, grid, palette } = pattern;
        const preview = opts.view === 'preview';
        const hasHighlight = (opts.highlightCells && opts.highlightCells.size) || opts.highlightColor != null;

        ctx.fillStyle = preview ? '#2b2b2e' : '#ffffff';
        ctx.fillRect(0, 0, L.width, L.height);

        const fills = palette.map(p => C.rgbToHex(p.rgb));
        const light = palette.map(p => C.isDark(p.rgb));
        const fontSize = Math.min(L.cw, L.ch) * 0.62;
        const drawSymbols = !preview && opts.showSymbols && fontSize >= 6;
        const drawGrid = !preview && opts.showGrid && Math.min(L.cw, L.ch) >= 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = grid[r * cols + c];
                const { x, y } = R.cellRect(L, r, c);
                const key = r + ',' + c;
                if (preview) {
                    const pad = Math.max(0.4, Math.min(L.cw, L.ch) * 0.06);
                    roundRect(ctx, x + pad, y + pad, L.cw - pad * 2, L.ch - pad * 2, Math.min(L.cw, L.ch) * 0.35);
                    ctx.fillStyle = fills[idx];
                    ctx.fill();
                    if (L.cw > 5) {
                        ctx.fillStyle = 'rgba(255,255,255,0.28)';
                        ctx.beginPath();
                        ctx.ellipse(x + L.cw * 0.36, y + L.ch * 0.32, L.cw * 0.14, L.ch * 0.12, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    ctx.fillStyle = fills[idx];
                    ctx.fillRect(x, y, L.cw, L.ch);
                    if (drawSymbols) {
                        ctx.fillStyle = light[idx] ? '#ffffff' : '#111111';
                        ctx.fillText(palette[idx].symbol, x + L.cw / 2, y + L.ch / 2 + 0.5);
                    }
                    if (drawGrid) {
                        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x + 0.5, y + 0.5, L.cw - 1, L.ch - 1);
                    }
                }

                const done = opts.doneCells && opts.doneCells.has(key);
                const dimmed = hasHighlight &&
                    !(opts.highlightCells && opts.highlightCells.has(key)) &&
                    !(opts.highlightColor != null && opts.highlightColor === idx);
                if (done || dimmed) {
                    ctx.fillStyle = done ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.55)';
                    ctx.fillRect(x, y, L.cw, L.ch);
                }
            }
        }

        // Contorno del paso resaltado
        if (opts.highlightCells && opts.highlightCells.size) {
            ctx.strokeStyle = '#e8007a';
            ctx.lineWidth = Math.max(1.5, Math.min(L.cw, L.ch) * 0.14);
            opts.highlightCells.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                const { x, y } = R.cellRect(L, r, c);
                ctx.strokeRect(x + 1, y + 1, L.cw - 2, L.ch - 2);
            });
        }

        // Líneas guía cada 10 mostacillas (solo cuadrícula recta)
        if (!preview && L.offset === 'none' && opts.showGrid) {
            ctx.strokeStyle = 'rgba(0,0,0,0.75)';
            ctx.lineWidth = 1.5;
            for (let c = 10; c < cols; c += 10) {
                const x = Math.round(L.margin + c * L.cw) + 0.5;
                ctx.beginPath(); ctx.moveTo(x, L.margin); ctx.lineTo(x, L.margin + rows * L.ch); ctx.stroke();
            }
            for (let r = 10; r < rows; r += 10) {
                const y = Math.round(L.margin + r * L.ch) + 0.5;
                ctx.beginPath(); ctx.moveTo(L.margin, y); ctx.lineTo(L.margin + cols * L.cw, y); ctx.stroke();
            }
        }

        if (opts.showNumbers) drawNumbers(ctx, pattern, L, preview);
        return L;
    };

    function drawNumbers(ctx, pattern, L, preview) {
        const size = Math.max(9, Math.min(13, L.margin * 0.42));
        ctx.font = `${size}px system-ui, sans-serif`;
        ctx.fillStyle = preview ? '#dddddd' : '#444444';
        ctx.textBaseline = 'middle';
        const colStep = L.cw * 5 >= size * 2.6 ? 5 : 10;
        const rowStep = L.ch * 5 >= size * 1.4 ? 5 : 10;
        const gridBottom = L.margin + pattern.rows * L.ch + (L.offset === 'col' ? L.ch / 2 : 0);
        const gridRight = L.margin + pattern.cols * L.cw + (L.offset === 'row' ? L.cw / 2 : 0);

        ctx.textAlign = 'center';
        for (let c = 0; c < pattern.cols; c++) {
            if (c !== 0 && (c + 1) % colStep !== 0) continue;
            const x = L.margin + c * L.cw + L.cw / 2;
            ctx.fillText(String(c + 1), x, L.margin / 2);
            ctx.fillText(String(c + 1), x, gridBottom + L.margin / 2);
        }
        for (let r = 0; r < pattern.rows; r++) {
            if (r !== 0 && (r + 1) % rowStep !== 0) continue;
            const y = L.margin + r * L.ch + L.ch / 2;
            ctx.textAlign = 'right';
            ctx.fillText(String(r + 1), L.margin - 4, y);
            ctx.textAlign = 'left';
            ctx.fillText(String(r + 1), gridRight + 4, y);
        }
    }

    /** Imagen para exportar: patrón + leyenda de colores con cantidades. */
    R.exportCanvas = function (pattern, materials, opts) {
        const chart = document.createElement('canvas');
        const zoom = Math.max(4, Math.min(12, 2400 / (Math.max(pattern.cols, pattern.rows) * 1.6)));
        R.draw(chart, pattern, Object.assign({}, opts, { zoom, showNumbers: true, highlightCells: null, highlightColor: null, doneCells: null }));

        const lineH = 30, pad = 24, colW = 360;
        const perCol = Math.max(1, Math.floor((chart.width - pad * 2) / colW));
        const legendRows = Math.ceil(pattern.palette.length / perCol);
        const headerH = 70;
        const out = document.createElement('canvas');
        out.width = Math.max(chart.width, colW + pad * 2);
        out.height = headerH + chart.height + pad + legendRows * lineH + pad;
        const ctx = out.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, out.width, out.height);

        ctx.fillStyle = '#111111';
        ctx.textBaseline = 'middle';
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.fillText('Patrón de mostacillas', pad, 24);
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText(
            `${materials.stitch.name} · ${materials.bead.name} · ${pattern.cols} × ${pattern.rows} mostacillas · ` +
            `${(materials.widthMm / 10).toFixed(1)} × ${(materials.heightMm / 10).toFixed(1)} cm · ` +
            `${materials.total} mostacillas`, pad, 50);
        ctx.drawImage(chart, 0, headerH);

        const top = headerH + chart.height + pad;
        ctx.font = '14px system-ui, sans-serif';
        pattern.palette.forEach((p, i) => {
            const col = i % perCol, row = Math.floor(i / perCol);
            const x = pad + col * colW, y = top + row * lineH;
            ctx.fillStyle = C.rgbToHex(p.rgb);
            ctx.fillRect(x, y, 22, 22);
            ctx.strokeStyle = '#999999';
            ctx.strokeRect(x + 0.5, y + 0.5, 21, 21);
            ctx.fillStyle = C.isDark(p.rgb) ? '#ffffff' : '#111111';
            ctx.textAlign = 'center';
            ctx.fillText(p.symbol, x + 11, y + 12);
            ctx.textAlign = 'left';
            ctx.fillStyle = '#111111';
            const c = materials.colors[i];
            ctx.fillText(`${p.name || C.rgbToHex(p.rgb)} — ${c.count} (comprar ${c.withWaste}, ${c.grams.toFixed(1)} g)`, x + 30, y + 12);
        });
        return out;
    };

    M.Render = R;
})(window.Mostacillas);

/**
 * Utilidades de color: conversión sRGB <-> CIELAB, distancias perceptuales,
 * k-means para reducir colores y difuminado Floyd–Steinberg.
 */
window.Mostacillas = window.Mostacillas || {};

(function (M) {
    const C = {};

    function srgbToLinear(v) {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }

    function linearToSrgb(v) {
        v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        return Math.max(0, Math.min(255, Math.round(v * 255)));
    }

    // Tabla precalculada para acelerar la conversión de 0–255 a lineal.
    const LIN = new Float64Array(256);
    for (let i = 0; i < 256; i++) LIN[i] = srgbToLinear(i);
    C.LIN = LIN;
    C.linearToSrgb = linearToSrgb;

    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;

    function f(t) {
        return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
    }

    function fInv(t) {
        const t3 = t * t * t;
        return t3 > 216 / 24389 ? t3 : (116 * t - 16) / (24389 / 27);
    }

    /** Convierte rgb lineal (0–1) a Lab. */
    C.linearToLab = function (r, g, b) {
        const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / Xn;
        const y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / Yn;
        const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / Zn;
        const fx = f(x), fy = f(y), fz = f(z);
        return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    };

    C.rgbToLab = function (rgb) {
        return C.linearToLab(LIN[rgb[0]], LIN[rgb[1]], LIN[rgb[2]]);
    };

    C.labToRgb = function (lab) {
        const fy = (lab[0] + 16) / 116;
        const fx = fy + lab[1] / 500;
        const fz = fy - lab[2] / 200;
        const x = fInv(fx) * Xn, y = fInv(fy) * Yn, z = fInv(fz) * Zn;
        const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
        const g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
        const b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
        return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)];
    };

    C.hexToRgb = function (hex) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    C.rgbToHex = function (rgb) {
        return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
    };

    C.dist2 = function (a, b) {
        const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
        return dl * dl + da * da + db * db;
    };

    /** Luminancia relativa, para elegir texto claro u oscuro sobre un color. */
    C.isDark = function (rgb) {
        const l = 0.2126 * LIN[rgb[0]] + 0.7152 * LIN[rgb[1]] + 0.0722 * LIN[rgb[2]];
        return l < 0.22;
    };

    C.nearestIndex = function (lab, palette) {
        let best = 0, bestD = Infinity;
        for (let i = 0; i < palette.length; i++) {
            const d = C.dist2(lab, palette[i]);
            if (d < bestD) { bestD = d; best = i; }
        }
        return best;
    };

    /** Generador pseudoaleatorio con semilla: mismo resultado para la misma imagen. */
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /**
     * k-means en espacio Lab con inicialización k-means++.
     * @param {Array<number[]>} points colores Lab
     * @param {number} k número de colores deseado
     * @returns {Array<number[]>} centroides (solo los que tienen puntos asignados)
     */
    C.kmeans = function (points, k, maxIter = 24) {
        const n = points.length;
        if (n === 0) return [];
        k = Math.min(k, n);
        const rand = mulberry32(n * 2654435761 + k);

        // k-means++
        const centers = [points[Math.floor(rand() * n)].slice()];
        const d = new Float64Array(n).fill(Infinity);
        while (centers.length < k) {
            const last = centers[centers.length - 1];
            let sum = 0;
            for (let i = 0; i < n; i++) {
                const dd = C.dist2(points[i], last);
                if (dd < d[i]) d[i] = dd;
                sum += d[i];
            }
            if (sum === 0) break; // menos colores distintos que k
            let target = rand() * sum, idx = 0;
            for (; idx < n - 1; idx++) {
                target -= d[idx];
                if (target <= 0) break;
            }
            centers.push(points[idx].slice());
        }

        const assign = new Int32Array(n).fill(-1);
        for (let iter = 0; iter < maxIter; iter++) {
            let changed = 0;
            for (let i = 0; i < n; i++) {
                const a = C.nearestIndex(points[i], centers);
                if (a !== assign[i]) { assign[i] = a; changed++; }
            }
            const sums = centers.map(() => [0, 0, 0, 0]);
            for (let i = 0; i < n; i++) {
                const s = sums[assign[i]], p = points[i];
                s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
            }
            sums.forEach((s, j) => {
                if (s[3]) centers[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
            });
            if (changed === 0) break;
        }

        const used = new Set(assign);
        return centers.filter((_, j) => used.has(j));
    };

    /**
     * Asigna a cada celda el color de paleta más cercano. Con difuminado
     * reparte el error de color a las celdas vecinas (Floyd–Steinberg).
     */
    C.mapToPalette = function (cellsLab, cols, rows, paletteLab, dither) {
        const out = new Int32Array(cols * rows);
        if (!dither) {
            for (let i = 0; i < out.length; i++) out[i] = C.nearestIndex(cellsLab[i], paletteLab);
            return out;
        }
        const work = cellsLab.map(p => p.slice());
        const spread = (r, c, e, w) => {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return;
            const p = work[r * cols + c];
            p[0] += e[0] * w; p[1] += e[1] * w; p[2] += e[2] * w;
        };
        for (let r = 0; r < rows; r++) {
            // recorrido en serpentina para evitar vetas diagonales
            const ltr = r % 2 === 0;
            for (let k = 0; k < cols; k++) {
                const c = ltr ? k : cols - 1 - k;
                const i = r * cols + c;
                const idx = C.nearestIndex(work[i], paletteLab);
                out[i] = idx;
                const p = paletteLab[idx], old = work[i];
                // atenuado al 75 % para que el patrón no quede demasiado "ruidoso"
                const e = [(old[0] - p[0]) * 0.75, (old[1] - p[1]) * 0.75, (old[2] - p[2]) * 0.75];
                const dir = ltr ? 1 : -1;
                spread(r, c + dir, e, 7 / 16);
                spread(r + 1, c - dir, e, 3 / 16);
                spread(r + 1, c, e, 5 / 16);
                spread(r + 1, c + dir, e, 1 / 16);
            }
        }
        return out;
    };

    M.Color = C;
})(window.Mostacillas);

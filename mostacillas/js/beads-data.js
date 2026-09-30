/**
 * Datos de referencia: tipos de mostacilla, puntadas y catálogo de colores.
 * Las medidas y rendimientos (mostacillas por gramo) son aproximados y varían
 * según fabricante y acabado; sirven para estimar, no para cotizar al detalle.
 */
window.Mostacillas = window.Mostacillas || {};

(function (M) {
    // dia = diámetro (mm), len = largo en el eje del agujero (mm)
    M.BEAD_TYPES = {
        delica11: {
            name: 'Delica 11/0 (cilíndrica)',
            dia: 1.6, len: 1.3, perGram: 200,
            needle: 'Aguja para mostacilla #10 o #12',
            thread: 'Hilo Miyuki, Nymo D o FireLine 4–6 lb'
        },
        checa11: {
            name: 'Mostacilla checa 11/0',
            dia: 2.1, len: 1.5, perGram: 115,
            needle: 'Aguja para mostacilla #10 o #12',
            thread: 'Hilo Nymo D, Miyuki o FireLine 6 lb'
        },
        rocalla11: {
            name: 'Rocalla japonesa 11/0',
            dia: 2.0, len: 1.5, perGram: 110,
            needle: 'Aguja para mostacilla #10 o #12',
            thread: 'Hilo Nymo D, Miyuki o FireLine 6 lb'
        },
        rocalla15: {
            name: 'Rocalla 15/0 (fina)',
            dia: 1.5, len: 1.0, perGram: 250,
            needle: 'Aguja para mostacilla #12 o #13',
            thread: 'Hilo Nymo B o FireLine 4 lb'
        },
        checa10: {
            name: 'Mostacilla checa 10/0',
            dia: 2.3, len: 1.7, perGram: 75,
            needle: 'Aguja para mostacilla #10',
            thread: 'Hilo Nymo D o FireLine 6 lb'
        },
        rocalla8: {
            name: 'Rocalla 8/0 (gruesa)',
            dia: 3.0, len: 2.2, perGram: 36,
            needle: 'Aguja para mostacilla #10',
            thread: 'Hilo Nymo D, S-Lon o FireLine 8 lb'
        }
    };

    /**
     * offset: 'none' cuadrícula recta, 'col' columnas alternas desplazadas medio
     * bloque hacia abajo (peyote), 'row' filas alternas desplazadas medio bloque
     * hacia la derecha (ladrillo).
     * holes: orientación del agujero; define si la celda es más alta o más ancha.
     * threadFactor: veces que el hilo recorre cada mostacilla (para estimar hilo).
     */
    M.STITCHES = {
        telar: {
            name: 'Telar (loom)',
            offset: 'none', holes: 'horizontal', threadFactor: 2,
            description: 'Cuadrícula recta. Se ensarta una fila completa y se pasa por encima de los hilos de la urdimbre.'
        },
        cuadrado: {
            name: 'Punto cuadrado (square stitch)',
            offset: 'none', holes: 'horizontal', threadFactor: 3.5,
            description: 'Mismo resultado visual que el telar, pero tejido a mano sin telar.'
        },
        peyote: {
            name: 'Peyote plano (par)',
            offset: 'col', holes: 'horizontal', threadFactor: 2,
            description: 'Columnas intercaladas a medio bloque. El ancho se ajusta a un número par.'
        },
        ladrillo: {
            name: 'Ladrillo (brick stitch)',
            offset: 'row', holes: 'vertical', threadFactor: 2.5,
            description: 'Filas intercaladas a medio bloque, como una pared de ladrillos.'
        }
    };

    /** Catálogo de colores comunes (referencias aproximadas, no códigos oficiales). */
    M.CATALOG = [
        { name: 'Negro', hex: '#111111' },
        { name: 'Gris oscuro', hex: '#3d3d40' },
        { name: 'Gris', hex: '#7a7a7e' },
        { name: 'Gris claro', hex: '#b9b9bc' },
        { name: 'Plateado', hex: '#d2d4d8' },
        { name: 'Blanco', hex: '#f7f7f5' },
        { name: 'Blanco perla', hex: '#ece6da' },
        { name: 'Crema', hex: '#efe0bd' },
        { name: 'Beige arena', hex: '#d6bf96' },
        { name: 'Piel', hex: '#e8b48f' },
        { name: 'Durazno', hex: '#f6b48a' },
        { name: 'Salmón', hex: '#ef8a73' },
        { name: 'Coral', hex: '#f0624f' },
        { name: 'Rojo', hex: '#d0181f' },
        { name: 'Rojo vino', hex: '#7e1624' },
        { name: 'Terracota', hex: '#b5532f' },
        { name: 'Naranja', hex: '#f0741c' },
        { name: 'Mandarina', hex: '#f89a2c' },
        { name: 'Mostaza', hex: '#d0a023' },
        { name: 'Amarillo', hex: '#fcd000' },
        { name: 'Amarillo limón', hex: '#f4ea4f' },
        { name: 'Dorado', hex: '#c09a3e' },
        { name: 'Bronce', hex: '#8a6a3a' },
        { name: 'Cobre', hex: '#a65a33' },
        { name: 'Café claro', hex: '#a47a52' },
        { name: 'Café', hex: '#6c4528' },
        { name: 'Chocolate', hex: '#3f2718' },
        { name: 'Verde limón', hex: '#a8cf38' },
        { name: 'Verde claro', hex: '#72bf5a' },
        { name: 'Verde', hex: '#2b9a3f' },
        { name: 'Verde bandera', hex: '#16723a' },
        { name: 'Verde bosque', hex: '#1d4a2c' },
        { name: 'Verde oliva', hex: '#6b6d2a' },
        { name: 'Verde menta', hex: '#9fdcbf' },
        { name: 'Aguamarina', hex: '#4fc3b0' },
        { name: 'Turquesa', hex: '#12a3b4' },
        { name: 'Celeste', hex: '#9fd3ee' },
        { name: 'Azul cielo', hex: '#4ea3dd' },
        { name: 'Azul', hex: '#1f63b8' },
        { name: 'Azul rey', hex: '#1f3d9e' },
        { name: 'Azul marino', hex: '#16224d' },
        { name: 'Lila', hex: '#bfa3d9' },
        { name: 'Violeta', hex: '#7e4fae' },
        { name: 'Morado', hex: '#4b2475' },
        { name: 'Rosado claro', hex: '#f6c3d3' },
        { name: 'Rosado', hex: '#ee7fa6' },
        { name: 'Fucsia', hex: '#d81f7d' },
        { name: 'Magenta', hex: '#a3155f' }
    ];

    // Símbolos para imprimir el patrón en blanco y negro.
    M.SYMBOLS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abdefghkmnpqrtuwxyz+#%&@$=?!<>*~^'.split('');
})(window.Mostacillas);

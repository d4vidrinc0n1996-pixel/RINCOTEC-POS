# Patrones de Mostacillas

Aplicación web para convertir una imagen en un patrón de artesanía con mostacillas.
Funciona 100 % en el navegador (HTML, CSS y JavaScript sin dependencias ni Firebase):
la imagen nunca sale del equipo del usuario.

Publicada en **https://mostacillas.netlify.app**: un sitio de Netlify propio creado desde este
repositorio con *Base directory* = `mostacillas` y *Publish directory* = `mostacillas`
(usa `mostacillas/netlify.toml`). El sitio del POS redirige `/mostacillas/` a esa dirección.

## Qué hace

- **Convierte la imagen en una cuadrícula** de mostacillas del tamaño elegido (ancho × alto),
  respetando la forma real de cada mostacilla según el tipo y la puntada.
- **Puntadas**: telar, punto cuadrado, peyote plano (par) y ladrillo (brick stitch).
- **Tipos de mostacilla**: Delica 11/0, checa 11/0 y 10/0, rocalla 15/0, 11/0 y 8/0.
- **Reducción de colores** a un máximo configurable, con dos modos:
  - *Colores de la imagen* (k-means en espacio de color CIELAB).
  - *Catálogo de mostacillas*: ajusta cada color al más parecido del catálogo,
    usando solo los colores que el usuario marque como disponibles.
- **Cantidades por color**: mostacillas exactas, cantidad a comprar con margen de reserva,
  gramos, paquetes y costo estimado.
- **Ubicación**: patrón con símbolos, números de fila/columna y guías cada 10;
  al pasar el cursor muestra fila, columna y color de cada mostacilla.
- **Paso a paso**: secuencia de colores por fila en el orden de tejido
  (incluye el orden especial del peyote), con avance guardado en el navegador.
- **Materiales**: aguja, hilo (metros estimados), telar (medidas mínimas) y accesorios.
- **Edición**: pincel para retocar mostacillas, deshacer, cambiar el tono o el nombre/código de cada color.
- **Exportar**: PNG con leyenda, CSV (Excel), impresión/PDF y proyecto `.json` para continuar después.

## Instalar la app

La app es instalable (PWA) y funciona sin conexión después de abrirla una vez.

- **Android (Chrome)**: abre `https://mostacillas.netlify.app` y toca **Instalar app**
  en la barra superior (o menú ⋮ → *Instalar aplicación*).
- **iPhone/iPad (Safari)**: botón Compartir → *Agregar a pantalla de inicio*.
- **Windows/Mac (Chrome o Edge)**: botón **Instalar app** o el ícono de instalar en la barra de direcciones.

Al cambiar archivos de la app, sube `?v=` en `index.html` y la misma versión en
`APP_SHELL` y `VERSION` de `sw.js` para que los dispositivos instalados se actualicen.

## Estructura

```
mostacillas/
├── index.html
├── manifest.webmanifest # Datos de la app instalable
├── sw.js               # Funcionamiento sin conexión
├── icons/              # Íconos de la app
├── css/mostacillas.css
└── js/
    ├── beads-data.js   # Tipos de mostacilla, puntadas y catálogo de colores
    ├── color.js        # sRGB <-> Lab, k-means, difuminado Floyd–Steinberg
    ├── pattern.js      # Cuadrícula, conteos, instrucciones y materiales
    ├── render.js       # Dibujo del patrón y vista previa en canvas
    └── app.js          # Interfaz
```

## Notas

- Las medidas, los gramos (mostacillas por gramo) y los metros de hilo son **estimaciones**;
  varían según marca, acabado y tensión al tejer.
- Los nombres del catálogo son referencias aproximadas, no códigos oficiales de fabricante.
  Escribe el código de tu proveedor en la columna «Nombre / código».
- Netlify guarda en caché los `.js` y `.css` durante un año: al modificarlos,
  sube el número `?v=` en las etiquetas de `index.html` (y en `sw.js`).

# Vectorizador de imágenes

Convierte una imagen (PNG/JPG/etc.) en contornos vectoriales cerrados y los exporta a **DXF** (R12, compatible con AutoCAD, LibreCAD, láser y CNC) o **SVG**. Todo corre en el navegador: no sube nada a ningún servidor.

## Uso
Abre `vectorizador/index.html` con un servidor HTTP local, carga una imagen (arrastrar, elegir o pegar), ajusta los controles y descarga.

- **Umbral**: separa "tinta" de fondo (automático con Otsu, o manual). *Invertir* traza las zonas claras.
- **Suavizado / Simplificación**: menos ruido y menos vértices (Douglas-Peucker).
- **Ignorar manchas**: descarta contornos diminutos.
- **Ancho final (mm)**: escala del dibujo; el DXF sale en milímetros con el eje Y hacia arriba.

## Cómo funciona
`js/vectorize.js` (marching squares con interpolación subpíxel + simplificación) y `js/export.js` (escritores DXF/SVG). Cada contorno se exporta como `POLYLINE` cerrada en la capa indicada.

## Limitaciones
Traza por umbral (blanco y negro). No hay modo de varios colores ni ajuste de curvas (los contornos son polilíneas).

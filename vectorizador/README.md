# Vectorizador de imágenes

Convierte una imagen (PNG/JPG/etc.) en contornos vectoriales cerrados y los exporta a **DXF** (R12, compatible con AutoCAD, LibreCAD, láser y CNC) o **SVG**. Todo corre en el navegador: no sube nada a ningún servidor.

## Uso
Abre `vectorizador/index.html` con un servidor HTTP local, carga una imagen (arrastrar, elegir o pegar), ajusta los controles y descarga.

- **Modo**: *Blanco y negro* (una capa) o *Varios colores*, que reduce la imagen a N colores (k-means), omite opcionalmente el fondo y crea **una capa DXF por color** (`COLOR_n_RRGGBB`, con el color ACI más cercano). El SVG sale con un relleno por color.
- **Umbral** (blanco y negro): separa "tinta" de fondo (automático con Otsu, o manual). *Invertir* traza las zonas claras.
- **Suavizado / Simplificación**: menos ruido y menos vértices (Douglas-Peucker).
- **Ignorar manchas**: descarta contornos diminutos.
- **Ancho final (mm)**: escala del dibujo; el DXF sale en milímetros con el eje Y hacia arriba.

## Cómo funciona
`js/vectorize.js` (marching squares con interpolación subpíxel + simplificación) y `js/export.js` (escritores DXF/SVG). Cada contorno se exporta como `POLYLINE` cerrada en la capa indicada.

## Limitaciones
Los contornos son polilíneas (sin ajuste de curvas). En modo color, los degradados y colores muy parecidos se fusionan según el número de colores elegido.

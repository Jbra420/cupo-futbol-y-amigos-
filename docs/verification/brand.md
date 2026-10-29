# CUPO — Identidad y encabezado adaptable

Fecha: 28 de octubre de 2026.

## Diseño

El propietario eligió CUPO como nombre y pidió reemplazar la marca anterior, que se veía como texto en dos líneas en el móvil. Se dibujó un logotipo vectorial original: una C abierta inspirada en una cancha, un balón en su abertura y letras geométricas redondeadas. Los trazos son propios y no requieren una tipografía descargada.

La misma geometría está en `src/lib/brand.ts` y se reutiliza en el componente React, los SVG independientes, los iconos y Open Graph. `npm run brand:assets` regenera los archivos estáticos y la lámina de identidad. No se usó generación de imágenes raster para diseñar el logotipo: los PNG son renderizados del SVG original.

## Aplicación

- Encabezado de inicio, panel y páginas públicas con CUPO en una sola línea. Se eliminaron las reglas que ocultaban el símbolo en pantallas pequeñas.
- Colores adaptados al tema claro y oscuro; logo de 152 px en escritorio y 128 px en móvil. Los controles mantienen áreas táctiles de al menos 44 px. En anchos inferiores a 380 px el encabezado permite reorganizar las acciones.
- Favicon de 16, 32 y 48 px, icono SVG, icono Apple de 180 px y variantes de 192/512 px para el manifiesto.
- Nombre CUPO en títulos, accesibilidad, metadatos, manifiesto, exportación PNG y vistas de Open Graph. Los nombres de los partidos pertenecen al usuario y se conservan.
- Las credenciales, migraciones, dominios y enlaces existentes mantienen sus identificadores técnicos.

## Verificación

TypeScript, ESLint y compilación de producción correctos. Se repitieron las 53 pruebas unitarias y los 28 casos de navegador sobre el build de producción local, en 390 × 844 y 1440 × 900. Se comprobó el encabezado en ambos temas, ausencia de desbordamiento, accesibilidad, navegación, acceso administrativo, creación/edición de partidos, Google Maps y exportaciones.

La respuesta de Open Graph conserva sus 1200 × 630 px y el PNG de alineación sus 1520 px de ancho. Ambos muestran el logotipo CUPO. El favicon contiene las tres resoluciones previstas. No hubo cambios SQL; la suite de 40 pruebas de integración corresponde a la verificación anterior del esquema sin modificaciones.

## Evidencia

- [Identidad en fondo claro y oscuro](../../artifacts/brand/cupo-identity.png).
- [Encabezado móvil oscuro](../../artifacts/brand/header-mobile-dark.png) y [claro](../../artifacts/brand/header-mobile-light.png).
- [Encabezado de escritorio oscuro](../../artifacts/brand/header-desktop-dark.png) y [claro](../../artifacts/brand/header-desktop-light.png).
- [Open Graph](../../artifacts/brand/open-graph.png) y [alineación PNG](../../artifacts/brand/alineacion.png).

Las capturas corresponden a partidos temporales de las pruebas locales. Se conservó la evidencia histórica de las fases anteriores.

# Fútbol y amigos — Ubicación de la cancha

Fecha: 28 de octubre de 2026.

## Funcionamiento

El administrador agrega un enlace de Google Maps al crear o editar un partido. Los jugadores ven un mapa insertado y el botón «Ver en Google Maps». El campo vacío elimina el mapa; los partidos sin enlace conservan su dirección de texto. Los cambios llegan por el mecanismo Realtime existente y sobreviven a una recarga.

Los enlaces cortos se expanden únicamente tras validar cada host y ruta. Se rechazan protocolos distintos de HTTPS, credenciales en la URL, puertos alternativos y saltos a otros servicios. El límite total es de cinco segundos y cinco solicitudes. Se normaliza el dominio de Google Ecuador y se utiliza el punto del lugar antes que el centro de la cámara.

## Datos y permisos

Migración `20261029011442_add_match_google_maps`: columna pública nullable `matches.maps_url`, validación SQL, proyección pública explícita y dos RPC que reutilizan los controles transaccionales existentes. No se cambiaron las firmas anteriores. Las operaciones comprueban administrador único, revisión, estado editable y capacidad; un enlace inválido revierte toda la transacción.

La migración se comprobó en local y se aplicó al Supabase alojado. Se conservó el partido existente, con mapa inicialmente vacío. RLS permanece activado. El historial remoto quedó alineado con la versión del archivo local. El asesor no informa errores; mantiene los avisos sobre RPC elevadas, sesiones anónimas y protección de contraseñas de Auth. Las dos nuevas RPC están limitadas a usuarios autenticados y vuelven a comprobar al administrador mediante las operaciones existentes; las pruebas rechazan otros usuarios y jugadores.

## Verificación

- 53 pruebas unitarias aprobadas: formatos de enlace, coordenadas, dominios, redirecciones externas, bucles y fallos de red.
- 40 pruebas de integración aprobadas: permisos, lectura pública, transacciones, conflictos de revisión, eliminación del mapa y compatibilidad con las RPC anteriores, además de la suite de cupos y equipos.
- 28 casos de navegador aprobados en una ejecución sobre compilación de producción local, en 390 × 844 y 1440 × 900. Incluyen crear, rechazar enlaces ajenos, mostrar el iframe, editar, sincronizar, recargar y quitar el mapa.
- TypeScript, ESLint y compilación de producción correctos.
- Comprobación de un enlace corto real publicado por el Municipio de Cuenca: se resolvió la redirección `google.com.ec/maps/search/…` y se obtuvieron sus coordenadas.
- Comprobación visual con Google Maps real dentro de un partido temporal local: mapa y marcador visibles. El partido temporal se eliminó al terminar.

**Total: 121 pruebas aprobadas.** Las pruebas automáticas interceptan la carga del iframe para no depender de Google en CI; sus capturas verifican la estructura y el destino, no los mosaicos de Google. La comprobación visual real se realizó por separado. Ningún fixture ni partido de prueba se creó en producción.

Referencias: [compartir e insertar mapas](https://support.google.com/maps/answer/7101463?hl=es), [URLs de Google Maps](https://developers.google.com/maps/documentation/urls/guide).

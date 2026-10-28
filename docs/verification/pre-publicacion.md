# Fútbol y amigos — Corrección y comprobación previa a publicar

Fecha: 28 de octubre de 2026.

## Incidencia y corrección

Al crear un partido, `POST /api/partidos` guardaba el evento y respondía `201`. Después, el montaje de `AdminMatch` fallaba porque `useMatchRealtime` llamaba directamente a `crypto.randomUUID()`. Se reproducía la pantalla «Se nos fue la pelota». Había una segunda llamada a la misma API al sortear equipos.

`randomUUID()` requiere un contexto seguro; puede no estar disponible al acceder por HTTP desde la red local. Se sustituyeron ambos usos por `nanoid()`, una dependencia existente cuyo módulo de navegador usa `crypto.getRandomValues()`. Se conserva una fuente criptográfica de aleatoriedad. No cambian las reglas de inscripción, permisos ni las migraciones.

Referencias: [randomUUID y contexto seguro](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [getRandomValues y disponibilidad en HTTP](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

## Recorrido verificado

Administrador → formulario de partido → API autenticada → PostgreSQL → pantalla de administración → Realtime → página pública → edición de fecha → sorteo → publicación de equipos → recarga.

La nueva prueba suprime únicamente `Crypto.prototype.randomUUID` antes de cargar las páginas. Verifica que `getRandomValues` siga disponible, que la creación responda `201`, que ambas pantallas permanezcan utilizables, que las modificaciones lleguen al otro navegador y que fecha y equipos persistan. Recoge errores no controlados de ambos navegadores. Falló con la implementación anterior y pasó con la corrección en móvil y escritorio. Esta prueba reproduce la ausencia de la API; no equivale a una prueba física desde otra computadora de la red.

| Frontera                  | Estado   | Evidencia                                                             |
| ------------------------- | -------- | --------------------------------------------------------------------- |
| Formulario → API          | Correcto | Creación mediante formulario; respuesta `201`                         |
| API → base de datos       | Correcto | Evento recuperado por RPC; fecha almacenada en UTC                    |
| Base → pantalla           | Correcto | Administración visible y persistente tras recargar                    |
| Realtime → otro navegador | Correcto | Cambio de título, cupos y equipos visible sin recargar                |
| Sorteo y publicación      | Correcto | Seis participantes asignados y visibles en la página pública          |
| Compatibilidad            | Correcto | Mismo recorrido con `randomUUID` ausente y sin errores no controlados |

## Comprobaciones finales

| Comprobación                                  | Resultado                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run typecheck`                           | Sin errores                                                               |
| `npm run lint`                                | Sin errores                                                               |
| `npm test`                                    | 39 pruebas aprobadas                                                      |
| `npm run test:integration`                    | 37 pruebas aprobadas contra Supabase/PostgreSQL local                     |
| Compilación de producción                     | Correcta, Next.js 15.5.28 y Node.js 22                                    |
| Suite completa de Playwright sobre producción | 26 pruebas aprobadas en una ejecución, 1,1 minutos                        |
| `npm audit --omit=dev --json`                 | Cero vulnerabilidades conocidas notificadas en dependencias de producción |

**Total: 102 pruebas aprobadas.** Chromium móvil: 390 × 844 con touch. Escritorio: 1440 × 900.

La suite incluye acceso y cierre de sesión, autorización, creación y edición, confirmados/espera, cancelación y promoción, concurrencia, pagos privados, equipos, arrastre/touch/teclado, sincronización, PNG, Open Graph y accesibilidad. Los fixtures actúan únicamente contra Supabase local y restauran la cuenta administradora original.

La compilación de pruebas usa `.next-qa`, el puerto 3100 y una URL canónica de pruebas. El servidor se inicia con `next start` y se detiene al terminar. Los pasos reproducibles están en el [README](../../README.md).

## Evidencia visual

- [Fallo antes de la corrección](../../artifacts/browser-compatibility/error-antes.png)
- [Partido creado, editado y publicado en móvil](../../artifacts/browser-compatibility/partido-mobile.png)
- [Partido creado, editado y publicado en escritorio](../../artifacts/browser-compatibility/partido-desktop.png)

## Pendientes del entorno público

Las conexiones a las cuentas están disponibles y el código está en GitHub. La inspección de los servicios todavía no encuentra un proyecto Supabase de esta aplicación ni un proyecto Vercel llamado Cupo/Fútbol y amigos. No se ha publicado ni probado un entorno alojado.

Antes de dar acceso a los jugadores:

1. Crear el proyecto Supabase dedicado y aplicar las 18 migraciones existentes.
2. Configurar las sesiones anónimas, el acceso por contraseña del administrador único y Realtime con las columnas públicas previstas por las migraciones.
3. Crear la cuenta administradora de producción y asignarla a `private.app_administrator`. Las credenciales locales no se trasladan automáticamente.
4. Crear el proyecto Vercel desde el repositorio, usar Node.js 22 y configurar las tres variables públicas con el proyecto y la URL HTTPS definitivos. La aplicación no requiere una clave `service_role`.
5. Verificar en esa URL acceso/cierre, creación/edición, inscripción desde otro dispositivo, espera, Realtime, equipos, PNG y metadatos públicos.
6. Definir límites de Auth y copias de seguridad para ese entorno.

Para difusión abierta se recomienda protección CAPTCHA; requiere integrar su token antes de habilitarla en Supabase. La recuperación actual de contraseña se hace desde Supabase Auth por el propietario; todavía no hay cambio ni recuperación desde la interfaz. Safari/iOS físico, compartir archivos mediante la hoja nativa y la vista previa dentro de WhatsApp requieren comprobación con dispositivos y una URL pública.

**Resultado:** la implementación local corregida supera las verificaciones para iniciar el despliegue. La operación en producción sigue pendiente de la configuración y comprobación del entorno público.

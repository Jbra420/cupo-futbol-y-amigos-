# Fútbol y amigos — Plan de implementación

> Actualización del 28 de octubre de 2026: la aplicación se llama **Fútbol y amigos**. Por instrucción del usuario, el acceso es con **usuario y contraseña para un único administrador**, sin Google. Puede crear partidos y editar eventos programados, incluida fecha y cantidad de jugadores. Esta decisión sustituye las referencias a múltiples organizadores y Google del plan original. Consulta el [README actual](../README.md) y la [verificación de administrador](verification/administrator.md).

Fecha: 28 de octubre de 2026. Estado: aprobado por el usuario; las siete fases locales verificadas; 93 pruebas aprobadas y compilación de producción correcta.

Este documento y la [lista de tareas](tasks.md) son los entregables de planificación. La implementación comienza después de la aprobación del usuario. Cada fase debe pasar sus verificaciones antes de iniciar la siguiente.

## 1. Objetivo y alcance

Construir una aplicación para organizar partidos de fútbol amateur: crear un partido, compartir un enlace, inscribir jugadores sin registro, administrar cupos y espera, formar equipos y compartir su alineación. Toda la interfaz será en español latinoamericano, con prioridad para celulares.

Stack: Next.js **15**, App Router, TypeScript estricto, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Auth/Realtime, RPC en PL/pgSQL, dnd-kit, html-to-image, Vitest y Playwright. Preparación para Vercel. Todo cambio de base de datos quedará en `supabase/migrations`.

El alcance incluye las rutas `/`, `/panel`, `/p/[slug]` y `/p/[slug]/admin`, además del callback de autenticación y los metadatos Open Graph. No incluye cobro electrónico: `paid` es un registro manual del pago.

## 2. Estado observado del repositorio

| Área          | Evidencia actual                                                                             | Trabajo previsto                                                                               |
| ------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Framework     | `package.json` declara Next.js 16.4.3, React 19.3.0 y Tailwind 4; TypeScript ya usa `strict` | Alinear Next.js a 15.x y fijar versiones compatibles de React, ESLint y las demás dependencias |
| Bibliotecas   | Ya aparecen Supabase, dnd-kit, html-to-image, seedrandom, Vitest y Playwright                | Verificar compatibilidad e incorporar shadcn/ui                                                |
| Base de datos | Existen diez migraciones SQL locales con tablas, RPC, RLS y publicación Realtime             | Auditar y completar antes de dar por válida la fase 1                                          |
| Seguridad     | Lectura general de `registrations` y actualizaciones directas del propio registro            | Restringir columnas y canalizar las operaciones críticas por RPC                               |
| Concurrencia  | Algunas funciones leen estado antes de bloquear el partido                                   | Releer y validar dentro del bloqueo para evitar decisiones con datos antiguos                  |
| Equipos       | Hay una primera implementación de `balanceTeams`                                             | Corregir la serpiente, alternancia y desempates, y agregar pruebas en la fase 4                |
| Verificación  | Hay configuraciones de Vitest y Playwright; no se encontraron archivos de pruebas            | Crear suites, datos de prueba y evidencia por fase                                             |
| Interfaz      | La página principal conserva la plantilla inicial de Next.js                                 | Construir las pantallas de Cupo por fases                                                      |

Existen cambios locales previos en dependencias, código y SQL. Durante esta planificación solo se agregan estos dos documentos; no se alteran esos cambios. La existencia de archivos no implica que una fase haya pasado pruebas.

Se leyeron las guías locales de Next.js para versiones 15 y 16 y la separación de componentes de servidor y cliente, conforme a `AGENTS.md`. Al cambiar de versión se volverá a consultar la documentación correspondiente: no se trasladarán convenciones exclusivas de Next.js 16 a la implementación en 15.

## 3. Decisiones propuestas para aprobar

1. **Versiones:** cumplir Next.js 15. En la fase 1 se verificará y fijará una versión 15.x con los parches disponibles y sus dependencias compatibles; no se instalará `latest` sin limitar la versión mayor.
2. **Identidad del jugador:** una inscripción activa por sesión de usuario y partido, además de la restricción por nombre. La identidad corresponde a la sesión persistida del navegador; borrar sus datos o usar otro navegador crea otra identidad. Repetir una solicitud no debe ocupar dos cupos.
3. **Altas manuales:** permitir `registrations.user_id = NULL` únicamente mediante la operación autorizada del organizador. Así puede añadir varias personas sin atribuirle falsamente todos sus cupos. Solo el organizador administra esas inscripciones.
4. **Capacidad:** aumentar cupos también promueve personas en espera, en orden. Reducirlos desplaza a los últimos confirmados; la confirmación de la UI muestra cuántos perderán la confirmación. Toda operación se ejecuta en una transacción.
5. **Empates de orden:** usar `created_at, id` para promociones y el orden inverso para desplazamientos. Así hay un criterio estable si dos registros comparten fecha.
6. **Equipos publicados:** cambiar la lista de confirmados o la capacidad invalida `teams_ready`, retira asignaciones de personas que ya no están confirmadas y conserva el resto como borrador. El estado vuelve a `open` o `full`. Cambiar solo la espera no invalida los equipos. Un partido `finished` queda en modo de consulta.
7. **Publicación de equipos:** se puede editar un borrador antes de llenar cupos; `teams_ready` exige cupos completos y todos los confirmados asignados exactamente una vez. El sorteo garantiza tamaños equilibrados; la edición manual muestra avisos de desequilibrio.
8. **Fecha y moneda:** guardar fechas en `timestamptz`, usar inicialmente `America/Guayaquil` al crear y presentar el partido y mostrar esa zona explícitamente. Mostrar el precio opcional en USD. Estos son valores iniciales propuestos para este proyecto.

## 4. Arquitectura

### Rutas y responsabilidades

| Ruta              | Experiencia                                                             | Datos y permisos                                                                 |
| ----------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `/`               | Presentación breve y botón «Organizar partido»                          | Información pública                                                              |
| `/panel`          | Login con Google, partidos, creación y jugadores frecuentes             | Solo organizador autenticado con Google                                          |
| `/p/[slug]`       | Inscripción, cupos, espera, cancelación propia y alineación de consulta | Lectura pública segura; sesión anónima automática si no hay una sesión existente |
| `/p/[slug]/admin` | Configuración, participantes, pagos y editor de equipos                 | Sesión y propiedad verificadas en servidor y base de datos                       |
| `/auth/callback`  | Completar OAuth y volver a un destino interno permitido                 | Intercambio de código y cookies de sesión                                        |

Se usarán Server Components para la carga inicial, comprobaciones de acceso y metadatos; Client Components para formularios, Realtime, tema, arrastre y exportación. `cookies`, `params` y otras APIs de petición se utilizarán conforme a las guías de la versión elegida, con acceso asíncrono donde corresponda.

Organización prevista dentro de `src`: rutas en `app`, componentes reutilizables en `components`, módulos de Supabase en `lib/supabase`, algoritmo puro en `lib/teams`, validaciones y utilidades en `lib`, y tipos generados en `types`. Pruebas unitarias, de integración y E2E estarán separadas bajo `tests` o junto al módulo cuando corresponda.

### Autenticación y configuración

- Supabase Auth con Google para organizar; refresco de sesión con cookies mediante `@supabase/ssr` y la convención compatible con Next.js 15.
- Anonymous Sign-In automático al abrir el enlace si no existe sesión; conservar una sesión de Google ya iniciada. Evitar crear sesiones duplicadas al montar la página o abrir otra pestaña.
- Verificar identidad y propiedad también en cada operación del servidor y cada RPC. El permiso de organizador requiere una cuenta de Google, no solamente pertenecer al rol SQL `authenticated`.
- Los usuarios anónimos de Supabase también usan el rol `authenticated`; se distinguirán mediante los datos verificados de la sesión y la identidad. [Referencia oficial de Supabase](https://supabase.com/docs/guides/auth/auth-anonymous).
- Pedir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` al comenzar la fase 1. Usarlas mediante variables de entorno; `.env.example` tendrá solo marcadores y los valores locales estarán ignorados por Git.
- Configurar Google OAuth y sus redirecciones en Supabase/Google. Las credenciales del proveedor pertenecen a esa configuración, no al código del navegador.
- Priorizar un Supabase local para pruebas reproducibles; si no está disponible, usar un proyecto de pruebas dedicado. No ejecutar suites destructivas sobre datos reales.

## 5. Base de datos, RPC y privacidad

Se conservarán las cinco entidades solicitadas y sus campos, con las extensiones mínimas descritas a continuación.

### Restricciones e integridad

- `matches`: slug corto único con reintento ante colisión; capacidad par de 6 a 22; precio opcional no negativo; campos requeridos validados también en SQL.
- `registrations`: nombre recortado y no vacío; índice único parcial por partido y `lower(player_name)` para estados activos; índice único parcial de inscripción activa por `user_id` no nulo; posición y estado restringidos.
- `players`: acceso exclusivo del organizador, nivel entre 1 y 5 y nombre normalizado único por organizador. Relacionar inscritos y jugadores frecuentes mediante el nombre normalizado dentro de ese organizador. Si no hay coincidencia, nivel 3.
- `teams`: dos equipos como máximo por partido, índices 0 y 1, nombre válido y color validado.
- `team_assignments`: agregar `match_id` para filtrar Realtime. Claves foráneas compuestas garantizarán que inscripción y equipo pertenecen al mismo partido. Una sola asignación por inscripción, solo para confirmados y coordenadas finitas entre 0 y 100.
- Índices para listar por partido/estado/orden y por organizador. Tipos TypeScript generados desde el esquema validado.

### Operaciones transaccionales

Todas las mutaciones que cambian confirmados, capacidad o composición publicada bloquearán primero la misma fila de `matches`, en un orden común. Las validaciones sensibles al estado se harán después de adquirir el bloqueo.

| Operación                          | Contrato                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `join_match(slug, name, position)` | Exigir sesión, bloquear partido con `SELECT ... FOR UPDATE`, validar estado y duplicados, contar confirmados e insertar `confirmed` o `waitlist`. Retornar estado e información del propio cupo sin datos privados ajenos |
| `cancel_registration(id)`          | Exigir sesión, bloquear partido, releer registro y comprobar dueño u organizador. Cancelar una sola vez; si era confirmado, promover al primero en espera. Un reintento no promueve a otra persona                        |
| Cambio de capacidad                | Solo organizador; validar par/rango y bloquear partido. Reducir: desplazar últimos confirmados. Aumentar: promover primeros en espera hasta llenar. Recalcular estado e invalidar equipos publicados cuando corresponda   |
| Alta manual                        | Solo organizador; aplicar las mismas reglas de nombre, capacidad y espera con `user_id` nulo                                                                                                                              |
| Pagos y configuración              | Solo organizador; campos permitidos explícitos, sin poder modificar dueño ni saltarse las reglas de capacidad/estado                                                                                                      |
| Guardado/publicación de equipos    | Solo organizador; validar inscritos confirmados del mismo partido y guardar ambas alineaciones atómicamente. Un error revierte todo                                                                                       |

Los RPC rechazarán explícitamente `auth.uid() IS NULL`, validarán `NULL` y límites de entrada, usarán nombres de esquema explícitos y un `search_path` controlado. Se revocará ejecución general y se concederá solo a los roles previstos. Las comprobaciones no usarán comparaciones susceptibles de permitir acceso por un resultado SQL `NULL`.

Los cambios críticos no tendrán rutas alternativas de escritura directa: un jugador no podrá alterar `paid`, `status`, `user_id` o `match_id` por REST. El organizador tampoco podrá saltarse la transacción actualizando `capacity` directamente. Las eliminaciones de participantes se implementarán como cancelaciones para preservar la promoción y el historial.

### Lecturas públicas y Realtime

RLS limita filas; no oculta columnas por sí sola. Se revocarán permisos generales y se concederá acceso público únicamente a columnas seguras. Los detalles privados del panel se obtendrán mediante operaciones con verificación de organizador. [Referencia de permisos por columna](https://supabase.com/docs/guides/database/postgres/column-level-security).

La página pública recibirá nombre, posición y estado, junto con identificadores técnicos mínimos, conteos, orden de espera y coordenadas necesarios para representarlos. No recibirá `skill`, diferencias numéricas de nivel, `user_id`, pagos ni identificadores privados de organizadores. El propio cupo se consultará con `auth.uid()` en una operación específica.

Realtime se suscribirá a `registrations` y `team_assignments` con filtro por `match_id`; también a `matches` y `teams` para capacidad, estado, nombre y color. Se solicitarán columnas seguras y se probará que otro cliente no pueda pedir columnas privadas. La selección de columnas del cliente se acompañará siempre de permisos SQL. [Referencia de Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

Después de suscribirse y al reconectar, se recargará el snapshot autorizado para cubrir cambios ocurridos durante la conexión. Las cancelaciones serán actualizaciones lógicas. Para eliminar asignaciones se emitirá además una invalidación por partido desde la base de datos, con un payload mínimo, para no depender de la entrega de un borrado filtrado. Se agruparán eventos de una transacción para evitar estados intermedios parpadeantes y se limpiarán suscripciones al salir.

## 6. Formación y edición de equipos

`src/lib/teams/balance.ts` será un módulo puro, sin Supabase ni dependencias de interfaz.

1. Normalizar entradas con identificadores estables; asignar nivel 3 a quien no tenga nivel conocido.
2. Agrupar en orden `POR`, `DEF`, `MED`, `DEL` y ordenar cada grupo por nivel descendente. Resolver empates de forma reproducible con el seed.
3. Repartir en serpiente de dos equipos (`A, B, B, A, A, B, ...`) y alternar el equipo inicial entre grupos; el seed decide el primer equipo y los desempates.
4. Ajustar excedentes de grupos impares manteniendo diferencia de tamaño total máxima de uno y diferencia por posición máxima de uno, incluida la distribución de arqueros.
5. Intercambiar únicamente jugadores de la misma posición cuando disminuya estrictamente la diferencia de nivel total. Terminar cuando no exista un intercambio individual que la mejore.
6. Retornar equipos, seed, suma de niveles y conteos por posición para el organizador. No mutar las entradas.

La verificación de «diferencia mínima» utilizará casos con óptimo conocido y comprobará ausencia de una mejora por intercambios permitidos. El algoritmo pedido garantiza un mínimo local respecto de esos intercambios; no se afirmará optimalidad global para cualquier combinación.

«Volver a sortear» generará un seed nuevo. Con niveles distintos o muchas restricciones puede repetirse una alineación válida; la UI no prometerá que siempre cambie.

El editor tendrá vista de lista con dos equipos y zona «Sin equipo», y vista de cancha SVG. dnd-kit manejará mouse, touch y teclado. Arrastrar no impedirá desplazar la página; también habrá una acción accesible para mover de equipo sin arrastrar. La cancha convertirá las coordenadas de pantalla a 0–100, respetará sus límites y guardará al soltar. Se propondrán posiciones iniciales por rol y se mantendrán las ubicaciones guardadas al cambiar de tamaño de pantalla.

Los nombres se editarán en línea con guardar/cancelar; los colores tendrán opciones accesibles. Las escrituras mostrarán progreso y recuperarán el estado del servidor si fallan. El indicador privado mostrará diferencia de nivel y conteos por posición; ni la página pública ni la imagen exportada incluirán niveles.

## 7. UX y compartir

- Dirección visual inicial: cancha, acento verde, superficies claras u oscuras y tipografía legible. Posiciones consistentes con etiqueta e ícono: POR ámbar, DEF azul, MED violeta y DEL coral. El significado no dependerá solo del color.
- Controles táctiles de al menos 44 px, foco visible, etiquetas de formulario, navegación por teclado, mensajes anunciables y respeto por movimiento reducido.
- Mensajes como «Quedan 3 cupos», «Estás confirmado» y «Estás #2 en la lista de espera». Si el último cupo se ocupa durante el envío, mostrar el resultado real de la base de datos.
- Recordar únicamente nombre y posición en `localStorage`, con manejo de almacenamiento no disponible. Cargas, errores, partido inexistente/finalizado y estados vacíos tendrán mensajes claros.
- Compartir por WhatsApp mediante `wa.me` con título, fecha, cupos restantes y enlace codificados. Copiar enlace tendrá confirmación y alternativa si el portapapeles no está disponible.
- Exportar con html-to-image una versión limpia de la cancha en PNG, esperando fuentes y evitando dependencias externas que impidan dibujarla. Usar compartir archivo cuando el navegador lo permita y descarga como alternativa.
- `generateMetadata` y la imagen Open Graph leerán únicamente datos públicos. Los cupos se consultarán al generar la respuesta, sin cachear indefinidamente la disponibilidad. WhatsApp puede conservar su propia vista previa: no se prometerá actualización inmediata de un enlace ya compartido.

## 8. Fases y criterios para avanzar

| Fase               | Entregables                                                                                                                     | Condición de salida                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Base y Supabase | Versiones alineadas, entorno, clientes Auth, migraciones, RLS/RPC, tipos y shell visual mínimo                                  | Instalación reproducible, TypeScript/lint/build; migraciones desde cero; permisos, transacciones y concurrencia aprobados; capturas del shell                  |
| 2. Organizador     | Landing, Google OAuth, `/panel`, creación, listado y jugadores frecuentes                                                       | Pruebas de acceso, validación y persistencia; cada organizador ve y cambia solo sus recursos; capturas de landing/panel/formulario                             |
| 3. Inscripción     | Página pública, sesión anónima, cupos, confirmados/espera, cancelar y Realtime; administración de participantes/capacidad/pagos | Llenado, intento extra, promoción, doble envío, reducción confirmada, pagos privados y sincronización entre navegadores; capturas públicas/admin               |
| 4. Algoritmo       | Módulo puro, pruebas y previsualización privada del equilibrio                                                                  | Tamaños, posiciones/arqueros, niveles por defecto, óptimos conocidos, mínimo local, reproducibilidad e inmutabilidad; capturas de previsualización             |
| 5. Editor          | Lista y cancha, arrastre, guardado, nombres/colores y publicación; lectura pública de alineaciones                              | Persistencia al recargar, permisos, touch/teclado, coordenadas y cambios de inscritos; recorrido E2E completo hasta renombrar equipo; capturas de ambas vistas |
| 6. Compartir       | Mensaje WhatsApp, enlace, PNG y Open Graph dinámico                                                                             | Texto/URL correctos, PNG válido revisado, metadatos sin datos privados y comprobación con una URL accesible si está disponible; capturas y PNG                 |
| 7. Entrega         | Pulido, accesibilidad, README y configuración de Vercel                                                                         | Suite completa, build de producción, revisión visual clara/oscura y guía de despliegue reproducible                                                            |

Cada fase registrará comandos ejecutados, resultados y limitaciones en un informe bajo `docs/verification/phase-N.md`. Las capturas estarán en `artifacts/phase-N/`, al menos a 390 × 844 y 1440 × 900, con ambos temas en las pantallas relevantes. Al cerrar una fase se enlazarán esos archivos como artifacts en el chat. Capturas reales y reportes se generarán al implementar; esta planificación no acredita verificaciones de UI.

Si falla una condición obligatoria, se corrige y repite el conjunto afectado. Si falta un servicio o credencial indispensable, la fase permanece pendiente y no se inicia la siguiente. La aprobación solicitada ahora habilita comenzar la fase 1; no se solicitará otra aprobación rutinaria para cada fase que ya haya pasado sus pruebas.

## 9. Plan de verificación

| Nivel                  | Casos principales                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SQL/integración        | Constraints, duplicados con mayúsculas/espacios, entradas nulas, identidad requerida, cancelación propia/ajena, pagos/configuración/equipos protegidos y lectura privada denegada                                  |
| Concurrencia           | Partido con capacidad 10, quince usuarios independientes y quince llamadas simultáneas reales a `join_match`: exactamente 10 confirmados y 5 en espera. Consultar el estado final desde una conexión independiente |
| Carreras adicionales   | Dos cancelaciones simultáneas del mismo registro no promueven dos personas; inscripción frente a cancelación/cambio de capacidad; capacidad nunca superada; empate de orden estable                                |
| Unitarias Vitest       | Algoritmo, invariantes, seeds, entradas vacías/impares, un solo arquero y dos arqueros, niveles por defecto; validaciones y generación de mensajes cuando corresponda                                              |
| E2E Playwright         | Crear → llenar → extra a espera → cancelar → promover primero → sortear → mover → renombrar → recargar y comprobar persistencia                                                                                    |
| Realtime y privacidad  | Dos contextos de navegador independientes, snapshot tras reconexión, cambios de cupos/equipos y ausencia de nivel, pagos e identidades ajenas en JSON/HTML/payloads públicos                                       |
| Visual y accesibilidad | 390 px y escritorio, ambos temas, textos largos, formularios con error, espera/lleno/vacío, foco, teclado y gestos touch                                                                                           |

Las pruebas de integración usarán PostgreSQL/Supabase real de pruebas, no mocks para acreditar concurrencia o RLS. Las llamadas usarán JWT de jugadores diferentes; una credencial administrativa se limitará a preparar y limpiar fixtures. El login de Google se verificará con el proveedor configurado; los fixtures de sesión del E2E no sustituirán esa comprobación.

Los comandos esperados para la entrega serán `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:integration`, `npm run test:e2e` y `npm run build`, una vez definidos los scripts correspondientes en la fase 1. Los tests de fases futuras se incorporarán cuando exista su funcionalidad.

## 10. Preparación de despliegue

El README final documentará instalación, variables, entorno Supabase local, aplicación de migraciones, activación de Anonymous Sign-In y Google, redirecciones para desarrollo/Vercel, Realtime, pruebas y recuperación de errores comunes. Vercel tendrá versiones de runtime compatibles y variables por entorno; la aplicación de migraciones será un paso explícito previo al uso de esa versión.

El alcance actual prepara el despliegue. La aprobación de este plan no implica publicar en una cuenta externa ni aplicar migraciones a producción.

## Estado de ejecución

El usuario aprobó el plan y pidió completar el trabajo de forma autónoma. Se continuó con Supabase local real: las fases pasaron sus suites antes de continuar y la fase 7 cerró con 93 pruebas aprobadas, capturas finales y compilación de producción correcta. Los informes en `docs/verification` conservan la evidencia por fase.

La actualización posterior del usuario reemplazó Google OAuth por un usuario y contraseña normales para un único administrador. Esta configuración ya se verificó localmente y no requiere conectar Google. El despliegue alojado sigue pendiente de conectar Supabase y Vercel; no se publicó la aplicación.

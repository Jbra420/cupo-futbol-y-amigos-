# Fase 1 — Base técnica verificada

> Informe histórico de la primera implementación. El nombre y el acceso se actualizaron después a **Fútbol y amigos**, con usuario/contraseña y un único administrador. Consulta la [verificación actual](administrator.md).

Fecha: 28 de octubre de 2026. Estado: completada en el entorno local de pruebas.

## Resultado

La base de Cupo usa Next.js 15.5.28, React 19.1.10 y TypeScript estricto. Supabase local ejecuta PostgreSQL 17, Auth, PostgREST y Realtime. Las operaciones críticas están protegidas por RPC transaccionales, restricciones, permisos SQL y RLS. La interfaz inicial está en español, tiene temas claro/oscuro y funciona en móvil y escritorio.

La fase 2 no está implementada. El botón «Organizar partido» está deshabilitado de forma explícita hasta construir el flujo de Google y el panel. No se presenta una función futura como disponible.

## Cambios

- Se conservaron las diez migraciones iniciales. Las migraciones 00011–00014 agregan integridad, restricciones de escritura, API transaccional, privacidad y normalización de nombres.
- `join_match`, cancelaciones, capacidad y guardado de alineaciones comparten el bloqueo de la fila del partido y validan el estado después de obtenerlo.
- Repetir una inscripción devuelve el mismo cupo. Repetir una cancelación no promueve otra persona. Aumentar capacidad promueve en orden; reducirla desplaza a los últimos confirmados.
- Las altas manuales usan `user_id` nulo y solo las administra el organizador. Las identidades reales de jugadores no se exponen públicamente.
- RLS aísla jugadores frecuentes por organizador. La identidad de Google se comprueba contra Auth, sin confiar en `user_metadata` editable por el usuario.
- REST no permite escribir directamente campos de inscripción, cupos, pagos o equipos. Los RPC privados verifican identidad y propiedad.
- Las lecturas públicas y la publicación Realtime usan una lista explícita de columnas seguras. `matches.revision` permite invalidar un snapshot tras pagos o eliminaciones sin transmitir esos datos privados.
- Las asignaciones validan partido, estado confirmado, unicidad y coordenadas. Cambiar confirmados invalida los equipos publicados y elimina asignaciones que ya no son válidas.
- Los tipos se generaron desde el esquema real en `src/types/supabase.ts`. Los clientes Supabase usan variables de entorno validadas y cookies de sesión compatibles con Next.js 15.
- Se incorporaron Tailwind/PostCSS, configuración shadcn/ui, un botón accesible, tema persistente y tokens de posición. El build utiliza una pila tipográfica local y no requiere descargar fuentes.
- Vitest se actualizó a 5.0.5 y PostCSS a 8.5.32 para resolver los avisos encontrados. La instalación final con `npm ci` reportó cero vulnerabilidades.

## Verificación ejecutada

| Comprobación                                               | Resultado                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm ci --no-fund --fetch-retries=1 --fetch-timeout=30000` | Instalación reproducible; cero vulnerabilidades reportadas                        |
| Arranque de Supabase local nuevo                           | Migraciones 00001–00013 aplicadas desde la base inicial                           |
| `supabase migration up --local`                            | Migración 00014 aplicada; base local actualizada                                  |
| `npm run supabase:types`                                   | Tipos generados desde PostgreSQL local                                            |
| `npm run test`                                             | 23 pruebas unitarias aprobadas con Vitest 5.0.5                                   |
| `npm run test:integration`                                 | 33 pruebas aprobadas contra Supabase real local                                   |
| `npm run typecheck`                                        | Sin errores                                                                       |
| `npm run lint`                                             | Sin errores ni advertencias de ESLint                                             |
| `npm run build`                                            | Compilación de producción exitosa con Next.js 15.5.28 y entorno local configurado |
| `npm run test:e2e -- --reporter=line`                      | 6 pruebas aprobadas contra la compilación de producción local                     |
| `git diff --check`                                         | Sin errores de formato de diff                                                    |
| Exclusión de `.env.local`                                  | Confirmada con `git check-ignore`                                                 |

Total: **62 pruebas aprobadas**, además de los controles de instalación, tipos, lint, compilación y migraciones.

### Evidencia de reglas críticas

- Quince usuarios distintos enviaron `join_match` simultáneamente a un partido con capacidad diez. Resultado: **10 confirmados y 5 en espera**, comprobado también desde una conexión PostgreSQL independiente.
- Ocho solicitudes simultáneas de un mismo usuario generaron una sola inscripción.
- Dos cancelaciones simultáneas del mismo confirmado promovieron a una sola persona, la primera en espera.
- Altas, cancelación y reducción concurrentes conservaron exactamente seis confirmados con capacidad seis.
- Empates de `created_at` se resolvieron por `id` de forma estable.
- Un jugador no pudo cancelar el cupo ajeno, marcar pagos ni cambiar campos sensibles por REST. Otro organizador no pudo administrar el partido ni leer sus niveles privados.
- Un rol `authenticated` con `auth.uid()` nulo fue rechazado. Cambiar `user_metadata` para fingir Google no concedió permisos de organizador.
- Consultas públicas manipuladas no pudieron leer pagos o identidades. Los snapshots públicos no incluyeron `skill`, `paid`, `user_id` ni `organizer_id`.
- Realtime entregó los eventos del partido correcto tanto con selección explícita de columnas como con una suscripción amplia, sin incluir campos privados.
- Guardar una alineación inválida revirtió la transacción completa. Cancelar un confirmado retiró su asignación e invalidó la publicación anterior.

La prueba de Realtime espera el evento de sistema que confirma la suscripción a PostgreSQL. Resolver únicamente la conexión del canal podía perder el primer cambio durante el arranque; esa condición se identificó y corrigió en la verificación.

## Revisión visual y artifacts

Las capturas se generaron con Chromium/Playwright sobre el build de producción, y se revisó también la página en el navegador integrado. Se comprobó idioma, ausencia de errores de página, ausencia de desbordamiento horizontal, persistencia del tema y control de tema de al menos 44 × 44 px.

| Vista                           | Claro                                                | Oscuro                                              |
| ------------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Móvil, viewport 390 × 844       | [Captura](../../artifacts/phase-1/mobile-light.png)  | [Captura](../../artifacts/phase-1/mobile-dark.png)  |
| Escritorio, viewport 1440 × 900 | [Captura](../../artifacts/phase-1/desktop-light.png) | [Captura](../../artifacts/phase-1/desktop-dark.png) |

Las imágenes capturan la página completa y por eso pueden tener más altura que el viewport.

## Configuración y límites de esta entrega

- La URL y clave pública locales se generaron en `.env.local`, ignorado por Git. No se incluyen valores en código, documentación ni artifacts. Las credenciales administrativas de tests permanecen en memoria del proceso.
- La suite se limita a Supabase local y comprueba los hosts de API y base de datos antes de preparar o eliminar fixtures. No se aplicaron migraciones a un proyecto remoto.
- Los usuarios organizadores de tests usan sesiones reales de Auth y una identidad de Google creada como fixture SQL local. **Todavía no se verificó el flujo OAuth real de Google**; corresponde a la fase 2.
- Para conectar el proyecto Supabase del usuario siguen pendientes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y tener Google habilitado en ese proyecto, con la redirección de desarrollo correspondiente.
- La lista de tareas y el plan reflejan el cierre de esta fase. El algoritmo de equipos existente conserva su condición de borrador hasta la fase 4; solo recibió una corrección de lint.

## Referencias consultadas

Se leyeron las guías locales de Next.js indicadas por `AGENTS.md` antes de modificar código. Next.js 15 no incluye esa carpeta de documentación empaquetada; para el ajuste de versión se consultó además su [guía oficial de versión 15](https://nextjs.org/docs/15/app/guides/upgrading/version-15).

Las decisiones de privacidad se contrastaron con [permisos por columna](https://supabase.com/docs/guides/database/postgres/column-level-security), [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) y [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). La configuración de componentes sigue la [guía de shadcn/ui para Next.js](https://ui.shadcn.com/docs/installation/next).

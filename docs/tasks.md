# CUPO — Lista de tareas

> Actualización del 28 de octubre de 2026: el propietario eligió **CUPO** como nombre definitivo y pidió una identidad uniforme para móvil y web. Se mantiene el acceso con **usuario y contraseña para un único administrador**, sin Google. Puede crear partidos y editar eventos programados, incluida fecha, jugadores y Google Maps. Consulta el [README actual](../README.md) y la [verificación de administrador](verification/administrator.md).

Fecha: 28 de octubre de 2026. Estado actual: CUPO tiene un administrador único con usuario/contraseña y ubicación de Google Maps dentro del partido. Se aprobaron 53 pruebas unitarias, 40 de integración SQL, 28 de navegador y la compilación de producción para la función de mapas. Supabase alojado tiene las 19 migraciones y conserva los partidos del propietario. Consulta la [configuración alojada](verification/supabase-alojado.md), la [verificación de mapas](verification/maps.md) y la [identidad de CUPO](verification/brand.md).

Leyenda: `[x]` realizado y verificado; `[ ]` pendiente. Los archivos de implementación que ya existen no se dan por terminados sin pruebas. Solo se trabaja en la fase siguiente después de pasar la condición de salida de la anterior.

## Preparación y aprobación

- [x] Leer el encargo completo y `AGENTS.md`.
- [x] Inspeccionar dependencias, rutas, SQL, algoritmo y configuraciones de pruebas existentes.
- [x] Leer las guías locales relevantes de Next.js y consultar referencias oficiales de Supabase.
- [x] Identificar la diferencia entre Next.js 16.4.3 actual y Next.js 15 solicitado.
- [x] Crear el plan de implementación y esta lista de tareas como archivos revisables.
- [x] Obtener aprobación del usuario antes de modificar la implementación.

## Fase 1 — Proyecto base, Supabase, migraciones, RLS y RPC

Depende de: aprobación del plan.

- [x] Registrar el estado inicial y revisar los cambios locales antes de integrarlos.
- [x] Verificar y fijar Next.js 15.x y versiones compatibles de React, ESLint y dependencias.
- [x] Consultar documentación de la versión elegida antes de escribir código Next.js.
- [x] Validar instalación reproducible y TypeScript estricto.
- [x] Preparar Tailwind, shadcn/ui, tokens por posición y modo claro/oscuro.
- [x] Crear scripts de typecheck, pruebas unitarias, integración y E2E.
- [x] Pedir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` cuando se vaya a conectar el proyecto.
- [x] Crear `.env.example` sin valores reales y comprobar que el entorno local esté ignorado.
- [x] Preparar Supabase local o un proyecto dedicado a pruebas con configuración reproducible.
- [x] Revisar si las migraciones existentes ya fueron aplicadas; usar migraciones nuevas para cambios de un esquema aplicado.
- [x] Completar tablas, validaciones, índices, restricciones de nombres y registro activo por sesión.
- [x] Definir el alta manual con `user_id` nulo y permisos exclusivos del organizador.
- [x] Agregar `match_id` a asignaciones y garantizar integridad entre partido, inscripción y equipo.
- [x] Implementar/corregir `join_match` con bloqueo y validación del estado bajo el bloqueo.
- [x] Implementar/corregir cancelación idempotente y promoción ordenada en la misma transacción.
- [x] Implementar cambio de capacidad: democión al reducir y promoción al aumentar.
- [x] Cerrar las rutas de escritura directa que eludan las reglas de cupos, pagos o estado.
- [x] Implementar operaciones autorizadas para altas manuales, pagos, configuración y guardado de equipos.
- [x] Definir las transiciones `open`, `full`, `teams_ready` y `finished` y la invalidación de alineaciones.
- [x] Revisar `SECURITY DEFINER`, permisos de ejecución, `search_path` y rechazo explícito de sesiones nulas.
- [x] Separar lectura pública de datos privados con RLS, permisos por columna y consultas autorizadas.
- [x] Preparar Realtime filtrado por partido, columnas seguras e invalidación de asignaciones eliminadas.
- [x] Crear clientes Supabase y manejo de cookies/sesión compatibles con Next.js 15.
- [x] Generar tipos desde el esquema y preparar fixtures de usuarios/partidos aislados.
- [x] Probar migraciones desde una base limpia, constraints y matriz de permisos.
- [x] Probar quince inscripciones simultáneas con capacidad 10: exactamente diez confirmados y cinco en espera.
- [x] Probar doble cancelación y carreras con altas/cambios de capacidad sin sobrecupos ni doble promoción.
- [x] Probar que peticiones REST/RPC/Realtime manipuladas no expongan ni modifiquen campos privados.
- [x] Pasar TypeScript, lint, build y suites aplicables a esta fase.
- [x] Verificar el shell en navegador a 390 px y escritorio; guardar capturas e informe de fase 1.
- [x] Cerrar la fase 1 con evidencia antes de iniciar la fase 2.

## Fase 2 — Panel del organizador y creación

Depende de: fase 1 aprobada por sus pruebas.

- [x] Crear landing en español y acción «Organizar partido».
- [x] Sustituir el flujo Google por usuario/contraseña y administrador único, según la actualización del usuario.
- [x] Implementar entrada, callback, cierre y recuperación de sesión.
- [x] Proteger `/panel` y `/p/[slug]/admin` y comprobar la cuenta administradora explícitamente asignada.
- [x] Crear listado de partidos con estados vacíos, carga y errores claros.
- [x] Crear formulario de partido con título, fecha/zona, lugar, capacidad par y precio opcional.
- [x] Generar slug corto único y manejar colisiones.
- [x] Crear gestión de jugadores frecuentes con posición y nivel privado 1–5.
- [x] Probar creación, validaciones, persistencia y aislamiento entre dos organizadores.
- [x] Retirar la dependencia de Google OAuth por instrucción del usuario y verificar el acceso real con usuario y contraseña.
- [x] Revisar landing, panel y formulario a 390 px y escritorio; guardar capturas e informe.
- [x] Cerrar la fase 2 con pruebas y comprobaciones de UI satisfactorias.

## Fase 3 — Inscripción pública, espera y tiempo real

Depende de: fase 2 aprobada por sus pruebas.

- [x] Cargar información pública del partido sin datos privados.
- [x] Iniciar sesión anónima automáticamente cuando haga falta y conservar sesiones existentes.
- [x] Implementar formulario de nombre y botones POR/DEF/MED/DEL con íconos y colores consistentes.
- [x] Recordar nombre/posición con `localStorage` y manejar almacenamiento no disponible.
- [x] Mostrar progreso, cupos restantes, confirmados y espera en orden.
- [x] Cambiar a «Unirme a la lista de espera» al llenarse y reflejar el resultado real de la RPC.
- [x] Mostrar estado personal y puesto en espera; permitir cancelar solo el cupo propio.
- [x] Evitar doble envío y duplicación de la sesión anónima.
- [x] Integrar Realtime para registros, capacidad y estado, con recarga del snapshot al reconectar.
- [x] Crear en admin controles de capacidad, confirmación de reducción, alta manual y cancelación.
- [x] Crear marcado de pagos con permisos y lectura exclusivos del organizador.
- [x] Probar llenado, intento extra, cancelación, promoción, nombres duplicados y aumento/reducción de capacidad.
- [x] Probar sincronización entre dos navegadores y aislamiento de datos privados.
- [x] Revisar estados vacío/lleno/espera/error/finalizado a 390 px y escritorio.
- [x] Guardar capturas e informe; cerrar la fase 3 antes de continuar.

## Fase 4 — Algoritmo de equipos

Depende de: fase 3 aprobada por sus pruebas.

- [x] Mantener el módulo puro en `src/lib/teams` con tipos explícitos.
- [x] Obtener niveles desde jugadores frecuentes del organizador y usar 3 por defecto.
- [x] Implementar orden POR/DEF/MED/DEL, niveles descendentes y desempates con seed.
- [x] Implementar serpiente A/B/B/A y alternancia del equipo inicial por grupo.
- [x] Ajustar grupos impares sin perder equilibrio de tamaños ni distribución de posiciones.
- [x] Implementar optimización por intercambios de la misma posición hasta mínimo local.
- [x] Incluir indicadores de diferencia de nivel y conteos por posición, solo para el organizador.
- [x] Agregar previsualización privada y «Volver a sortear» con seed nuevo.
- [x] Probar con Vitest: entradas vacías/impares, tamaños, arqueros, posiciones y niveles por defecto.
- [x] Probar óptimos conocidos, ausencia de intercambios que mejoren y preservación de participantes.
- [x] Probar reproducibilidad, desempates e inmutabilidad de la entrada.
- [x] Revisar previsualización a 390 px y escritorio y guardar capturas e informe.
- [x] Cerrar la fase 4 con toda la suite del algoritmo aprobada.

## Fase 5 — Editor de equipos

Depende de: fase 4 aprobada por sus pruebas.

- [x] Crear equipos y borradores con persistencia transaccional y controles exclusivos del organizador.
- [x] Integrar «Sortear balanceado» y «Armar a mano».
- [x] Crear lista arrastrable con dos equipos y zona «Sin equipo».
- [x] Configurar dnd-kit para mouse, touch y teclado, con alternativa para mover sin arrastrar.
- [x] Dibujar cancha SVG responsive con un equipo por mitad y fichas con iniciales.
- [x] Convertir coordenadas a 0–100, limitar los bordes y guardar al soltar.
- [x] Agregar edición en línea de nombres y selector de color.
- [x] Mostrar guardado, errores recuperables y avisos de desequilibrio manual.
- [x] Publicar equipos solo con cupos completos y todas las asignaciones válidas.
- [x] Actualizar equipos, posiciones, nombres y colores por Realtime.
- [x] Mostrar alineaciones públicas en consulta sin controles ni datos de nivel.
- [x] Manejar cancelaciones/promociones/capacidad posteriores al sorteo sin asignaciones inválidas.
- [x] Probar touch y teclado, recarga/persistencia y permisos frente a peticiones manipuladas.
- [x] Pasar E2E: crear → llenar → extra en espera → cancelar/promover → sortear → mover → renombrar.
- [x] Revisar lista y cancha a 390 px y escritorio, ambos temas; guardar capturas e informe.
- [x] Cerrar la fase 5 con el flujo E2E completo aprobado.

## Fase 6 — WhatsApp, PNG y Open Graph

Depende de: fase 5 aprobada por sus pruebas.

- [x] Implementar copiar enlace y alternativa si el portapapeles falla.
- [x] Crear URL `wa.me` con título, fecha, cupos restantes y link correctamente codificados.
- [x] Exportar cancha a PNG con html-to-image, fuentes listas y contenido sin niveles privados.
- [x] Ofrecer compartir archivo cuando sea compatible y descarga como alternativa.
- [x] Implementar metadatos dinámicos e imagen Open Graph por slug.
- [x] Evitar disponibilidad obsoleta por caché de la aplicación y documentar caché externa de WhatsApp.
- [x] Probar encoding, enlaces, datos de metadatos y PNG válido sin recortes en ambos tamaños.
- [x] Verificar lectura de Open Graph sin sesión y vista previa con URL accesible si está disponible.
- [x] Guardar PNG, capturas e informe; cerrar la fase 6 con evidencia.

## Fase 7 — Pulido, accesibilidad y entrega

Depende de: fase 6 aprobada por sus pruebas.

- [x] Revisar español latinoamericano, textos largos, estados vacíos, carga y errores.
- [x] Revisar claro/oscuro, contraste, foco, teclado, lectores de pantalla y objetivos táctiles de 44 px.
- [x] Revisar formularios, diálogos, anuncios Realtime y movimiento reducido.
- [x] Revisar diseño completo a 390 px y escritorio, scroll y gestos de cancha/lista.
- [x] Ejecutar TypeScript, lint, Vitest, integración con Supabase, Playwright y build de producción.
- [x] Verificar nuevamente concurrencia, aislamiento entre organizadores y ausencia de datos privados públicos.
- [x] Documentar instalación, variables, migraciones, Google, Anonymous Sign-In y Realtime en el README.
- [x] Documentar despliegue en Vercel, redirecciones, runtime, variables por entorno y aplicación de migraciones.
- [x] Adjuntar capturas finales, resultados de pruebas y limitaciones reales de la verificación.
- [x] Revisar el diff final preservando el trabajo previo del usuario y sin credenciales.
- [x] Entregar la aplicación preparada para despliegue con todas las fases verificadas localmente.

## Evidencia requerida al cerrar cada fase

- [x] `docs/verification/phase-N.md`: alcance, comandos, resultado y limitaciones.
- [x] `artifacts/phase-N/`: capturas reales a 390 × 844 y 1440 × 900.
- [x] Capturas de ambos temas y estados relevantes; PNG de alineación a partir de la fase 6.
- [x] Enlaces en el chat al informe y artifacts de esa fase.
- [x] Ninguna prueba indispensable pendiente ni fallo conocido que impida iniciar la siguiente fase.

## Comprobaciones externas diferidas

- [x] Sustituir Google por usuario/contraseña y administrador único, según la nueva instrucción del usuario.
- [x] Conectar el proyecto Supabase alojado y aplicar las 18 migraciones.
- [x] Vincular la cuenta administradora alojada existente con usuario `admin`.
- [x] Validar el despliegue de la corrección en Vercel y su formulario público.
- [ ] Comprobar el ingreso del propietario y sus operaciones con la contraseña que eligió.
- [ ] Comprobar Safari/iOS físico, la hoja nativa de compartir y la vista previa dentro de WhatsApp con una URL pública.

Estos puntos no se dan por acreditados por los fixtures ni por Chromium local. Los pasos están en el README.

## Actualización — Fútbol y amigos y administrador único

- [x] Cambiar nombre, marca, metadatos, imágenes y ejemplos sin fijar un día de la semana.
- [x] Agregar acceso con usuario y contraseña sin registro público ni Google.
- [x] Restringir la administración a una sola cuenta desde SQL, RLS, RPC y rutas.
- [x] Permitir editar fecha, lugar, nombre, precio y número de jugadores en una transacción.
- [x] Conservar acceso del administrador a eventos anteriores sin cambiar sus propietarios históricos.
- [x] Comprobar 39 pruebas unitarias, 37 de integración y compilación de producción.
- [x] Cerrar la revisión de navegador y adjuntar capturas actuales.
- [x] Dejar preparada la cuenta local y sus credenciales fuera de Git.

## Corrección de compatibilidad y prepublicación

- [x] Reproducir el fallo al abrir un partido con `crypto.randomUUID` ausente.
- [x] Corregir las llamadas del canal Realtime y del sorteo con la dependencia Nano ID existente.
- [x] Agregar una regresión de creación, edición, Realtime y publicación de equipos en móvil y escritorio.
- [x] Separar el build de verificación y ejecutar los 26 casos E2E sobre `next start` en una sola ejecución correcta.
- [x] Comprobar 39 pruebas unitarias, 37 de integración, tipos, lint y auditoría de dependencias de producción.
- [x] Registrar los pendientes reales de infraestructura y las limitaciones de la comprobación.

## Conexión a Supabase alojado

- [x] Verificar el proyecto indicado y su clave publishable activa.
- [x] Aplicar las 18 migraciones y alinear su historial con los archivos del repositorio.
- [x] Comprobar RLS, Realtime público y rechazo de columnas privadas desde la API.
- [x] Admitir la variable publishable con compatibilidad para la clave anterior.
- [x] Separar las variables locales de build y pruebas de la configuración alojada.
- [x] Aprobar 41 pruebas unitarias, 37 de integración y 26 de navegador.
- [x] Conservar la cuenta con correo creada por el propietario y asignar su permiso único.
- [x] Asociar usuario normal y correo exclusivamente en el servidor, con rechazo de configuración incompleta y nombres distintos.
- [x] Aprobar 45 pruebas unitarias, tipos, lint, build y repetir los 26 casos de navegador tras ese cambio.
- [x] Configurar las variables de producción y el dominio definitivo de Supabase; comprobar el despliegue y el rechazo de usuarios incorrectos.
- [ ] Completar el acceso real del propietario en Vercel con su contraseña elegida.

Detalles y pendientes: [Supabase alojado](verification/supabase-alojado.md).

## Ubicación dentro del partido

- [x] Agregar un enlace opcional de Google Maps al crear y editar partidos.
- [x] Mostrar el mapa y el acceso a Google Maps para los jugadores.
- [x] Resolver enlaces cortos y redirecciones de Ecuador sin solicitudes a otros servicios.
- [x] Guardar y quitar el mapa de forma transaccional y conservar los partidos anteriores.
- [x] Aplicar la migración 19 al proyecto alojado sin modificar el partido existente.
- [x] Aprobar 53 pruebas unitarias, 40 de integración, 28 de navegador y compilación de producción.
- [x] Comprobar el marcador real en un partido temporal local.

Evidencia y límites: [verificación de mapas](verification/maps.md).

## Identidad CUPO

- [x] Dibujar un logotipo vectorial original con el nombre CUPO en una sola línea.
- [x] Unificar encabezados, modo claro/oscuro, títulos y nombres accesibles.
- [x] Reemplazar favicon y generar iconos para móvil y manifiesto.
- [x] Aplicar la marca en Open Graph y alineaciones PNG.
- [x] Comprobar tipos, lint, build, 53 pruebas unitarias y los 28 casos de navegador.
- [x] Conservar las capturas actuales en `artifacts/brand` y los SVG editables en `public/brand`.

Diseño y comprobaciones: [identidad CUPO](verification/brand.md).

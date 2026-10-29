# Fútbol y amigos — Conexión con Supabase alojado

Fecha: 28 de octubre de 2026.

## Proyecto y configuración

Proyecto indicado por el propietario: `Cupo`, referencia `gexqdlgvlykuabvaqoll`, región `us-east-1`, estado `ACTIVE_HEALTHY`. Se comprobó que estaba vacío antes de instalar el esquema. La clave publishable facilitada coincide con una clave activa de ese proyecto.

La aplicación admite `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y conserva `NEXT_PUBLIC_SUPABASE_ANON_KEY` como alternativa. La publishable tiene prioridad cuando ambas contienen un valor. Se mantienen los clientes SSR, cookies y renovación de sesión existentes; no se reemplazó la aplicación por el ejemplo de `todos`.

La conexión alojada está en `.env.local`, fuera de Git. La configuración local anterior está conservada en `.local/supabase-local.env`. Los datos de Supabase local siguen en su instancia; no se trasladaron partidos de prueba al entorno alojado.

## Base de datos

- Aplicadas las 18 migraciones del repositorio, desde `00001_create_matches` hasta `00018_single_administrator`.
- Historial remoto alineado con las versiones `00001`–`00018` de los archivos locales. El transporte MCP asignó versiones temporales; se normalizaron los registros recién creados para conservar compatibilidad con futuras migraciones de la CLI.
- Cinco tablas públicas y la tabla privada del administrador único, todas con RLS activado.
- Realtime publica únicamente las columnas previstas de partidos, inscripciones, equipos y asignaciones; excluye identidades, pagos y niveles privados.
- Activados los accesos anónimos para jugadores mediante el panel. Email/contraseña está habilitado; Google y la vinculación manual permanecen deshabilitados.

## Verificación

| Comprobación                                                           | Resultado                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| API Auth con la clave publishable                                      | HTTP `200`                                                   |
| RPC pública `get_public_match` con un enlace inexistente               | HTTP `200`, resultado `null`                                 |
| Consulta directa de la columna privada `registrations.paid` sin sesión | HTTP `401`, acceso rechazado                                 |
| Historial remoto                                                       | Las 18 versiones coinciden con los archivos locales          |
| RLS y Realtime                                                         | Consultados directamente en los catálogos PostgreSQL         |
| TypeScript y ESLint                                                    | Sin errores                                                  |
| Pruebas unitarias                                                      | 41 aprobadas, incluidas prioridad y compatibilidad de claves |
| Pruebas de integración contra PostgreSQL local                         | 37 aprobadas                                                 |
| Suite de navegador sobre producción local                              | 26 aprobadas en una ejecución                                |
| Build de pruebas con `.env.local` alojado                              | Correcto usando exclusivamente el Supabase local             |

**Total de la comprobación local: 104 pruebas aprobadas** (41 unitarias, 37 de integración y 26 de navegador).

Las suites locales reemplazan tanto la URL como ambos nombres de clave con valores de la instancia local. Las credenciales administrativas de pruebas se mantienen en memoria y los fixtures rechazan endpoints remotos. No se ejecutó la suite de integración/E2E contra el proyecto alojado.

## Avisos del asesor de seguridad

El asesor no informó errores. Indicó avisos sobre funciones `SECURITY DEFINER` accesibles por API y una información sobre RLS sin políticas en `private.app_administrator`.

Son accesos previstos por este modelo: las funciones de escritura comprueban al administrador o la propiedad de la inscripción y las lecturas públicas usan una proyección explícita de columnas. La tabla privada no concede acceso directo a `anon` ni `authenticated`; la ausencia de políticas impide acceso por defecto. No se habilitaron políticas permisivas para eliminar el aviso.

Referencias del asesor: [funciones públicas elevadas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [funciones de usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sin política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Pendientes

1. Completar el formulario de creación de `admin@admin.futbolyamigos.invalid` con la contraseña generada, guardada solo en `.local/admin-production-credentials.json`. El formulario está preparado con confirmación automática. La automatización del navegador no recibe el portapapeles del sistema; el propietario debe pegarla y pulsar «Create user».
2. Asignar esa cuenta confirmada a `private.app_administrator`, con usuario `admin`, y verificar su acceso real. No existe todavía una cuenta administradora de producción asignada.
3. Comprobar que Vercel tenga las tres variables canónicas, desplegar la versión actual y ajustar Site URL de Supabase al dominio definitivo. Se detectó un proyecto `cupo-futbol-y-amigos-`, pero la conexión de Vercel rechaza su inspección con `404` y el listado de despliegues con `403`; el despliegue no se da por validado.
4. Configurar copias de seguridad, protección contra abuso y comprobación final desde el dominio público. El cambio/recuperación de contraseña desde la aplicación y CAPTCHA siguen pendientes de implementación si se requieren; la recuperación operativa actual se hace desde Supabase Auth.

La contraseña y las variables locales permanecen excluidas de Git. No se ha solicitado ni añadido una clave `service_role` a la aplicación.

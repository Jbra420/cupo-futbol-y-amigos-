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
- Vinculada la cuenta Auth confirmada que creó el propietario a `private.app_administrator` con usuario `admin`. Se conservaron su correo y contraseña.

## Usuario normal y cuenta con correo

Supabase identifica internamente la cuenta mediante correo. La ruta de ingreso convierte el usuario `admin` al correo configurado exclusivamente en el servidor mediante `SUPABASE_ADMIN_USERNAME` y `SUPABASE_ADMIN_EMAIL`. El formulario continúa pidiendo usuario y contraseña, sin publicar el correo ni aceptar otros nombres de usuario. La autorización final comprueba también la pertenencia a la tabla privada.

Ambas variables están configuradas en `.env.local` y en el entorno Production de Vercel. Una configuración incompleta rechaza el ingreso. Las pruebas locales vacían esa asociación para conservar sus cuentas temporales aisladas.

## Verificación

| Comprobación                                                           | Resultado                                                  |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| API Auth con la clave publishable                                      | HTTP `200`                                                 |
| RPC pública `get_public_match` con un enlace inexistente               | HTTP `200`, resultado `null`                               |
| Consulta directa de la columna privada `registrations.paid` sin sesión | HTTP `401`, acceso rechazado                               |
| Historial remoto                                                       | Las 18 versiones coinciden con los archivos locales        |
| RLS y Realtime                                                         | Consultados directamente en los catálogos PostgreSQL       |
| TypeScript y ESLint                                                    | Sin errores                                                |
| Pruebas unitarias                                                      | 45 aprobadas, incluidas claves y asociación usuario/correo |
| Pruebas de integración contra PostgreSQL local                         | 37 aprobadas                                               |
| Suite de navegador sobre producción local                              | 26 aprobadas en una ejecución                              |
| Build de pruebas con `.env.local` alojado                              | Correcto usando exclusivamente el Supabase local           |

**Estado de las suites: 108 pruebas aprobadas** (45 unitarias, 37 de integración y 26 de navegador). Tras agregar la asociación usuario/correo se repitieron las 45 unitarias, tipos, lint, build y los 26 casos de navegador; la integración SQL corresponde a la comprobación anterior, sin cambios posteriores en el esquema.

Las suites locales reemplazan tanto la URL como ambos nombres de clave con valores de la instancia local. Las credenciales administrativas de pruebas se mantienen en memoria y los fixtures rechazan endpoints remotos. No se ejecutó la suite de integración/E2E contra el proyecto alojado.

## Avisos del asesor de seguridad

El asesor no informó errores. Indicó avisos sobre funciones `SECURITY DEFINER` accesibles por API y una información sobre RLS sin políticas en `private.app_administrator`.

Son accesos previstos por este modelo: las funciones de escritura comprueban al administrador o la propiedad de la inscripción y las lecturas públicas usan una proyección explícita de columnas. La tabla privada no concede acceso directo a `anon` ni `authenticated`; la ausencia de políticas impide acceso por defecto. No se habilitaron políticas permisivas para eliminar el aviso.

Referencias del asesor: [funciones públicas elevadas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [funciones de usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sin política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Pendientes

1. El propietario debe comprobar el acceso público con `admin` y la contraseña que eligió en Supabase. La contraseña generada previamente y guardada localmente no corresponde a esta cuenta; se marcó como no verificada, sin cambiar la contraseña real.
2. Completar la comprobación del despliegue actualizado y ajustar Site URL de Supabase al dominio definitivo. La conexión de Vercel rechaza la inspección con `404`/`403`; su panel web sí permite revisar y configurar el proyecto.
3. Configurar copias de seguridad, protección contra abuso y comprobación final desde el dominio público. El cambio/recuperación de contraseña desde la aplicación y CAPTCHA siguen pendientes de implementación si se requieren; la recuperación operativa actual se hace desde Supabase Auth.

La contraseña y las variables locales permanecen excluidas de Git. No se ha solicitado ni añadido una clave `service_role` a la aplicación.

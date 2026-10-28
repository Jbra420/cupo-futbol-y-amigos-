# Fútbol y amigos — Administrador único y eventos editables

28 de octubre de 2026. Esta actualización sustituye el nombre Cupo y el acceso por Google de los informes anteriores.

## Resultado

- La marca, metadatos, página principal y exportaciones usan **Fútbol y amigos**, sin asociar la aplicación a un día de la semana.
- El único administrador entra con **usuario y contraseña**. No hay registro público de administradores ni acceso Google. Los jugadores siguen entrando por el enlace del partido, sin credenciales.
- `private.app_administrator` admite una sola cuenta; los permisos se comprueban en la aplicación y en SQL/RLS/RPC. Una identidad Google o cambiar `user_metadata` no concede acceso.
- El administrador crea partidos con fecha y número de jugadores y puede editar los eventos programados: nombre, fecha/hora, lugar, precio y capacidad. Los eventos anteriores siguen siendo administrables.
- Los cambios de datos y capacidad se guardan en una transacción con revisión. Si hay un error, todo vuelve al estado anterior. Reducir capacidad confirma la democión a espera; los jugadores reciben el resultado por Realtime.
- La cuenta local `admin` se prepara con `npm run admin:setup`. Su contraseña se guarda solo en `.local/admin-credentials.json`, con permisos restringidos e ignorada por Git. La aplicación no incluye contraseñas fijas en el código.

## Verificación

| Comprobación                      | Resultado                               |
| --------------------------------- | --------------------------------------- |
| TypeScript y ESLint               | Sin errores                             |
| Vitest                            | 39 pruebas aprobadas                    |
| Supabase/PostgreSQL real          | 37 pruebas aprobadas                    |
| Next.js 15.5.28, producción       | Compilación correcta                    |
| Navegador, 390 × 844 y 1440 × 900 | 24 casos E2E cubiertos y aprobados      |
| Formato y diff                    | Prettier y `git diff --check` correctos |

La ejecución completa acreditó 18 casos E2E. Se corrigieron las etiquetas accesibles de marca/capacidad y un selector de prueba que confundía una alerta con el anunciador de rutas; se repitieron los seis casos afectados y pasaron sobre la compilación actualizada. No se sustituyeron llamadas reales de autenticación por mocks.

Se comprobó usuario/contraseña correctos e incorrectos, persistencia al recargar, cierre de sesión, rechazo de rutas/API sin permisos, creación, reprogramación, reducción de jugadores con confirmación, persistencia y actualización del navegador público. La base también comprueba administrador único, rechazo de otra cuenta y de metadatos manipulados, rollback de edición y acceso a eventos anteriores. Se conserva la cobertura de concurrencia, espera, equipos, touch, teclado, privacidad, PNG y Open Graph.

La cuenta local definitiva se comprobó por separado en móvil y escritorio con el formulario real. La contraseña no se imprimió ni se incluyó en las capturas.

## Capturas actuales

- [Acceso móvil](../../artifacts/administrator/acceso-mobile.png)
- [Acceso escritorio](../../artifacts/administrator/acceso-desktop.png)
- [Panel móvil](../../artifacts/administrator/panel-mobile.png)
- [Panel escritorio](../../artifacts/administrator/panel-desktop.png)
- [Editar un partido en móvil](../../artifacts/administrator/editar-mobile.png)
- [Editar un partido en escritorio](../../artifacts/administrator/editar-desktop.png)

Las migraciones nuevas son `00017_atomic_event_edit.sql` y `00018_single_administrator.sql`; se conservaron todas las anteriores. No se modificaron servicios alojados ni se publicó la aplicación. Los pasos de configuración de la única cuenta y despliegue están en el [README](../../README.md).

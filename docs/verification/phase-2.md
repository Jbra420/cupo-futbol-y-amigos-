# Fase 2 — Panel del organizador

> Informe histórico de la primera implementación. El nombre y el acceso se actualizaron después a **Fútbol y amigos**, con usuario/contraseña y un único administrador. Consulta la [verificación actual](administrator.md).

Estado: implementación y pruebas locales aprobadas, 28 de octubre de 2026.

Se implementaron Google OAuth y callback PKCE, cierre de sesión, panel protegido, creación de partidos y gestión de jugadores frecuentes. Las peticiones de escritura verifican origen, sesión e identidad; la base de datos verifica la propiedad de cada recurso.

Verificación: 25 pruebas unitarias, TypeScript y ESLint aprobados; 12 pruebas Playwright aprobadas en 390 × 844 y 1440 × 900. Se probaron creación/persistencia de partidos, altas/ediciones/bajas de jugadores, callback inválido y rechazo de destinos externos. Las sesiones de organizador son reales de Supabase local con identidades de Google creadas exclusivamente como fixtures.

Google OAuth real en una cuenta externa sigue pendiente de autorizar/configurar el proveedor. La solicitud del usuario de continuar con todo el desarrollo permite diferir esa comprobación externa y seguir verificando cada fase contra Supabase local; no se considera un login real de Google probado.

Capturas:

| Pantalla             | Móvil                                                   | Escritorio                                               |
| -------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Panel                | [Captura](../../artifacts/phase-2/panel-mobile.png)     | [Captura](../../artifacts/phase-2/panel-desktop.png)     |
| Crear partido        | [Captura](../../artifacts/phase-2/crear-mobile.png)     | [Captura](../../artifacts/phase-2/crear-desktop.png)     |
| Jugadores frecuentes | [Captura](../../artifacts/phase-2/jugadores-mobile.png) | [Captura](../../artifacts/phase-2/jugadores-desktop.png) |
| Acceso Google        | [Captura](../../artifacts/phase-2/login-mobile.png)     | [Captura](../../artifacts/phase-2/login-desktop.png)     |

La landing se comprobó además en ambos temas. No se incorporó un acceso alternativo al panel ni credenciales administrativas en la aplicación.

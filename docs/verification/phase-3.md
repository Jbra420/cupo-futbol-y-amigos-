# Fase 3 — Inscripción y tiempo real

> Informe histórico de la primera implementación. El nombre y el acceso se actualizaron después a **Fútbol y amigos**, con usuario/contraseña y un único administrador. Consulta la [verificación actual](administrator.md).

Estado: pruebas locales aprobadas, 28 de octubre de 2026.

Página pública con sesión anónima automática, nombre/posición recordados, progreso de cupos, listas ordenadas, puesto propio en espera y cancelación. El panel administra capacidad, altas manuales, pagos y datos del partido. Realtime refresca snapshots al conectar, reconectar o recuperar visibilidad; las revisiones impiden reemplazar datos nuevos por respuestas antiguas.

TypeScript y ESLint aprobados. Los 14 E2E de la aplicación pasaron en ambos tamaños. El flujo usa ocho navegadores distintos para llenar seis cupos, dejar dos personas en espera, cancelar y promover, marcar un pago, aumentar cupos, agregar manualmente y reducir con confirmación. Las RPC mantienen las garantías de las 33 pruebas de integración de la fase 1.

| Vista         | Móvil                                                                                                                 | Escritorio                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Confirmación  | [Claro](../../artifacts/phase-3/confirmado-mobile.png) · [Oscuro](../../artifacts/phase-3/confirmado-mobile-dark.png) | [Claro](../../artifacts/phase-3/confirmado-desktop.png) · [Oscuro](../../artifacts/phase-3/confirmado-desktop-dark.png) |
| Espera        | [Captura](../../artifacts/phase-3/espera-mobile.png)                                                                  | [Captura](../../artifacts/phase-3/espera-desktop.png)                                                                   |
| Administrador | [Captura](../../artifacts/phase-3/admin-mobile.png)                                                                   | [Captura](../../artifacts/phase-3/admin-desktop.png)                                                                    |

No se exponen niveles, pagos ni identidades de jugadores en la página pública.

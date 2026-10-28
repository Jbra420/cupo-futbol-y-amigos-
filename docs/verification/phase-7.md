# Fase 7 — Revisión final y entrega local

> Informe histórico de la primera implementación. El nombre y el acceso se actualizaron después a **Fútbol y amigos**, con usuario/contraseña y un único administrador. Consulta la [verificación actual](administrator.md).

Fecha: 28 de octubre de 2026. La implementación está preparada para Vercel; no se ha publicado en servicios externos.

## Revisión realizada

Se revisaron claro/oscuro, nombres y títulos largos, foco visible, enlace para saltar al contenido, anuncios en español, movimiento reducido, formularios y controles de al menos 44 px. Se mejoró el contraste de las posiciones y textos secundarios. La lista móvil reserva el ancho completo para los nombres. Mover entre equipos busca un espacio libre para que una ficha no oculte a otra; arrastrar en la cancha conserva libertad de posición.

Las fechas usan America/Guayaquil y normalizan espacios de Intl para evitar diferencias de hidratación entre Node y Chromium. Los redirects de autenticación conservan el host real del navegador. Las respuestas de guardado y Realtime respetan las revisiones para evitar sustituir un snapshot más reciente.

## Comprobaciones

| Comando                              | Resultado                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `npm ci`                             | Instalación limpia correcta; auditoría sin vulnerabilidades notificadas            |
| `npm run typecheck`                  | Sin errores                                                                        |
| `npm run lint`                       | Sin errores                                                                        |
| `npm test`                           | 37 pruebas aprobadas                                                               |
| `npm run test:integration`           | 34 pruebas aprobadas con Supabase/PostgreSQL real                                  |
| `npm run build`                      | Producción Next.js 15.5.28 compilada; rutas privadas y de partido dinámicas        |
| `npm run test:e2e -- --workers=2`    | 22 pruebas aprobadas sobre producción (30,4 s)                                     |
| Prettier y `git diff --check`        | Formato correcto y sin errores de whitespace                                       |
| Revisión de credenciales incrustadas | Sin detecciones en código, SQL, scripts, tests y documentos; `.env.local` ignorado |

La integración incluye 15 inscripciones simultáneas para capacidad 10, cancelaciones concurrentes, promoción FIFO, cambios de capacidad, RLS, permisos por columna y eventos Realtime seguros. Los fixtures y credenciales administrativas de pruebas están limitados a la instancia local. Las primeras diez migraciones del trabajo previo se conservaron.

**Resultado final: 93 pruebas aprobadas** (37 unitarias, 34 de integración y 22 E2E).

La suite final de Playwright se ejecutó sobre `next start` después de compilar, en Chromium móvil 390 × 844 y escritorio 1440 × 900. Incluye el recorrido de creación → llenar → espera → cancelación/promoción → sortear → mover → renombrar, mouse/touch/teclado, persistencia, dos navegadores sincronizados, PNG, Open Graph sin sesión y auditoría Axe WCAG A/AA en ambos temas.

## Artifacts

- [Editor móvil claro](../../artifacts/phase-7/editor-mobile-light.png)
- [Editor móvil oscuro](../../artifacts/phase-7/editor-mobile-dark.png)
- [Editor escritorio claro](../../artifacts/phase-7/editor-desktop-light.png)
- [Editor escritorio oscuro](../../artifacts/phase-7/editor-desktop-dark.png)
- [Partido público móvil](../../artifacts/phase-7/partido-mobile-light.png)
- [Partido público escritorio](../../artifacts/phase-7/partido-desktop-dark.png)
- [PNG exportado](../../artifacts/phase-6/alineacion-mobile.png)
- [Imagen Open Graph](../../artifacts/phase-6/open-graph-desktop.png)

## Límites de la verificación

Google OAuth real, su consentimiento y la publicación requieren conectar los proyectos del propietario. Se documentaron en el [README](../../README.md) las variables, migraciones, Anonymous Sign-In, vinculación de identidades, proveedor Google, redirecciones y despliegue Vercel con Node 22. No se crearon cuentas externas ni se aplicaron migraciones a producción.

La auditoría automática no sustituye una evaluación manual completa con lector de pantalla. Touch se comprobó en Chromium; Safari/iOS físico y la hoja nativa de compartir no están acreditados. La vista previa real dentro de WhatsApp requiere una URL pública y puede mantener una caché propia.

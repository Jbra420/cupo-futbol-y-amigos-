# Fase 5 — Editor de equipos

> Informe histórico de la primera implementación. El nombre y el acceso se actualizaron después a **Fútbol y amigos**, con usuario/contraseña y un único administrador. Consulta la [verificación actual](administrator.md).

Verificación local del 28 de octubre de 2026.

El editor ofrece dos equipos y zona sin equipo, arrastre con dnd-kit y selector accesible por jugador. La cancha SVG convierte el desplazamiento a coordenadas porcentuales, limita los bordes y guarda al soltar. Nombres, colores, borradores y publicación se guardan mediante una transacción autorizada. Un número de revisión evita sobrescribir una edición concurrente; el conflicto devuelve HTTP 409 inmediatamente. Los equipos públicos son de consulta y no incluyen niveles ni pagos.

TypeScript, ESLint y 33 pruebas unitarias aprobados. Las 34 pruebas de integración con Supabase real comprueban permisos, concurrencia de cupos, invalidación de alineaciones y rechazo de revisiones antiguas. El recorrido completo de creación, seis inscripciones, espera, cancelación/promoción, sorteo, movimiento y renombrado pasó en ambos tamaños.

Las pruebas del editor ejercitan mouse en la lista, touch en la cancha móvil, teclado en la cancha de escritorio, recarga, nombres/colores, Realtime público y cierre del partido. La comprobación de errores de hidratación detectó una diferencia de espacios de Intl entre Node y Chromium, ya normalizada.

[Cancha móvil](../../artifacts/phase-5/cancha-mobile.png) · [Cancha móvil oscura](../../artifacts/phase-5/cancha-mobile-dark.png) · [Lista escritorio](../../artifacts/phase-5/lista-desktop.png) · [Cancha escritorio](../../artifacts/phase-5/cancha-desktop.png).

La comprobación touch se ejecuta en Chromium con eventos táctiles reales del protocolo del navegador; Safari/iOS físico queda fuera de esta verificación local.

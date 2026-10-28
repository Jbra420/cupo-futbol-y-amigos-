# Fase 6 — Compartir y vista previa

> Informe histórico de la primera implementación. El nombre y el acceso se actualizaron después a **Fútbol y amigos**, con usuario/contraseña y un único administrador. Consulta la [verificación actual](administrator.md).

Estado: verificación local aprobada, 28 de octubre de 2026.

Copiar enlace ofrece selección manual si el navegador rechaza el portapapeles. WhatsApp recibe título, fecha/hora de Ecuador, cupos actualizados y URL codificada. La exportación espera las fuentes, renderiza una composición pública de ancho fijo y produce PNG de 1520 px de ancho; incluye cancha y listas completas sin indicadores de nivel ni pagos. Usa compartir archivos si está disponible y descarga en los demás casos.

La página y la imagen Open Graph son dinámicas y consultan exclusivamente la proyección pública. La imagen responde con `Cache-Control: no-store`. Dos E2E pasaron en móvil y escritorio: lectura sin sesión con agente WhatsApp, metadatos antes/después de llenar, imagen OG 1200 × 630, enlace codificado, alternativa de portapapeles y descarga de PNG válido. TypeScript, ESLint y 35 pruebas unitarias aprobados.

[PNG móvil](../../artifacts/phase-6/alineacion-mobile.png) · [PNG escritorio](../../artifacts/phase-6/alineacion-desktop.png) · [Open Graph](../../artifacts/phase-6/open-graph-desktop.png) · [UI móvil](../../artifacts/phase-6/compartir-mobile.png).

Se inspeccionaron visualmente los archivos reales. La hoja nativa de compartir y la vista previa dentro de WhatsApp requieren un dispositivo y una URL pública: no se acreditan con Chromium local. WhatsApp puede conservar su propia caché aunque Cupo responda con información reciente.

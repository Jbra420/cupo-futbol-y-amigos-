# Fase 4 — Sorteo balanceado

> Informe histórico de la primera implementación. El nombre y el acceso se actualizaron después a **Fútbol y amigos**, con usuario/contraseña y un único administrador. Consulta la [verificación actual](administrator.md).

Estado: pruebas locales aprobadas, 28 de octubre de 2026.

Algoritmo puro en `src/lib/teams`: serpiente A/B/B/A, alternancia por posición, desempates por seed, ajuste de grupos impares preservando posiciones y optimización local mediante intercambios de la misma posición. Nivel desconocido: 3. La entrada no se modifica y el orden de entrada no altera el resultado de una misma semilla.

Pasaron 32 pruebas unitarias, TypeScript y ESLint. Los casos del algoritmo recorren tamaños 0–22 y múltiples seeds, verifican arqueros, un óptimo conocido, ausencia de mejoras locales pendientes, inmutabilidad y reproducibilidad. Dos E2E verificaron la previsualización privada en ambos tamaños.

[Captura móvil](../../artifacts/phase-4/equilibrio-mobile.png) · [Captura escritorio](../../artifacts/phase-4/equilibrio-desktop.png).

Se garantiza un mínimo local bajo los intercambios permitidos, no un óptimo global para toda combinación.

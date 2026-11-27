import { prefersReducedMotion } from "./motion";

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "rect" | "circle";
};

/**
 * Confeti ligero en un canvas temporal, sin dependencias. Sale desde `origin`
 * (coordenadas de la ventana) y se elimina solo al terminar.
 */
export function launchConfetti({
  colors,
  origin,
  count = 90,
}: {
  colors: string[];
  origin?: { x: number; y: number };
  count?: number;
}) {
  if (typeof document === "undefined" || prefersReducedMotion()) return;
  const canvas = document.createElement("canvas");
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.className = "confetti-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return;
  }
  context.scale(ratio, ratio);
  const start = origin ?? { x: width / 2, y: height * 0.6 };
  const pieces: Piece[] = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const speed = 7 + Math.random() * 9;
    return {
      x: start.x,
      y: start.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() < 0.7 ? "rect" : "circle",
    };
  });
  const startedAt = performance.now();
  const duration = 2200;
  function frame(now: number) {
    const elapsed = now - startedAt;
    context!.clearRect(0, 0, width, height);
    context!.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 1400) / 800);
    for (const piece of pieces) {
      piece.vy += 0.32;
      piece.vx *= 0.985;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rotation += piece.spin;
      context!.save();
      context!.translate(piece.x, piece.y);
      context!.rotate(piece.rotation);
      context!.fillStyle = piece.color;
      if (piece.shape === "rect")
        context!.fillRect(
          -piece.size / 2,
          -piece.size / 4,
          piece.size,
          piece.size / 2,
        );
      else {
        context!.beginPath();
        context!.arc(0, 0, piece.size / 3, 0, Math.PI * 2);
        context!.fill();
      }
      context!.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

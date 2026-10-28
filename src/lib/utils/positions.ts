import type { Position } from "@/types/database";

export const POSITIONS: Position[] = ["POR", "DEF", "MED", "DEL"];

export const POSITION_LABELS: Record<Position, string> = {
  POR: "Portero",
  DEF: "Defensa",
  MED: "Mediocampista",
  DEL: "Delantero",
};

export const POSITION_LABELS_SHORT: Record<Position, string> = {
  POR: "POR",
  DEF: "DEF",
  MED: "MED",
  DEL: "DEL",
};

export const POSITION_COLORS: Record<Position, string> = {
  POR: "#F59E0B", // Amarillo
  DEF: "#3B82F6", // Azul
  MED: "#7C3AED", // Violeta
  DEL: "#EF4444", // Rojo
};

export const POSITION_BG_CLASSES: Record<Position, string> = {
  POR: "bg-amber-500",
  DEF: "bg-blue-500",
  MED: "bg-violet-500",
  DEL: "bg-red-500",
};

export const POSITION_TEXT_CLASSES: Record<Position, string> = {
  POR: "text-amber-500",
  DEF: "text-blue-500",
  MED: "text-violet-500",
  DEL: "text-red-500",
};

export const POSITION_BORDER_CLASSES: Record<Position, string> = {
  POR: "border-amber-500",
  DEF: "border-blue-500",
  MED: "border-violet-500",
  DEL: "border-red-500",
};

export const POSITION_ICONS: Record<Position, string> = {
  POR: "🧤",
  DEF: "🛡️",
  MED: "⚡",
  DEL: "⚽",
};

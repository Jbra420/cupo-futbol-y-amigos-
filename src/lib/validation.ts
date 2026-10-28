import { z } from "zod";

export const playerNameSchema = z
  .string()
  .transform((name) => name.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Escribe tu nombre.")
      .max(60, "Usa un nombre de hasta 60 caracteres."),
  );

export const positionSchema = z.enum(["POR", "DEF", "MED", "DEL"], {
  error: "Elige tu posición.",
});

export const capacitySchema = z
  .number()
  .int()
  .min(6)
  .max(22)
  .refine((capacity) => capacity % 2 === 0, "Elige un número par de cupos.");

export const joinMatchSchema = z.object({
  playerName: playerNameSchema,
  position: positionSchema,
});

export function publicErrorMessage(
  error: { code?: string } | null | undefined,
): string {
  switch (error?.code) {
    case "PT409":
      return "El partido cambió en otra pantalla. Recarga el borrador antes de guardar.";
    case "23505":
      return "Ya hay una persona con ese nombre. Agrega tu apellido.";
    case "42501":
      return "No tienes permiso para realizar esta acción. Revisa tu sesión.";
    case "23514":
      return "Los cupos cambiaron. Revisa el partido e inténtalo de nuevo.";
    default:
      return "No pudimos completar la acción. Inténtalo de nuevo.";
  }
}

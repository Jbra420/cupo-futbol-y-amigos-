"use client";
import { TEAM_COLORS, sameColor, teamColorName } from "@/lib/teams/colors";
import { Jersey } from "./jersey";

/**
 * Elección del color de camiseta entre los colores básicos. El color del
 * otro equipo queda bloqueado para que no se confundan en la cancha.
 */
export function TeamColorPicker({
  label,
  name,
  value,
  rivalColor,
  disabled,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  rivalColor: string;
  disabled: boolean;
  onChange: (hex: string) => void;
}) {
  // Equipos guardados antes de la paleta conservan su color hasta que se cambie.
  const legacy = teamColorName(value) === null;
  const options = [
    ...(legacy ? [{ name: "Color actual", hex: value }] : []),
    ...TEAM_COLORS,
  ];
  return (
    <div className="team-color-picker" role="radiogroup" aria-label={label}>
      {options.map((color) => {
        const checked = sameColor(color.hex, value);
        const taken = !checked && sameColor(color.hex, rivalColor);
        return (
          <label
            key={color.hex}
            className={`color-swatch ${checked ? "is-checked" : ""} ${taken ? "is-taken" : ""}`}
            title={taken ? `${color.name}: lo usa el otro equipo` : color.name}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={color.hex}
              checked={checked}
              disabled={disabled || taken}
              onChange={() => onChange(color.hex)}
            />
            <Jersey color={color.hex} label="" size={30} />
            <span className="sr-only">
              {color.name}
              {taken ? " (lo usa el otro equipo)" : ""}
            </span>
          </label>
        );
      })}
    </div>
  );
}

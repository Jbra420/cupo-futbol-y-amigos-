import { inkOn, luminance } from "@/lib/color";

/** Camiseta vectorial con iniciales o dorsal; la tinta se ajusta al color. */
export function Jersey({
  color,
  label,
  size = 64,
  className = "",
}: {
  color: string;
  label: string;
  size?: number;
  className?: string;
}) {
  const ink = inkOn(color);
  const light = (luminance(color) ?? 0) > 0.42;
  return (
    <svg
      className={`jersey ${className}`}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22 6 12 10 3 22l9 7 4-5v34h32V24l4 5 9-7-9-12-10-4c-1 5-5 8-10 8s-9-3-10-8Z"
        fill={color}
        stroke={light ? "#0007" : "#0003"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M40 24v34h8V24l4 5 9-7-9-12-10-4z" fill="#0000001a" />
      <path
        d="M22 6c1 5 5 8 10 8s9-3 10-8"
        fill="none"
        stroke={light ? "#0005" : "#fff8"}
        strokeWidth="2"
      />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontSize={label.length > 2 ? 15 : 18}
        fontWeight="800"
        fill={ink}
        style={{ fontFamily: "inherit" }}
      >
        {label}
      </text>
    </svg>
  );
}

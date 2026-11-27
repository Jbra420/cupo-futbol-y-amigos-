/** Camiseta vectorial con iniciales o dorsal, en el color de la posición. */
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
        stroke="#0003"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 6c1 5 5 8 10 8s9-3 10-8"
        fill="none"
        stroke="#fff8"
        strokeWidth="2"
      />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontSize={label.length > 2 ? 15 : 18}
        fontWeight="800"
        fill="#fff"
        style={{ fontFamily: "inherit" }}
      >
        {label}
      </text>
    </svg>
  );
}

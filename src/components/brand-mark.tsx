import { BRAND_PATHS } from "@/lib/brand";

export function BrandMark({
  width = 152,
  ink = "currentColor",
  accent = "var(--primary)",
  ballInk = "var(--background)",
}: {
  width?: number;
  ink?: string;
  accent?: string;
  ballInk?: string;
}) {
  return (
    <svg
      className="cupo-logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 190 48"
      width={width}
      height={(width * 48) / 190}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke={ink}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={BRAND_PATHS.c} />
        <path d={BRAND_PATHS.u} />
        <path d={BRAND_PATHS.p} />
        <path d={BRAND_PATHS.o} />
      </g>
      <circle cx="35" cy="24" r="7" fill={accent} />
      <path d={BRAND_PATHS.ball} fill={ballInk} />
    </svg>
  );
}

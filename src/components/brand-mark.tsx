import { Goal } from "lucide-react";

export function BrandMark() {
  return (
    <>
      <span className="brand-icon" aria-hidden="true">
        <Goal size={23} />
      </span>
      <span className="brand-name">
        Fútbol{" "}
        <span>
          y amigos<span className="brand-period">.</span>
        </span>
      </span>
    </>
  );
}

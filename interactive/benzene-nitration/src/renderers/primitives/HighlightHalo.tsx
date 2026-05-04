import type { HighlightHalo } from "../../types";

interface HighlightHaloPrimitiveProps {
  highlight: HighlightHalo;
}

export function HighlightHaloPrimitive({ highlight }: HighlightHaloPrimitiveProps) {
  return <circle className="mechanism-svg__halo" cx={highlight.x} cy={highlight.y} r={highlight.radius} />;
}

import type { CurlyArrow } from "../../types";

interface CurlyArrowPrimitiveProps {
  arrow: CurlyArrow;
  markerId: string;
}

export function CurlyArrowPrimitive({ arrow, markerId }: CurlyArrowPrimitiveProps) {
  return (
    <path
      className="mechanism-svg__curly-arrow"
      d={`M ${arrow.from.x} ${arrow.from.y} C ${arrow.control1.x} ${arrow.control1.y}, ${arrow.control2.x} ${arrow.control2.y}, ${arrow.to.x} ${arrow.to.y}`}
      markerEnd={`url(#${markerId})`}
    />
  );
}

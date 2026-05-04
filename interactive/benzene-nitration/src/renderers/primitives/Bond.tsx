import type { Atom, Point } from "../../types";

interface BondPrimitiveProps {
  from: Atom | Point;
  to: Atom | Point;
  order?: 1 | 2;
}

export function BondPrimitive({ from, to, order = 1 }: BondPrimitiveProps) {
  if (order !== 2) {
    return <line className="mechanism-svg__bond" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = 4.2;
  const ox = Number(((-dy / length) * offset).toFixed(2));
  const oy = Number(((dx / length) * offset).toFixed(2));

  return (
    <>
      <line
        className="mechanism-svg__bond mechanism-svg__bond--double"
        x1={Number((from.x + ox).toFixed(2))}
        y1={Number((from.y + oy).toFixed(2))}
        x2={Number((to.x + ox).toFixed(2))}
        y2={Number((to.y + oy).toFixed(2))}
      />
      <line
        className="mechanism-svg__bond mechanism-svg__bond--double"
        x1={Number((from.x - ox).toFixed(2))}
        y1={Number((from.y - oy).toFixed(2))}
        x2={Number((to.x - ox).toFixed(2))}
        y2={Number((to.y - oy).toFixed(2))}
      />
    </>
  );
}

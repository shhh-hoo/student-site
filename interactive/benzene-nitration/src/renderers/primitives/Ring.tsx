import type { Ring } from "../../types";
import { getHexagonPoints } from "../geometry";

interface RingPrimitiveProps {
  ring: Ring;
}

export function RingPrimitive({ ring }: RingPrimitiveProps) {
  const points = getHexagonPoints(ring)
    .map(point => `${point.x},${point.y}`)
    .join(" ");

  return (
    <g className="mechanism-svg__ring" data-ring-id={ring.id}>
      <polygon points={points} />
      {ring.type === "aromatic" ? (
        <circle
          className="mechanism-svg__aromatic-core"
          cx={ring.cx}
          cy={ring.cy}
          r={Number((ring.radius * 0.48).toFixed(1))}
        />
      ) : null}
    </g>
  );
}

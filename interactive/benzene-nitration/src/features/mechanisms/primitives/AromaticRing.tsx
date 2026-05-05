import { hexagonPoints, polygonPointString } from "../geometry";

export function AromaticRing({ cx, cy, r, label }: { cx: number; cy: number; r: number; label?: string }) {
  const points = hexagonPoints(cx, cy, r);
  const aromaticRadius = r * 0.525;

  return (
    <g className="mechanism-svg__ring" aria-label={label ?? "aromatic ring"}>
      <polygon
        points={polygonPointString([points.c1, points.c2, points.c3, points.c4, points.c5, points.c6])}
        fill="none"
      />
      <circle className="mechanism-svg__aromatic-core" cx={cx} cy={cy} r={aromaticRadius} fill="none" />
    </g>
  );
}

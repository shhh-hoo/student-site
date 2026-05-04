import React from "react";

export type Point = [number, number];

export function SvgDefs() {
  return (
    <defs>
      <marker id="curly-arrow-head" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <path className="mechanism-svg__arrowhead" d="M 0 0 L 9 3.5 L 0 7 Q 2.4 3.5 0 0" />
      </marker>
    </defs>
  );
}

export function CurlyArrow({ d, label }: { d: string; label?: string }) {
  return (
    <g aria-label={label ?? "curly arrow"}>
      <path
        d={d}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mechanism-svg__curly-arrow-underlay"
      />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#curly-arrow-head)"
        className="mechanism-svg__curly-arrow"
      />
    </g>
  );
}

export function LonePair({ x, y, label }: { x: number; y: number; label?: string }) {
  return (
    <g aria-label={label ?? "lone pair"} className="mechanism-svg__lone-pair">
      <circle cx={x - 4} cy={y} r="1.9" fill="currentColor" />
      <circle cx={x + 4} cy={y} r="1.9" fill="currentColor" />
    </g>
  );
}

export function FormalCharge({ x, y, charge }: { x: number; y: number; charge: "+" | "−" }) {
  return (
    <text
      aria-label={`formal charge ${charge}`}
      className="mechanism-svg__formal-charge"
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {charge}
    </text>
  );
}

export function PartialCharge({ x, y, charge }: { x: number; y: number; charge: "δ+" | "δ−" }) {
  return (
    <text
      aria-label={`partial charge ${charge}`}
      className="mechanism-svg__partial-charge"
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {charge}
    </text>
  );
}

export function Bond({ from, to, order = 1, label }: { from: Point; to: Point; order?: 1 | 2; label?: string }) {
  const [x1, y1] = from;
  const [x2, y2] = to;

  if (order === 1) {
    return <line className="mechanism-svg__bond" aria-label={label ?? "single bond"} x1={x1} y1={y1} x2={x2} y2={y2} />;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const offsetX = (-dy / length) * 4;
  const offsetY = (dx / length) * 4;

  return (
    <g aria-label={label ?? "double bond"}>
      <line
        className="mechanism-svg__bond mechanism-svg__bond--double"
        x1={x1 + offsetX}
        y1={y1 + offsetY}
        x2={x2 + offsetX}
        y2={y2 + offsetY}
      />
      <line
        className="mechanism-svg__bond mechanism-svg__bond--double"
        x1={x1 - offsetX}
        y1={y1 - offsetY}
        x2={x2 - offsetX}
        y2={y2 - offsetY}
      />
    </g>
  );
}

export const ringPoints = {
  c1: [240, 130] as Point,
  c2: [292, 160] as Point,
  c3: [292, 220] as Point,
  c4: [240, 250] as Point,
  c5: [188, 220] as Point,
  c6: [188, 160] as Point,
};

export function getRingPoints(cx = 240, cy = 190, r = 60) {
  const horizontal = r * 0.866;

  return {
    c1: [cx, cy - r] as Point,
    c2: [cx + horizontal, cy - r / 2] as Point,
    c3: [cx + horizontal, cy + r / 2] as Point,
    c4: [cx, cy + r] as Point,
    c5: [cx - horizontal, cy + r / 2] as Point,
    c6: [cx - horizontal, cy - r / 2] as Point,
  };
}

function hexagonPoints(points = ringPoints) {
  return [points.c1, points.c2, points.c3, points.c4, points.c5, points.c6].map(([x, y]) => `${x},${y}`).join(" ");
}

export function BenzeneRing({ cx = 240, cy = 190, r = 60 }: { cx?: number; cy?: number; r?: number }) {
  const points = getRingPoints(cx, cy, r);

  return (
    <g className="mechanism-svg__ring" aria-label="benzene ring">
      <polygon points={hexagonPoints(points)} fill="none" />
      <circle className="mechanism-svg__aromatic-core" cx={cx} cy={cy} r={r * 0.57} fill="none" />
    </g>
  );
}

export function BrokenDelocalisationRing({ cx = 240, cy = 190, r = 60 }: { cx?: number; cy?: number; r?: number }) {
  const points = getRingPoints(cx, cy, r);
  const horseshoeTopY = cy - r * 0.28;
  const horseshoeBottomY = cy + r * 0.9;

  return (
    <g aria-label="Wheland intermediate ring with broken delocalisation horseshoe">
      <polygon className="mechanism-svg__sigma-ring-outline" points={hexagonPoints(points)} fill="none" />
      <path
        aria-label="broken delocalisation horseshoe, not aromatic circle"
        className="mechanism-svg__horseshoe"
        d={`M ${cx - r * 0.52} ${horseshoeTopY} C ${cx - r * 0.85} ${cy + r * 0.25}, ${
          cx - r * 0.4
        } ${horseshoeBottomY}, ${cx} ${horseshoeBottomY} C ${cx + r * 0.4} ${horseshoeBottomY}, ${
          cx + r * 0.85
        } ${cy + r * 0.25}, ${cx + r * 0.52} ${horseshoeTopY}`}
        fill="none"
      />
      <g aria-label="positive charge on sigma complex">
        <circle className="mechanism-svg__charge-backing" cx={cx} cy={cy + r * 0.26} r="14" />
        <FormalCharge x={cx} y={cy + r * 0.26} charge="+" />
      </g>
    </g>
  );
}

export function NitroniumIon({ x = 300, y = 66 }: { x?: number; y?: number }) {
  return (
    <g aria-label="nitronium ion, NO2+">
      <text className="mechanism-svg__atom" x={x - 48} y={y}>
        O
      </text>
      <line className="mechanism-svg__bond mechanism-svg__bond--thin" x1={x - 35} y1={y - 3} x2={x - 14} y2={y - 3} />
      <line className="mechanism-svg__bond mechanism-svg__bond--thin" x1={x - 35} y1={y + 5} x2={x - 14} y2={y + 5} />
      <text className="mechanism-svg__atom" x={x} y={y + 3}>
        N
      </text>
      <FormalCharge x={x + 15} y={y - 17} charge="+" />
      <line className="mechanism-svg__bond mechanism-svg__bond--thin" x1={x + 14} y1={y - 3} x2={x + 35} y2={y - 3} />
      <line className="mechanism-svg__bond mechanism-svg__bond--thin" x1={x + 14} y1={y + 5} x2={x + 35} y2={y + 5} />
      <text className="mechanism-svg__atom" x={x + 50} y={y}>
        O
      </text>
      <text className="mechanism-svg__small-label" x={x} y={y + 34} textAnchor="middle">
        NO₂⁺
      </text>
    </g>
  );
}

export function NitroGroup({ x = 245, y = 42 }: { x?: number; y?: number }) {
  return (
    <text className="mechanism-svg__atom" x={x} y={y} aria-label="nitro group">
      NO
      <tspan baselineShift="sub" fontSize="13">
        2
      </tspan>
    </text>
  );
}

export function HydrogensulfateBase({ x = 78, y = 54 }: { x?: number; y?: number }) {
  return (
    <g aria-label="hydrogensulfate ion with explicit oxygen lone pair">
      <text className="mechanism-svg__atom" x={x} y={y}>
        O
      </text>
      <FormalCharge x={x + 14} y={y - 17} charge="−" />
      <LonePair x={x + 22} y={y - 2} label="oxygen lone pair on hydrogensulfate" />
      <Bond from={[x + 24, y]} to={[x + 58, y]} order={1} label="O-S bond in hydrogensulfate" />
      <text className="mechanism-svg__species-text" x={x + 98} y={y} textAnchor="middle" dominantBaseline="middle">
        SO
        <tspan baselineShift="sub" fontSize="12">
          3
        </tspan>
        H
      </text>
      <text className="mechanism-svg__small-label" x={x + 52} y={y + 30} textAnchor="middle">
        HSO₄⁻ base
      </text>
    </g>
  );
}

export function ReactionConditionLabel() {
  return (
    <text className="mechanism-svg__small-label" x="240" y="328" textAnchor="middle">
      conc. HNO₃, conc. H₂SO₄, 50–55 °C
    </text>
  );
}

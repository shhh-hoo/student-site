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
    <path
      aria-label={label ?? "curly arrow"}
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      markerEnd="url(#curly-arrow-head)"
      className="mechanism-svg__curly-arrow"
    />
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
    <text className="mechanism-svg__formal-charge" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
      {charge}
    </text>
  );
}

export function PartialCharge({ x, y, charge }: { x: number; y: number; charge: "δ+" | "δ−" }) {
  return (
    <text className="mechanism-svg__partial-charge" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
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
  c1: [200, 96] as Point,
  c2: [250, 128] as Point,
  c3: [250, 192] as Point,
  c4: [200, 224] as Point,
  c5: [150, 192] as Point,
  c6: [150, 128] as Point,
};

function hexagonPoints(points = ringPoints) {
  return [points.c1, points.c2, points.c3, points.c4, points.c5, points.c6].map(([x, y]) => `${x},${y}`).join(" ");
}

export function BenzeneRing() {
  return (
    <g className="mechanism-svg__ring" aria-label="benzene ring">
      <polygon points={hexagonPoints()} fill="none" />
      <circle className="mechanism-svg__aromatic-core" cx="200" cy="160" r="34" fill="none" />
    </g>
  );
}

export function ExplicitSigmaComplexRing() {
  // One valid resonance form is shown: positive charge localised at C2.
  // C1 is the attacked sp3 carbon. C1-H and C1-NO2 are external substituent bonds.
  return (
    <g aria-label="Wheland intermediate ring with explicit bond orders">
      <Bond from={ringPoints.c1} to={ringPoints.c2} order={1} label="C1-C2 single bond" />
      <Bond from={ringPoints.c2} to={ringPoints.c3} order={1} label="C2-C3 single bond" />
      <Bond from={ringPoints.c3} to={ringPoints.c4} order={2} label="C3-C4 double bond" />
      <Bond from={ringPoints.c4} to={ringPoints.c5} order={1} label="C4-C5 single bond" />
      <Bond from={ringPoints.c5} to={ringPoints.c6} order={2} label="C5-C6 double bond" />
      <Bond from={ringPoints.c6} to={ringPoints.c1} order={1} label="C6-C1 single bond" />
      <FormalCharge x={266} y={122} charge="+" />
      <text className="mechanism-svg__small-label" x="200" y="252" textAnchor="middle">
        one resonance form of the arenium ion is shown
      </text>
    </g>
  );
}

export function ExamStyleBrokenAreniumRing() {
  return (
    <g aria-label="exam-style Wheland intermediate ring">
      <polygon points={hexagonPoints()} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
      <path
        d="M 171 136 A 38 38 0 1 0 229 136"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <FormalCharge x={200} y={160} charge="+" />
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
    <g aria-label="nitro group bonded through nitrogen">
      <text className="mechanism-svg__atom" x={x} y={y}>
        N
      </text>
      <FormalCharge x={x + 15} y={y - 16} charge="+" />
      <line className="mechanism-svg__bond mechanism-svg__bond--thin" x1={x - 12} y1={y - 8} x2={x - 34} y2={y - 27} />
      <line className="mechanism-svg__bond mechanism-svg__bond--thin" x1={x - 8} y1={y - 13} x2={x - 30} y2={y - 32} />
      <text className="mechanism-svg__atom" x={x - 48} y={y - 39}>
        O
      </text>
      <line className="mechanism-svg__bond mechanism-svg__bond--thin" x1={x + 12} y1={y - 8} x2={x + 34} y2={y - 27} />
      <text className="mechanism-svg__atom" x={x + 48} y={y - 39}>
        O
      </text>
      <FormalCharge x={x + 64} y={y - 51} charge="−" />
      <text className="mechanism-svg__small-label" x={x} y={y + 30} textAnchor="middle">
        NO₂
      </text>
    </g>
  );
}

export function HydrogensulfateBase({ x = 78, y = 54 }: { x?: number; y?: number }) {
  return (
    <g aria-label="hydrogensulfate ion with explicit oxygen lone pair">
      <text className="mechanism-svg__species-text" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
        HSO
        <tspan baselineShift="sub" fontSize="12">
          4
        </tspan>
        <tspan baselineShift="super" fontSize="12">
          −
        </tspan>
      </text>
      <LonePair x={x + 28} y={y - 18} label="oxygen lone pair on hydrogensulfate" />
      <text className="mechanism-svg__small-label" x={x} y={y + 26} textAnchor="middle">
        base
      </text>
    </g>
  );
}

export function ReactionConditionLabel() {
  return (
    <text className="mechanism-svg__small-label" x="200" y="268" textAnchor="middle">
      conc. HNO₃ / conc. H₂SO₄, 50–55 °C
    </text>
  );
}

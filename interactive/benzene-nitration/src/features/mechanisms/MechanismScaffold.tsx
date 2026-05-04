import React from "react";

import { polygonPointString } from "./geometry";
import { AromaticRing } from "./primitives/AromaticRing";
import type { ScaffoldDefinition, ScaffoldElement, TextRun } from "./types";

function renderTextRuns(text: string | TextRun[]) {
  if (typeof text === "string") {
    return text;
  }

  return text.map((run, index) => (
    <tspan key={`${run.text}-${index}`} baselineShift={run.baselineShift} fontSize={run.fontSize}>
      {run.text}
    </tspan>
  ));
}

function BondElement({ element }: { element: Extract<ScaffoldElement, { kind: "bond" }> }) {
  const order = element.order ?? 1;

  if (order === 1) {
    return (
      <line
        className={element.className ?? "mechanism-svg__bond"}
        aria-label={element.ariaLabel ?? "single bond"}
        x1={element.from.x}
        y1={element.from.y}
        x2={element.to.x}
        y2={element.to.y}
      />
    );
  }

  const dx = element.to.x - element.from.x;
  const dy = element.to.y - element.from.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const offsetX = (-dy / length) * 4;
  const offsetY = (dx / length) * 4;
  const className = element.className ?? "mechanism-svg__bond mechanism-svg__bond--double";

  return (
    <g aria-label={element.ariaLabel ?? "double bond"}>
      <line
        className={className}
        x1={element.from.x + offsetX}
        y1={element.from.y + offsetY}
        x2={element.to.x + offsetX}
        y2={element.to.y + offsetY}
      />
      <line
        className={className}
        x1={element.from.x - offsetX}
        y1={element.from.y - offsetY}
        x2={element.to.x - offsetX}
        y2={element.to.y - offsetY}
      />
    </g>
  );
}

function ScaffoldElementView({ element }: { element: ScaffoldElement }) {
  switch (element.kind) {
    case "atomLabel":
    case "text":
      return (
        <text
          className={
            element.className ?? (element.kind === "atomLabel" ? "mechanism-svg__atom" : "mechanism-svg__small-label")
          }
          aria-label={element.ariaLabel}
          x={element.x}
          y={element.y}
          textAnchor={element.textAnchor}
          dominantBaseline={element.dominantBaseline}
        >
          {renderTextRuns(element.text)}
        </text>
      );
    case "bond":
      return <BondElement element={element} />;
    case "line":
      return (
        <line
          className={element.className}
          aria-label={element.ariaLabel}
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
        />
      );
    case "polygon":
      return (
        <polygon
          className={element.className}
          aria-label={element.ariaLabel}
          points={polygonPointString(element.points)}
          fill="none"
        />
      );
    case "circle":
      return (
        <circle
          className={element.className}
          aria-label={element.ariaLabel}
          cx={element.cx}
          cy={element.cy}
          r={element.r}
          fill={element.fill ?? "none"}
        />
      );
    case "path":
      return (
        <path
          className={element.className}
          aria-label={element.ariaLabel}
          d={element.d}
          fill={element.fill ?? "none"}
        />
      );
    case "aromaticRing":
      return <AromaticRing cx={element.cx} cy={element.cy} r={element.r} label={element.ariaLabel} />;
  }
}

export function MechanismScaffold({ scaffold }: { scaffold: ScaffoldDefinition }) {
  return (
    <g className="mechanism-scaffold" data-scaffold-id={scaffold.id} data-scaffold-kind={scaffold.kind}>
      {scaffold.elements.map(element => (
        <ScaffoldElementView key={element.id} element={element} />
      ))}
    </g>
  );
}

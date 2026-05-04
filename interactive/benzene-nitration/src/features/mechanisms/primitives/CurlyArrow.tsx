import React from "react";

import { anchorPoint, boundsFromPoints, offsetArrowhead, quadraticControlPoint } from "../geometry";
import type { AnchorDefinition, CurlyArrowAnnotation, MechanismDebugOptions, MechanismPoint } from "../types";

export type CurlyArrowGeometry = {
  d: string;
  start: MechanismPoint;
  end: MechanismPoint;
  controls: MechanismPoint[];
  bounds: ReturnType<typeof boundsFromPoints>;
};

export function getCurlyArrowGeometry(
  annotation: CurlyArrowAnnotation,
  fromAnchor: AnchorDefinition,
  toAnchor: AnchorDefinition
): CurlyArrowGeometry {
  const start = anchorPoint(fromAnchor, annotation.layout.startOffset);
  const endBase = anchorPoint(toAnchor, annotation.layout.endOffset);

  if (annotation.layout.control1 && annotation.layout.control2) {
    const end = offsetArrowhead(endBase, annotation.layout.control2, annotation.layout.arrowheadOffset);
    const controls = [annotation.layout.control1, annotation.layout.control2];

    return {
      d: `M ${start.x} ${start.y} C ${controls[0].x} ${controls[0].y}, ${controls[1].x} ${controls[1].y}, ${end.x} ${end.y}`,
      start,
      end,
      controls,
      bounds: boundsFromPoints([start, ...controls, end], 10),
    };
  }

  const control = annotation.layout.control1 ?? quadraticControlPoint(start, endBase, annotation.layout.bend ?? 0);
  const end = offsetArrowhead(endBase, control, annotation.layout.arrowheadOffset);

  return {
    d: `M ${start.x} ${start.y} Q ${control.x} ${control.y}, ${end.x} ${end.y}`,
    start,
    end,
    controls: [control],
    bounds: boundsFromPoints([start, control, end], 10),
  };
}

export function CurlyArrow({
  annotation,
  fromAnchor,
  toAnchor,
  debug,
}: {
  annotation: CurlyArrowAnnotation;
  fromAnchor: AnchorDefinition;
  toAnchor: AnchorDefinition;
  debug?: MechanismDebugOptions;
}) {
  const geometry = getCurlyArrowGeometry(annotation, fromAnchor, toAnchor);
  const strokeWidth = annotation.layout.strokeWidth ?? 2.8;

  return (
    <g
      aria-label={`curly arrow from ${fromAnchor.role ?? fromAnchor.id} to ${toAnchor.role ?? toAnchor.id}`}
      className="mechanism-annotation mechanism-annotation--curly-arrow"
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
    >
      <title>{annotation.id}</title>
      <path
        d={geometry.d}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mechanism-svg__curly-arrow-underlay"
      />
      <path
        d={geometry.d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#mechanism-curly-arrow-head)"
        className="mechanism-svg__curly-arrow"
        data-electron-flow={annotation.electronFlow}
      />
      {debug?.showControlPoints ? (
        <g className="mechanism-debug__controls" aria-hidden="true">
          {geometry.controls.map((point, index) => (
            <React.Fragment key={`${annotation.id}-control-${index}`}>
              <line
                className="mechanism-debug__control-line"
                x1={index === 0 ? geometry.start.x : geometry.end.x}
                y1={index === 0 ? geometry.start.y : geometry.end.y}
                x2={point.x}
                y2={point.y}
              />
              <circle
                className="mechanism-debug__control-point"
                cx={point.x}
                cy={point.y}
                r={annotation.layout.locked ? 3.2 : 4.2}
              />
            </React.Fragment>
          ))}
          <circle className="mechanism-debug__endpoint" cx={geometry.start.x} cy={geometry.start.y} r="3.4" />
          <circle className="mechanism-debug__endpoint" cx={geometry.end.x} cy={geometry.end.y} r="3.4" />
        </g>
      ) : null}
    </g>
  );
}

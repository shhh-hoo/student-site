import { boundsFromPoints } from "../geometry";
import type { AreniumHorseshoeAnnotation, MechanismDebugOptions, MechanismPoint } from "../types";

export function getAreniumHorseshoePath(annotation: AreniumHorseshoeAnnotation) {
  return annotation.layout.segments.reduce(
    (path, segment) =>
      `${path} C ${segment.control1.x} ${segment.control1.y}, ${segment.control2.x} ${segment.control2.y}, ${segment.end.x} ${segment.end.y}`,
    `M ${annotation.layout.start.x} ${annotation.layout.start.y}`
  );
}

export function getAreniumHorseshoePoints(annotation: AreniumHorseshoeAnnotation): MechanismPoint[] {
  return [
    annotation.layout.start,
    ...annotation.layout.segments.flatMap(segment => [segment.control1, segment.control2, segment.end]),
  ];
}

export function getAreniumHorseshoeBounds(annotation: AreniumHorseshoeAnnotation) {
  return boundsFromPoints(getAreniumHorseshoePoints(annotation), 10);
}

export function AreniumHorseshoe({
  annotation,
  debug,
}: {
  annotation: AreniumHorseshoeAnnotation;
  debug?: MechanismDebugOptions;
}) {
  const d = getAreniumHorseshoePath(annotation);

  return (
    <g
      aria-label={`arenium partial delocalisation horseshoe excluding ${annotation.excludedAnchorIds.join(", ")}`}
      className="mechanism-annotation mechanism-annotation--arenium-horseshoe"
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
    >
      <title>{annotation.id}</title>
      <path
        aria-label="broken delocalisation horseshoe, not aromatic circle"
        className="mechanism-svg__horseshoe"
        d={d}
        fill="none"
        strokeWidth={annotation.layout.strokeWidth}
      />
      {debug?.showControlPoints ? (
        <g className="mechanism-debug__controls" aria-hidden="true">
          {annotation.layout.segments.map((segment, index) => {
            const prior = index === 0 ? annotation.layout.start : annotation.layout.segments[index - 1].end;

            return (
              <g key={`${annotation.id}-segment-${index}`}>
                <line
                  className="mechanism-debug__control-line"
                  x1={prior.x}
                  y1={prior.y}
                  x2={segment.control1.x}
                  y2={segment.control1.y}
                />
                <line
                  className="mechanism-debug__control-line"
                  x1={segment.end.x}
                  y1={segment.end.y}
                  x2={segment.control2.x}
                  y2={segment.control2.y}
                />
                <circle
                  className="mechanism-debug__control-point"
                  cx={segment.control1.x}
                  cy={segment.control1.y}
                  r="3.6"
                />
                <circle
                  className="mechanism-debug__control-point"
                  cx={segment.control2.x}
                  cy={segment.control2.y}
                  r="3.6"
                />
                <circle className="mechanism-debug__endpoint" cx={segment.end.x} cy={segment.end.y} r="3.1" />
              </g>
            );
          })}
          <circle
            className="mechanism-debug__endpoint"
            cx={annotation.layout.start.x}
            cy={annotation.layout.start.y}
            r="3.1"
          />
        </g>
      ) : null}
    </g>
  );
}

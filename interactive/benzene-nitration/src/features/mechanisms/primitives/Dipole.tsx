import { anchorPoint, boundsFromPoints } from "../geometry";
import type { AnchorDefinition, DipoleAnnotation } from "../types";

export function getDipoleBounds(
  annotation: DipoleAnnotation,
  fromAnchor: AnchorDefinition,
  toAnchor: AnchorDefinition
) {
  return boundsFromPoints(
    [anchorPoint(fromAnchor, annotation.layout.startOffset), anchorPoint(toAnchor, annotation.layout.endOffset)],
    8
  );
}

export function Dipole({
  annotation,
  fromAnchor,
  toAnchor,
}: {
  annotation: DipoleAnnotation;
  fromAnchor: AnchorDefinition;
  toAnchor: AnchorDefinition;
}) {
  const start = anchorPoint(fromAnchor, annotation.layout.startOffset);
  const end = anchorPoint(toAnchor, annotation.layout.endOffset);

  return (
    <g
      aria-label={`dipole from ${fromAnchor.id} to ${toAnchor.id}`}
      className="mechanism-annotation mechanism-annotation--dipole"
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
    >
      <title>{annotation.id}</title>
      <line
        className="mechanism-svg__dipole"
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        strokeWidth={annotation.layout.strokeWidth ?? 2}
        markerEnd="url(#mechanism-dipole-head)"
      />
      <text
        className="mechanism-svg__partial-charge"
        x={start.x + (annotation.layout.labelOffset?.x ?? -10)}
        y={start.y + (annotation.layout.labelOffset?.y ?? -8)}
        textAnchor="middle"
      >
        δ+
      </text>
      <text
        className="mechanism-svg__partial-charge"
        x={end.x - (annotation.layout.labelOffset?.x ?? -10)}
        y={end.y - (annotation.layout.labelOffset?.y ?? -8)}
        textAnchor="middle"
      >
        δ−
      </text>
    </g>
  );
}

import { anchorPoint, boundsFromPoints } from "../geometry";
import type { AnchorDefinition, LonePairAnnotation } from "../types";

export function getLonePairBounds(annotation: LonePairAnnotation, anchor: AnchorDefinition) {
  const center = anchorPoint(anchor, annotation.layout.offset);
  const spacing = annotation.layout.dotSpacing ?? 8;

  return boundsFromPoints(
    [
      { x: center.x - spacing / 2, y: center.y },
      { x: center.x + spacing / 2, y: center.y },
    ],
    6
  );
}

export function LonePair({ annotation, anchor }: { annotation: LonePairAnnotation; anchor: AnchorDefinition }) {
  const center = anchorPoint(anchor, annotation.layout.offset);
  const spacing = annotation.layout.dotSpacing ?? 8;
  const rotation = annotation.layout.rotation ?? 0;

  return (
    <g
      aria-label={anchor.role ? `lone pair at ${anchor.id}: ${anchor.role}` : `lone pair at ${anchor.id}`}
      className="mechanism-annotation mechanism-svg__lone-pair"
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
      transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}
    >
      <title>{annotation.id}</title>
      <circle cx={-spacing / 2} cy="0" r="1.9" fill="currentColor" />
      <circle cx={spacing / 2} cy="0" r="1.9" fill="currentColor" />
    </g>
  );
}

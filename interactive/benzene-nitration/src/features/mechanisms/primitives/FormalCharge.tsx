import { anchorPoint, boundsFromPoints } from "../geometry";
import type { AnchorDefinition, FormalChargeAnnotation } from "../types";

function displayCharge(value: FormalChargeAnnotation["value"]) {
  return value.replace("-", "−");
}

export function getFormalChargeBounds(annotation: FormalChargeAnnotation, anchor: AnchorDefinition) {
  const point = anchorPoint(anchor, annotation.layout.offset);
  const size = annotation.layout.fontSize ?? 20;

  return boundsFromPoints([point], size * 0.7);
}

export function FormalCharge({ annotation, anchor }: { annotation: FormalChargeAnnotation; anchor: AnchorDefinition }) {
  const point = anchorPoint(anchor, annotation.layout.offset);

  return (
    <text
      aria-label={`formal charge ${annotation.value} at ${anchor.id}`}
      className="mechanism-annotation mechanism-svg__formal-charge"
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
      x={point.x}
      y={point.y}
      fontSize={annotation.layout.fontSize}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      <title>{annotation.id}</title>
      {displayCharge(annotation.value)}
    </text>
  );
}

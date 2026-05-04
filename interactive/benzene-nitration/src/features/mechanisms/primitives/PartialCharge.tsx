import { anchorPoint, boundsFromPoints } from "../geometry";
import type { AnchorDefinition, PartialChargeAnnotation } from "../types";

function displayPartialCharge(value: PartialChargeAnnotation["value"]) {
  return value.replace("-", "−");
}

export function getPartialChargeBounds(annotation: PartialChargeAnnotation, anchor: AnchorDefinition) {
  const point = anchorPoint(anchor, annotation.layout.offset);
  const size = annotation.layout.fontSize ?? 13;

  return boundsFromPoints([point], size);
}

export function PartialCharge({
  annotation,
  anchor,
}: {
  annotation: PartialChargeAnnotation;
  anchor: AnchorDefinition;
}) {
  const point = anchorPoint(anchor, annotation.layout.offset);

  return (
    <text
      aria-label={`partial charge ${annotation.value} at ${anchor.id}`}
      className="mechanism-annotation mechanism-svg__partial-charge"
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
      x={point.x}
      y={point.y}
      fontSize={annotation.layout.fontSize}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      <title>{annotation.id}</title>
      {displayPartialCharge(annotation.value)}
    </text>
  );
}

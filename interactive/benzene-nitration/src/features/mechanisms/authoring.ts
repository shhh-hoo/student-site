import { anchorPoint } from "./geometry";
import type {
  AreniumHorseshoeAnnotation,
  CurlyArrowAnnotation,
  LabelAnnotation,
  MechanismAnnotation,
  MechanismPoint,
  MechanismScene,
} from "./types";

export type EditableMechanismHandle =
  | {
      annotationId: string;
      kind: "curlyArrow";
      field: "control1" | "control2" | "startOffset" | "endOffset";
    }
  | {
      annotationId: string;
      kind: "anchoredOffset";
      field: "offset";
    }
  | {
      annotationId: string;
      kind: "lonePairRotation";
      field: "rotation";
    }
  | {
      annotationId: string;
      kind: "labelPosition";
      field: "offset" | "position";
    }
  | {
      annotationId: string;
      kind: "areniumHorseshoe";
      field: "start";
    }
  | {
      annotationId: string;
      kind: "areniumHorseshoeSegment";
      segmentIndex: number;
      field: "control1" | "control2" | "end";
    };

export type EditableHandleView = {
  id: string;
  label: string;
  point: MechanismPoint;
  handle: EditableMechanismHandle;
  disabled: boolean;
};

export type LayoutOverridesExport = {
  sceneId: string;
  annotations: Record<string, { layout: MechanismAnnotation["layout"] }>;
};

export type FullAnnotationsExport = {
  sceneId: string;
  annotations: MechanismAnnotation[];
};

type LayoutOverrideInput = {
  annotations?: Record<string, { layout?: MechanismAnnotation["layout"] }>;
};

const LONE_PAIR_ROTATION_HANDLE_RADIUS = 18;

function point(x: number, y: number): MechanismPoint {
  return { x, y };
}

function deltaFromAnchor(anchor: MechanismPoint, svgPoint: MechanismPoint): MechanismPoint {
  return {
    x: svgPoint.x - anchor.x,
    y: svgPoint.y - anchor.y,
  };
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function angleFromCenter(center: MechanismPoint, pointToMeasure: MechanismPoint) {
  return Number(((Math.atan2(pointToMeasure.y - center.y, pointToMeasure.x - center.x) * 180) / Math.PI).toFixed(1));
}

function getAnnotation(annotations: MechanismAnnotation[], annotationId: string) {
  return annotations.find(annotation => annotation.id === annotationId);
}

function getSceneAnnotation(scene: MechanismScene, annotationId: string) {
  return scene.annotations.find(annotation => annotation.id === annotationId);
}

function getAnchor(scene: MechanismScene, anchorId: string) {
  return scene.anchors[anchorId];
}

export function cloneMechanismAnnotations(annotations: MechanismAnnotation[]): MechanismAnnotation[] {
  return annotations.map(annotation => ({
    ...annotation,
    layout: structuredClone(annotation.layout),
  })) as MechanismAnnotation[];
}

function updateAnnotation(
  annotations: MechanismAnnotation[],
  annotationId: string,
  updater: (annotation: MechanismAnnotation) => MechanismAnnotation
) {
  let changed = false;
  const next = annotations.map(annotation => {
    if (annotation.id !== annotationId) {
      return annotation;
    }

    const updated = updater(annotation);
    changed = updated !== annotation;
    return updated;
  });

  return changed ? next : annotations;
}

function withCurlyArrowLayout(
  annotation: CurlyArrowAnnotation,
  layout: Partial<CurlyArrowAnnotation["layout"]>
): CurlyArrowAnnotation {
  return {
    ...annotation,
    layout: {
      ...annotation.layout,
      ...layout,
    },
  };
}

function withAreniumHorseshoeLayout(
  annotation: AreniumHorseshoeAnnotation,
  layout: Partial<AreniumHorseshoeAnnotation["layout"]>
): AreniumHorseshoeAnnotation {
  return {
    ...annotation,
    layout: {
      ...annotation.layout,
      ...layout,
    },
  };
}

function withLabelLayout(annotation: LabelAnnotation, layout: Partial<LabelAnnotation["layout"]>): LabelAnnotation {
  return {
    ...annotation,
    layout: {
      ...annotation.layout,
      ...layout,
    },
  };
}

export function getDefaultHandleForAnnotation(annotation: MechanismAnnotation): EditableMechanismHandle | null {
  switch (annotation.kind) {
    case "curlyArrow":
      return {
        annotationId: annotation.id,
        kind: "curlyArrow",
        field: annotation.layout.control1 ? "control1" : "startOffset",
      };
    case "formalCharge":
    case "partialCharge":
    case "lonePair":
      return {
        annotationId: annotation.id,
        kind: "anchoredOffset",
        field: "offset",
      };
    case "label":
      return {
        annotationId: annotation.id,
        kind: "labelPosition",
        field: annotation.anchorId ? "offset" : "position",
      };
    case "areniumHorseshoe":
      return {
        annotationId: annotation.id,
        kind: "areniumHorseshoe",
        field: "start",
      };
    case "bondChange":
    case "dipole":
      return null;
  }
}

export function getHandleKey(handle: EditableMechanismHandle) {
  if (handle.kind === "areniumHorseshoeSegment") {
    return `${handle.annotationId}:${handle.kind}:${handle.segmentIndex}:${handle.field}`;
  }

  return `${handle.annotationId}:${handle.kind}:${handle.field}`;
}

export function getAnnotationHandlePoint(
  scene: MechanismScene,
  annotations: MechanismAnnotation[],
  handle: EditableMechanismHandle
): MechanismPoint | null {
  const annotation = getAnnotation(annotations, handle.annotationId);

  if (!annotation) {
    return null;
  }

  switch (handle.kind) {
    case "curlyArrow": {
      if (annotation.kind !== "curlyArrow") {
        return null;
      }

      if (handle.field === "control1") {
        return annotation.layout.control1 ?? null;
      }
      if (handle.field === "control2") {
        return annotation.layout.control2 ?? null;
      }

      const anchorId = handle.field === "startOffset" ? annotation.fromAnchorId : annotation.toAnchorId;
      const anchor = getAnchor(scene, anchorId);

      return anchor ? anchorPoint(anchor, annotation.layout[handle.field]) : null;
    }
    case "anchoredOffset": {
      if (annotation.kind !== "formalCharge" && annotation.kind !== "partialCharge" && annotation.kind !== "lonePair") {
        return null;
      }

      const anchor = getAnchor(scene, annotation.anchorId);

      return anchor ? anchorPoint(anchor, annotation.layout.offset) : null;
    }
    case "lonePairRotation": {
      if (annotation.kind !== "lonePair") {
        return null;
      }

      const anchor = getAnchor(scene, annotation.anchorId);

      if (!anchor) {
        return null;
      }

      const center = anchorPoint(anchor, annotation.layout.offset);
      const radians = degreesToRadians(annotation.layout.rotation ?? 0);

      return {
        x: Number((center.x + Math.cos(radians) * LONE_PAIR_ROTATION_HANDLE_RADIUS).toFixed(2)),
        y: Number((center.y + Math.sin(radians) * LONE_PAIR_ROTATION_HANDLE_RADIUS).toFixed(2)),
      };
    }
    case "labelPosition": {
      if (annotation.kind !== "label") {
        return null;
      }

      if (annotation.anchorId) {
        const anchor = getAnchor(scene, annotation.anchorId);

        return anchor ? anchorPoint(anchor, annotation.layout.offset) : null;
      }

      return annotation.layout.position ?? point(0, 0);
    }
    case "areniumHorseshoe": {
      return annotation.kind === "areniumHorseshoe" ? annotation.layout.start : null;
    }
    case "areniumHorseshoeSegment": {
      if (annotation.kind !== "areniumHorseshoe") {
        return null;
      }

      return annotation.layout.segments[handle.segmentIndex]?.[handle.field] ?? null;
    }
  }
}

export function getEditableHandlesForAnnotation(
  scene: MechanismScene,
  annotations: MechanismAnnotation[],
  annotation: MechanismAnnotation
): EditableHandleView[] {
  const disabled = annotation.layout.locked === true;
  const makeHandle = (label: string, handle: EditableMechanismHandle): EditableHandleView | null => {
    const pointForHandle = getAnnotationHandlePoint(scene, annotations, handle);

    return pointForHandle
      ? {
          id: getHandleKey(handle),
          label,
          point: pointForHandle,
          handle,
          disabled,
        }
      : null;
  };

  switch (annotation.kind) {
    case "curlyArrow":
      return [
        makeHandle("start offset", { annotationId: annotation.id, kind: "curlyArrow", field: "startOffset" }),
        makeHandle("end offset", { annotationId: annotation.id, kind: "curlyArrow", field: "endOffset" }),
        makeHandle("control 1", { annotationId: annotation.id, kind: "curlyArrow", field: "control1" }),
        makeHandle("control 2", { annotationId: annotation.id, kind: "curlyArrow", field: "control2" }),
      ].filter((handle): handle is EditableHandleView => Boolean(handle));
    case "formalCharge":
    case "partialCharge":
      return [
        makeHandle("offset", {
          annotationId: annotation.id,
          kind: "anchoredOffset",
          field: "offset",
        }),
      ].filter((handle): handle is EditableHandleView => Boolean(handle));
    case "lonePair":
      return [
        makeHandle("offset", {
          annotationId: annotation.id,
          kind: "anchoredOffset",
          field: "offset",
        }),
        makeHandle("rotation", {
          annotationId: annotation.id,
          kind: "lonePairRotation",
          field: "rotation",
        }),
      ].filter((handle): handle is EditableHandleView => Boolean(handle));
    case "label":
      return [
        makeHandle(annotation.anchorId ? "label offset" : "label position", {
          annotationId: annotation.id,
          kind: "labelPosition",
          field: annotation.anchorId ? "offset" : "position",
        }),
      ].filter((handle): handle is EditableHandleView => Boolean(handle));
    case "areniumHorseshoe":
      return [
        makeHandle("horseshoe start", {
          annotationId: annotation.id,
          kind: "areniumHorseshoe",
          field: "start",
        }),
        ...annotation.layout.segments.flatMap((_, segmentIndex) =>
          (["control1", "control2", "end"] as const).map(field =>
            makeHandle(`segment ${segmentIndex + 1} ${field}`, {
              annotationId: annotation.id,
              kind: "areniumHorseshoeSegment",
              segmentIndex,
              field,
            })
          )
        ),
      ].filter((handle): handle is EditableHandleView => Boolean(handle));
    case "bondChange":
    case "dipole":
      return [];
  }
}

export function updateAnnotationLayoutFromHandle(
  scene: MechanismScene,
  annotations: MechanismAnnotation[],
  handle: EditableMechanismHandle,
  svgPoint: MechanismPoint
): MechanismAnnotation[] {
  const annotation = getAnnotation(annotations, handle.annotationId);

  if (!annotation || annotation.layout.locked) {
    return annotations;
  }

  return updateAnnotation(annotations, handle.annotationId, current => {
    switch (handle.kind) {
      case "curlyArrow": {
        if (current.kind !== "curlyArrow") {
          return current;
        }

        if (handle.field === "control1" || handle.field === "control2") {
          return withCurlyArrowLayout(current, {
            [handle.field]: svgPoint,
          });
        }

        const anchorId = handle.field === "startOffset" ? current.fromAnchorId : current.toAnchorId;
        const anchor = getAnchor(scene, anchorId);

        return anchor
          ? withCurlyArrowLayout(current, {
              [handle.field]: deltaFromAnchor(anchor, svgPoint),
            })
          : current;
      }
      case "anchoredOffset": {
        if (current.kind !== "formalCharge" && current.kind !== "partialCharge" && current.kind !== "lonePair") {
          return current;
        }

        const anchor = getAnchor(scene, current.anchorId);

        return anchor
          ? {
              ...current,
              layout: {
                ...current.layout,
                offset: deltaFromAnchor(anchor, svgPoint),
              },
            }
          : current;
      }
      case "lonePairRotation": {
        if (current.kind !== "lonePair") {
          return current;
        }

        const anchor = getAnchor(scene, current.anchorId);

        return anchor
          ? {
              ...current,
              layout: {
                ...current.layout,
                rotation: angleFromCenter(anchorPoint(anchor, current.layout.offset), svgPoint),
              },
            }
          : current;
      }
      case "labelPosition": {
        if (current.kind !== "label") {
          return current;
        }

        if (current.anchorId) {
          const anchor = getAnchor(scene, current.anchorId);

          return anchor
            ? withLabelLayout(current, {
                offset: deltaFromAnchor(anchor, svgPoint),
              })
            : current;
        }

        return withLabelLayout(current, {
          position: svgPoint,
        });
      }
      case "areniumHorseshoe": {
        if (current.kind !== "areniumHorseshoe") {
          return current;
        }

        return withAreniumHorseshoeLayout(current, {
          start: svgPoint,
        });
      }
      case "areniumHorseshoeSegment": {
        if (current.kind !== "areniumHorseshoe") {
          return current;
        }

        return withAreniumHorseshoeLayout(current, {
          segments: current.layout.segments.map((segment, index) =>
            index === handle.segmentIndex
              ? {
                  ...segment,
                  [handle.field]: svgPoint,
                }
              : segment
          ),
        });
      }
    }
  });
}

export function nudgeAnnotationHandle(
  scene: MechanismScene,
  annotations: MechanismAnnotation[],
  handle: EditableMechanismHandle,
  delta: MechanismPoint
) {
  const currentPoint = getAnnotationHandlePoint(scene, annotations, handle);

  return currentPoint
    ? updateAnnotationLayoutFromHandle(scene, annotations, handle, {
        x: currentPoint.x + delta.x,
        y: currentPoint.y + delta.y,
      })
    : annotations;
}

export function resetAnnotationToSceneLayout(
  scene: MechanismScene,
  annotations: MechanismAnnotation[],
  annotationId: string
) {
  const original = getSceneAnnotation(scene, annotationId);

  if (!original) {
    return annotations;
  }

  return updateAnnotation(annotations, annotationId, current =>
    current.kind === original.kind
      ? ({
          ...current,
          layout: structuredClone(original.layout),
        } as MechanismAnnotation)
      : current
  );
}

export function createLayoutOverridesExport(
  scene: MechanismScene,
  annotations: MechanismAnnotation[]
): LayoutOverridesExport {
  return {
    sceneId: scene.id,
    annotations: Object.fromEntries(
      annotations.map(annotation => [
        annotation.id,
        {
          layout: annotation.layout,
        },
      ])
    ),
  };
}

export function createFullAnnotationsExport(
  scene: MechanismScene,
  annotations: MechanismAnnotation[]
): FullAnnotationsExport {
  return {
    sceneId: scene.id,
    annotations,
  };
}

export function createSelectedAnnotationExport(annotations: MechanismAnnotation[], annotationId?: string | null) {
  return annotationId ? (getAnnotation(annotations, annotationId) ?? null) : null;
}

export function applyLayoutOverrides(
  annotations: MechanismAnnotation[],
  overrides: LayoutOverrideInput
): MechanismAnnotation[] {
  const byId = overrides.annotations ?? {};

  return annotations.map(annotation => ({
    ...annotation,
    layout: {
      ...annotation.layout,
      ...(byId[annotation.id]?.layout ?? {}),
    },
  })) as MechanismAnnotation[];
}

export function describeAnnotationSemantics(annotation: MechanismAnnotation) {
  switch (annotation.kind) {
    case "curlyArrow":
    case "dipole":
    case "bondChange":
      return `from ${annotation.fromAnchorId} → ${annotation.toAnchorId}`;
    case "lonePair":
    case "formalCharge":
    case "partialCharge":
    case "areniumHorseshoe":
      return `anchor ${annotation.anchorId}`;
    case "label":
      return annotation.anchorId ? `label anchor ${annotation.anchorId}` : "manual label position";
  }
}

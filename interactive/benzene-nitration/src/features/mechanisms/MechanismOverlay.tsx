import React from "react";

import { anchorPoint, boundsFromPoints, type Bounds } from "./geometry";
import {
  describeAnnotationSemantics,
  getEditableHandlesForAnnotation,
  getHandleKey,
  type EditableMechanismHandle,
} from "./authoring";
import { AreniumHorseshoe, getAreniumHorseshoeBounds } from "./primitives/AreniumHorseshoe";
import { CurlyArrow, getCurlyArrowGeometry } from "./primitives/CurlyArrow";
import { Dipole, getDipoleBounds } from "./primitives/Dipole";
import { FormalCharge, getFormalChargeBounds } from "./primitives/FormalCharge";
import { LonePair, getLonePairBounds } from "./primitives/LonePair";
import { PartialCharge, getPartialChargeBounds } from "./primitives/PartialCharge";
import type {
  AnchorDefinition,
  BondChangeAnnotation,
  LabelAnnotation,
  MechanismAnnotation,
  MechanismDebugOptions,
  MechanismScene,
  TextRun,
} from "./types";

export type MechanismOverlayAuthoring = {
  selectedAnnotationId: string | null;
  selectedHandle: EditableMechanismHandle | null;
  onSelectAnnotation: (annotationId: string) => void;
  onBeginHandleDrag: (event: React.PointerEvent<SVGElement>, handle: EditableMechanismHandle) => void;
};

function defaultZIndex(annotation: MechanismAnnotation) {
  switch (annotation.kind) {
    case "curlyArrow":
      return 10;
    case "bondChange":
      return 15;
    case "areniumHorseshoe":
      return 20;
    case "dipole":
      return 30;
    case "lonePair":
      return 40;
    case "formalCharge":
    case "partialCharge":
    case "label":
      return 50;
  }
}

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

function getAnchor(scene: MechanismScene, anchorId: string) {
  return scene.anchors[anchorId];
}

function Label({ annotation, anchor }: { annotation: LabelAnnotation; anchor?: AnchorDefinition }) {
  const point = anchor ? anchorPoint(anchor, annotation.layout.offset) : (annotation.layout.position ?? { x: 0, y: 0 });

  return (
    <text
      aria-label={
        annotation.chemicallyLinked && anchor
          ? `label ${annotation.id} linked to ${anchor.id}`
          : `label ${annotation.id}`
      }
      className={`mechanism-annotation ${annotation.layout.className ?? "mechanism-svg__small-label"}`}
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
      x={point.x}
      y={point.y}
      fontSize={annotation.layout.fontSize}
      textAnchor={annotation.layout.align ?? "middle"}
    >
      <title>{annotation.id}</title>
      {renderTextRuns(annotation.text)}
    </text>
  );
}

function BondChange({
  annotation,
  fromAnchor,
  toAnchor,
}: {
  annotation: BondChangeAnnotation;
  fromAnchor: AnchorDefinition;
  toAnchor: AnchorDefinition;
}) {
  const start = anchorPoint(fromAnchor, annotation.layout.startOffset);
  const end = anchorPoint(toAnchor, annotation.layout.endOffset);

  return (
    <line
      aria-label={`${annotation.change} bond annotation from ${fromAnchor.id} to ${toAnchor.id}`}
      className="mechanism-annotation mechanism-svg__bond-change"
      data-annotation-id={annotation.id}
      data-locked={annotation.layout.locked ? "true" : undefined}
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      strokeWidth={annotation.layout.strokeWidth ?? 3}
    >
      <title>{annotation.id}</title>
    </line>
  );
}

function getLabelBounds(annotation: LabelAnnotation, anchor?: AnchorDefinition): Bounds {
  const point = anchor ? anchorPoint(anchor, annotation.layout.offset) : (annotation.layout.position ?? { x: 0, y: 0 });
  const text = typeof annotation.text === "string" ? annotation.text : annotation.text.map(run => run.text).join("");
  const fontSize = annotation.layout.fontSize ?? 12;
  const width = Math.max(fontSize * 1.2, text.length * fontSize * 0.54);
  const align = annotation.layout.align ?? "middle";
  const x = align === "middle" ? point.x - width / 2 : align === "end" ? point.x - width : point.x;

  return {
    x,
    y: point.y - fontSize,
    width,
    height: fontSize * 1.45,
  };
}

function getBondChangeBounds(
  annotation: BondChangeAnnotation,
  fromAnchor: AnchorDefinition,
  toAnchor: AnchorDefinition
): Bounds {
  return boundsFromPoints(
    [anchorPoint(fromAnchor, annotation.layout.startOffset), anchorPoint(toAnchor, annotation.layout.endOffset)],
    8
  );
}

function getAnnotationBounds(scene: MechanismScene, annotation: MechanismAnnotation): Bounds | null {
  switch (annotation.kind) {
    case "curlyArrow": {
      const fromAnchor = getAnchor(scene, annotation.fromAnchorId);
      const toAnchor = getAnchor(scene, annotation.toAnchorId);

      return fromAnchor && toAnchor ? getCurlyArrowGeometry(annotation, fromAnchor, toAnchor).bounds : null;
    }
    case "lonePair": {
      const anchor = getAnchor(scene, annotation.anchorId);

      return anchor ? getLonePairBounds(annotation, anchor) : null;
    }
    case "formalCharge": {
      const anchor = getAnchor(scene, annotation.anchorId);

      return anchor ? getFormalChargeBounds(annotation, anchor) : null;
    }
    case "partialCharge": {
      const anchor = getAnchor(scene, annotation.anchorId);

      return anchor ? getPartialChargeBounds(annotation, anchor) : null;
    }
    case "dipole": {
      const fromAnchor = getAnchor(scene, annotation.fromAnchorId);
      const toAnchor = getAnchor(scene, annotation.toAnchorId);

      return fromAnchor && toAnchor ? getDipoleBounds(annotation, fromAnchor, toAnchor) : null;
    }
    case "label":
      return getLabelBounds(annotation, annotation.anchorId ? getAnchor(scene, annotation.anchorId) : undefined);
    case "bondChange": {
      const fromAnchor = getAnchor(scene, annotation.fromAnchorId);
      const toAnchor = getAnchor(scene, annotation.toAnchorId);

      return fromAnchor && toAnchor ? getBondChangeBounds(annotation, fromAnchor, toAnchor) : null;
    }
    case "areniumHorseshoe":
      return getAreniumHorseshoeBounds(annotation);
  }
}

function AnnotationView({
  scene,
  annotation,
  debug,
  authoring,
}: {
  scene: MechanismScene;
  annotation: MechanismAnnotation;
  debug?: MechanismDebugOptions;
  authoring?: MechanismOverlayAuthoring;
}) {
  const selected = authoring?.selectedAnnotationId === annotation.id;
  const selectable = Boolean(authoring);
  const handlePointerDown = selectable
    ? (event: React.PointerEvent<SVGGElement>) => {
        event.stopPropagation();
        authoring?.onSelectAnnotation(annotation.id);
      }
    : undefined;
  const className = [
    "mechanism-annotation-shell",
    selected ? "mechanism-annotation-shell--selected" : "",
    annotation.layout.locked ? "mechanism-annotation-shell--locked" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const child = (() => {
    switch (annotation.kind) {
      case "curlyArrow": {
        const fromAnchor = getAnchor(scene, annotation.fromAnchorId);
        const toAnchor = getAnchor(scene, annotation.toAnchorId);

        return fromAnchor && toAnchor ? (
          <CurlyArrow annotation={annotation} fromAnchor={fromAnchor} toAnchor={toAnchor} debug={debug} />
        ) : null;
      }
      case "lonePair": {
        const anchor = getAnchor(scene, annotation.anchorId);

        return anchor ? <LonePair annotation={annotation} anchor={anchor} /> : null;
      }
      case "formalCharge": {
        const anchor = getAnchor(scene, annotation.anchorId);

        return anchor ? <FormalCharge annotation={annotation} anchor={anchor} /> : null;
      }
      case "partialCharge": {
        const anchor = getAnchor(scene, annotation.anchorId);

        return anchor ? <PartialCharge annotation={annotation} anchor={anchor} /> : null;
      }
      case "dipole": {
        const fromAnchor = getAnchor(scene, annotation.fromAnchorId);
        const toAnchor = getAnchor(scene, annotation.toAnchorId);

        return fromAnchor && toAnchor ? (
          <Dipole annotation={annotation} fromAnchor={fromAnchor} toAnchor={toAnchor} />
        ) : null;
      }
      case "label":
        return (
          <Label
            annotation={annotation}
            anchor={annotation.anchorId ? getAnchor(scene, annotation.anchorId) : undefined}
          />
        );
      case "bondChange": {
        const fromAnchor = getAnchor(scene, annotation.fromAnchorId);
        const toAnchor = getAnchor(scene, annotation.toAnchorId);

        return fromAnchor && toAnchor ? (
          <BondChange annotation={annotation} fromAnchor={fromAnchor} toAnchor={toAnchor} />
        ) : null;
      }
      case "areniumHorseshoe":
        return <AreniumHorseshoe annotation={annotation} debug={debug} />;
    }
  })();

  if (!child) {
    return null;
  }

  return (
    <g
      className={className}
      data-selected={selected ? "true" : undefined}
      data-annotation-id={annotation.id}
      onPointerDown={handlePointerDown}
    >
      {child}
    </g>
  );
}

function EditableHandles({
  scene,
  annotations,
  debug,
  authoring,
}: {
  scene: MechanismScene;
  annotations: MechanismAnnotation[];
  debug?: MechanismDebugOptions;
  authoring: MechanismOverlayAuthoring;
}) {
  const selectedAnnotation = authoring.selectedAnnotationId
    ? (annotations.find(annotation => annotation.id === authoring.selectedAnnotationId) ?? null)
    : null;
  const visibleAnnotations = annotations.filter(
    annotation => annotation.id === authoring.selectedAnnotationId || debug?.showControlPoints
  );

  return (
    <g className="mechanism-author-handles" aria-hidden="true">
      {visibleAnnotations.flatMap(annotation =>
        getEditableHandlesForAnnotation(scene, annotations, annotation).map(handleView => {
          const selectedHandle = authoring.selectedHandle
            ? getHandleKey(authoring.selectedHandle) === getHandleKey(handleView.handle)
            : false;
          const selectedAnnotationHandle = annotation.id === authoring.selectedAnnotationId;

          return (
            <g
              key={handleView.id}
              className={[
                "mechanism-author-handle",
                selectedAnnotationHandle
                  ? "mechanism-author-handle--selected-annotation"
                  : "mechanism-author-handle--ghost",
                selectedHandle ? "mechanism-author-handle--selected" : "",
                handleView.disabled ? "mechanism-author-handle--disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              transform={`translate(${handleView.point.x} ${handleView.point.y})`}
              onPointerDown={event => {
                if (handleView.disabled) {
                  event.stopPropagation();
                  authoring.onSelectAnnotation(annotation.id);
                  return;
                }

                authoring.onBeginHandleDrag(event, handleView.handle);
              }}
            >
              <circle className="mechanism-author-handle__ring" r="7" />
              <circle className="mechanism-author-handle__dot" r="3.2" />
              <title>{`${annotation.id}: ${handleView.label}`}</title>
            </g>
          );
        })
      )}
      {selectedAnnotation ? <SelectedAnnotationCallout scene={scene} annotation={selectedAnnotation} /> : null}
    </g>
  );
}

function SelectedAnnotationCallout({ scene, annotation }: { scene: MechanismScene; annotation: MechanismAnnotation }) {
  const bounds = getAnnotationBounds(scene, annotation);

  if (!bounds) {
    return null;
  }

  const x = bounds.x;
  const y = Math.max(14, bounds.y - 10);

  return (
    <g className="mechanism-author-selection-label" aria-hidden="true">
      <rect x={x - 4} y={y - 12} width={Math.max(126, annotation.id.length * 6.4)} height="17" rx="5" />
      <text x={x} y={y}>
        {annotation.id}
      </text>
      <text x={x} y={y + 12}>
        {describeAnnotationSemantics(annotation)}
      </text>
    </g>
  );
}

function DebugAnchors({ scene, showHitboxes }: { scene: MechanismScene; showHitboxes?: boolean }) {
  return (
    <g className="mechanism-debug__anchors" aria-hidden="true">
      {Object.values(scene.anchors).map(anchor => (
        <g key={anchor.id} className="mechanism-debug__anchor">
          {showHitboxes ? <circle className="mechanism-debug__hitbox" cx={anchor.x} cy={anchor.y} r="10" /> : null}
          <circle className="mechanism-debug__anchor-dot" cx={anchor.x} cy={anchor.y} r="3.2" />
          <text className="mechanism-debug__anchor-label" x={anchor.x + 6} y={anchor.y - 6}>
            {anchor.id}
          </text>
          <title>{anchor.role ?? anchor.id}</title>
        </g>
      ))}
    </g>
  );
}

function DebugBounds({ scene, annotations }: { scene: MechanismScene; annotations: MechanismAnnotation[] }) {
  return (
    <g className="mechanism-debug__bounds" aria-hidden="true">
      {annotations.map(annotation => {
        const bounds = getAnnotationBounds(scene, annotation);

        return bounds ? (
          <rect
            key={annotation.id}
            className="mechanism-debug__bounds-rect"
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
          />
        ) : null;
      })}
    </g>
  );
}

export function MechanismOverlay({
  scene,
  debug,
  authoring,
}: {
  scene: MechanismScene;
  debug?: MechanismDebugOptions;
  authoring?: MechanismOverlayAuthoring;
}) {
  const annotations = [...scene.annotations].sort(
    (a, b) => (a.layout.zIndex ?? defaultZIndex(a)) - (b.layout.zIndex ?? defaultZIndex(b))
  );

  return (
    <g className="mechanism-overlay" data-scene-id={scene.id}>
      {annotations.map(annotation => (
        <AnnotationView key={annotation.id} scene={scene} annotation={annotation} debug={debug} authoring={authoring} />
      ))}
      {debug?.showAnnotationBounds ? <DebugBounds scene={scene} annotations={annotations} /> : null}
      {debug?.showAnchors ? <DebugAnchors scene={scene} showHitboxes={debug.showHitboxes} /> : null}
      {authoring ? (
        <EditableHandles scene={scene} annotations={annotations} debug={debug} authoring={authoring} />
      ) : null}
    </g>
  );
}

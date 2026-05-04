import React from "react";

import { anchorPoint, boundsFromPoints, type Bounds } from "./geometry";
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
}: {
  scene: MechanismScene;
  annotation: MechanismAnnotation;
  debug?: MechanismDebugOptions;
}) {
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

export function MechanismOverlay({ scene, debug }: { scene: MechanismScene; debug?: MechanismDebugOptions }) {
  const annotations = [...scene.annotations].sort(
    (a, b) => (a.layout.zIndex ?? defaultZIndex(a)) - (b.layout.zIndex ?? defaultZIndex(b))
  );

  return (
    <g className="mechanism-overlay" data-scene-id={scene.id}>
      {annotations.map(annotation => (
        <AnnotationView key={annotation.id} scene={scene} annotation={annotation} debug={debug} />
      ))}
      {debug?.showAnnotationBounds ? <DebugBounds scene={scene} annotations={annotations} /> : null}
      {debug?.showAnchors ? <DebugAnchors scene={scene} showHitboxes={debug.showHitboxes} /> : null}
    </g>
  );
}

export function extractSerializableAnnotationLayout(scene: MechanismScene) {
  return {
    sceneId: scene.id,
    annotations: scene.annotations.map(annotation => ({
      id: annotation.id,
      kind: annotation.kind,
      layout: annotation.layout,
    })),
  };
}

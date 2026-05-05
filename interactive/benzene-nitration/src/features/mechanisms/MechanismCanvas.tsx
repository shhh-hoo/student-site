import { useCallback, useRef } from "react";
import type React from "react";

import { MechanismOverlay } from "./MechanismOverlay";
import { MechanismScaffold } from "./MechanismScaffold";
import type { EditableMechanismHandle } from "./authoring";
import type { MechanismAnnotation, MechanismDebugOptions, MechanismPoint, MechanismScene } from "./types";

export type MechanismCanvasAuthoring = {
  selectedAnnotationId: string | null;
  selectedHandle: EditableMechanismHandle | null;
  isDragging: boolean;
  selectAnnotation: (annotationId: string) => void;
  beginDrag: (handle: EditableMechanismHandle) => void;
  dragSelectedHandleTo: (point: MechanismPoint) => void;
  endDrag: () => void;
  nudgeSelectedHandle: (delta: MechanismPoint) => void;
  clearSelection: () => void;
  resetSelectedAnnotation: () => void;
};

export function svgPointFromPointerEvent(svg: SVGSVGElement | null, event: Pick<PointerEvent, "clientX" | "clientY">) {
  if (!svg) {
    return null;
  }

  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return null;
  }

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  const svgPoint = point.matrixTransform(matrix.inverse());

  return {
    x: Number(svgPoint.x.toFixed(2)),
    y: Number(svgPoint.y.toFixed(2)),
  };
}

export function MechanismSvgDefs() {
  return (
    <defs>
      <marker id="mechanism-curly-arrow-head" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
        <path className="mechanism-svg__arrowhead" d="M 0 0 L 9.6 4 L 0 8 C 2.8 5.2 2.8 2.8 0 0" />
      </marker>
      <marker id="mechanism-dipole-head" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
        <path className="mechanism-svg__arrowhead" d="M 0 0 L 7.8 3.5 L 0 7 Z" />
      </marker>
    </defs>
  );
}

export function MechanismCanvas({
  scene,
  debug,
  titleId,
  annotations,
  authoring,
}: {
  scene: MechanismScene;
  debug?: MechanismDebugOptions;
  titleId: string;
  annotations?: MechanismAnnotation[];
  authoring?: MechanismCanvasAuthoring;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const renderScene = annotations
    ? {
        ...scene,
        annotations,
      }
    : scene;
  const editable = Boolean(authoring);

  const handleSelectAnnotation = useCallback(
    (annotationId: string) => {
      authoring?.selectAnnotation(annotationId);
      svgRef.current?.focus();
    },
    [authoring]
  );

  const handleBeginHandleDrag = useCallback(
    (event: React.PointerEvent<SVGElement>, handle: EditableMechanismHandle) => {
      if (!authoring) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      svgRef.current?.focus();
      svgRef.current?.setPointerCapture(event.pointerId);
      authoring.beginDrag(handle);
    },
    [authoring]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!authoring?.isDragging) {
        return;
      }

      const point = svgPointFromPointerEvent(svgRef.current, event.nativeEvent);

      if (point) {
        authoring.dragSelectedHandleTo(point);
      }
    },
    [authoring]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!authoring?.isDragging) {
        return;
      }

      if (svgRef.current?.hasPointerCapture(event.pointerId)) {
        svgRef.current.releasePointerCapture(event.pointerId);
      }
      authoring.endDrag();
    },
    [authoring]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGSVGElement>) => {
      if (!authoring) {
        return;
      }

      const step = event.shiftKey ? 10 : 1;

      if (event.key === "Escape") {
        event.preventDefault();
        authoring.clearSelection();
        return;
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        authoring.resetSelectedAnnotation();
        return;
      }

      const nudgeByKey: Record<string, MechanismPoint> = {
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
      };
      const delta = nudgeByKey[event.key];

      if (delta) {
        event.preventDefault();
        authoring.nudgeSelectedHandle(delta);
      }
    },
    [authoring]
  );

  return (
    <svg
      ref={svgRef}
      viewBox={scene.scaffold.viewBox}
      className="mechanism-svg mechanism-reference__svg mechanism-canvas"
      role="img"
      aria-labelledby={titleId}
      data-author-mode={editable ? "true" : undefined}
      tabIndex={editable ? 0 : undefined}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <title id={titleId}>{scene.title}</title>
      <MechanismSvgDefs />
      <MechanismScaffold scaffold={scene.scaffold} />
      <MechanismOverlay
        scene={renderScene}
        debug={debug}
        authoring={
          authoring
            ? {
                selectedAnnotationId: authoring.selectedAnnotationId,
                selectedHandle: authoring.selectedHandle,
                onSelectAnnotation: handleSelectAnnotation,
                onBeginHandleDrag: handleBeginHandleDrag,
              }
            : undefined
        }
      />
    </svg>
  );
}

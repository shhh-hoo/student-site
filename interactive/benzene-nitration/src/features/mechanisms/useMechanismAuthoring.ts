import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  applyLayoutOverrides,
  cloneMechanismAnnotations,
  createFullAnnotationsExport,
  createLayoutOverridesExport,
  createSelectedAnnotationExport,
  getDefaultHandleForAnnotation,
  nudgeAnnotationHandle,
  resetAnnotationToSceneLayout,
  updateAnnotationLayoutFromHandle,
  type EditableMechanismHandle,
} from "./authoring";
import type { MechanismAnnotation, MechanismPoint, MechanismScene } from "./types";

function storageKeyForScene(sceneId: string) {
  return `mechanism-author-layout-v2:${sceneId}`;
}

function readStoredDraft(scene: MechanismScene) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKeyForScene(scene.id));

    return raw ? applyLayoutOverrides(cloneMechanismAnnotations(scene.annotations), JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeStoredDraft(scene: MechanismScene, annotations: MechanismAnnotation[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKeyForScene(scene.id),
    JSON.stringify(createLayoutOverridesExport(scene, annotations))
  );
}

function removeStoredDraft(sceneId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKeyForScene(sceneId));
}

function findAnnotation(annotations: MechanismAnnotation[], annotationId?: string | null) {
  return annotationId ? (annotations.find(annotation => annotation.id === annotationId) ?? null) : null;
}

export function useMechanismAuthoring(scene: MechanismScene | undefined, enabled: boolean) {
  const [draftAnnotations, setDraftAnnotations] = useState<MechanismAnnotation[]>(() =>
    scene ? cloneMechanismAnnotations(scene.annotations) : []
  );
  const [selectedHandle, setSelectedHandle] = useState<EditableMechanismHandle | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const activeDragHandleRef = useRef<EditableMechanismHandle | null>(null);

  useEffect(() => {
    if (!scene) {
      setDraftAnnotations([]);
      setSelectedHandle(null);
      activeDragHandleRef.current = null;
      return;
    }

    setDraftAnnotations(
      enabled ? (readStoredDraft(scene) ?? cloneMechanismAnnotations(scene.annotations)) : scene.annotations
    );
    setSelectedHandle(null);
    setIsDragging(false);
    activeDragHandleRef.current = null;
  }, [enabled, scene]);

  useEffect(() => {
    if (enabled && scene) {
      writeStoredDraft(scene, draftAnnotations);
    }
  }, [draftAnnotations, enabled, scene]);

  const selectedAnnotationId = selectedHandle?.annotationId ?? null;
  const selectedAnnotation = useMemo(
    () => findAnnotation(draftAnnotations, selectedAnnotationId),
    [draftAnnotations, selectedAnnotationId]
  );

  const selectAnnotation = useCallback(
    (annotationId: string) => {
      const annotation = findAnnotation(draftAnnotations, annotationId);
      setSelectedHandle(annotation ? getDefaultHandleForAnnotation(annotation) : null);
    },
    [draftAnnotations]
  );

  const selectHandle = useCallback((handle: EditableMechanismHandle) => {
    setSelectedHandle(handle);
  }, []);

  const beginDrag = useCallback((handle: EditableMechanismHandle) => {
    activeDragHandleRef.current = handle;
    setSelectedHandle(handle);
    setIsDragging(true);
  }, []);

  const dragSelectedHandleTo = useCallback(
    (svgPoint: MechanismPoint) => {
      const activeHandle = activeDragHandleRef.current ?? selectedHandle;

      if (!scene || !activeHandle) {
        return;
      }

      setDraftAnnotations(current => updateAnnotationLayoutFromHandle(scene, current, activeHandle, svgPoint));
    },
    [scene, selectedHandle]
  );

  const endDrag = useCallback(() => {
    activeDragHandleRef.current = null;
    setIsDragging(false);
  }, []);

  const nudgeSelectedHandle = useCallback(
    (delta: MechanismPoint) => {
      if (!scene || !selectedHandle) {
        return;
      }

      setDraftAnnotations(current => nudgeAnnotationHandle(scene, current, selectedHandle, delta));
    },
    [scene, selectedHandle]
  );

  const clearSelection = useCallback(() => {
    activeDragHandleRef.current = null;
    setSelectedHandle(null);
    setIsDragging(false);
  }, []);

  const resetSceneDraft = useCallback(() => {
    if (!scene) {
      return;
    }

    removeStoredDraft(scene.id);
    setDraftAnnotations(cloneMechanismAnnotations(scene.annotations));
    setSelectedHandle(null);
    activeDragHandleRef.current = null;
    setCopyStatus("Scene draft reset");
  }, [scene]);

  const resetSelectedAnnotation = useCallback(() => {
    if (!scene || !selectedAnnotationId) {
      return;
    }

    setDraftAnnotations(current => resetAnnotationToSceneLayout(scene, current, selectedAnnotationId));
    setCopyStatus("Selected annotation reset");
  }, [scene, selectedAnnotationId]);

  const clearSavedDraft = useCallback(() => {
    if (!scene) {
      return;
    }

    removeStoredDraft(scene.id);
    setCopyStatus("Saved draft cleared");
  }, [scene]);

  const exportData = useMemo(() => {
    if (!scene) {
      return {
        layoutOverrides: null,
        fullAnnotations: null,
        selectedAnnotation: null,
      };
    }

    return {
      layoutOverrides: createLayoutOverridesExport(scene, draftAnnotations),
      fullAnnotations: createFullAnnotationsExport(scene, draftAnnotations),
      selectedAnnotation: createSelectedAnnotationExport(draftAnnotations, selectedAnnotationId),
    };
  }, [draftAnnotations, scene, selectedAnnotationId]);

  return {
    annotations: enabled ? draftAnnotations : (scene?.annotations ?? []),
    draftAnnotations,
    selectedAnnotation,
    selectedAnnotationId,
    selectedHandle,
    isDragging,
    copyStatus,
    setCopyStatus,
    selectAnnotation,
    selectHandle,
    beginDrag,
    dragSelectedHandleTo,
    endDrag,
    nudgeSelectedHandle,
    clearSelection,
    resetSceneDraft,
    resetSelectedAnnotation,
    clearSavedDraft,
    exportData,
  };
}

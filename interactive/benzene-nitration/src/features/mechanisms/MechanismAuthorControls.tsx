import { useMemo } from "react";

import {
  createFullAnnotationsExport,
  createLayoutOverridesExport,
  describeAnnotationSemantics,
  getHandleKey,
  type EditableMechanismHandle,
} from "./authoring";
import type { MechanismAnnotation, MechanismDebugOptions, MechanismScene } from "./types";

const debugToggleLabels: Array<{ key: keyof MechanismDebugOptions; label: string }> = [
  { key: "showAnchors", label: "Anchors" },
  { key: "showHitboxes", label: "Hitboxes" },
  { key: "showAnnotationBounds", label: "Bounds" },
  { key: "showControlPoints", label: "Controls" },
  { key: "showJson", label: "JSON" },
];

export function MechanismAuthorControls({
  scene,
  annotations,
  selectedAnnotation,
  selectedHandle,
  debugOptions,
  onDebugOptionsChange,
  onResetSceneDraft,
  onResetSelectedAnnotation,
  onClearSavedDraft,
  copyStatus,
  onCopyStatusChange,
}: {
  scene: MechanismScene;
  annotations: MechanismAnnotation[];
  selectedAnnotation: MechanismAnnotation | null;
  selectedHandle: EditableMechanismHandle | null;
  debugOptions: MechanismDebugOptions;
  onDebugOptionsChange: (nextOptions: MechanismDebugOptions) => void;
  onResetSceneDraft: () => void;
  onResetSelectedAnnotation: () => void;
  onClearSavedDraft: () => void;
  copyStatus: string;
  onCopyStatusChange: (status: string) => void;
}) {
  const lockedCount = annotations.filter(annotation => annotation.layout.locked).length;
  const exportJson = useMemo(
    () => ({
      layoutOverrides: createLayoutOverridesExport(scene, annotations),
      fullAnnotations: createFullAnnotationsExport(scene, annotations),
      selectedAnnotation,
    }),
    [annotations, scene, selectedAnnotation]
  );
  const previewJson = selectedAnnotation ?? exportJson.layoutOverrides;

  const copyJson = (label: string, value: unknown) => {
    const serialized = JSON.stringify(value, null, 2);

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(serialized);
      onCopyStatusChange(`${label} copied`);
      return;
    }

    onCopyStatusChange(`${label} ready in preview`);
  };

  return (
    <aside className="mechanism-author" aria-label="Mechanism author controls">
      <div className="mechanism-author__bar">
        <div>
          <p className="mechanism-block-label">Author mode</p>
          <p className="mechanism-author__summary">
            {annotations.length} annotations · {lockedCount} locked · {Object.keys(scene.anchors).length} anchors
          </p>
        </div>
        <div className="mechanism-author__toggles">
          {debugToggleLabels.map(toggle => (
            <label key={toggle.key} className="mechanism-author__toggle">
              <input
                type="checkbox"
                checked={debugOptions[toggle.key]}
                onChange={event =>
                  onDebugOptionsChange({
                    ...debugOptions,
                    [toggle.key]: event.currentTarget.checked,
                  })
                }
              />
              <span>{toggle.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mechanism-author__selection">
        <div>
          <p className="mechanism-author__label">Selected annotation</p>
          {selectedAnnotation ? (
            <>
              <p className="mechanism-author__selected-id">{selectedAnnotation.id}</p>
              <p className="mechanism-author__summary">{describeAnnotationSemantics(selectedAnnotation)}</p>
              <p className="mechanism-author__summary">
                Handle: {selectedHandle ? getHandleKey(selectedHandle) : "annotation only"}
              </p>
            </>
          ) : (
            <p className="mechanism-author__summary">Select an annotation or handle in the SVG.</p>
          )}
        </div>
        <div className="mechanism-author__actions">
          <button type="button" className="mechanism-author__button" onClick={onResetSceneDraft}>
            Reset scene draft
          </button>
          <button
            type="button"
            className="mechanism-author__button"
            onClick={onResetSelectedAnnotation}
            disabled={!selectedAnnotation}
          >
            Reset selected
          </button>
          <button type="button" className="mechanism-author__button" onClick={onClearSavedDraft}>
            Clear saved draft
          </button>
        </div>
      </div>
      <div className="mechanism-author__export">
        <p className="mechanism-author__label">Export</p>
        <div className="mechanism-author__actions">
          <button
            type="button"
            className="mechanism-author__button"
            onClick={() => copyJson("Layout overrides", exportJson.layoutOverrides)}
          >
            Copy layout overrides
          </button>
          <button
            type="button"
            className="mechanism-author__button"
            onClick={() => copyJson("Full annotations", exportJson.fullAnnotations)}
          >
            Copy full annotations
          </button>
          <button
            type="button"
            className="mechanism-author__button"
            onClick={() => copyJson("Selected annotation", selectedAnnotation)}
            disabled={!selectedAnnotation}
          >
            Copy selected
          </button>
        </div>
        {copyStatus ? <p className="mechanism-author__copy-status">{copyStatus}</p> : null}
      </div>
      {debugOptions.showJson ? (
        <pre className="mechanism-author__json">{JSON.stringify(previewJson, null, 2)}</pre>
      ) : null}
    </aside>
  );
}

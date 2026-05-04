import { extractSerializableAnnotationLayout } from "./MechanismOverlay";
import type { MechanismDebugOptions, MechanismScene } from "./types";

const debugToggleLabels: Array<{ key: keyof MechanismDebugOptions; label: string }> = [
  { key: "showAnchors", label: "Anchors" },
  { key: "showHitboxes", label: "Hitboxes" },
  { key: "showAnnotationBounds", label: "Bounds" },
  { key: "showControlPoints", label: "Controls" },
  { key: "showJson", label: "JSON" },
];

export function MechanismAuthorControls({
  scene,
  debugOptions,
  onDebugOptionsChange,
}: {
  scene: MechanismScene;
  debugOptions: MechanismDebugOptions;
  onDebugOptionsChange: (nextOptions: MechanismDebugOptions) => void;
}) {
  const serializableLayout = extractSerializableAnnotationLayout(scene);
  const lockedCount = scene.annotations.filter(annotation => annotation.layout.locked).length;

  return (
    <aside className="mechanism-author" aria-label="Mechanism author controls">
      <div className="mechanism-author__bar">
        <div>
          <p className="mechanism-block-label">Author mode</p>
          <p className="mechanism-author__summary">
            {scene.annotations.length} annotations · {lockedCount} locked · {Object.keys(scene.anchors).length} anchors
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
      {debugOptions.showJson ? (
        <pre className="mechanism-author__json">{JSON.stringify(serializableLayout, null, 2)}</pre>
      ) : null}
    </aside>
  );
}

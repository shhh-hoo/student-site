import { MechanismOverlay } from "./MechanismOverlay";
import { MechanismScaffold } from "./MechanismScaffold";
import type { MechanismDebugOptions, MechanismScene } from "./types";

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
}: {
  scene: MechanismScene;
  debug?: MechanismDebugOptions;
  titleId: string;
}) {
  return (
    <svg
      viewBox={scene.scaffold.viewBox}
      className="mechanism-svg mechanism-reference__svg mechanism-canvas"
      role="img"
      aria-labelledby={titleId}
      data-author-mode={debug ? "true" : undefined}
    >
      <title id={titleId}>{scene.title}</title>
      <MechanismSvgDefs />
      <MechanismScaffold scaffold={scene.scaffold} />
      <MechanismOverlay scene={scene} debug={debug} />
    </svg>
  );
}

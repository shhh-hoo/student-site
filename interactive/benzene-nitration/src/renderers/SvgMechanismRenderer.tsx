import type { Atom, MechanismPanelData } from "../types";
import { AtomPrimitive } from "./primitives/Atom";
import { BondPrimitive } from "./primitives/Bond";
import { CurlyArrowPrimitive } from "./primitives/CurlyArrow";
import { HighlightHaloPrimitive } from "./primitives/HighlightHalo";
import { ProductFragmentPrimitive } from "./primitives/ProductFragment";
import { RingPrimitive } from "./primitives/Ring";
import { TextLabelPrimitive } from "./primitives/TextLabel";

interface SvgMechanismRendererProps {
  panel: MechanismPanelData;
}

function getAtomMap(atoms: Atom[] = []) {
  return new Map(atoms.map(atom => [atom.id, atom]));
}

export function SvgMechanismRenderer({ panel }: SvgMechanismRendererProps) {
  const diagram = panel.diagram || {};
  const atoms = diagram.atoms || [];
  const atomMap = getAtomMap(atoms);
  const markerId = `${panel.id}-curly-arrowhead`;

  return (
    <svg
      className="mechanism-svg"
      viewBox={`0 0 ${panel.canvas.width} ${panel.canvas.height}`}
      role="img"
      aria-labelledby={`${panel.id}-title`}
    >
      <title id={`${panel.id}-title`}>{panel.title}</title>
      <defs>
        <marker
          id={markerId}
          markerWidth="12"
          markerHeight="12"
          refX="9"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 1 L 10 6 L 0 11 z" className="mechanism-svg__arrowhead" />
        </marker>
      </defs>

      {(diagram.highlights || []).map(highlight => (
        <HighlightHaloPrimitive key={highlight.id} highlight={highlight} />
      ))}
      {(diagram.rings || []).map(ring => (
        <RingPrimitive key={ring.id} ring={ring} />
      ))}
      {(diagram.bonds || []).map(bond => {
        const from = atomMap.get(bond.from);
        const to = atomMap.get(bond.to);

        return from && to ? <BondPrimitive key={bond.id} from={from} to={to} order={bond.order} /> : null;
      })}
      {(diagram.productFragments || []).map(fragment => (
        <ProductFragmentPrimitive key={fragment.id} fragment={fragment} />
      ))}
      {(diagram.curlyArrows || []).map(arrow => (
        <CurlyArrowPrimitive key={arrow.id} arrow={arrow} markerId={markerId} />
      ))}
      {atoms.map(atom => (
        <AtomPrimitive key={atom.id} atom={atom} />
      ))}
      {[...(diagram.texts || []), ...(diagram.annotations || [])].map(item => (
        <TextLabelPrimitive key={item.id} item={item} />
      ))}
    </svg>
  );
}

import type { Atom } from "../../types";
import { formatCharge } from "../chemistryText";

interface AtomPrimitiveProps {
  atom: Atom;
}

export function AtomPrimitive({ atom }: AtomPrimitiveProps) {
  return (
    <g className="mechanism-svg__atom-group" data-atom-id={atom.id}>
      <text className="mechanism-svg__atom" x={atom.x} y={atom.y}>
        {atom.element}
      </text>
      {atom.formalCharge && atom.formalCharge !== "0" ? (
        <text className="mechanism-svg__charge" x={atom.x + 16} y={atom.y - 15}>
          {formatCharge(atom.formalCharge)}
        </text>
      ) : null}
    </g>
  );
}

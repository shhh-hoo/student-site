import type { NitroSubstituentFragment } from "../../types";
import { getPointAtAngle } from "../geometry";
import { BondPrimitive } from "./Bond";

interface ProductFragmentPrimitiveProps {
  fragment: NitroSubstituentFragment;
}

export function ProductFragmentPrimitive({ fragment }: ProductFragmentPrimitiveProps) {
  const anchor = getPointAtAngle(
    fragment.ringCenterX,
    fragment.ringCenterY,
    fragment.ringRadius,
    fragment.attachToRingAtAngleDegrees
  );
  const nAtom = { x: fragment.nX, y: fragment.nY };
  const o1Atom = { x: fragment.o1X, y: fragment.o1Y };
  const o2Atom = { x: fragment.o2X, y: fragment.o2Y };

  return (
    <g className="mechanism-svg__product-fragment" data-fragment-id={fragment.id}>
      <BondPrimitive from={anchor} to={nAtom} order={1} />
      <BondPrimitive from={nAtom} to={o1Atom} order={2} />
      <BondPrimitive from={nAtom} to={o2Atom} order={2} />
      <text className="mechanism-svg__atom" x={fragment.nX} y={fragment.nY}>
        N
      </text>
      <text className="mechanism-svg__atom" x={fragment.o1X} y={fragment.o1Y}>
        O
      </text>
      <text className="mechanism-svg__atom" x={fragment.o2X} y={fragment.o2Y}>
        O
      </text>
    </g>
  );
}

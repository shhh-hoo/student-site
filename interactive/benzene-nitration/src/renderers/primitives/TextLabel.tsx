import type { MechanismText } from "../../types";
import { formatChemistryText } from "../chemistryText";

interface TextLabelPrimitiveProps {
  item: MechanismText;
}

export function TextLabelPrimitive({ item }: TextLabelPrimitiveProps) {
  return (
    <text className={`mechanism-svg__text mechanism-svg__text--${item.role}`} x={item.x} y={item.y}>
      {formatChemistryText(item.text)}
    </text>
  );
}

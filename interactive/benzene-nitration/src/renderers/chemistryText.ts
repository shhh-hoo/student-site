const chemistryReplacements = new Map([
  ["C6H5NO2", "C₆H₅NO₂"],
  ["C6H6", "C₆H₆"],
  ["H2SO4", "H₂SO₄"],
  ["HNO3", "HNO₃"],
  ["HSO4−", "HSO₄−"],
  ["HSO4-", "HSO₄⁻"],
  ["NO2+", "NO₂⁺"],
  ["H2O", "H₂O"],
]);

export function formatChemistryText(value: string): string {
  let text = String(value || "").replaceAll("->", "→");

  chemistryReplacements.forEach((replacement, source) => {
    text = text.replaceAll(source, replacement);
  });

  return text;
}

export function formatCharge(charge?: string): string {
  if (charge === "+1") {
    return "+";
  }

  if (charge === "-1") {
    return "−";
  }

  return String(charge || "");
}

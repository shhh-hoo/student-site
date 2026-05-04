export type MechanismStepId =
  | "electrophile-generation"
  | "electrophilic-attack"
  | "wheland-intermediate"
  | "deprotonation"
  | "product";

export type ChargeKind = "formal" | "partial";

export type ElectronSourceKind = "lone-pair" | "pi-system" | "bond" | "negative-charge";

export type ElectronTargetKind = "atom" | "bond" | "pi-system" | "proton";

export type MechanismAnchor = {
  id: string;
  label: string;
  step: MechanismStepId;
  sourceKind?: ElectronSourceKind;
  targetKind?: ElectronTargetKind;
};

export type MechanismArrowSpec = {
  id: string;
  step: MechanismStepId;
  sourceAnchor: string;
  targetAnchor: string;
  electronPairMovement: true;
  notes: string;
};

export type CorrectnessCheck = {
  id: string;
  step: MechanismStepId;
  label: string;
  requirement: string;
  severity: "required" | "recommended";
};

export const benzeneNitrationAnchors: MechanismAnchor[] = [
  {
    id: "benzene.pi-system",
    step: "electrophilic-attack",
    label: "benzene aromatic π system",
    sourceKind: "pi-system",
  },
  {
    id: "nitronium.N",
    step: "electrophilic-attack",
    label: "nitrogen atom of NO₂⁺",
    targetKind: "atom",
  },
  {
    id: "hydrogensulfate.O-lone-pair",
    step: "deprotonation",
    label: "lone pair on oxygen of HSO₄⁻",
    sourceKind: "lone-pair",
  },
  {
    id: "wheland.H",
    step: "deprotonation",
    label: "hydrogen attached to the sp³ carbon of the sigma complex",
    targetKind: "proton",
  },
  {
    id: "wheland.C-H-bond",
    step: "deprotonation",
    label: "C–H bond on the sp³ carbon",
    sourceKind: "bond",
  },
  {
    id: "wheland.C1-C2-bond-forming-pi-system",
    step: "deprotonation",
    label: "ring π system restored by forming the C1=C2 π bond",
    targetKind: "bond",
  },
];

export const benzeneNitrationArrows: MechanismArrowSpec[] = [
  {
    id: "arrow-benzene-pi-to-nitronium-N",
    step: "electrophilic-attack",
    sourceAnchor: "benzene.pi-system",
    targetAnchor: "nitronium.N",
    electronPairMovement: true,
    notes:
      "Curly arrow starts from the aromatic π system and points to the positively charged nitrogen, not to oxygen.",
  },
  {
    id: "arrow-hydrogensulfate-lone-pair-to-H",
    step: "deprotonation",
    sourceAnchor: "hydrogensulfate.O-lone-pair",
    targetAnchor: "wheland.H",
    electronPairMovement: true,
    notes: "Base arrow starts from an explicit oxygen lone pair on hydrogensulfate and points to the proton.",
  },
  {
    id: "arrow-C-H-bond-to-ring-pi-system",
    step: "deprotonation",
    sourceAnchor: "wheland.C-H-bond",
    targetAnchor: "wheland.C1-C2-bond-forming-pi-system",
    electronPairMovement: true,
    notes:
      "Second arrow starts from the C–H bond midpoint and returns those electrons into the ring to restore aromaticity.",
  },
];

export const benzeneNitrationCorrectnessChecks: CorrectnessCheck[] = [
  {
    id: "electrophile-is-no2-plus",
    step: "electrophile-generation",
    label: "Electrophile identity",
    requirement: "NO₂⁺ must be identified as the electrophile.",
    severity: "required",
  },
  {
    id: "nitronium-formal-charge",
    step: "electrophile-generation",
    label: "Formal charge",
    requirement: "The nitronium ion must show a formal positive charge on N.",
    severity: "required",
  },
  {
    id: "do-not-label-hno3-as-simple-base",
    step: "electrophile-generation",
    label: "Acid role wording",
    requirement:
      "Do not label nitric acid simply as ‘base’; describe nitric acid as being protonated by sulfuric acid.",
    severity: "required",
  },
  {
    id: "attack-arrow-source",
    step: "electrophilic-attack",
    label: "Attack arrow source",
    requirement: "The attack curly arrow must start from the benzene aromatic π system / aromatic circle.",
    severity: "required",
  },
  {
    id: "attack-arrow-target",
    step: "electrophilic-attack",
    label: "Attack arrow target",
    requirement: "The attack curly arrow must point to the nitrogen atom of NO₂⁺, not to oxygen.",
    severity: "required",
  },
  {
    id: "sigma-complex-c-n-bond",
    step: "wheland-intermediate",
    label: "New bond",
    requirement: "The sigma complex must show the new C–N bond between the ring and NO₂.",
    severity: "required",
  },
  {
    id: "sigma-complex-c-h-bond-retained",
    step: "wheland-intermediate",
    label: "C–H bond retained",
    requirement: "The attacked carbon must still be bonded to H in the sigma complex.",
    severity: "required",
  },
  {
    id: "sigma-complex-not-aromatic",
    step: "wheland-intermediate",
    label: "Aromaticity lost",
    requirement: "The sigma complex must not be drawn as a fully aromatic benzene ring.",
    severity: "required",
  },
  {
    id: "sigma-complex-positive-charge",
    step: "wheland-intermediate",
    label: "Positive charge",
    requirement: "The sigma complex / arenium ion must show a positive charge.",
    severity: "required",
  },
  {
    id: "hso4-base-lone-pair",
    step: "deprotonation",
    label: "Lone pair on base",
    requirement: "HSO₄⁻ must show an explicit oxygen lone pair as the electron source for deprotonation.",
    severity: "required",
  },
  {
    id: "base-arrow-source",
    step: "deprotonation",
    label: "Base arrow source",
    requirement: "The first deprotonation arrow must start from the oxygen lone pair on HSO₄⁻ and point to H.",
    severity: "required",
  },
  {
    id: "c-h-arrow-source",
    step: "deprotonation",
    label: "C–H arrow source",
    requirement:
      "The second deprotonation arrow must start from the C–H bond midpoint, not from H or from the carbon label.",
    severity: "required",
  },
  {
    id: "c-h-arrow-target",
    step: "deprotonation",
    label: "C–H arrow target",
    requirement: "The C–H bond electrons must be shown returning to the ring π system to restore aromaticity.",
    severity: "required",
  },
  {
    id: "product-is-nitrobenzene",
    step: "product",
    label: "Product identity",
    requirement: "The final product must be nitrobenzene.",
    severity: "required",
  },
  {
    id: "product-aromaticity-restored",
    step: "product",
    label: "Aromaticity restored",
    requirement: "The product must be drawn with restored aromaticity.",
    severity: "required",
  },
  {
    id: "partial-charge-policy",
    step: "electrophilic-attack",
    label: "Partial charge policy",
    requirement:
      "Partial charge notation is available in the primitive system, but is not required for benzene nitration because the active electrophile is a formal cation, NO₂⁺.",
    severity: "recommended",
  },
];

export const benzeneNitrationRequiredCorrectnessCheckIds = [
  "electrophile-is-no2-plus",
  "nitronium-formal-charge",
  "attack-arrow-source",
  "attack-arrow-target",
  "sigma-complex-c-n-bond",
  "sigma-complex-c-h-bond-retained",
  "sigma-complex-not-aromatic",
  "sigma-complex-positive-charge",
  "hso4-base-lone-pair",
  "base-arrow-source",
  "c-h-arrow-source",
  "c-h-arrow-target",
  "product-is-nitrobenzene",
  "product-aromaticity-restored",
] as const;

export function validateBenzeneNitrationArrowAnchors() {
  const anchors = new Map(benzeneNitrationAnchors.map(anchor => [anchor.id, anchor]));
  const errors: string[] = [];

  for (const arrow of benzeneNitrationArrows) {
    const source = anchors.get(arrow.sourceAnchor);
    const target = anchors.get(arrow.targetAnchor);

    if (!source) {
      errors.push(`${arrow.id}: missing source anchor ${arrow.sourceAnchor}`);
    }
    if (!target) {
      errors.push(`${arrow.id}: missing target anchor ${arrow.targetAnchor}`);
    }
    if (source && !source.sourceKind) {
      errors.push(`${arrow.id}: source anchor ${arrow.sourceAnchor} is not marked as an electron source`);
    }
    if (target && !target.targetKind) {
      errors.push(`${arrow.id}: target anchor ${arrow.targetAnchor} is not marked as an electron target`);
    }
    if (source && target && source.step !== arrow.step) {
      errors.push(`${arrow.id}: source anchor is assigned to ${source.step}, but arrow is in ${arrow.step}`);
    }
    if (target && target.step !== arrow.step) {
      errors.push(`${arrow.id}: target anchor is assigned to ${target.step}, but arrow is in ${arrow.step}`);
    }
  }

  return errors;
}

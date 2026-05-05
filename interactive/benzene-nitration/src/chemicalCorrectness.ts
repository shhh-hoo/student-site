import { benzeneNitrationScenes, validateMechanismScenes } from "./features/mechanisms";
import type { AnchorDefinition, ExpectedMechanismAction } from "./features/mechanisms";

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

function anchorSourceKind(anchor: AnchorDefinition): ElectronSourceKind | undefined {
  if (anchor.kind === "piSystem" || anchor.kind === "aromaticCircle") {
    return "pi-system";
  }
  if (anchor.kind === "lonePair") {
    return "lone-pair";
  }
  if (anchor.kind === "bondMidpoint") {
    return "bond";
  }

  return undefined;
}

function anchorTargetKind(anchor: AnchorDefinition): ElectronTargetKind | undefined {
  if (anchor.kind === "atom") {
    return anchor.role?.toLowerCase().includes("hydrogen") ? "proton" : "atom";
  }
  if (anchor.kind === "delocalisationRegion" || anchor.kind === "piSystem" || anchor.kind === "aromaticCircle") {
    return "pi-system";
  }
  if (anchor.kind === "bondMidpoint") {
    return "bond";
  }

  return undefined;
}

export const benzeneNitrationAnchors: MechanismAnchor[] = benzeneNitrationScenes.flatMap(scene =>
  Object.values(scene.anchors).map(anchor => ({
    id: anchor.id,
    step: scene.id as MechanismStepId,
    label: anchor.role ?? anchor.id,
    sourceKind: anchorSourceKind(anchor),
    targetKind: anchorTargetKind(anchor),
  }))
);

function isExpectedCurlyArrow(
  action: ExpectedMechanismAction
): action is Extract<ExpectedMechanismAction, { kind: "curlyArrow" }> {
  return action.kind === "curlyArrow";
}

export const benzeneNitrationArrows: MechanismArrowSpec[] = benzeneNitrationScenes.flatMap(scene =>
  (scene.expectedActions ?? []).filter(isExpectedCurlyArrow).map(action => ({
    id: action.id,
    step: scene.id as MechanismStepId,
    sourceAnchor: action.fromAnchorId,
    targetAnchor: action.toAnchorId,
    electronPairMovement: true,
    notes:
      action.id === "attack-arrow"
        ? "Curly arrow starts from the aromatic pi system and points to the positively charged nitrogen, not to oxygen."
        : action.id === "deprotonation-base-arrow"
          ? "Base arrow starts from an explicit oxygen lone pair on hydrogensulfate and points to the proton."
          : "C-H bond electrons return into the broken delocalisation region of the ring.",
  }))
);

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
    id: "sigma-complex-no-alternating-double-bonds",
    step: "wheland-intermediate",
    label: "No alternating double bonds",
    requirement: "The sigma complex must not be drawn with alternating double bonds.",
    severity: "required",
  },
  {
    id: "sigma-complex-broken-delocalisation",
    step: "wheland-intermediate",
    label: "Broken delocalisation",
    requirement: "The sigma complex must use an outer hexagon with a broken delocalisation horseshoe.",
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
    requirement: "The C–H bond electrons must be shown returning to the broken delocalisation region of the ring.",
    severity: "required",
  },
  {
    id: "deprotonation-uses-broken-delocalisation",
    step: "deprotonation",
    label: "Intermediate drawing retained",
    requirement: "The deprotonation step must still use the broken delocalisation form, not a full aromatic circle.",
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
  "do-not-label-hno3-as-simple-base",
  "attack-arrow-source",
  "attack-arrow-target",
  "sigma-complex-c-n-bond",
  "sigma-complex-c-h-bond-retained",
  "sigma-complex-not-aromatic",
  "sigma-complex-no-alternating-double-bonds",
  "sigma-complex-broken-delocalisation",
  "sigma-complex-positive-charge",
  "hso4-base-lone-pair",
  "base-arrow-source",
  "c-h-arrow-source",
  "c-h-arrow-target",
  "deprotonation-uses-broken-delocalisation",
  "product-is-nitrobenzene",
  "product-aromaticity-restored",
] as const;

export function validateBenzeneNitrationArrowAnchors() {
  const anchors = new Map(benzeneNitrationAnchors.map(anchor => [anchor.id, anchor]));
  const errors: string[] = validateMechanismScenes(benzeneNitrationScenes);

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

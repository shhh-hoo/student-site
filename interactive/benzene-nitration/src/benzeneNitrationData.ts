import type { MechanismStepId } from "./chemicalCorrectness";

export type BenzeneNitrationStep = {
  id: MechanismStepId;
  title: string;
  caption: string;
  longNote: string;
  partialChargeRequired: boolean;
  partialChargeReason: string;
};

export const benzeneNitrationSteps: BenzeneNitrationStep[] = [
  {
    id: "electrophile-generation",
    title: "1. Generation of the electrophile",
    caption: "Concentrated sulfuric acid generates the nitronium ion, NO₂⁺.",
    longNote:
      "Nitric acid is protonated by sulfuric acid and loses water to form NO₂⁺. Keep the main view formula-based and exam-friendly.",
    partialChargeRequired: false,
    partialChargeReason: "The active electrophile is the formal cation NO₂⁺.",
  },
  {
    id: "electrophilic-attack",
    title: "2. Electrophilic attack",
    caption: "The benzene π system attacks the positively charged nitrogen of NO₂⁺.",
    longNote: "The curly arrow must start from the aromatic circle / π system and must point to N in NO₂⁺, not to O.",
    partialChargeRequired: false,
    partialChargeReason: "NO₂⁺ carries a formal positive charge; δ notation is not required.",
  },
  {
    id: "wheland-intermediate",
    title: "3. Wheland intermediate",
    caption: "A sigma complex forms and aromaticity is temporarily lost.",
    longNote:
      "The attacked carbon is locally sp³ hybridised and is bonded to both H and NO₂. The ring must not be shown as fully aromatic.",
    partialChargeRequired: false,
    partialChargeReason: "The important charge is the formal positive charge on the arenium ion.",
  },
  {
    id: "deprotonation",
    title: "4. Deprotonation",
    caption: "HSO₄⁻ removes H⁺; the C–H bond electrons return to the ring.",
    longNote:
      "Show a lone pair on the oxygen of HSO₄⁻. One arrow goes from the O lone pair to H; the other starts from the C–H bond midpoint and returns to the ring.",
    partialChargeRequired: false,
    partialChargeReason: "The deprotonation is shown by lone pair and bond-electron movement.",
  },
  {
    id: "product",
    title: "5. Product",
    caption: "Nitrobenzene is formed and aromaticity is restored.",
    longNote: "The product is nitrobenzene: NO₂ has replaced one H on the benzene ring. Sulfuric acid is regenerated.",
    partialChargeRequired: false,
    partialChargeReason: "No partial charge is needed in the final skeletal product view.",
  },
];

export const benzeneNitrationSpecies = {
  benzene: {
    name: "benzene",
    role: "aromatic substrate",
    smiles: "c1ccccc1",
    charge: 0,
  },
  nitronium: {
    name: "nitronium ion",
    role: "electrophile",
    electrophile: true,
    formalCharge: "+",
    charge: 1,
    smiles: "[O-][N+]#O",
    displayFormula: "O=N⁺=O",
  },
  hydrogensulfate: {
    name: "hydrogensulfate ion",
    role: "base in deprotonation",
    formula: "HSO₄⁻",
    charge: -1,
  },
  nitrobenzene: {
    name: "nitrobenzene",
    role: "product",
    smiles: "O=[N+]([O-])c1ccccc1",
    charge: 0,
  },
} as const;

import { hexagonPoints } from "../geometry";
import type {
  AnchorDefinition,
  MechanismAnnotation,
  MechanismPoint,
  MechanismScene,
  ScaffoldElement,
  TextRun,
} from "../types";

function p(x: number, y: number): MechanismPoint {
  return { x, y };
}

function atomLabel(id: string, x: number, y: number, text: string | TextRun[], ariaLabel?: string): ScaffoldElement {
  return {
    id,
    kind: "atomLabel",
    x,
    y,
    text,
    ariaLabel,
  };
}

function bond(
  id: string,
  from: MechanismPoint,
  to: MechanismPoint,
  ariaLabel: string,
  order: 1 | 2 = 1
): ScaffoldElement {
  return {
    id,
    kind: "bond",
    from,
    to,
    order,
    ariaLabel,
  };
}

function aromaticRing(id: string, cx: number, cy: number, r: number): ScaffoldElement {
  return {
    id,
    kind: "aromaticRing",
    cx,
    cy,
    r,
    ariaLabel: "benzene aromatic π system shown with an aromatic circle",
  };
}

function sigmaRingOutline(id: string, cx: number, cy: number, r: number): ScaffoldElement {
  const ring = hexagonPoints(cx, cy, r);

  return {
    id,
    kind: "polygon",
    points: [ring.c1, ring.c2, ring.c3, ring.c4, ring.c5, ring.c6],
    className: "mechanism-svg__sigma-ring-outline",
    ariaLabel: "sigma complex ring outline, not aromatic",
  };
}

function nitroniumScaffold(idPrefix: string, x: number, y: number): ScaffoldElement[] {
  return [
    atomLabel(`${idPrefix}.leftO`, x - 46, y, "O", "left oxygen of nitronium ion"),
    bond(`${idPrefix}.leftNO`, p(x - 33, y), p(x - 13, y), "left N=O bond in nitronium ion", 2),
    atomLabel(`${idPrefix}.N`, x, y, "N", "nitrogen atom of nitronium ion"),
    bond(`${idPrefix}.rightNO`, p(x + 13, y), p(x + 33, y), "right N=O bond in nitronium ion", 2),
    atomLabel(`${idPrefix}.rightO`, x + 46, y, "O", "right oxygen of nitronium ion"),
  ];
}

function nitroGroupScaffold(idPrefix: string, x: number, y: number): ScaffoldElement[] {
  return [
    atomLabel(
      `${idPrefix}.label`,
      x,
      y,
      [{ text: "NO" }, { text: "2", baselineShift: "sub", fontSize: 13 }],
      "nitro group"
    ),
  ];
}

function hydrogensulfateScaffold(idPrefix: string, x: number, y: number): ScaffoldElement[] {
  return [
    atomLabel(`${idPrefix}.reactiveO`, x, y, "O", "reactive oxygen atom of hydrogensulfate"),
    bond(`${idPrefix}.OS`, p(x + 25, y), p(x + 58, y), "O-S bond in hydrogensulfate"),
    {
      id: `${idPrefix}.SO3H`,
      kind: "text",
      x: x + 96,
      y,
      text: [{ text: "SO" }, { text: "3", baselineShift: "sub", fontSize: 12 }, { text: "H" }],
      className: "mechanism-svg__species-text",
      textAnchor: "middle",
      dominantBaseline: "middle",
      ariaLabel: "SO3H group of hydrogensulfate",
    },
  ];
}

function whelandGeometry(cx: number, cy: number, r: number) {
  const ring = hexagonPoints(cx, cy, r);
  const hLabel = p(cx - 34, cy - 120);
  const hBondEnd = p(hLabel.x + 10, hLabel.y + 14);
  const no2Label = p(cx + 42, cy - 116);
  const no2BondEnd = p(no2Label.x - 13, no2Label.y + 14);

  return {
    ring,
    hLabel,
    hBondEnd,
    no2Label,
    no2BondEnd,
  };
}

function whelandScaffold(idPrefix: string, cx: number, cy: number, r: number): ScaffoldElement[] {
  const geometry = whelandGeometry(cx, cy, r);

  return [
    sigmaRingOutline(`${idPrefix}.ring`, cx, cy, r),
    bond(`${idPrefix}.CH`, geometry.ring.c1, geometry.hBondEnd, "C-H bond retained on attacked carbon"),
    bond(`${idPrefix}.CN`, geometry.ring.c1, geometry.no2BondEnd, "new C-N bond to nitro group"),
    atomLabel(`${idPrefix}.H`, geometry.hLabel.x, geometry.hLabel.y, "H", "hydrogen retained on attacked carbon"),
    ...nitroGroupScaffold(`${idPrefix}.nitro`, geometry.no2Label.x, geometry.no2Label.y),
  ];
}

function anchor(
  id: string,
  kind: AnchorDefinition["kind"],
  x: number,
  y: number,
  details: Omit<AnchorDefinition, "id" | "kind" | "x" | "y"> = {}
): AnchorDefinition {
  return {
    id,
    kind,
    x,
    y,
    ...details,
  };
}

function commonNitroniumAnnotations(nAnchorId: string, formulaAnchorId: string): MechanismAnnotation[] {
  return [
    {
      id: `${nAnchorId}.formal-positive-charge`,
      kind: "formalCharge",
      value: "+",
      anchorId: nAnchorId,
      layout: {
        offset: p(0, -27),
        zIndex: 55,
        locked: true,
      },
    },
    {
      id: `${formulaAnchorId}.formula-label`,
      kind: "label",
      text: "NO₂⁺",
      anchorId: formulaAnchorId,
      chemicallyLinked: false,
      layout: {
        offset: p(0, 0),
        className: "mechanism-svg__small-label",
        zIndex: 60,
      },
    },
  ];
}

function horseshoeAnnotation(
  id: string,
  anchorId: string,
  excludedAnchorId: string,
  cx: number,
  cy: number,
  r: number
): MechanismAnnotation {
  return {
    id,
    kind: "areniumHorseshoe",
    anchorId,
    excludedAnchorIds: [excludedAnchorId],
    layout: {
      start: p(cx - r * 0.48, cy - r * 0.08),
      segments: [
        {
          control1: p(cx - r * 0.74, cy + r * 0.26),
          control2: p(cx - r * 0.56, cy + r * 0.68),
          end: p(cx - r * 0.18, cy + r * 0.78),
        },
        {
          control1: p(cx - r * 0.08, cy + r * 0.86),
          control2: p(cx + r * 0.08, cy + r * 0.86),
          end: p(cx + r * 0.18, cy + r * 0.78),
        },
        {
          control1: p(cx + r * 0.56, cy + r * 0.68),
          control2: p(cx + r * 0.74, cy + r * 0.26),
          end: p(cx + r * 0.48, cy - r * 0.08),
        },
      ],
      strokeWidth: 2.9,
      zIndex: 22,
      locked: false,
    },
  };
}

export const benzeneNitrationScenes: MechanismScene[] = [
  {
    id: "electrophile-generation",
    title: "1. Generation of the electrophile",
    description: "Nitric acid is protonated by sulfuric acid to generate the nitronium ion.",
    scaffold: {
      id: "electrophile-generation-scaffold",
      kind: "manualSvg",
      viewBox: "0 0 480 340",
      elements: [...nitroniumScaffold("nitronium", 240, 176)],
    },
    anchors: {
      "nitronium.N": anchor("nitronium.N", "atom", 240, 176, {
        atomId: "nitronium.N",
        structureId: "nitronium",
        role: "electrophilic nitrogen bearing the formal positive charge",
      }),
      "nitronium.formulaLabel": anchor("nitronium.formulaLabel", "manualPoint", 240, 208, {
        structureId: "nitronium",
        role: "formula label position",
      }),
      "scene.equation": anchor("scene.equation", "manualPoint", 240, 94, {
        role: "overall electrophile generation equation",
      }),
      "scene.note": anchor("scene.note", "manualPoint", 240, 262, {
        role: "electrophile identification note",
      }),
    },
    annotations: [
      {
        id: "generation-equation-label",
        kind: "label",
        text: "HNO₃ + 2H₂SO₄ ⇌ NO₂⁺ + 2HSO₄⁻ + H₃O⁺",
        anchorId: "scene.equation",
        layout: {
          className: "mechanism-svg__equation",
          zIndex: 60,
          locked: true,
        },
      },
      ...commonNitroniumAnnotations("nitronium.N", "nitronium.formulaLabel"),
      {
        id: "electrophile-note-label",
        kind: "label",
        text: "Electrophile: nitronium ion, NO₂⁺",
        anchorId: "scene.note",
        layout: {
          className: "mechanism-svg__annotation",
          zIndex: 60,
        },
      },
    ],
    expectedActions: [
      {
        id: "nitronium-positive-charge",
        kind: "formalCharge",
        anchorId: "nitronium.N",
      },
    ],
  },
  {
    id: "electrophilic-attack",
    title: "2. Electrophilic attack",
    description: "The aromatic pi system attacks nitrogen in NO2+, not either oxygen atom.",
    scaffold: {
      id: "electrophilic-attack-scaffold",
      kind: "manualSvg",
      viewBox: "0 0 480 340",
      elements: [aromaticRing("benzene.ring", 178, 206, 58), ...nitroniumScaffold("nitronium", 352, 104)],
    },
    anchors: {
      "benzene.piSystem": anchor("benzene.piSystem", "piSystem", 178, 206, {
        structureId: "benzene",
        role: "benzene aromatic pi system electron source",
        normal: p(0.62, -0.78),
      }),
      "benzene.aromaticCircle": anchor("benzene.aromaticCircle", "aromaticCircle", 178, 206, {
        structureId: "benzene",
        role: "aromatic circle",
      }),
      "nitronium.N": anchor("nitronium.N", "atom", 352, 104, {
        atomId: "nitronium.N",
        structureId: "nitronium",
        role: "electrophilic nitrogen target",
      }),
      "nitronium.formulaLabel": anchor("nitronium.formulaLabel", "manualPoint", 352, 136, {
        structureId: "nitronium",
        role: "formula label position",
      }),
    },
    annotations: [
      ...commonNitroniumAnnotations("nitronium.N", "nitronium.formulaLabel"),
      {
        id: "attack-arrow",
        kind: "curlyArrow",
        fromAnchorId: "benzene.piSystem",
        toAnchorId: "nitronium.N",
        electronFlow: "pair",
        layout: {
          startOffset: p(26, -26),
          endOffset: p(-2, 0),
          control1: p(224, 132),
          control2: p(292, 105),
          arrowheadOffset: 12,
          strokeWidth: 2.8,
          zIndex: 12,
        },
      },
    ],
    expectedActions: [
      {
        id: "attack-arrow",
        kind: "curlyArrow",
        fromAnchorId: "benzene.piSystem",
        toAnchorId: "nitronium.N",
        electronFlow: "pair",
      },
    ],
  },
  {
    id: "wheland-intermediate",
    title: "3. Wheland intermediate",
    description:
      "The arenium ion has a new C-N bond, retained C-H bond, and partial delocalisation but no aromatic circle.",
    scaffold: {
      id: "wheland-intermediate-scaffold",
      kind: "manualSvg",
      viewBox: "0 0 480 340",
      elements: [...whelandScaffold("sigmaComplex", 240, 204, 58)],
    },
    anchors: {
      "sigmaComplex.sp3Carbon": anchor("sigmaComplex.sp3Carbon", "atom", 240, 146, {
        atomId: "sigmaComplex.C1",
        structureId: "sigmaComplex",
        role: "sp3 attacked carbon excluded from horseshoe",
      }),
      "sigmaComplex.attachedH": anchor("sigmaComplex.attachedH", "atom", 206, 84, {
        atomId: "sigmaComplex.H",
        structureId: "sigmaComplex",
        role: "hydrogen retained on attacked carbon",
      }),
      "sigmaComplex.CHBondMidpoint": anchor("sigmaComplex.CHBondMidpoint", "bondMidpoint", 223, 120, {
        bondId: "sigmaComplex.C-H",
        structureId: "sigmaComplex",
        role: "C-H bond midpoint",
      }),
      "sigmaComplex.positiveRegion": anchor("sigmaComplex.positiveRegion", "ringRegion", 240, 224, {
        structureId: "sigmaComplex",
        role: "delocalised positive charge in arenium ion, not on sp3 carbon",
      }),
      "sigmaComplex.delocalisationRegion": anchor(
        "sigmaComplex.delocalisationRegion",
        "delocalisationRegion",
        240,
        230,
        {
          structureId: "sigmaComplex",
          role: "partial delocalisation region excluding the sp3 carbon",
        }
      ),
    },
    annotations: [
      horseshoeAnnotation(
        "wheland-delocalisation-horseshoe",
        "sigmaComplex.delocalisationRegion",
        "sigmaComplex.sp3Carbon",
        240,
        204,
        58
      ),
      {
        id: "wheland-positive-charge",
        kind: "formalCharge",
        value: "+",
        anchorId: "sigmaComplex.positiveRegion",
        layout: {
          offset: p(0, 0),
          zIndex: 56,
        },
      },
      {
        id: "wheland-caption",
        kind: "label",
        text: "sigma complex; aromaticity temporarily lost",
        layout: {
          position: p(240, 304),
          className: "mechanism-svg__annotation",
          zIndex: 60,
        },
      },
    ],
    expectedActions: [
      {
        id: "wheland-positive-charge",
        kind: "formalCharge",
        anchorId: "sigmaComplex.positiveRegion",
      },
      {
        id: "wheland-horseshoe",
        kind: "areniumHorseshoe",
        anchorId: "sigmaComplex.delocalisationRegion",
      },
    ],
  },
  {
    id: "deprotonation",
    title: "4. Deprotonation",
    description: "Hydrogensulfate removes H while C-H bond electrons restore the delocalised pi system.",
    scaffold: {
      id: "deprotonation-scaffold",
      kind: "manualSvg",
      viewBox: "0 0 480 340",
      elements: [...whelandScaffold("sigmaComplex", 306, 208, 58), ...hydrogensulfateScaffold("hso4", 76, 102)],
    },
    anchors: {
      "hso4.reactiveO": anchor("hso4.reactiveO", "atom", 76, 102, {
        atomId: "hso4.reactiveO",
        structureId: "hso4",
        role: "reactive oxygen atom of hydrogensulfate base",
      }),
      "hso4.reactiveO.lonePair": anchor("hso4.reactiveO.lonePair", "lonePair", 103, 94, {
        atomId: "hso4.reactiveO",
        structureId: "hso4",
        role: "oxygen lone pair on hydrogensulfate electron source",
        normal: p(0.92, -0.38),
      }),
      "hso4.negativeCharge": anchor("hso4.negativeCharge", "manualPoint", 90, 85, {
        atomId: "hso4.reactiveO",
        structureId: "hso4",
        role: "negative formal charge associated with reactive oxygen",
      }),
      "hso4.label": anchor("hso4.label", "manualPoint", 128, 134, {
        structureId: "hso4",
        role: "hydrogensulfate base label",
      }),
      "sigmaComplex.sp3Carbon": anchor("sigmaComplex.sp3Carbon", "atom", 306, 150, {
        atomId: "sigmaComplex.C1",
        structureId: "sigmaComplex",
        role: "sp3 attacked carbon excluded from horseshoe",
      }),
      "sigmaComplex.attachedH": anchor("sigmaComplex.attachedH", "atom", 272, 88, {
        atomId: "sigmaComplex.H",
        structureId: "sigmaComplex",
        role: "hydrogen being removed by hydrogensulfate",
      }),
      "sigmaComplex.CHBondMidpoint": anchor("sigmaComplex.CHBondMidpoint", "bondMidpoint", 289, 124, {
        bondId: "sigmaComplex.C-H",
        structureId: "sigmaComplex",
        role: "C-H bond midpoint electron source",
      }),
      "sigmaComplex.positiveRegion": anchor("sigmaComplex.positiveRegion", "ringRegion", 306, 228, {
        structureId: "sigmaComplex",
        role: "delocalised positive charge in arenium ion, not on sp3 carbon",
      }),
      "sigmaComplex.delocalisationRegion": anchor(
        "sigmaComplex.delocalisationRegion",
        "delocalisationRegion",
        306,
        232,
        {
          structureId: "sigmaComplex",
          role: "broken delocalisation region and ring restoration target",
        }
      ),
    },
    annotations: [
      {
        id: "hso4-negative-charge",
        kind: "formalCharge",
        value: "-",
        anchorId: "hso4.reactiveO",
        layout: {
          offset: p(14, -17),
          zIndex: 56,
        },
      },
      {
        id: "hso4-reactive-oxygen-lone-pair",
        kind: "lonePair",
        anchorId: "hso4.reactiveO.lonePair",
        electronCount: 2,
        layout: {
          offset: p(0, 0),
          rotation: -20,
          dotSpacing: 8,
          zIndex: 48,
        },
      },
      {
        id: "hso4-base-label",
        kind: "label",
        text: "HSO₄⁻ base",
        anchorId: "hso4.label",
        layout: {
          className: "mechanism-svg__small-label",
          zIndex: 60,
        },
      },
      horseshoeAnnotation(
        "deprotonation-delocalisation-horseshoe",
        "sigmaComplex.delocalisationRegion",
        "sigmaComplex.sp3Carbon",
        306,
        208,
        58
      ),
      {
        id: "deprotonation-positive-charge",
        kind: "formalCharge",
        value: "+",
        anchorId: "sigmaComplex.positiveRegion",
        layout: {
          offset: p(0, 0),
          zIndex: 56,
        },
      },
      {
        id: "deprotonation-base-arrow",
        kind: "curlyArrow",
        fromAnchorId: "hso4.reactiveO.lonePair",
        toAnchorId: "sigmaComplex.attachedH",
        electronFlow: "pair",
        layout: {
          startOffset: p(4, -4),
          endOffset: p(-7, 4),
          control1: p(146, 58),
          control2: p(220, 58),
          arrowheadOffset: 8,
          strokeWidth: 2.8,
          zIndex: 12,
        },
      },
      {
        id: "restore-aromaticity-arrow",
        kind: "curlyArrow",
        fromAnchorId: "sigmaComplex.CHBondMidpoint",
        toAnchorId: "sigmaComplex.delocalisationRegion",
        electronFlow: "pair",
        layout: {
          startOffset: p(2, -2),
          endOffset: p(0, -34),
          control1: p(318, 138),
          control2: p(328, 168),
          arrowheadOffset: 6,
          strokeWidth: 2.8,
          zIndex: 12,
        },
      },
      {
        id: "deprotonation-caption",
        kind: "label",
        text: "C-H bond electrons restore aromaticity",
        layout: {
          position: p(306, 306),
          className: "mechanism-svg__annotation",
          zIndex: 60,
        },
      },
    ],
    expectedActions: [
      {
        id: "deprotonation-base-arrow",
        kind: "curlyArrow",
        fromAnchorId: "hso4.reactiveO.lonePair",
        toAnchorId: "sigmaComplex.attachedH",
        electronFlow: "pair",
      },
      {
        id: "restore-aromaticity-arrow",
        kind: "curlyArrow",
        fromAnchorId: "sigmaComplex.CHBondMidpoint",
        toAnchorId: "sigmaComplex.delocalisationRegion",
        electronFlow: "pair",
      },
      {
        id: "hso4-lone-pair",
        kind: "lonePair",
        anchorId: "hso4.reactiveO.lonePair",
      },
    ],
  },
  {
    id: "product",
    title: "5. Product",
    description: "Nitrobenzene is formed after aromaticity is restored.",
    scaffold: {
      id: "product-scaffold",
      kind: "manualSvg",
      viewBox: "0 0 480 340",
      elements: [
        aromaticRing("nitrobenzene.ring", 240, 210, 58),
        bond("nitrobenzene.CN", p(240, 152), p(240, 92), "C-N bond to nitro group in nitrobenzene"),
        ...nitroGroupScaffold("nitrobenzene.nitro", 240, 76),
      ],
    },
    anchors: {
      "nitrobenzene.aromaticCircle": anchor("nitrobenzene.aromaticCircle", "aromaticCircle", 240, 210, {
        structureId: "nitrobenzene",
        role: "restored aromatic circle",
      }),
      "nitrobenzene.nitroGroup": anchor("nitrobenzene.nitroGroup", "atom", 240, 76, {
        structureId: "nitrobenzene",
        role: "nitro group on aromatic ring",
      }),
    },
    annotations: [
      {
        id: "product-caption",
        kind: "label",
        text: "nitrobenzene; aromaticity restored",
        layout: {
          position: p(240, 300),
          className: "mechanism-svg__annotation",
          zIndex: 60,
        },
      },
      {
        id: "product-acid-regenerated-label",
        kind: "label",
        text: "H₂SO₄ is regenerated",
        layout: {
          position: p(240, 324),
          className: "mechanism-svg__small-label",
          zIndex: 60,
        },
      },
    ],
    expectedActions: [],
  },
];

export const benzeneNitrationSceneById = Object.fromEntries(
  benzeneNitrationScenes.map(scene => [scene.id, scene])
) as Record<string, MechanismScene>;

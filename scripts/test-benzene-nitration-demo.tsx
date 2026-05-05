import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import BenzeneNitrationMechanism, {
  ChemicalChecklist,
  getNextStepIndex,
  getPreviousStepIndex,
  MechanismSvg,
} from "../interactive/benzene-nitration/src/BenzeneNitrationMechanism";
import {
  benzeneNitrationOverview,
  benzeneNitrationSpecies,
  benzeneNitrationSteps,
} from "../interactive/benzene-nitration/src/benzeneNitrationData";
import {
  benzeneNitrationArrows,
  benzeneNitrationCorrectnessChecks,
  benzeneNitrationRequiredCorrectnessCheckIds,
  validateBenzeneNitrationArrowAnchors,
} from "../interactive/benzene-nitration/src/chemicalCorrectness";
import {
  benzeneNitrationScenes,
  cloneMechanismAnnotations,
  createLayoutOverridesExport,
  getAnnotationHandlePoint,
  getDefaultHandleForAnnotation,
  nudgeAnnotationHandle,
  updateAnnotationLayoutFromHandle,
  validateMechanismSceneActions,
  validateMechanismScenes,
  type EditableMechanismHandle,
  type MechanismAnnotation,
} from "../interactive/benzene-nitration/src/features/mechanisms";
import { MechanismDemoPage } from "../interactive/benzene-nitration/src/MechanismDemoPage";
import { PartialCharge } from "../interactive/benzene-nitration/src/svgPrimitives";

const requiredStepIds = [
  "electrophile-generation",
  "electrophilic-attack",
  "wheland-intermediate",
  "deprotonation",
  "product",
];

let passed = 0;

function pass(name: string) {
  passed += 1;
  console.log(`PASS ${passed}: ${name}`);
}

function getAnnotationById(annotations: MechanismAnnotation[], annotationId: string) {
  const annotation = annotations.find(item => item.id === annotationId);

  assert.ok(annotation, `Missing annotation ${annotationId}`);
  return annotation;
}

function withWindowSearch(search: string, callback: () => void) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        search,
      },
    },
  });

  try {
    callback();
  } finally {
    if (prior) {
      Object.defineProperty(globalThis, "window", prior);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  }
}

async function main() {
  const pageHtml = await readFile(join(process.cwd(), "interactive/benzene-nitration/index.html"), "utf8");

  assert.deepEqual(
    benzeneNitrationSteps.map(step => step.id),
    requiredStepIds
  );
  pass("all five benzene nitration step ids are present");

  assert.deepEqual(
    benzeneNitrationSteps.map(step => step.title),
    [
      "1. Generation of the electrophile",
      "2. Electrophilic attack",
      "3. Wheland intermediate",
      "4. Deprotonation",
      "5. Product",
    ]
  );
  assert.equal(benzeneNitrationOverview.title, "Nitration of benzene");
  assert.equal(benzeneNitrationOverview.topic, "Electrophilic substitution");
  assert.equal(benzeneNitrationOverview.conditions, "conc. HNO₃, conc. H₂SO₄, 50–55 °C");
  pass("all five step titles and required page labels are present");

  assert.equal(benzeneNitrationSpecies.nitronium.name, "nitronium ion");
  assert.equal(benzeneNitrationSpecies.nitronium.role, "electrophile");
  assert.equal(benzeneNitrationSpecies.nitronium.electrophile, true);
  assert.equal(benzeneNitrationSpecies.nitronium.formalCharge, "+");
  assert.equal(benzeneNitrationSpecies.nitronium.charge, 1);
  pass("nitronium is present as positively charged electrophile metadata");

  assert.deepEqual(validateBenzeneNitrationArrowAnchors(), []);
  assert.deepEqual(
    benzeneNitrationArrows.map(arrow => [arrow.sourceAnchor, arrow.targetAnchor]),
    [
      ["benzene.piSystem", "nitronium.N"],
      ["hso4.reactiveO.lonePair", "sigmaComplex.attachedH"],
      ["sigmaComplex.CHBondMidpoint", "sigmaComplex.delocalisationRegion"],
    ]
  );
  pass("all arrow anchors are valid and chemically constrained");

  assert.deepEqual(validateMechanismScenes(benzeneNitrationScenes), []);
  assert.deepEqual(
    benzeneNitrationScenes.map(scene => scene.id),
    requiredStepIds
  );
  assert.ok(benzeneNitrationScenes.every(scene => scene.scaffold.kind === "manualSvg"));
  assert.equal(benzeneNitrationScenes[1].anchors["benzene.piSystem"].kind, "piSystem");
  assert.equal(benzeneNitrationScenes[3].anchors["sigmaComplex.CHBondMidpoint"].kind, "bondMidpoint");
  pass("mechanism scenes are typed, scaffold-backed, and validate deterministically");

  const attackArrow = benzeneNitrationScenes[1].annotations.find(annotation => annotation.id === "attack-arrow");
  assert.equal(attackArrow?.kind, "curlyArrow");
  if (attackArrow?.kind === "curlyArrow") {
    assert.deepEqual(attackArrow.layout.startOffset, { x: 30, y: -30 });
    assert.deepEqual(attackArrow.layout.endOffset, { x: -6, y: 0 });
    assert.ok(attackArrow.layout.control1);
    assert.ok(attackArrow.layout.control2);
    assert.equal(attackArrow.layout.arrowheadOffset, 14);
  }
  const deprotonationArrows = benzeneNitrationScenes[3].annotations.filter(
    annotation => annotation.kind === "curlyArrow"
  );
  assert.equal(deprotonationArrows.length, 2);
  deprotonationArrows.forEach(annotation => {
    if (annotation.kind === "curlyArrow") {
      assert.ok(annotation.layout.control1);
      assert.ok(annotation.layout.control2);
      assert.ok(annotation.layout.startOffset);
      assert.ok(annotation.layout.endOffset);
    }
  });
  const baseLonePair = benzeneNitrationScenes[3].annotations.find(
    annotation => annotation.id === "hso4-reactive-oxygen-lone-pair"
  );
  assert.equal(baseLonePair?.kind, "lonePair");
  if (baseLonePair?.kind === "lonePair") {
    assert.equal(baseLonePair.electronCount, 2);
    assert.equal(baseLonePair.layout.rotation, -20);
  }
  const whelandHorseshoe = benzeneNitrationScenes[2].annotations.find(
    annotation => annotation.id === "wheland-delocalisation-horseshoe"
  );
  assert.equal(whelandHorseshoe?.kind, "areniumHorseshoe");
  if (whelandHorseshoe?.kind === "areniumHorseshoe") {
    assert.equal(whelandHorseshoe.layout.segments.length, 1);
    assert.deepEqual(whelandHorseshoe.excludedAnchorIds, ["sigmaComplex.sp3Carbon"]);
  }
  const deprotonationHorseshoe = benzeneNitrationScenes[3].annotations.find(
    annotation => annotation.id === "deprotonation-delocalisation-horseshoe"
  );
  assert.equal(deprotonationHorseshoe?.kind, "areniumHorseshoe");
  if (deprotonationHorseshoe?.kind === "areniumHorseshoe") {
    assert.equal(deprotonationHorseshoe.layout.segments.length, 1);
    assert.deepEqual(deprotonationHorseshoe.excludedAnchorIds, ["sigmaComplex.sp3Carbon"]);
  }
  pass("manual layout controls exist for arrows, charges, and lone pairs");

  const attackScene = benzeneNitrationScenes[1];
  const attackDraft = cloneMechanismAnnotations(attackScene.annotations);
  const control1Handle: EditableMechanismHandle = {
    annotationId: "attack-arrow",
    kind: "curlyArrow",
    field: "control1",
  };
  const control1Moved = updateAnnotationLayoutFromHandle(attackScene, attackDraft, control1Handle, { x: 232, y: 126 });
  const control1Arrow = getAnnotationById(control1Moved, "attack-arrow");
  assert.equal(control1Arrow.kind, "curlyArrow");
  if (control1Arrow.kind === "curlyArrow") {
    assert.deepEqual(control1Arrow.layout.control1, { x: 232, y: 126 });
    assert.deepEqual(control1Arrow.layout.control2, { x: 294, y: 96 });
    assert.equal(control1Arrow.fromAnchorId, "benzene.piSystem");
    assert.equal(control1Arrow.toAnchorId, "nitronium.N");
  }

  const control2Moved = updateAnnotationLayoutFromHandle(
    attackScene,
    control1Moved,
    {
      annotationId: "attack-arrow",
      kind: "curlyArrow",
      field: "control2",
    },
    { x: 302, y: 98 }
  );
  const control2Arrow = getAnnotationById(control2Moved, "attack-arrow");
  assert.equal(control2Arrow.kind, "curlyArrow");
  if (control2Arrow.kind === "curlyArrow") {
    assert.deepEqual(control2Arrow.layout.control1, { x: 232, y: 126 });
    assert.deepEqual(control2Arrow.layout.control2, { x: 302, y: 98 });
  }

  const startOffsetMoved = updateAnnotationLayoutFromHandle(
    attackScene,
    control2Moved,
    {
      annotationId: "attack-arrow",
      kind: "curlyArrow",
      field: "startOffset",
    },
    { x: 212, y: 176 }
  );
  const startOffsetArrow = getAnnotationById(startOffsetMoved, "attack-arrow");
  assert.equal(startOffsetArrow.kind, "curlyArrow");
  if (startOffsetArrow.kind === "curlyArrow") {
    assert.deepEqual(startOffsetArrow.layout.startOffset, { x: 34, y: -30 });
    assert.equal(startOffsetArrow.fromAnchorId, "benzene.piSystem");
  }

  const endOffsetMoved = updateAnnotationLayoutFromHandle(
    attackScene,
    startOffsetMoved,
    {
      annotationId: "attack-arrow",
      kind: "curlyArrow",
      field: "endOffset",
    },
    { x: 342, y: 106 }
  );
  const endOffsetArrow = getAnnotationById(endOffsetMoved, "attack-arrow");
  assert.equal(endOffsetArrow.kind, "curlyArrow");
  if (endOffsetArrow.kind === "curlyArrow") {
    assert.deepEqual(endOffsetArrow.layout.endOffset, { x: -10, y: 2 });
    assert.equal(endOffsetArrow.toAnchorId, "nitronium.N");
  }
  pass("dragging arrow handles updates only arrow layout fields");

  const whelandScene = benzeneNitrationScenes[2];
  const whelandDraft = cloneMechanismAnnotations(whelandScene.annotations);
  const movedChargeDraft = updateAnnotationLayoutFromHandle(
    whelandScene,
    whelandDraft,
    {
      annotationId: "wheland-positive-charge",
      kind: "anchoredOffset",
      field: "offset",
    },
    { x: 247, y: 231 }
  );
  const movedCharge = getAnnotationById(movedChargeDraft, "wheland-positive-charge");
  assert.equal(movedCharge.kind, "formalCharge");
  if (movedCharge.kind === "formalCharge") {
    assert.deepEqual(movedCharge.layout.offset, { x: 7, y: 7 });
    assert.equal(movedCharge.anchorId, "sigmaComplex.positiveRegion");
  }

  const partialChargeAnnotation: MechanismAnnotation = {
    id: "test-partial-charge",
    kind: "partialCharge",
    value: "δ+",
    anchorId: "nitronium.N",
    layout: {
      offset: { x: 3, y: -12 },
    },
  };
  const partialChargeMoved = updateAnnotationLayoutFromHandle(
    attackScene,
    [partialChargeAnnotation],
    {
      annotationId: "test-partial-charge",
      kind: "anchoredOffset",
      field: "offset",
    },
    { x: 360, y: 92 }
  )[0];
  assert.equal(partialChargeMoved.kind, "partialCharge");
  if (partialChargeMoved.kind === "partialCharge") {
    assert.deepEqual(partialChargeMoved.layout.offset, { x: 8, y: -12 });
    assert.equal(partialChargeMoved.anchorId, "nitronium.N");
  }

  const deprotonationScene = benzeneNitrationScenes[3];
  const lonePairMoved = updateAnnotationLayoutFromHandle(
    deprotonationScene,
    cloneMechanismAnnotations(deprotonationScene.annotations),
    {
      annotationId: "hso4-reactive-oxygen-lone-pair",
      kind: "anchoredOffset",
      field: "offset",
    },
    { x: 108, y: 90 }
  );
  const lonePairAfterMove = getAnnotationById(lonePairMoved, "hso4-reactive-oxygen-lone-pair");
  assert.equal(lonePairAfterMove.kind, "lonePair");
  if (lonePairAfterMove.kind === "lonePair") {
    assert.deepEqual(lonePairAfterMove.layout.offset, { x: 5, y: -4 });
    assert.equal(lonePairAfterMove.anchorId, "hso4.reactiveO.lonePair");
  }
  const lonePairRotated = updateAnnotationLayoutFromHandle(
    deprotonationScene,
    lonePairMoved,
    {
      annotationId: "hso4-reactive-oxygen-lone-pair",
      kind: "lonePairRotation",
      field: "rotation",
    },
    { x: 108, y: 108 }
  );
  const lonePairAfterRotation = getAnnotationById(lonePairRotated, "hso4-reactive-oxygen-lone-pair");
  assert.equal(lonePairAfterRotation.kind, "lonePair");
  if (lonePairAfterRotation.kind === "lonePair") {
    assert.deepEqual(lonePairAfterRotation.layout.offset, { x: 5, y: -4 });
    assert.equal(lonePairAfterRotation.layout.rotation, 90);
    assert.equal(lonePairAfterRotation.anchorId, "hso4.reactiveO.lonePair");
  }
  assert.deepEqual(
    getAnnotationHandlePoint(deprotonationScene, lonePairRotated, {
      annotationId: "hso4-reactive-oxygen-lone-pair",
      kind: "lonePairRotation",
      field: "rotation",
    }),
    { x: 108, y: 108 }
  );
  pass("dragging charge, partial charge, and lone pair handles updates only offsets and rotation");

  const generationScene = benzeneNitrationScenes[0];
  const lockedDraft = cloneMechanismAnnotations(generationScene.annotations);
  const lockedBefore = JSON.stringify(getAnnotationById(lockedDraft, "nitronium.N.formal-positive-charge"));
  const lockedAfter = updateAnnotationLayoutFromHandle(
    generationScene,
    lockedDraft,
    {
      annotationId: "nitronium.N.formal-positive-charge",
      kind: "anchoredOffset",
      field: "offset",
    },
    { x: 300, y: 300 }
  );
  assert.equal(JSON.stringify(getAnnotationById(lockedAfter, "nitronium.N.formal-positive-charge")), lockedBefore);
  pass("locked annotations do not update on drag");

  const nudgedDraft = nudgeAnnotationHandle(attackScene, endOffsetMoved, control1Handle, { x: 1, y: -1 });
  const nudgedArrow = getAnnotationById(nudgedDraft, "attack-arrow");
  assert.equal(nudgedArrow.kind, "curlyArrow");
  if (nudgedArrow.kind === "curlyArrow") {
    assert.deepEqual(nudgedArrow.layout.control1, { x: 233, y: 125 });
  }
  assert.deepEqual(getAnnotationHandlePoint(attackScene, nudgedDraft, control1Handle), { x: 233, y: 125 });
  assert.equal(getDefaultHandleForAnnotation(nudgedArrow)?.annotationId, "attack-arrow");
  pass("selected handles can be nudged with keyboard-compatible deltas");

  assert.deepEqual(validateMechanismSceneActions({ ...attackScene, annotations: nudgedDraft }), []);
  const layoutExport = createLayoutOverridesExport(attackScene, nudgedDraft);
  assert.equal(layoutExport.sceneId, "electrophilic-attack");
  const exportedAttackArrow = getAnnotationById(nudgedDraft, "attack-arrow");
  assert.equal(exportedAttackArrow.kind, "curlyArrow");
  if (exportedAttackArrow.kind === "curlyArrow") {
    assert.deepEqual(layoutExport.annotations["attack-arrow"].layout, exportedAttackArrow.layout);
    assert.deepEqual(exportedAttackArrow.layout.control1, { x: 233, y: 125 });
  }
  assert.equal(
    (getAnnotationById(nudgedDraft, "attack-arrow") as Extract<MechanismAnnotation, { kind: "curlyArrow" }>)
      .fromAnchorId,
    "benzene.piSystem"
  );
  pass("layout export reflects draft layout while validation remains anchor-based");

  const checkIds = new Set(benzeneNitrationCorrectnessChecks.map(check => check.id));
  benzeneNitrationRequiredCorrectnessCheckIds.forEach(checkId =>
    assert.ok(checkIds.has(checkId), `Missing required correctness check ${checkId}`)
  );
  assert.ok(checkIds.has("partial-charge-policy"));
  pass("all required correctness checks and partial-charge policy exist");

  const renderedStepSvgs = benzeneNitrationSteps.map(step => renderToStaticMarkup(<MechanismSvg step={step.id} />));
  assert.ok(renderedStepSvgs[0].includes("NO₂⁺"));
  assert.ok(renderedStepSvgs[1].includes("aromatic π system"));
  assert.ok(renderedStepSvgs[1].includes("nitrogen atom of nitronium ion"));
  assert.ok(renderedStepSvgs[1].includes("nitronium ion"));
  assert.ok(renderedStepSvgs[1].includes("formal charge +"));
  assert.ok(renderedStepSvgs[2].includes("new C-N bond to nitro group"));
  assert.ok(renderedStepSvgs[2].includes("C-H bond retained on attacked carbon"));
  assert.ok(renderedStepSvgs[2].includes("broken delocalisation horseshoe"));
  assert.ok(renderedStepSvgs[2].includes("wheland-positive-charge"));
  assert.ok(!renderedStepSvgs[2].includes("mechanism-svg__aromatic-core"));
  assert.ok(!renderedStepSvgs[2].includes("mechanism-svg__bond--double"));
  assert.ok(renderedStepSvgs[3].includes("oxygen lone pair on hydrogensulfate"));
  assert.ok(renderedStepSvgs[3].includes("C-H bond midpoint"));
  assert.ok(renderedStepSvgs[3].includes("broken delocalisation region"));
  assert.ok(!renderedStepSvgs[3].includes("mechanism-svg__aromatic-core"));
  assert.ok(renderedStepSvgs[4].includes("nitrobenzene; aromaticity restored"));
  assert.ok(renderedStepSvgs[4].includes("C-N bond to nitro nitrogen in nitrobenzene"));
  assert.ok(renderedStepSvgs[4].includes("nitro nitrogen directly bonded to the aromatic ring"));
  pass("step SVGs render the required mechanism features");

  const debugMarkup = renderToStaticMarkup(
    <MechanismSvg
      step="deprotonation"
      debugOptions={{
        showAnchors: true,
        showHitboxes: true,
        showAnnotationBounds: true,
        showControlPoints: true,
        showJson: false,
      }}
    />
  );
  assert.ok(debugMarkup.includes("mechanism-debug__anchor-dot"));
  assert.ok(debugMarkup.includes("mechanism-debug__bounds-rect"));
  assert.ok(debugMarkup.includes("mechanism-debug__control-point"));
  assert.ok(debugMarkup.includes("sigmaComplex.CHBondMidpoint"));
  pass("author debug SVG mode exposes anchors, bounds, hitboxes, and control points");

  const authorSvgMarkup = renderToStaticMarkup(
    <MechanismSvg
      step="electrophilic-attack"
      debugOptions={{
        showAnchors: true,
        showHitboxes: false,
        showAnnotationBounds: true,
        showControlPoints: true,
        showJson: false,
      }}
      annotations={nudgedDraft}
      authoring={{
        selectedAnnotationId: "attack-arrow",
        selectedHandle: control1Handle,
        isDragging: false,
        selectAnnotation: () => undefined,
        beginDrag: () => undefined,
        dragSelectedHandleTo: () => undefined,
        endDrag: () => undefined,
        nudgeSelectedHandle: () => undefined,
        clearSelection: () => undefined,
        resetSelectedAnnotation: () => undefined,
      }}
    />
  );
  assert.ok(authorSvgMarkup.includes("mechanism-author-handle"));
  assert.ok(authorSvgMarkup.includes("mechanism-author-handle--selected"));
  assert.ok(authorSvgMarkup.includes("attack-arrow"));
  assert.ok(!renderedStepSvgs[1].includes("mechanism-author-handle"));
  pass("author SVG renders drag handles while learner SVG remains clean");

  const primitiveMarkup = renderToStaticMarkup(<PartialCharge x={10} y={10} charge="δ+" />);
  assert.ok(primitiveMarkup.includes("δ+"));
  pass("PartialCharge exists as an SVG primitive");

  assert.equal(getPreviousStepIndex(0), 0);
  assert.equal(getPreviousStepIndex(3), 2);
  assert.equal(getNextStepIndex(0), 1);
  assert.equal(getNextStepIndex(requiredStepIds.length - 1), requiredStepIds.length - 1);
  pass("previous and next step navigation clamps correctly");

  const checklistMarkup = renderToStaticMarkup(<ChemicalChecklist step="deprotonation" />);
  assert.ok(checklistMarkup.includes("Chemical correctness checks"));
  assert.ok(checklistMarkup.includes("Lone pair on base"));
  assert.ok(checklistMarkup.includes("Intermediate drawing retained"));
  pass("chemical checklist renders for the current step");

  const componentMarkup = renderToStaticMarkup(<BenzeneNitrationMechanism />);
  assert.ok(componentMarkup.includes("1. Generation of the electrophile"));
  assert.ok(componentMarkup.includes("Go to 5. Product"));
  assert.ok(componentMarkup.includes("Chemical correctness checks"));
  assert.ok(!componentMarkup.includes("mechanism-author"));

  withWindowSearch("?mode=author&debugBounds=1&debugJson=1", () => {
    const authorComponentMarkup = renderToStaticMarkup(<BenzeneNitrationMechanism />);
    assert.ok(authorComponentMarkup.includes("mechanism-author"));
    assert.ok(authorComponentMarkup.includes("Copy layout overrides"));
    assert.ok(authorComponentMarkup.includes("mechanism-author-handle"));
  });
  pass("query author mode renders controls and learner mode does not");

  const pageMarkup = renderToStaticMarkup(<MechanismDemoPage />);
  assert.ok(pageMarkup.includes("Nitration of benzene"));
  assert.ok(pageMarkup.includes("Electrophilic substitution"));
  assert.ok(pageMarkup.includes("conc. HNO₃, conc. H₂SO₄, 50–55 °C"));
  assert.ok(pageMarkup.includes("Golden reference"));
  pass("React page and component render without crashing");

  assert.ok(pageHtml.includes('id="benzene-nitration-root"'));
  assert.ok(pageHtml.includes("./assets/benzene-nitration.js"));
  pass("static route shell includes React mount root and built asset reference");

  console.log(`Benzene nitration golden reference checks passed: ${passed}`);
}

void main();

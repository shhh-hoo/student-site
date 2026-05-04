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
  validateMechanismScenes,
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
    assert.deepEqual(attackArrow.layout.startOffset, { x: 26, y: -26 });
    assert.deepEqual(attackArrow.layout.endOffset, { x: -2, y: 0 });
    assert.ok(attackArrow.layout.control1);
    assert.ok(attackArrow.layout.control2);
    assert.equal(attackArrow.layout.arrowheadOffset, 12);
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
  pass("manual layout controls exist for arrows, charges, and lone pairs");

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

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import BenzeneNitrationMechanism, {
  MechanismSvg,
} from "../interactive/benzene-nitration/src/BenzeneNitrationMechanism";
import {
  benzeneNitrationSpecies,
  benzeneNitrationSteps,
} from "../interactive/benzene-nitration/src/benzeneNitrationData";
import {
  benzeneNitrationArrows,
  benzeneNitrationCorrectnessChecks,
  benzeneNitrationRequiredCorrectnessCheckIds,
  validateBenzeneNitrationArrowAnchors,
} from "../interactive/benzene-nitration/src/chemicalCorrectness";
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
      ["benzene.pi-system", "nitronium.N"],
      ["hydrogensulfate.O-lone-pair", "wheland.H"],
      ["wheland.C-H-bond", "wheland.C1-C2-bond-forming-pi-system"],
    ]
  );
  pass("all arrow anchors are valid and chemically constrained");

  const checkIds = new Set(benzeneNitrationCorrectnessChecks.map(check => check.id));
  benzeneNitrationRequiredCorrectnessCheckIds.forEach(checkId =>
    assert.ok(checkIds.has(checkId), `Missing required correctness check ${checkId}`)
  );
  assert.ok(checkIds.has("partial-charge-policy"));
  pass("all required correctness checks and partial-charge policy exist");

  const renderedStepSvgs = benzeneNitrationSteps.map(step => renderToStaticMarkup(<MechanismSvg step={step.id} />));
  assert.ok(renderedStepSvgs[0].includes("NO₂⁺"));
  assert.ok(renderedStepSvgs[1].includes("aromatic π system"));
  assert.ok(renderedStepSvgs[1].includes("nitrogen of nitronium ion"));
  assert.ok(renderedStepSvgs[2].includes("new C-N bond to nitro group"));
  assert.ok(renderedStepSvgs[2].includes("C-H bond retained on attacked carbon"));
  assert.ok(renderedStepSvgs[3].includes("oxygen lone pair on hydrogensulfate"));
  assert.ok(renderedStepSvgs[3].includes("C-H bond midpoint"));
  assert.ok(renderedStepSvgs[4].includes("nitrobenzene product"));
  pass("step SVGs render the required mechanism features");

  const primitiveMarkup = renderToStaticMarkup(<PartialCharge x={10} y={10} charge="δ+" />);
  assert.ok(primitiveMarkup.includes("δ+"));
  pass("PartialCharge exists as an SVG primitive");

  const componentMarkup = renderToStaticMarkup(<BenzeneNitrationMechanism />);
  assert.ok(componentMarkup.includes("1. Generation of the electrophile"));
  assert.ok(componentMarkup.includes("Chemical correctness checks"));

  const pageMarkup = renderToStaticMarkup(<MechanismDemoPage />);
  assert.ok(pageMarkup.includes("Nitration of benzene"));
  assert.ok(pageMarkup.includes("Golden reference"));
  pass("React page and component render without crashing");

  assert.ok(pageHtml.includes('id="benzene-nitration-root"'));
  assert.ok(pageHtml.includes("./assets/benzene-nitration.js"));
  pass("static route shell includes React mount root and built asset reference");

  console.log(`Benzene nitration golden reference checks passed: ${passed}`);
}

void main();

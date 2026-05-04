import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import fixtureJson from "../interactive/benzene-nitration/fixtures/benzene-nitration.v1.json";
import { validateMechanismFixture } from "../interactive/benzene-nitration/src/fixtureValidation";
import { MechanismDemoPage } from "../interactive/benzene-nitration/src/MechanismDemoPage";
import { formatChemistryText } from "../interactive/benzene-nitration/src/renderers/chemistryText";
import { SvgMechanismRenderer } from "../interactive/benzene-nitration/src/renderers/SvgMechanismRenderer";
import {
  createMechanismDemoState,
  getActivePanel,
  getStepIndicator,
  movePanel,
} from "../interactive/benzene-nitration/src/state";

const panelTitles = [
  "Step 1. Generate the electrophile",
  "Step 2. Electrophilic attack",
  "Step 3. Restore aromaticity",
];

let passed = 0;

function pass(name: string) {
  passed += 1;
  console.log(`PASS ${passed}: ${name}`);
}

async function main() {
  const pageHtml = await readFile(join(process.cwd(), "interactive/benzene-nitration/index.html"), "utf8");
  const fixture = validateMechanismFixture(fixtureJson);

  assert.equal(fixture.id, "benzene-eas-nitration-v1");
  assert.equal(fixture.panels.length, 3);
  assert.equal(fixture.display.show3D, false);
  pass("fixture parsing and shape validation");

  assert.deepEqual(
    fixture.panels.map(panel => panel.title),
    panelTitles
  );
  pass("all three panel titles are present in the fixture");

  assert.equal(fixture.reaction.overallEquation, "C6H6 + HNO3 -> C6H5NO2 + H2O");
  assert.equal(formatChemistryText(fixture.reaction.overallEquation), "C₆H₆ + HNO₃ → C₆H₅NO₂ + H₂O");
  pass("overall reaction text appears and formats for display");

  assert.ok(fixture.examChecklist.some(item => item.includes("NO2+")));
  assert.ok(fixture.examChecklist.some(item => item.includes("Aromaticity restored")));
  pass("exam checklist renders from fixture content");

  let state = createMechanismDemoState(fixture);
  assert.equal(getActivePanel(state).title, panelTitles[0]);
  assert.equal(getStepIndicator(state), "1 / 3");
  state = movePanel(state, 1);
  assert.equal(getActivePanel(state).title, panelTitles[1]);
  state = movePanel(state, 1);
  assert.equal(getActivePanel(state).title, panelTitles[2]);
  state = movePanel(state, 1);
  assert.equal(getActivePanel(state).title, panelTitles[2]);
  state = movePanel(state, -1);
  assert.equal(getActivePanel(state).title, panelTitles[1]);
  pass("stepper state moves between panels and clamps at bounds");

  const renderedPanels = fixture.panels.map(panel => renderToStaticMarkup(<SvgMechanismRenderer panel={panel} />));
  assert.ok(renderedPanels.every(markup => markup.includes("<svg")));
  assert.ok(renderedPanels[0].includes("NO₂⁺"));
  assert.ok(renderedPanels[1].includes("attack-arrow") || renderedPanels[1].includes("mechanism-svg__curly-arrow"));
  assert.ok(renderedPanels[2].includes("HSO₄−"));
  assert.ok(renderedPanels[2].includes("nitrobenzene"));
  pass("SVG smoke render covers electrophile, attack, deprotonation, and product labels");

  const pageMarkup = renderToStaticMarkup(<MechanismDemoPage />);
  assert.ok(pageMarkup.includes("Nitration of benzene"));
  panelTitles.forEach(panelTitle =>
    assert.ok(pageMarkup.includes(panelTitle), `Missing rendered title: ${panelTitle}`)
  );
  assert.ok(pageMarkup.includes("Overall reaction"));
  assert.ok(pageMarkup.includes("Exam checklist"));
  pass("React demo page smoke renders with all panel titles available");

  assert.ok(pageHtml.includes('id="benzene-nitration-root"'));
  assert.ok(pageHtml.includes("./assets/benzene-nitration.js"));
  pass("static route shell includes React mount root and built asset reference");

  console.log(`Benzene nitration demo checks passed: ${passed}`);
}

void main();

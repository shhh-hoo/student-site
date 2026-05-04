import type { MechanismFixture, MechanismPanelData } from "./types";

const requiredPanelIds = [
  "panel-1-electrophile-generation",
  "panel-2-electrophilic-attack",
  "panel-3-deprotonation",
] as const;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function collectDiagramText(panel: MechanismPanelData) {
  const diagram = panel.diagram || {};

  return [...(diagram.texts || []), ...(diagram.annotations || [])].map(item => String(item?.text || "")).join(" ");
}

function hasFormalCharge(panel: MechanismPanelData, charge: string) {
  return (panel.diagram.atoms || []).some(atom => atom.formalCharge === charge);
}

export function validateMechanismFixture(fixture: unknown): MechanismFixture {
  const candidate = fixture as Partial<MechanismFixture>;

  assertCondition(candidate && typeof candidate === "object", "Mechanism fixture must be an object.");
  assertCondition(candidate.id === "benzene-eas-nitration-v1", "Unexpected mechanism fixture id.");
  assertCondition(typeof candidate.title === "string" && candidate.title.length > 0, "Mechanism title is required.");
  assertCondition(
    typeof candidate.subtitle === "string" && candidate.subtitle.length > 0,
    "Mechanism subtitle is required."
  );
  assertCondition(candidate.display?.show3D === false, "This preview must stay 2D.");
  assertCondition(Array.isArray(candidate.panels), "Mechanism panels must be an array.");
  assertCondition(candidate.panels.length === 3, "Benzene nitration preview must contain exactly three panels.");

  requiredPanelIds.forEach((panelId, index) => {
    const panel = candidate.panels?.[index];

    assertCondition(panel?.id === panelId, `Panel ${index + 1} has the wrong id.`);
    assertCondition(typeof panel.title === "string" && panel.title.length > 0, `Panel ${index + 1} needs a title.`);
    assertCondition(
      typeof panel.caption === "string" && panel.caption.length > 0,
      `Panel ${index + 1} needs a caption.`
    );
    assertCondition(Number.isFinite(panel.canvas?.width), `Panel ${index + 1} needs a canvas width.`);
    assertCondition(Number.isFinite(panel.canvas?.height), `Panel ${index + 1} needs a canvas height.`);
  });

  assertCondition(
    candidate.reaction?.overallEquation === "C6H6 + HNO3 -> C6H5NO2 + H2O",
    "Overall reaction equation is missing or changed."
  );
  assertCondition(Array.isArray(candidate.reaction?.conditions), "Reaction conditions must be an array.");
  assertCondition(candidate.reaction.conditions.length >= 3, "Reaction conditions are incomplete.");
  assertCondition(Array.isArray(candidate.examChecklist), "Exam checklist must be an array.");
  assertCondition(candidate.examChecklist.length >= 5, "Exam checklist is incomplete.");

  const [electrophilePanel, attackPanel, deprotonationPanel] = candidate.panels;

  assertCondition(collectDiagramText(electrophilePanel).includes("NO2+"), "Panel 1 must label NO2+.");
  assertCondition(collectDiagramText(attackPanel).includes("NO2+"), "Panel 2 must label the electrophile NO2+.");
  assertCondition(
    (attackPanel.diagram.curlyArrows || []).some(arrow => arrow.id === "attack-arrow"),
    "Panel 2 must include the benzene attack curly arrow."
  );
  assertCondition(hasFormalCharge(attackPanel, "+1"), "Panel 2 must show a positive charge in the sigma complex.");
  assertCondition(collectDiagramText(deprotonationPanel).includes("HSO4−"), "Panel 3 must label HSO4−.");
  assertCondition(
    (deprotonationPanel.diagram.curlyArrows || []).length >= 2,
    "Panel 3 must include deprotonation curly arrows."
  );
  assertCondition(
    (deprotonationPanel.diagram.productFragments || []).some(fragment => fragment.type === "nitro-substituent"),
    "Panel 3 must include the nitrobenzene product fragment."
  );

  return candidate as MechanismFixture;
}

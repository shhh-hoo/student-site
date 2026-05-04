import type { MechanismArrow, MechanismFixture, MechanismPanelData, MechanismSpecies } from "./types";

const requiredPanelIds = [
  "panel-1-electrophile-generation",
  "panel-2-electrophilic-attack",
  "panel-3-deprotonation",
] as const;

const requiredConceptualAnchors = new Set([
  "benzene.pi-system",
  "nitronium.N",
  "sigma-complex.C-H-bond",
  "bisulfate.O-lone-pair",
]);

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getPanelDiagram(panel: MechanismPanelData) {
  return panel.display.layout.diagram;
}

function collectDiagramText(panel: MechanismPanelData) {
  const diagram = getPanelDiagram(panel);

  return [...(diagram.texts || []), ...(diagram.annotations || [])].map(item => String(item?.text || "")).join(" ");
}

function hasFormalCharge(panel: MechanismPanelData, charge: string) {
  return (getPanelDiagram(panel).atoms || []).some(atom => atom.formalCharge === charge);
}

function getAnchorKey(ref: { speciesId: string; anchorId: string }) {
  return `${ref.speciesId}.${ref.anchorId}`;
}

function buildSpeciesMap(species: MechanismSpecies[]) {
  return new Map(species.map(item => [item.id, item]));
}

function assertSpeciesIdentity(species: MechanismSpecies[]) {
  assertCondition(Array.isArray(species), "Mechanism species must be an array.");
  assertCondition(species.length >= 8, "Mechanism species catalogue is incomplete.");

  const speciesIds = new Set<string>();

  species.forEach(item => {
    assertCondition(typeof item.id === "string" && item.id.length > 0, "Each species needs an id.");
    assertCondition(!speciesIds.has(item.id), `Duplicate species id: ${item.id}.`);
    speciesIds.add(item.id);
    assertCondition(typeof item.name === "string" && item.name.length > 0, `Species ${item.id} needs a name.`);
    assertCondition(typeof item.role === "string" && item.role.length > 0, `Species ${item.id} needs a role.`);
    assertCondition(typeof item.smiles === "string" && item.smiles.length > 0, `Species ${item.id} needs a SMILES.`);
    assertCondition(Number.isFinite(item.charge), `Species ${item.id} needs a numeric charge.`);
    assertCondition(
      typeof item.structureSource === "string" && item.structureSource.length > 0,
      `Species ${item.id} needs a structure source.`
    );
    assertCondition(
      item.molfile === undefined || typeof item.molfile === "string",
      `Species ${item.id} molfile must be a string when provided.`
    );
  });
}

function assertAnchorRef(speciesMap: Map<string, MechanismSpecies>, ref: MechanismArrow["from"], arrowId: string) {
  const species = speciesMap.get(ref.speciesId);
  const anchorKey = getAnchorKey(ref);

  assertCondition(species, `Mechanism arrow ${arrowId} references unknown species ${ref.speciesId}.`);
  assertCondition(
    requiredConceptualAnchors.has(anchorKey),
    `Mechanism arrow ${arrowId} uses unknown anchor ${anchorKey}.`
  );
  assertCondition(
    (species.anchors || []).some(anchor => anchor.id === ref.anchorId),
    `Mechanism arrow ${arrowId} references anchor ${anchorKey}, but it is not declared on that species.`
  );
}

function assertMechanismArrows(panel: MechanismPanelData, speciesMap: Map<string, MechanismSpecies>) {
  const diagramArrowIds = new Set((getPanelDiagram(panel).curlyArrows || []).map(arrow => arrow.id));

  panel.mechanismArrows.forEach(arrow => {
    assertCondition(typeof arrow.id === "string" && arrow.id.length > 0, "Mechanism arrows need ids.");
    assertCondition(arrow.type === "curly-electron-pair", `Mechanism arrow ${arrow.id} has an unsupported type.`);
    assertCondition(
      diagramArrowIds.has(arrow.displayArrowId),
      `Mechanism arrow ${arrow.id} must map to a display curly arrow.`
    );
    assertAnchorRef(speciesMap, arrow.from, arrow.id);
    assertAnchorRef(speciesMap, arrow.to, arrow.id);
  });
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
  assertSpeciesIdentity(candidate.species || []);

  const speciesMap = buildSpeciesMap(candidate.species || []);

  requiredPanelIds.forEach((panelId, index) => {
    const panel = candidate.panels?.[index];

    assertCondition(panel?.id === panelId, `Panel ${index + 1} has the wrong id.`);
    assertCondition(typeof panel.title === "string" && panel.title.length > 0, `Panel ${index + 1} needs a title.`);
    assertCondition(
      typeof panel.caption === "string" && panel.caption.length > 0,
      `Panel ${index + 1} needs a caption.`
    );
    assertCondition(Number.isFinite(panel.display?.layout?.canvas?.width), `Panel ${index + 1} needs a canvas width.`);
    assertCondition(
      Number.isFinite(panel.display?.layout?.canvas?.height),
      `Panel ${index + 1} needs a canvas height.`
    );
    assertCondition(panel.display?.layout?.diagram, `Panel ${index + 1} needs a display diagram.`);
    assertCondition(Array.isArray(panel.visibleSpecies), `Panel ${index + 1} needs visible species ids.`);
    panel.visibleSpecies.forEach(speciesId =>
      assertCondition(speciesMap.has(speciesId), `Panel ${index + 1} references unknown species ${speciesId}.`)
    );
    assertCondition(Array.isArray(panel.mechanismArrows), `Panel ${index + 1} needs mechanism arrows.`);
    assertMechanismArrows(panel, speciesMap);
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
    (getPanelDiagram(attackPanel).curlyArrows || []).some(arrow => arrow.id === "attack-arrow"),
    "Panel 2 must include the benzene attack curly arrow."
  );
  assertCondition(
    attackPanel.mechanismArrows.some(
      arrow =>
        arrow.id === "attack-arrow" &&
        getAnchorKey(arrow.from) === "benzene.pi-system" &&
        getAnchorKey(arrow.to) === "nitronium.N"
    ),
    "Panel 2 mechanism arrow must connect benzene.pi-system to nitronium.N."
  );
  assertCondition(hasFormalCharge(attackPanel, "+1"), "Panel 2 must show a positive charge in the sigma complex.");
  assertCondition(collectDiagramText(deprotonationPanel).includes("HSO4−"), "Panel 3 must label HSO4−.");
  assertCondition(
    (getPanelDiagram(deprotonationPanel).curlyArrows || []).length >= 2,
    "Panel 3 must include deprotonation curly arrows."
  );
  assertCondition(
    deprotonationPanel.mechanismArrows.some(
      arrow =>
        arrow.id === "base-to-h" &&
        getAnchorKey(arrow.from) === "bisulfate.O-lone-pair" &&
        getAnchorKey(arrow.to) === "sigma-complex.C-H-bond"
    ),
    "Panel 3 must show bisulfate.O-lone-pair deprotonating sigma-complex.C-H-bond."
  );
  assertCondition(
    deprotonationPanel.mechanismArrows.some(
      arrow =>
        arrow.id === "c-h-to-ring" &&
        getAnchorKey(arrow.from) === "sigma-complex.C-H-bond" &&
        getAnchorKey(arrow.to) === "benzene.pi-system"
    ),
    "Panel 3 must show C-H electrons restoring benzene.pi-system."
  );
  assertCondition(
    (getPanelDiagram(deprotonationPanel).productFragments || []).some(
      fragment => fragment.type === "nitro-substituent"
    ),
    "Panel 3 must include the nitrobenzene product fragment."
  );

  return candidate as MechanismFixture;
}

import assert from "node:assert/strict";

import {
  buildStableContentId,
  classifyLegacyBlankState,
  classifyLegacyEasyQuestionState,
} from "../interactive/9701-memorisation-bank/learning-state-id.mjs";

{
  const asCoreId = buildStableContentId({
    stage: "AS",
    levelId: "level-1-core",
    topicSlug: "atomic-structure",
    fileId: "core-definitions",
    sourceId: "as-def-001",
    kind: "single",
    blankIndex: 0,
  });
  const a2CoreId = buildStableContentId({
    stage: "A2",
    levelId: "level-1-core",
    topicSlug: "thermodynamics",
    fileId: "core-definitions",
    sourceId: "a2-def-001",
    kind: "single",
    blankIndex: 0,
  });

  assert.equal(asCoreId, "mb:canonical:v1:as:level-1-core:atomic-structure:core-definitions:as-def-001:single:blank-0");
  assert.equal(a2CoreId, "mb:canonical:v1:a2:level-1-core:thermodynamics:core-definitions:a2-def-001:single:blank-0");
  assert.notEqual(asCoreId, a2CoreId);
  console.log("PASS 1: Level 1 core IDs include stage, level, topic, file, source id, kind, and blank.");
}

{
  const guidedBlank = buildStableContentId({
    stage: "AS",
    levelId: "level-2-guided-cloze",
    topicSlug: "group-2",
    fileId: "guided-cloze",
    sourceId: "as-exp-003",
    kind: "cloze",
    blankIndex: 2,
  });
  const multiRoundBlank = buildStableContentId({
    stage: "AS",
    levelId: "level-3-multi-round-cloze",
    topicSlug: "group-2",
    fileId: "multi-round-cloze",
    sourceId: "as-exp-003",
    kind: "cloze",
    round: 2,
    blankIndex: 0,
  });

  assert.equal(guidedBlank, "mb:canonical:v1:as:level-2-guided-cloze:group-2:guided-cloze:as-exp-003:cloze:blank-2");
  assert.equal(
    multiRoundBlank,
    "mb:canonical:v1:as:level-3-multi-round-cloze:group-2:multi-round-cloze:as-exp-003:cloze:round-2:blank-0"
  );
  assert.notEqual(guidedBlank, multiRoundBlank);
  console.log("PASS 2: Repeated raw source ids across cloze levels stay distinct.");
}

{
  const baseDuplicate = buildStableContentId({
    stage: "AS",
    levelId: "level-1-core",
    topicSlug: "bonding",
    fileId: "core-definitions",
    sourceId: "as-def-010",
    kind: "single",
    blankIndex: 0,
  });
  const disambiguatedDuplicate = buildStableContentId({
    stage: "AS",
    levelId: "level-1-core",
    topicSlug: "bonding",
    fileId: "core-definitions",
    sourceId: "as-def-010",
    kind: "single",
    blankIndex: 0,
    duplicateKey: "sigma-bond",
  });

  assert.equal(baseDuplicate, "mb:canonical:v1:as:level-1-core:bonding:core-definitions:as-def-010:single:blank-0");
  assert.equal(
    disambiguatedDuplicate,
    "mb:canonical:v1:as:level-1-core:bonding:core-definitions:as-def-010:single:blank-0:dup-sigma-bond"
  );
  console.log("PASS 3: Duplicate source ids can be disambiguated without array indexes.");
}

{
  const classification = classifyLegacyBlankState({
    id: "guided-cloze::group-2::as-exp-003::1",
    value: "student typed answer",
    status: "wrong",
    wrongCount: 2,
    revealed: true,
    coveredGroups: ["charge-density"],
    missingGroups: ["polarisation"],
    contradictionHits: ["opposite-trend"],
    reviewPriority: 1200,
    matchState: "checked",
  });
  const serialized = JSON.stringify(classification);

  assert.equal(classification.progressStatus, "reviewing");
  assert.equal(classification.correctDelta, 0);
  assert.equal(classification.wrongDelta, 2);
  assert.equal(classification.revealedDelta, 1);
  assert.deepEqual(classification.reviewReasons, ["wrong-answer", "revealed-answer"]);
  assert.equal(serialized.includes("student typed answer"), false);
  console.log("PASS 4: Legacy blank classification preserves review debt without typed answers.");
}

{
  const correctEasy = classifyLegacyEasyQuestionState({
    questionId: "core-definitions::atomic-structure::as-def-001",
    easyStep: "copy",
    selectedKeywordIds: ["keyword-1", "keyword-2"],
    keywordStatus: "correct",
    copyValue: "student copied answer",
    copyStatus: "correct",
  });
  const wrongEasy = classifyLegacyEasyQuestionState({
    questionId: "core-definitions::atomic-structure::as-def-001",
    easyStep: "copy",
    selectedKeywordIds: ["keyword-1"],
    keywordStatus: "correct",
    copyValue: "wrong answer",
    copyStatus: "wrong",
  });
  const keywordOnly = classifyLegacyEasyQuestionState({
    questionId: "core-definitions::atomic-structure::as-def-001",
    easyStep: "copy",
    selectedKeywordIds: ["keyword-1"],
    keywordStatus: "correct",
    copyValue: "",
    copyStatus: "idle",
  });
  const serialized = JSON.stringify([correctEasy, wrongEasy, keywordOnly]);

  assert.equal(correctEasy.correctDelta, 1);
  assert.equal(correctEasy.masteryEvidence, "easy-copy-correct-low-confidence");
  assert.equal(wrongEasy.progressStatus, "reviewing");
  assert.equal(wrongEasy.wrongDelta, 1);
  assert.equal(keywordOnly.correctDelta, 0);
  assert.equal(keywordOnly.masteryEvidence, "keyword-activity-only");
  assert.equal(serialized.includes("student copied answer"), false);
  assert.equal(serialized.includes("wrong answer"), false);
  assert.equal(serialized.includes("keyword-1"), false);
  console.log("PASS 5: Legacy Easy classification avoids treating keyword activity as mastery.");
}

console.log("Memorisation learning-state ID planning checks passed: 5");

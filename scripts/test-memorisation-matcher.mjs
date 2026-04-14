import assert from "node:assert/strict";

import { createAnswerModel, evaluateAnswerModel } from "../interactive/9701-memorisation-bank/matcher.mjs";

const cases = [
  {
    name: "article normalization keeps short canonical definitions passable",
    answerModel: createAnswerModel({
      answer: "a proton donor",
      type: "definition",
      sourceScope: "syllabus_only",
    }),
    userValue: "proton donor",
    expectedStatus: "correct",
    contradiction: false,
  },
  {
    name: "definition qualifiers are still required for strong-acid wording",
    answerModel: createAnswerModel({
      answer: "an acid that is completely dissociated in aqueous solution",
      type: "definition",
      sourceScope: "syllabus_only",
    }),
    userValue: "acid dissociated solution",
    expectedStatus: "wrong",
    contradiction: false,
  },
  {
    name: "negation flip fails for ketone IR elimination wording",
    answerModel: createAnswerModel({
      answer:
        "The spectrum has a strong absorption around 1700 cm-1 showing a C=O bond. There is no broad absorption due to O-H. So the compound can be identified as a ketone.",
      type: "full_reconstruction",
    }),
    userValue:
      "The spectrum has a strong absorption around 1700 cm-1 showing a C=O bond. There is broad absorption due to O-H. So the compound can be identified as a ketone.",
    expectedStatus: "wrong",
    contradiction: true,
  },
  {
    name: "detected vs not-detected fails for D2O explanations",
    answerModel: createAnswerModel({
      answer:
        "The O-H proton is exchangeable. It is replaced by deuterium from D2O, and deuterium is not detected in the same way in a proton NMR spectrum. Therefore the O-H peak disappears.",
      type: "full_reconstruction",
    }),
    userValue:
      "The O-H proton is exchangeable. It is replaced by deuterium from D2O, and deuterium is detected in the same way in a proton NMR spectrum. Therefore the O-H peak disappears.",
    expectedStatus: "wrong",
    contradiction: true,
  },
];

let passed = 0;

cases.forEach(testCase => {
  const result = evaluateAnswerModel(testCase.answerModel, testCase.userValue);

  assert.equal(
    result.status,
    testCase.expectedStatus,
    `${testCase.name}: expected ${testCase.expectedStatus}, got ${result.status}`
  );

  if (testCase.contradiction) {
    assert.ok(
      result.contradictionHits.length > 0,
      `${testCase.name}: expected a contradiction hit for the polarity flip`
    );
  }

  passed += 1;
  console.log(`PASS ${passed}: ${testCase.name}`);
});

console.log(`Matcher regression checks passed: ${passed}`);

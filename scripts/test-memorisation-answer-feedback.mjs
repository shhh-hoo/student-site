import assert from "node:assert/strict";

import {
  buildScaffoldModel,
  diffAnswer,
  normalizeAnswer,
  tokenizeAnswer,
} from "../interactive/9701-memorisation-bank/answer-feedback.mjs";

const normalized = normalizeAnswer(" Standard  conditions — apply! ");
assert.equal(normalized, "standard conditions - apply");
console.log("PASS 1: normalizeAnswer handles case, spacing, punctuation, and dash variants.");

const tokens = tokenizeAnswer("Ecell is less positive.");
assert.deepEqual(
  tokens.filter(token => token.kind === "word").map(token => token.normalized),
  ["ecell", "is", "less", "positive"]
);
console.log("PASS 2: tokenizeAnswer returns deterministic word tokens.");

const diff = diffAnswer(
  "The enthalpy change when mole compound formed from elements standard condition",
  "The enthalpy change when one mole of a compound is formed from its elements under standard conditions."
);

assert.ok(diff.summary.missing > 0, "Expected missing words in the diff.");
assert.ok(diff.summary.wrong > 0, "Expected wrong words in the diff.");
assert.ok(diff.hasDifference, "Expected the diff to report a difference.");
console.log("PASS 3: diffAnswer detects missing and wrong words.");

const scaffold = buildScaffoldModel(
  "Standard electrode potentials apply only under standard conditions and activation energy changes.",
  {
    keyTerms: ["standard conditions", "activation energy"],
  }
);

assert.ok(scaffold.wordBank.includes("standard"));
assert.ok(scaffold.wordBank.includes("conditions"));
assert.ok(scaffold.wordBank.includes("activation"));
assert.ok(scaffold.wordBank.includes("energy"));
assert.ok(!scaffold.wordBank.includes("and"));
console.log("PASS 4: scaffold word bank keeps configured scientific terms and excludes safe grammar words.");

console.log("Memorisation answer-feedback regression checks passed: 4");

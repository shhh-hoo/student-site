import assert from "node:assert/strict";

import {
  resolveActiveBlankId,
  resolvePreferredBlankId,
} from "../interactive/9701-memorisation-bank/active-blank-state.mjs";

const blankOrder = [
  "guided-cloze::group-2::as-exp-003::0",
  "guided-cloze::group-2::as-exp-003::1",
  "guided-cloze::group-2::as-exp-003::2",
];

const cases = [
  {
    name: "valid pending focus wins over current blank",
    actual: resolveActiveBlankId(blankOrder, blankOrder[1], blankOrder[0]),
    expected: blankOrder[1],
  },
  {
    name: "current blank is used when pending focus is invalid",
    actual: resolveActiveBlankId(blankOrder, "missing-blank", blankOrder[2]),
    expected: blankOrder[2],
  },
  {
    name: "invalid pending and current ids fall back to the first blank",
    actual: resolveActiveBlankId(blankOrder, "missing-pending", "missing-current"),
    expected: blankOrder[0],
  },
  {
    name: "preferred blank helper returns the first valid candidate",
    actual: resolvePreferredBlankId(blankOrder, ["missing", blankOrder[2], blankOrder[1]]),
    expected: blankOrder[2],
  },
];

let passed = 0;

cases.forEach((testCase) => {
  assert.equal(testCase.actual, testCase.expected, testCase.name);
  passed += 1;
  console.log(`PASS ${passed}: ${testCase.name}`);
});

console.log(`Active blank resolver regression checks passed: ${passed}`);

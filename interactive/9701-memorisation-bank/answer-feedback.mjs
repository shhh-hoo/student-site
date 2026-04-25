const hyphenLikePattern = /[‐‑‒–—−]/g;
const singleQuotePattern = /[‘’‚‛`´]/g;
const doubleQuotePattern = /[“”„‟]/g;
const boundaryPunctuationPattern = /^[^\p{L}\p{N}+\-()[\]{}/^<>=]+|[^\p{L}\p{N}+\-()[\]{}/^<>=]+$/gu;
const ordinaryPunctuationPattern = /[.,;:!?'"“”‘’]/g;

const scaffoldStopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "therefore",
  "to",
  "when",
  "which",
  "with",
]);

const protectedScientificPhrases = [
  "activation energy",
  "standard conditions",
  "standard enthalpy",
  "same number",
  "different number",
  "greater amount",
  "one mole",
];

function normalizeUnicode(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(hyphenLikePattern, "-")
    .replace(singleQuotePattern, "'")
    .replace(doubleQuotePattern, '"')
    .replace(/\u00a0/g, " ");
}

export function normalizeAnswer(input) {
  return normalizeUnicode(input).toLowerCase().replace(ordinaryPunctuationPattern, " ").replace(/\s+/g, " ").trim();
}

export function tokenizeAnswer(input) {
  const segments = normalizeUnicode(input).match(/\S+|\s+/gu) || [];
  let wordIndex = 0;

  return segments.map((segment, segmentIndex) => {
    const isWhitespace = /^\s+$/u.test(segment);
    const normalized = isWhitespace
      ? ""
      : normalizeAnswer(segment.replace(boundaryPunctuationPattern, "")).replace(/\s+/g, "");

    if (isWhitespace || !normalized) {
      return {
        kind: "space",
        text: segment,
        normalized: "",
        segmentIndex,
        wordIndex: -1,
      };
    }

    const token = {
      kind: "word",
      text: segment,
      normalized,
      segmentIndex,
      wordIndex,
    };
    wordIndex += 1;
    return token;
  });
}

function getWordTokens(input) {
  return tokenizeAnswer(input).filter(token => token.kind === "word");
}

function buildLcsTable(leftTokens, rightTokens) {
  const table = Array.from({ length: leftTokens.length + 1 }, () => Array(rightTokens.length + 1).fill(0));

  for (let leftIndex = leftTokens.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightTokens.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] =
        leftTokens[leftIndex].normalized === rightTokens[rightIndex].normalized
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  return table;
}

function compactDiffOperations(operations) {
  const compacted = [];

  for (let index = 0; index < operations.length; index += 1) {
    const current = operations[index];
    const next = operations[index + 1];

    if (current.type === "missing" && next?.type === "extra") {
      compacted.push({
        type: "wrong",
        expected: current.text,
        actual: next.text,
      });
      index += 1;
      continue;
    }

    if (current.type === "extra" && next?.type === "missing") {
      compacted.push({
        type: "wrong",
        expected: next.text,
        actual: current.text,
      });
      index += 1;
      continue;
    }

    compacted.push(current);
  }

  return compacted;
}

export function diffAnswer(userAnswer, canonicalAnswer) {
  const userTokens = getWordTokens(userAnswer);
  const canonicalTokens = getWordTokens(canonicalAnswer);
  const table = buildLcsTable(userTokens, canonicalTokens);
  const operations = [];
  let userIndex = 0;
  let canonicalIndex = 0;

  while (userIndex < userTokens.length && canonicalIndex < canonicalTokens.length) {
    if (userTokens[userIndex].normalized === canonicalTokens[canonicalIndex].normalized) {
      operations.push({
        type: "match",
        text: userTokens[userIndex].text,
      });
      userIndex += 1;
      canonicalIndex += 1;
      continue;
    }

    if (table[userIndex + 1][canonicalIndex] >= table[userIndex][canonicalIndex + 1]) {
      operations.push({
        type: "extra",
        text: userTokens[userIndex].text,
      });
      userIndex += 1;
    } else {
      operations.push({
        type: "missing",
        text: canonicalTokens[canonicalIndex].text,
      });
      canonicalIndex += 1;
    }
  }

  while (userIndex < userTokens.length) {
    operations.push({
      type: "extra",
      text: userTokens[userIndex].text,
    });
    userIndex += 1;
  }

  while (canonicalIndex < canonicalTokens.length) {
    operations.push({
      type: "missing",
      text: canonicalTokens[canonicalIndex].text,
    });
    canonicalIndex += 1;
  }

  const compacted = compactDiffOperations(operations);
  const summary = compacted.reduce(
    (counts, operation) => {
      if (operation.type !== "match") {
        counts[operation.type] += 1;
      }

      return counts;
    },
    {
      missing: 0,
      extra: 0,
      wrong: 0,
    }
  );

  return {
    operations: compacted,
    summary,
    hasDifference: compacted.some(operation => operation.type !== "match"),
  };
}

function normalizeTerm(value) {
  return normalizeAnswer(value.replace(boundaryPunctuationPattern, "")).replace(/\s+/g, " ");
}

function extractConfiguredTerms(answer, config = {}) {
  return [
    ...(Array.isArray(config.keyTerms) ? config.keyTerms : []),
    ...(Array.isArray(config.blankPhrases) ? config.blankPhrases : []),
    ...(Array.isArray(config.revealWords) ? config.revealWords : []),
    ...protectedScientificPhrases.filter(phrase => normalizeAnswer(answer).includes(phrase)),
  ]
    .map(normalizeTerm)
    .filter(Boolean);
}

function stableShuffle(values) {
  return values
    .map(value => {
      let hash = 0;

      for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) % 9973;
      }

      return { value, hash };
    })
    .sort((left, right) => left.hash - right.hash || left.value.localeCompare(right.value))
    .map(entry => entry.value);
}

export function buildScaffoldModel(answer, config = {}) {
  const configuredTerms = new Set(extractConfiguredTerms(answer, config));
  const tokens = getWordTokens(answer);
  const words = tokens.map(token => {
    const normalized = normalizeTerm(token.text);
    const isConfigured = configuredTerms.has(normalized);
    const isCore =
      isConfigured || (normalized.length > 2 && !scaffoldStopWords.has(normalized) && /[\p{L}\p{N}]/u.test(normalized));

    return {
      id: `word-${token.wordIndex}`,
      text: token.text,
      normalized,
      isCore,
    };
  });
  const wordBank = stableShuffle(Array.from(new Set(words.filter(word => word.isCore).map(word => word.normalized))));

  return {
    words,
    wordBank,
  };
}

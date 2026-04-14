const britishAmericanVariantMap = new Map([
  ["sulphur", "sulfur"],
  ["sulphate", "sulfate"],
  ["sulphates", "sulfates"],
  ["sulphite", "sulfite"],
  ["sulphites", "sulfites"],
  ["aluminium", "aluminum"],
  ["ionisation", "ionization"],
  ["ionisations", "ionizations"],
  ["ionise", "ionize"],
  ["ionised", "ionized"],
  ["ionises", "ionizes"],
  ["ionising", "ionizing"],
  ["oxidise", "oxidize"],
  ["oxidised", "oxidized"],
  ["oxidises", "oxidizes"],
  ["oxidising", "oxidizing"],
  ["polymerisation", "polymerization"],
  ["polymerisations", "polymerizations"],
  ["polymerise", "polymerize"],
  ["polymerised", "polymerized"],
  ["polymerises", "polymerizes"],
  ["polymerising", "polymerizing"],
]);

const hyphenLikePattern = /[‐‑‒–—−]/g;
const singleQuotePattern = /[‘’‚‛`´]/g;
const doubleQuotePattern = /[“”„‟]/g;
const reversibleArrowPattern = /(?:⇌|↔|⟷|<=>)/g;
const forwardArrowPattern = /(?:⟶|⟹|→|=>)/g;
const trimBoundaryPattern = /^[^a-z0-9+\-()[\]{}.,/^<>=]+|[^a-z0-9+\-()[\]{}.,/^<>=]+$/gi;

function normaliseUnicodeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(hyphenLikePattern, "-")
    .replace(singleQuotePattern, "'")
    .replace(doubleQuotePattern, '"')
    .replace(/\u00a0/g, " ");
}

function splitIntoDisplaySegments(text) {
  return String(text ?? "").match(/\S+|\s+/gu) ?? [];
}

function normalizeWord(word, matcherType = "controlled-text") {
  const normalized = normaliseUnicodeText(word)
    .toLowerCase()
    .replace(reversibleArrowPattern, "<->")
    .replace(forwardArrowPattern, "->")
    .replace(trimBoundaryPattern, "");

  if (!normalized) {
    return "";
  }

  if (matcherType === "equation") {
    return normalized;
  }

  return normalized
    .split("-")
    .map(segment => britishAmericanVariantMap.get(segment) || segment)
    .join("-");
}

function extractWordUnits(segments, matcherType = "controlled-text") {
  let wordIndex = 0;

  return segments.flatMap((segment, segmentIndex) => {
    if (/^\s+$/u.test(segment)) {
      return [];
    }

    const unit = {
      raw: segment,
      normalized: normalizeWord(segment, matcherType),
      segmentIndex,
      wordIndex,
    };
    wordIndex += 1;
    return [unit];
  });
}

function findPhraseWordIndexes(userWords, canonicalWords) {
  const phraseIndexes = new Set();

  for (let userStart = 0; userStart < userWords.length; userStart += 1) {
    for (let canonicalStart = 0; canonicalStart < canonicalWords.length; canonicalStart += 1) {
      let length = 0;

      while (
        userStart + length < userWords.length &&
        canonicalStart + length < canonicalWords.length &&
        userWords[userStart + length].normalized &&
        userWords[userStart + length].normalized === canonicalWords[canonicalStart + length]
      ) {
        length += 1;
      }

      if (length >= 2) {
        for (let offset = 0; offset < length; offset += 1) {
          phraseIndexes.add(userWords[userStart + offset].wordIndex);
        }
      }
    }
  }

  return phraseIndexes;
}

export function buildSoftHighlightModel(user, canonical, checked = false, matcherType = "controlled-text") {
  const displaySegments = splitIntoDisplaySegments(user);
  const userWords = extractWordUnits(displaySegments, matcherType);
  const canonicalWords = extractWordUnits(splitIntoDisplaySegments(canonical), matcherType)
    .map(unit => unit.normalized)
    .filter(Boolean);
  const canonicalSet = new Set(canonicalWords);
  const phraseIndexes = findPhraseWordIndexes(userWords, canonicalWords);

  if (!checked) {
    return {
      segments: displaySegments.map(segment => ({
        text: segment,
        tone: /^\s+$/.test(segment) ? "plain" : "neutral",
      })),
      wordHits: [],
      phraseHits: [],
    };
  }

  const wordHitList = [];
  const phraseHitList = [];
  const wordUnitBySegment = new Map(userWords.map(unit => [unit.segmentIndex, unit]));
  const phraseSegmentIndexes = new Set();

  userWords.forEach(unit => {
    if (phraseIndexes.has(unit.wordIndex)) {
      phraseSegmentIndexes.add(unit.segmentIndex);
    }
  });

  for (let segmentIndex = 0; segmentIndex < displaySegments.length; segmentIndex += 1) {
    if (!/^\s+$/u.test(displaySegments[segmentIndex])) {
      continue;
    }

    const previousWord = wordUnitBySegment.get(segmentIndex - 1);
    const nextWord = wordUnitBySegment.get(segmentIndex + 1);

    if (
      previousWord &&
      nextWord &&
      phraseIndexes.has(previousWord.wordIndex) &&
      phraseIndexes.has(nextWord.wordIndex) &&
      nextWord.wordIndex === previousWord.wordIndex + 1
    ) {
      phraseSegmentIndexes.add(segmentIndex);
    }
  }

  const segments = displaySegments.map((segment, segmentIndex) => {
    if (/^\s+$/u.test(segment)) {
      return {
        text: segment,
        tone: phraseSegmentIndexes.has(segmentIndex) ? "phrase_hit" : "plain",
      };
    }

    const unit = wordUnitBySegment.get(segmentIndex);

    if (!unit || !unit.normalized) {
      return {
        text: segment,
        tone: "neutral",
      };
    }

    if (canonicalSet.has(unit.normalized)) {
      wordHitList.push(unit.raw);
    }

    if (phraseIndexes.has(unit.wordIndex)) {
      phraseHitList.push(unit.raw);
      return {
        text: segment,
        tone: "phrase_hit",
      };
    }

    if (canonicalSet.has(unit.normalized)) {
      return {
        text: segment,
        tone: "word_hit",
      };
    }

    return {
      text: segment,
      tone: "neutral",
    };
  });

  return {
    segments,
    wordHits: Array.from(new Set(wordHitList.map(word => word.trim()).filter(Boolean))),
    phraseHits: Array.from(new Set(phraseHitList.map(word => word.trim()).filter(Boolean))),
  };
}

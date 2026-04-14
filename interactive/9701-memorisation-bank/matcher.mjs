const articleTokens = new Set(["a", "an", "the"]);
const prepositionTokens = new Set([
  "in",
  "on",
  "at",
  "of",
  "to",
  "from",
  "with",
  "by",
  "for",
  "into",
  "between",
  "under",
  "through",
  "over",
  "within",
  "without",
  "across",
  "after",
  "before",
  "around",
  "against",
  "among",
  "along",
  "during",
  "inside",
  "outside",
  "onto",
  "upon",
]);
const exactSuccessStates = new Set(["exact", "normalized_match"]);
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
const conceptKeywordStopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "between",
  "by",
  "each",
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
  "with",
]);
const requiredQualifierTokens = new Set([
  "all",
  "both",
  "completely",
  "concentrated",
  "dilute",
  "different",
  "higher",
  "lower",
  "more",
  "less",
  "negative",
  "no",
  "non-polar",
  "not",
  "only",
  "polar",
  "positive",
  "same",
  "standard",
  "stronger",
  "weaker",
  "aqueous",
]);
const contradictionPairs = [
  ["same", "different"],
  ["different", "same"],
  ["increase", "decrease"],
  ["decrease", "increase"],
  ["higher", "lower"],
  ["lower", "higher"],
  ["stronger", "weaker"],
  ["weaker", "stronger"],
  ["oxidised", "reduced"],
  ["reduced", "oxidised"],
  ["oxidation", "reduction"],
  ["reduction", "oxidation"],
  ["positive", "negative"],
  ["negative", "positive"],
  ["polar", "non-polar"],
  ["non-polar", "polar"],
  ["present", "absent"],
  ["absent", "present"],
];

const hyphenLikePattern = /[‐‑‒–—−]/g;
const singleQuotePattern = /[‘’‚‛`´]/g;
const doubleQuotePattern = /[“”„‟]/g;
const punctuationSpacingPattern = /\s*([,.;:!?])\s*/g;
const bracketSpacingPattern = /\s*([()[\]{}])\s*/g;
const quoteCharacterPattern = /["']/g;
const stateSymbolPattern = /\(\s*(aq|s|l|g)\s*\)/gi;
const reversibleArrowPattern = /(?:⇌|↔|⟷|<=>)/g;
const forwardArrowPattern = /(?:⟶|⟹|→|=>)/g;

function normaliseUnicodeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(hyphenLikePattern, "-")
    .replace(singleQuotePattern, "'")
    .replace(doubleQuotePattern, '"')
    .replace(/\u00a0/g, " ");
}

function normaliseVariantToken(token) {
  return token
    .split("-")
    .map(segment => britishAmericanVariantMap.get(segment) || segment)
    .join("-");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildControlledTextComparable(value, { ignorePrepositions = false } = {}) {
  const normalizedText = normaliseUnicodeText(value)
    .trim()
    .replace(bracketSpacingPattern, "$1")
    .replace(punctuationSpacingPattern, " ")
    .replace(quoteCharacterPattern, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (!normalizedText) {
    return { text: "", tokens: [] };
  }

  const tokens = normalizedText
    .split(" ")
    .filter(Boolean)
    .map(normaliseVariantToken)
    .filter(token => !articleTokens.has(token))
    .filter(token => !(ignorePrepositions && prepositionTokens.has(token)));

  return {
    text: tokens.join(" "),
    tokens,
  };
}

function buildEquationComparable(value, { ignoreStateSymbols = true } = {}) {
  let normalizedText = normaliseUnicodeText(value)
    .trim()
    .replace(reversibleArrowPattern, "<->")
    .replace(forwardArrowPattern, "->");

  if (ignoreStateSymbols) {
    normalizedText = normalizedText.replace(stateSymbolPattern, "");
  }

  return normalizedText
    .replace(/\s*<->\s*/g, "<->")
    .replace(/\s*->\s*/g, "->")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getMatcherConfig(unit) {
  if (unit?.fileId === "core-equations") {
    const sourceText = `${unit?.prompt || ""} ${unit?.question || ""}`;

    return {
      type: "equation",
      ignoreStateSymbols: !/state symbols?/i.test(sourceText),
    };
  }

  return {
    type: "controlled-text",
  };
}

function buildComparablePair(userValue, canonicalValue, matcherConfig) {
  if (matcherConfig.type === "equation") {
    return {
      canonicalText: buildEquationComparable(canonicalValue, matcherConfig),
      userText: buildEquationComparable(userValue, matcherConfig),
    };
  }

  return {
    canonicalText: buildControlledTextComparable(canonicalValue).text,
    userText: buildControlledTextComparable(userValue).text,
  };
}

function evaluateMatchResult(userValue, canonicalValue, matcherConfig) {
  const rawUserText = String(userValue ?? "");
  const comparablePair = buildComparablePair(rawUserText, canonicalValue, matcherConfig);

  if (!rawUserText.trim()) {
    return {
      state: "untouched",
      ...comparablePair,
    };
  }

  if (rawUserText === String(canonicalValue ?? "")) {
    return {
      state: "exact",
      ...comparablePair,
    };
  }

  if (comparablePair.userText === comparablePair.canonicalText) {
    return {
      state: "normalized_match",
      ...comparablePair,
    };
  }

  if (matcherConfig.type !== "equation") {
    const canonicalWithoutPrepositions = buildControlledTextComparable(canonicalValue, {
      ignorePrepositions: true,
    }).text;
    const userWithoutPrepositions = buildControlledTextComparable(rawUserText, {
      ignorePrepositions: true,
    }).text;

    if (
      canonicalWithoutPrepositions &&
      userWithoutPrepositions &&
      canonicalWithoutPrepositions === userWithoutPrepositions
    ) {
      return {
        state: "near_miss_preposition",
        ...comparablePair,
      };
    }
  }

  return {
    state: "incorrect",
    ...comparablePair,
  };
}

function isSuccessfulMatchState(state) {
  return exactSuccessStates.has(state);
}

function splitConceptPhrases(text) {
  const normalized = String(text || "").trim();

  if (!normalized) {
    return [];
  }

  let phrases = normalized
    .replace(/;\s+/g, "|")
    .replace(/\.\s+/g, "|")
    .replace(/\s+but\s+/gi, "|")
    .replace(/\s+because\s+/gi, "|because ")
    .replace(/\s+therefore\s+/gi, "|therefore ")
    .replace(/\s+to form\s+/gi, "|form ")
    .replace(/\s+to produce\s+/gi, "|produce ")
    .split("|")
    .map(phrase => phrase.trim())
    .filter(Boolean);

  if (phrases.length === 1 && phrases[0].split(/\s+/).length > 10) {
    phrases = phrases[0]
      .replace(/,\s+(?=(and|which|while)\b)/gi, "|")
      .split("|")
      .map(phrase => phrase.trim())
      .filter(Boolean);
  }

  return phrases.length ? phrases : [normalized];
}

function buildConceptKeywords(text, matcherConfig) {
  if (matcherConfig.type === "equation") {
    return [];
  }

  return unique(
    buildControlledTextComparable(text).tokens.filter(
      token => token && !conceptKeywordStopwords.has(token) && !prepositionTokens.has(token)
    )
  );
}

function buildRequiredTokens(text, matcherConfig) {
  if (matcherConfig.type === "equation") {
    return [];
  }

  return unique(buildControlledTextComparable(text).tokens.filter(token => requiredQualifierTokens.has(token)));
}

function buildConceptHint(phrase, keywords) {
  const lowered = String(phrase || "").toLowerCase();

  if (lowered.includes("electron") && lowered.includes("remove")) {
    return "Mention the electron-removal step.";
  }

  if (lowered.includes("ion") && lowered.includes("form")) {
    return "Mention the ions formed.";
  }

  if (lowered.includes("proton") && lowered.includes("number")) {
    return "Mention the proton-number condition.";
  }

  if (lowered.includes("neutron")) {
    return "Mention what differs about neutrons.";
  }

  if (lowered.includes("lone pair")) {
    return "Mention the lone-pair part of the idea.";
  }

  if (lowered.includes("electrostatic")) {
    return "Mention the electrostatic attraction.";
  }

  if (lowered.includes("gaseous")) {
    return "Mention the gaseous species involved.";
  }

  if (keywords.length === 1) {
    return `Mention ${keywords[0]}.`;
  }

  if (keywords.length >= 2) {
    return `Include the ${keywords.slice(0, 2).join(" / ")} idea.`;
  }

  return "Include the missing chemistry idea.";
}

function resolveMinimumKeywordMatches(group, keywords, matcherConfig) {
  if (group.minimum_keyword_matches != null) {
    return Number(group.minimum_keyword_matches);
  }

  if (matcherConfig.type === "equation") {
    return 0;
  }

  if (keywords.length <= 5) {
    return keywords.length;
  }

  return Math.min(4, Math.max(1, Math.ceil(keywords.length * 0.6)));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createContradictionModel(variants, matcherConfig, id) {
  const normalizedVariants = unique(
    variants.map(variant =>
      matcherConfig.type === "equation"
        ? buildEquationComparable(variant, matcherConfig)
        : buildControlledTextComparable(variant).text
    )
  );

  if (!normalizedVariants.length) {
    return null;
  }

  return {
    id,
    variants: unique(variants),
    normalized_variants: normalizedVariants,
  };
}

function buildTokenContradictionsForPhrase(phrase, matcherConfig, groupId) {
  if (matcherConfig.type === "equation") {
    return [];
  }

  return contradictionPairs
    .map(([fromToken, toToken]) => {
      const tokenPattern = new RegExp(`\\b${escapeRegExp(fromToken)}\\b`, "i");

      if (!tokenPattern.test(phrase)) {
        return null;
      }

      return createContradictionModel(
        [phrase.replace(tokenPattern, toToken)],
        matcherConfig,
        `${groupId}::${fromToken}-vs-${toToken}`
      );
    })
    .filter(Boolean);
}

function buildNegationContradictionsForPhrase(phrase, matcherConfig, groupId) {
  if (matcherConfig.type === "equation") {
    return [];
  }

  const contradictionModels = [];
  const contradictionTransforms = [
    {
      pattern: /\bno\s+/gi,
      replacement: "",
      suffix: "remove-no",
    },
    {
      pattern: /\bnot\s+/gi,
      replacement: "",
      suffix: "remove-not",
    },
    {
      pattern: /\bnever\s+/gi,
      replacement: "",
      suffix: "remove-never",
    },
    {
      pattern: /\bwithout\b/gi,
      replacement: "with",
      suffix: "without-vs-with",
    },
    {
      pattern: /\bnon-([a-z]+)/gi,
      replacement: "$1",
      suffix: "remove-non",
    },
  ];

  contradictionTransforms.forEach(({ pattern, replacement, suffix }) => {
    const contradictionText = phrase.replace(pattern, replacement).replace(/\s+/g, " ").trim();

    if (!contradictionText || contradictionText === phrase) {
      return;
    }

    const contradictionModel = createContradictionModel([contradictionText], matcherConfig, `${groupId}::${suffix}`);

    if (contradictionModel) {
      contradictionModels.push(contradictionModel);
    }
  });

  return contradictionModels;
}

function buildContradictionsForPhrase(phrase, matcherConfig, groupId) {
  const contradictionLookup = new Map();

  [
    ...buildTokenContradictionsForPhrase(phrase, matcherConfig, groupId),
    ...buildNegationContradictionsForPhrase(phrase, matcherConfig, groupId),
  ].forEach(contradiction => {
    const signature = contradiction.normalized_variants.join("||");

    if (!contradictionLookup.has(signature)) {
      contradictionLookup.set(signature, contradiction);
    }
  });

  return Array.from(contradictionLookup.values());
}

function normalizeConceptGroups(conceptGroups, matcherConfig) {
  return conceptGroups
    .map((group, groupIndex) => {
      const variants = Array.isArray(group.variants) ? group.variants.filter(Boolean) : [];
      const normalizedVariants = unique(
        variants.map(variant =>
          matcherConfig.type === "equation"
            ? buildEquationComparable(variant, matcherConfig)
            : buildControlledTextComparable(variant).text
        )
      );

      if (!normalizedVariants.length) {
        return null;
      }

      const keywords = buildConceptKeywords(variants[0], matcherConfig);
      const requiredTokens = buildRequiredTokens(variants[0], matcherConfig);

      return {
        id: group.id || `group-${groupIndex + 1}`,
        required: group.required !== false,
        variants,
        normalized_variants: normalizedVariants,
        keywords,
        required_tokens: requiredTokens,
        minimum_keyword_matches: resolveMinimumKeywordMatches(group, keywords, matcherConfig),
        hint: group.hint || buildConceptHint(variants[0], keywords),
      };
    })
    .filter(Boolean);
}

function normalizeContradictions(contradictions, matcherConfig) {
  return contradictions
    .map((contradiction, contradictionIndex) =>
      createContradictionModel(
        Array.isArray(contradiction.variants) ? contradiction.variants.filter(Boolean) : [],
        matcherConfig,
        contradiction.id || `contradiction-${contradictionIndex + 1}`
      )
    )
    .filter(Boolean);
}

function deriveConceptGroups(minimalPass, matcherConfig) {
  if (matcherConfig.type === "equation") {
    return normalizeConceptGroups(
      [
        {
          id: "equation-match",
          required: true,
          variants: [minimalPass],
          hint: "Match the stored equation.",
        },
      ],
      matcherConfig
    );
  }

  return normalizeConceptGroups(
    splitConceptPhrases(minimalPass).map((phrase, phraseIndex) => ({
      id: `group-${phraseIndex + 1}`,
      required: true,
      variants: [phrase],
      hint: buildConceptHint(phrase, buildConceptKeywords(phrase, matcherConfig)),
    })),
    matcherConfig
  );
}

export function createAnswerModel({
  answer,
  fullAnswer,
  minimalPass,
  conceptGroups,
  contradictions,
  fileId,
  prompt,
  question,
  type,
  sourceScope,
}) {
  const canonicalValue = String(answer ?? fullAnswer ?? minimalPass ?? "").trim();
  const resolvedFullAnswer = String(fullAnswer ?? canonicalValue).trim() || canonicalValue;
  const resolvedMinimalPass =
    String(
      minimalPass ??
        (type === "definition" && sourceScope && sourceScope !== "paper_only" ? canonicalValue : canonicalValue)
    ).trim() || resolvedFullAnswer;
  const matcherConfig = getMatcherConfig({
    fileId,
    prompt,
    question,
  });
  const resolvedConceptGroups = normalizeConceptGroups(conceptGroups || [], matcherConfig);
  const derivedConceptGroups = resolvedConceptGroups.length
    ? resolvedConceptGroups
    : deriveConceptGroups(resolvedMinimalPass, matcherConfig);
  const resolvedContradictions = normalizeContradictions(contradictions || [], matcherConfig);
  const derivedContradictions =
    resolvedContradictions.length > 0
      ? resolvedContradictions
      : derivedConceptGroups.flatMap(group => buildContradictionsForPhrase(group.variants[0], matcherConfig, group.id));

  return {
    full_answer: resolvedFullAnswer,
    minimal_pass: resolvedMinimalPass,
    concept_groups: derivedConceptGroups,
    contradictions: derivedContradictions,
    matcherConfig,
  };
}

function buildComparableInput(value, matcherConfig) {
  if (matcherConfig.type === "equation") {
    const text = buildEquationComparable(value, matcherConfig);

    return {
      text,
      tokens: text ? [text] : [],
      tokenSet: new Set(text ? [text] : []),
      ngrams: new Set(text ? [text] : []),
    };
  }

  const comparable = buildControlledTextComparable(value);
  const ngrams = new Set();

  for (let length = Math.min(comparable.tokens.length, 6); length > 0; length -= 1) {
    for (let startIndex = 0; startIndex <= comparable.tokens.length - length; startIndex += 1) {
      ngrams.add(comparable.tokens.slice(startIndex, startIndex + length).join(" "));
    }
  }

  return {
    text: comparable.text,
    tokens: comparable.tokens,
    tokenSet: new Set(comparable.tokens),
    ngrams,
  };
}

function comparableInputContainsVariant(comparableInput, variant, matcherConfig) {
  if (!variant) {
    return false;
  }

  if (matcherConfig.type === "equation") {
    return comparableInput.text === variant;
  }

  return (
    comparableInput.text === variant ||
    comparableInput.ngrams.has(variant) ||
    ` ${comparableInput.text} `.includes(` ${variant} `)
  );
}

export function evaluateAnswerModel(answerModel, userValue) {
  const comparableInput = buildComparableInput(userValue, answerModel.matcherConfig);
  const legacyResult = evaluateMatchResult(userValue, answerModel.minimal_pass, answerModel.matcherConfig);
  const coveredGroups = [];
  const missingGroups = [];
  const missingRequiredTokens = [];

  answerModel.concept_groups.forEach(group => {
    const phraseCovered = group.normalized_variants.some(variant =>
      comparableInputContainsVariant(comparableInput, variant, answerModel.matcherConfig)
    );
    const keywordMatches = group.keywords.filter(keyword => comparableInput.tokenSet.has(keyword));
    const missingRequiredTokensForGroup = group.required_tokens.filter(token => !comparableInput.tokenSet.has(token));
    const keywordCovered =
      answerModel.matcherConfig.type !== "equation" &&
      group.minimum_keyword_matches > 0 &&
      keywordMatches.length >= group.minimum_keyword_matches;

    if ((phraseCovered || keywordCovered) && missingRequiredTokensForGroup.length === 0) {
      coveredGroups.push(group.id);
      return;
    }

    if (group.required) {
      missingGroups.push(group.id);
      missingRequiredTokens.push(...missingRequiredTokensForGroup);
    }
  });

  const contradictionHits = answerModel.contradictions
    .filter(contradiction =>
      contradiction.normalized_variants.some(variant =>
        comparableInputContainsVariant(comparableInput, variant, answerModel.matcherConfig)
      )
    )
    .map(contradiction => contradiction.id);
  const minimumPassSatisfied = missingGroups.length === 0 && contradictionHits.length === 0;

  return {
    status: minimumPassSatisfied ? "correct" : "wrong",
    coveredGroups,
    missingGroups,
    contradictionHits,
    minimumPassSatisfied,
    matchState: legacyResult.state,
    missingRequiredTokens: unique(missingRequiredTokens),
    successfulMatchState: isSuccessfulMatchState(legacyResult.state),
  };
}

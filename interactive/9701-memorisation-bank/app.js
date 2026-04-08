const definitionScopeOptions = [
  { id: "all", label: "All" },
  { id: "paper_only", label: "Past paper only" },
  { id: "syllabus_only", label: "Syllabus only" },
  { id: "paper_and_syllabus", label: "Paper + syllabus" },
];

const levelOrder = [
  "level-1-core",
  "level-2-guided-cloze",
  "level-3-multi-round-cloze",
  "level-4-full-reconstruction",
];

const fileOrder = [
  "core-definitions",
  "core-reagents-conditions",
  "core-reaction-paths",
  "core-equations",
  "core-observations",
  "core-fixed-conclusions",
  "guided-cloze",
  "multi-round-cloze",
  "full-reconstruction",
];

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
const hyphenLikePattern = /[‐‑‒–—−]/g;
const singleQuotePattern = /[‘’‚‛`´]/g;
const doubleQuotePattern = /[“”„‟]/g;
const punctuationSpacingPattern = /\s*([,.;:!?])\s*/g;
const bracketSpacingPattern = /\s*([()[\]{}])\s*/g;
const quoteCharacterPattern = /["']/g;
const stateSymbolPattern = /\(\s*(aq|s|l|g)\s*\)/gi;
const reversibleArrowPattern = /(?:⇌|↔|⟷|<=>)/g;
const forwardArrowPattern = /(?:⟶|⟹|→|=>)/g;

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const stageSwitcher = document.getElementById("stage-switcher");
const levelSwitcher = document.getElementById("level-switcher");
const topicFilter = document.getElementById("topic-filter");
const fileSwitcher = document.getElementById("file-switcher");
const definitionFilterSection = document.getElementById("definition-filter-section");
const definitionFilterGrid = document.getElementById("definition-filter-grid");
const roundSwitcherSection = document.getElementById("round-switcher-section");
const roundSwitcher = document.getElementById("round-switcher");
const fileManifestCount = document.getElementById("file-manifest-count");
const poolCount = document.getElementById("pool-count");
const itemCounter = document.getElementById("item-counter");
const counterChip = document.getElementById("counter-chip");
const stageBadge = document.getElementById("stage-badge");
const levelBadge = document.getElementById("level-badge");
const topicBadge = document.getElementById("topic-badge");
const fileBadge = document.getElementById("file-badge");
const sourceBadge = document.getElementById("source-badge");
const roundBadge = document.getElementById("round-badge");
const questionLabel = document.getElementById("question-label");
const questionTitle = document.getElementById("question-title");
const questionCopy = document.getElementById("question-copy");
const promptCard = document.getElementById("prompt-card");
const revealAnswerButton = document.getElementById("reveal-answer");
const nextItemButton = document.getElementById("next-item");
const answerPanel = document.getElementById("answer-panel");
const answerLabel = document.getElementById("answer-label");
const answerText = document.getElementById("answer-text");
const answerNote = document.getElementById("answer-note");

const appState = {
  catalog: null,
  topicNormalizationMap: {},
  stage: "",
  level: "",
  topic: "",
  file: "",
  definitionScope: "all",
  round: "all",
  activePool: [],
  sequence: [],
  sequenceIndex: 0,
  currentUnitId: "",
  revealed: false,
  renderToken: 0,
  fileDataCache: new Map(),
  staticEventsRegistered: false,
};

function fetchJson(path) {
  return fetch(path, { cache: "no-store" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed for ${path} (${response.status}).`);
    }

    return response.json();
  });
}

function formatLabel(value) {
  return String(value || "")
    .trim()
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDefinitionScope(scope) {
  return definitionScopeOptions.find((option) => option.id === scope)?.label || formatLabel(scope);
}

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
    .map((segment) => britishAmericanVariantMap.get(segment) || segment)
    .join("-");
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
    .filter((token) => !articleTokens.has(token))
    .filter((token) => !(ignorePrepositions && prepositionTokens.has(token)));

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
  const fileId = getFileEntry()?.id;

  if (fileId === "core-equations") {
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

function createMatchGuideSegments(canonicalText, userText, state) {
  if (!canonicalText) {
    return {
      matchedText: "",
      mismatchText: "",
      remainingText: "",
      extraText: "",
    };
  }

  if (!userText) {
    return {
      matchedText: "",
      mismatchText: "",
      remainingText: canonicalText,
      extraText: "",
    };
  }

  if (exactSuccessStates.has(state)) {
    return {
      matchedText: canonicalText,
      mismatchText: "",
      remainingText: "",
      extraText: "",
    };
  }

  const canonicalCharacters = Array.from(canonicalText);
  const userCharacters = Array.from(userText);
  let matchedLength = 0;

  while (
    matchedLength < canonicalCharacters.length &&
    matchedLength < userCharacters.length &&
    canonicalCharacters[matchedLength] === userCharacters[matchedLength]
  ) {
    matchedLength += 1;
  }

  return {
    matchedText: canonicalCharacters.slice(0, matchedLength).join(""),
    mismatchText:
      matchedLength < canonicalCharacters.length ? canonicalCharacters[matchedLength] : "",
    remainingText:
      matchedLength < canonicalCharacters.length
        ? canonicalCharacters.slice(matchedLength + 1).join("")
        : "",
    extraText:
      matchedLength >= canonicalCharacters.length &&
      userCharacters.length > canonicalCharacters.length
        ? " +"
        : "",
  };
}

function renderMatchGuide(guideElement, result, label = "Match guide") {
  guideElement.replaceChildren();
  guideElement.dataset.state = result.state;

  const labelElement = document.createElement("span");
  labelElement.className = "memorisation-match-guide__label";
  labelElement.textContent = label;

  const copyElement = document.createElement("span");
  copyElement.className = "memorisation-match-guide__copy";

  const segments = createMatchGuideSegments(
    result.canonicalText || "",
    result.userText || "",
    result.state,
  );

  const segmentDescriptors = [
    {
      className: "memorisation-match-guide__matched",
      text: segments.matchedText,
    },
    {
      className: "memorisation-match-guide__mismatch",
      text: segments.mismatchText,
    },
    {
      className: "memorisation-match-guide__remaining",
      text: segments.remainingText,
    },
    {
      className: "memorisation-match-guide__extra",
      text: segments.extraText,
    },
  ];

  segmentDescriptors.forEach((segment) => {
    if (!segment.text) {
      return;
    }

    const segmentElement = document.createElement("span");
    segmentElement.className = segment.className;
    segmentElement.textContent = segment.text;
    copyElement.append(segmentElement);
  });

  guideElement.append(labelElement, copyElement);
}

function isSuccessfulMatchState(state) {
  return exactSuccessStates.has(state);
}

function getUntouchedMessage(matcherConfig, interactionLabel) {
  if (matcherConfig.type === "equation") {
    return `${interactionLabel} Equation matching normalizes spacing, arrow variants, and optional state symbols only.`;
  }

  return `${interactionLabel} Formatting, spelling, quote, punctuation, and article variants are normalized. Prepositions stay strict.`;
}

function getMatchMessage(state, matcherConfig) {
  if (state === "exact") {
    return {
      text: "Exact match.",
      tone: "correct",
    };
  }

  if (state === "normalized_match") {
    return {
      text:
        matcherConfig.type === "equation"
          ? "Accepted equation formatting variant."
          : "Accepted formatting / spelling / article variant.",
      tone: "correct",
    };
  }

  if (state === "near_miss_preposition") {
    return {
      text: "Almost there. The remaining difference is a preposition.",
      tone: "warning",
    };
  }

  return {
    text:
      matcherConfig.type === "equation"
        ? "Equation structure or chemistry does not match the stored answer."
        : "Does not match the canonical answer.",
    tone: "incorrect",
  };
}

function applyMatchResultToField(
  field,
  feedbackElement,
  guideElement,
  result,
  matcherConfig,
  label,
) {
  applyFieldState(field, result.state);
  renderMatchGuide(guideElement, result, label);

  const message = getMatchMessage(result.state, matcherConfig);
  setFeedbackMessage(feedbackElement, message.text, message.tone);
}

function resetFieldToUntouched(
  field,
  feedbackElement,
  guideElement,
  canonicalValue,
  matcherConfig,
  interactionLabel,
  guideLabel,
) {
  const result = evaluateMatchResult("", canonicalValue, matcherConfig);

  applyFieldState(field, "untouched");
  renderMatchGuide(guideElement, result, guideLabel);
  setFeedbackMessage(feedbackElement, getUntouchedMessage(matcherConfig, interactionLabel));
}

function updateDraftGuide(guideElement, userValue, canonicalValue, matcherConfig, guideLabel) {
  renderMatchGuide(
    guideElement,
    evaluateMatchResult(userValue, canonicalValue, matcherConfig),
    guideLabel,
  );
}

function normalizeTopicKey(topicValue) {
  const rawTopic = String(topicValue || "").trim();

  if (!rawTopic) {
    return "";
  }

  const hyphenatedTopic = rawTopic.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  const spacedTopic = rawTopic.toLowerCase().replace(/[-_]+/g, " ").trim();

  return (
    appState.topicNormalizationMap[rawTopic] ||
    appState.topicNormalizationMap[hyphenatedTopic] ||
    appState.topicNormalizationMap[spacedTopic] ||
    hyphenatedTopic
  );
}

function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function setFeedbackMessage(element, message, tone = "neutral") {
  element.textContent = message;
  element.dataset.tone = tone;
}

function applyFieldState(field, state) {
  field.dataset.state = state;
}

function getStageEntries() {
  return Array.isArray(appState.catalog?.stages) ? appState.catalog.stages : [];
}

function getStageEntry(stageId = appState.stage) {
  return getStageEntries().find((stage) => stage.id === stageId) || null;
}

function getLevelEntries(stageId = appState.stage) {
  return getStageEntry(stageId)?.levels || [];
}

function getLevelEntry(stageId = appState.stage, levelId = appState.level) {
  return getLevelEntries(stageId).find((level) => level.id === levelId) || null;
}

function getTopicEntries(stageId = appState.stage, levelId = appState.level) {
  return getLevelEntry(stageId, levelId)?.topics || [];
}

function getTopicEntry(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
) {
  return getTopicEntries(stageId, levelId).find((topic) => topic.id === topicId) || null;
}

function getFileEntries(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
) {
  return getTopicEntry(stageId, levelId, topicId)?.files || [];
}

function getFileEntry(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
  fileId = appState.file,
) {
  return getFileEntries(stageId, levelId, topicId).find((file) => file.id === fileId) || null;
}

function getStageSourceTotal(stageEntry) {
  return Object.values(stageEntry?.counts || {}).reduce(
    (sum, count) => sum + Number(count || 0),
    0,
  );
}

function getDefaultLevelId(stageId) {
  return (
    getLevelEntries(stageId).find((level) => (level.topics || []).length > 0)?.id ||
    getLevelEntries(stageId)[0]?.id ||
    ""
  );
}

function getDefaultTopicId(stageId, levelId) {
  return getTopicEntries(stageId, levelId)[0]?.id || "";
}

function getDefaultFileId(stageId, levelId, topicId) {
  return getFileEntries(stageId, levelId, topicId)[0]?.id || "";
}

function getSelectionSnapshot(overrides = {}) {
  return {
    stage: appState.stage,
    level: appState.level,
    topic: appState.topic,
    file: appState.file,
    definitionScope: appState.definitionScope,
    round: appState.round,
    ...overrides,
  };
}

function getInitialSelectionFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const requestedRound = searchParams.get("round");

  return {
    stage: String(searchParams.get("stage") || "")
      .trim()
      .toUpperCase(),
    level: String(searchParams.get("level") || "").trim(),
    topic: normalizeTopicKey(searchParams.get("topic") || ""),
    file: String(searchParams.get("file") || "").trim(),
    definitionScope: String(searchParams.get("definition_scope") || "all").trim(),
    round: requestedRound && requestedRound !== "all" ? String(Number(requestedRound)) : "all",
  };
}

function synchroniseSelection(requestedSelection = getSelectionSnapshot()) {
  const stageEntries = getStageEntries();
  const stageId = stageEntries.some((stage) => stage.id === requestedSelection.stage)
    ? requestedSelection.stage
    : stageEntries[0]?.id || "";
  const levelEntries = getLevelEntries(stageId);
  const levelId = levelEntries.some((level) => level.id === requestedSelection.level)
    ? requestedSelection.level
    : getDefaultLevelId(stageId);
  const topicEntries = getTopicEntries(stageId, levelId);
  const topicId = topicEntries.some((topic) => topic.id === requestedSelection.topic)
    ? requestedSelection.topic
    : getDefaultTopicId(stageId, levelId);
  const fileEntries = getFileEntries(stageId, levelId, topicId);
  const fileId = fileEntries.some((file) => file.id === requestedSelection.file)
    ? requestedSelection.file
    : getDefaultFileId(stageId, levelId, topicId);
  const fileEntry = getFileEntry(stageId, levelId, topicId, fileId);
  const definitionScope =
    fileId === "core-definitions" &&
    definitionScopeOptions.some((option) => option.id === requestedSelection.definitionScope)
      ? requestedSelection.definitionScope
      : "all";
  const round =
    fileId === "multi-round-cloze" &&
    fileEntry?.rounds?.some((roundNumber) => String(roundNumber) === requestedSelection.round)
      ? requestedSelection.round
      : "all";

  appState.stage = stageId;
  appState.level = levelId;
  appState.topic = topicId;
  appState.file = fileId;
  appState.definitionScope = definitionScope;
  appState.round = round;

  return getFileEntry(stageId, levelId, topicId, fileId);
}

function applySelection(nextSelection, { resetSequence = true } = {}) {
  synchroniseSelection(nextSelection);
  renderControls();
  updateUrlFromState();
  refreshPool({ resetSequence });
}

function updateUrlFromState() {
  const searchParams = new URLSearchParams(window.location.search);

  searchParams.set("stage", appState.stage);
  searchParams.set("level", appState.level);
  searchParams.set("topic", appState.topic);
  searchParams.set("file", appState.file);

  if (appState.definitionScope !== "all" && appState.file === "core-definitions") {
    searchParams.set("definition_scope", appState.definitionScope);
  } else {
    searchParams.delete("definition_scope");
  }

  if (appState.round !== "all" && appState.file === "multi-round-cloze") {
    searchParams.set("round", appState.round);
  } else {
    searchParams.delete("round");
  }

  const nextSearch = searchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;

  window.history.replaceState(null, "", nextUrl);
}

function createShuffledSequence(unitIds, avoidUnitId = "") {
  const shuffled = unitIds.slice();

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  if (avoidUnitId && shuffled.length > 1 && shuffled[0] === avoidUnitId) {
    const replacementIndex = shuffled.findIndex((unitId) => unitId !== avoidUnitId);

    if (replacementIndex > 0) {
      [shuffled[0], shuffled[replacementIndex]] = [shuffled[replacementIndex], shuffled[0]];
    }
  }

  return shuffled;
}

function getCurrentUnit() {
  return (
    appState.activePool.find((unit) => unit.unitId === appState.currentUnitId) ||
    appState.activePool[0] ||
    null
  );
}

function getFileCountLabel(fileEntry) {
  if (!fileEntry) {
    return "0 items";
  }

  if (fileEntry.id === "multi-round-cloze") {
    return `${pluralise(fileEntry.count, "prompt")} · ${pluralise(
      fileEntry.runtime_unit_count,
      "round",
    )}`;
  }

  return pluralise(fileEntry.count, "item");
}

function renderStageSwitcher() {
  stageSwitcher.innerHTML = getStageEntries()
    .map((stageEntry) => {
      const countLabel = pluralise(getStageSourceTotal(stageEntry), "source item");

      return `
        <button
          class="memorisation-toggle"
          type="button"
          data-stage-id="${stageEntry.id}"
          data-active="${stageEntry.id === appState.stage ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${stageEntry.id}</span>
          <span class="memorisation-toggle__count">${countLabel}</span>
        </button>
      `;
    })
    .join("");

  stageSwitcher.querySelectorAll("[data-stage-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextStage = button.dataset.stageId;

      if (!nextStage || nextStage === appState.stage) {
        return;
      }

      applySelection(
        getSelectionSnapshot({
          stage: nextStage,
          level: "",
          topic: "",
          file: "",
          definitionScope: "all",
          round: "all",
        }),
      );
    });
  });
}

function renderLevelSwitcher() {
  levelSwitcher.innerHTML = getLevelEntries()
    .sort((left, right) => levelOrder.indexOf(left.id) - levelOrder.indexOf(right.id))
    .map(
      (levelEntry) => `
        <button
          class="memorisation-toggle"
          type="button"
          data-level-id="${levelEntry.id}"
          data-active="${levelEntry.id === appState.level ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${levelEntry.label}</span>
          <span class="memorisation-toggle__count">${pluralise(
            levelEntry.count,
            "source item",
          )}</span>
        </button>
      `,
    )
    .join("");

  levelSwitcher.querySelectorAll("[data-level-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLevel = button.dataset.levelId;

      if (!nextLevel || nextLevel === appState.level) {
        return;
      }

      applySelection(
        getSelectionSnapshot({
          level: nextLevel,
          topic: "",
          file: "",
          definitionScope: "all",
          round: "all",
        }),
      );
    });
  });
}

function renderTopicFilter() {
  const topics = getTopicEntries()
    .slice()
    .sort((left, right) => collator.compare(left.label, right.label));

  topicFilter.disabled = topics.length === 0;
  topicFilter.innerHTML = topics.length
    ? topics.map((topic) => `<option value="${topic.id}">${topic.label}</option>`).join("")
    : '<option value="">No topics available</option>';

  if (!topics.some((topic) => topic.id === appState.topic)) {
    appState.topic = topics[0]?.id || "";
  }

  topicFilter.value = appState.topic;
}

function renderFileSwitcher() {
  fileSwitcher.innerHTML = getFileEntries()
    .slice()
    .sort((left, right) => fileOrder.indexOf(left.id) - fileOrder.indexOf(right.id))
    .map(
      (fileEntry) => `
        <button
          class="memorisation-toggle memorisation-toggle--compact"
          type="button"
          data-file-id="${fileEntry.id}"
          data-active="${fileEntry.id === appState.file ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${fileEntry.label}</span>
          <span class="memorisation-toggle__count">${getFileCountLabel(fileEntry)}</span>
        </button>
      `,
    )
    .join("");

  fileSwitcher.querySelectorAll("[data-file-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextFile = button.dataset.fileId;

      if (!nextFile || nextFile === appState.file) {
        return;
      }

      applySelection(
        getSelectionSnapshot({
          file: nextFile,
          definitionScope: "all",
          round: "all",
        }),
      );
    });
  });
}

function renderDefinitionFilter() {
  const fileEntry = getFileEntry();

  if (fileEntry?.id !== "core-definitions") {
    definitionFilterSection.hidden = true;
    definitionFilterGrid.innerHTML = "";
    appState.definitionScope = "all";
    return;
  }

  definitionFilterSection.hidden = false;

  const definitionSourceCounts = fileEntry.definition_source_counts || {};
  definitionFilterGrid.innerHTML = definitionScopeOptions
    .map((option) => {
      const count =
        option.id === "all" ? fileEntry.count : Number(definitionSourceCounts[option.id] || 0);

      return `
        <button
          class="memorisation-toggle memorisation-toggle--compact"
          type="button"
          data-definition-scope="${option.id}"
          data-active="${option.id === appState.definitionScope ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${option.label}</span>
          <span class="memorisation-toggle__count">${pluralise(count, "item")}</span>
        </button>
      `;
    })
    .join("");

  definitionFilterGrid.querySelectorAll("[data-definition-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextScope = button.dataset.definitionScope;

      if (!nextScope || nextScope === appState.definitionScope) {
        return;
      }

      appState.definitionScope = nextScope;
      renderDefinitionFilter();
      refreshPool({ resetSequence: true });
    });
  });
}

function renderRoundSwitcher() {
  const fileEntry = getFileEntry();

  if (fileEntry?.id !== "multi-round-cloze") {
    roundSwitcherSection.hidden = true;
    roundSwitcher.innerHTML = "";
    appState.round = "all";
    return;
  }

  roundSwitcherSection.hidden = false;
  const roundOptions = ["all", ...fileEntry.rounds.map((round) => String(round))];

  if (!roundOptions.includes(appState.round)) {
    appState.round = "all";
  }

  roundSwitcher.innerHTML = roundOptions
    .map((option) => {
      const label = option === "all" ? "All rounds" : `Round ${option}`;

      return `
        <button
          class="memorisation-toggle memorisation-toggle--compact"
          type="button"
          data-round-value="${option}"
          data-active="${option === appState.round ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${label}</span>
        </button>
      `;
    })
    .join("");

  roundSwitcher.querySelectorAll("[data-round-value]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextRound = button.dataset.roundValue;

      if (!nextRound || nextRound === appState.round) {
        return;
      }

      appState.round = nextRound;
      renderRoundSwitcher();
      refreshPool({ resetSequence: true });
    });
  });
}

function renderControls() {
  renderStageSwitcher();
  renderLevelSwitcher();
  renderTopicFilter();
  renderFileSwitcher();
  renderDefinitionFilter();
  renderRoundSwitcher();
}

async function loadCurrentFileItems() {
  const fileEntry = getFileEntry();

  if (!fileEntry) {
    return [];
  }

  if (appState.fileDataCache.has(fileEntry.path)) {
    return appState.fileDataCache.get(fileEntry.path);
  }

  const items = await fetchJson(`./data/${fileEntry.path}`);
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        topic: normalizeTopicKey(item.topic || appState.topic),
      }))
    : [];

  appState.fileDataCache.set(fileEntry.path, normalizedItems);
  return normalizedItems;
}

async function loadCatalogResources({ preserveSelection = true } = {}) {
  const fallbackSelection = preserveSelection
    ? getSelectionSnapshot()
    : getInitialSelectionFromUrl();
  const catalog = await fetchJson("./data/catalog.json");

  if (!Array.isArray(catalog?.stages) || catalog.stages.length === 0) {
    throw new Error("The memorisation catalog is empty or malformed.");
  }

  let topicNormalizationMap = appState.topicNormalizationMap;

  try {
    const loadedMap = await fetchJson("./data/context/topic_normalization_map.json");
    topicNormalizationMap =
      loadedMap && typeof loadedMap === "object" && !Array.isArray(loadedMap) ? loadedMap : {};
  } catch (error) {
    topicNormalizationMap = preserveSelection ? appState.topicNormalizationMap : {};
  }

  appState.catalog = catalog;
  appState.topicNormalizationMap = topicNormalizationMap;
  appState.fileDataCache.clear();
  synchroniseSelection(fallbackSelection);
}

function buildActivePool(items, fileEntry) {
  const filteredItems =
    fileEntry.id === "core-definitions" && appState.definitionScope !== "all"
      ? items.filter((item) => item.source_scope === appState.definitionScope)
      : items;

  if (fileEntry.id === "guided-cloze") {
    return filteredItems.map((item) => ({
      ...item,
      kind: "guided-cloze",
      unitId: item.id,
    }));
  }

  if (fileEntry.id === "multi-round-cloze") {
    return filteredItems
      .flatMap((item) => {
        const rounds = Array.isArray(item.rounds) ? item.rounds : [];

        return rounds.map((round, index) => ({
          ...item,
          kind: "multi-round-cloze",
          unitId: `${item.id}::round-${round.round ?? index + 1}`,
          prompt: round.prompt,
          answers: Array.isArray(round.answers) ? round.answers.slice() : [],
          round: Number(round.round ?? index + 1),
          roundTotal: rounds.length,
        }));
      })
      .filter((unit) => appState.round === "all" || String(unit.round) === appState.round);
  }

  if (fileEntry.id === "full-reconstruction") {
    return filteredItems.map((item) => ({
      ...item,
      kind: "full-reconstruction",
      unitId: item.id,
    }));
  }

  return filteredItems.map((item) => ({
    ...item,
    kind: "single",
    unitId: item.id,
  }));
}

function setLoadingState(message = "Loading current training file...") {
  questionLabel.textContent = "Loading";
  questionTitle.textContent = message;
  questionCopy.textContent = "Reading the selected level, topic, and training file.";
  promptCard.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  answerPanel.hidden = true;
  revealAnswerButton.disabled = true;
  nextItemButton.disabled = true;
}

function renderStatusCard(message, actionLabel = "", actionHandler = null) {
  const shell = document.createElement("div");
  shell.className = "memorisation-status-card";

  const copy = document.createElement("p");
  copy.className = "memorisation-empty";
  copy.textContent = message;
  shell.append(copy);

  if (actionLabel && typeof actionHandler === "function") {
    const actions = document.createElement("div");
    actions.className = "memorisation-status-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-link";
    button.textContent = actionLabel;
    button.addEventListener("click", actionHandler);

    actions.append(button);
    shell.append(actions);
  }

  promptCard.replaceChildren(shell);
}

function getEmptyStateMessage() {
  const fileEntry = getFileEntry();

  if (!fileEntry) {
    return "No training file is available for this topic.";
  }

  if (fileEntry.id === "core-definitions" && appState.definitionScope !== "all") {
    return "No definition items match the selected source filter in this topic.";
  }

  if (fileEntry.id === "multi-round-cloze" && appState.round !== "all") {
    return `No prompts expose ${`Round ${appState.round}`} in this topic.`;
  }

  return "No items are available in the selected training file.";
}

function renderStats() {
  const fileEntry = getFileEntry();
  const counterValue =
    appState.activePool.length === 0
      ? "0 / 0"
      : `${appState.sequenceIndex + 1} / ${appState.activePool.length}`;

  fileManifestCount.textContent = getFileCountLabel(fileEntry);
  poolCount.textContent = pluralise(appState.activePool.length, "runtime unit");
  itemCounter.textContent = counterValue;
  counterChip.textContent = counterValue;
}

function buildQuestionMeta(unit) {
  const parts = [];

  if (unit.subtopic) {
    parts.push(formatLabel(unit.subtopic));
  }

  if (unit.source_scope) {
    parts.push(formatDefinitionScope(unit.source_scope));
  }

  if (unit.kind === "guided-cloze" || unit.kind === "multi-round-cloze") {
    parts.push(pluralise(unit.answers.length, "blank"));
  }

  if (unit.kind === "multi-round-cloze") {
    parts.push(`Round ${unit.round} of ${unit.roundTotal}`);
  }

  if (unit.kind === "full-reconstruction") {
    parts.push("Full canonical reconstruction");
  }

  return parts.join(" · ");
}

function updateBadges(unit) {
  const stageEntry = getStageEntry();
  const levelEntry = getLevelEntry();
  const topicEntry = getTopicEntry();
  const fileEntry = getFileEntry();

  stageBadge.textContent = stageEntry?.id || "Stage";
  levelBadge.textContent = levelEntry?.label || "Level";
  topicBadge.textContent = topicEntry?.label || "Topic";
  fileBadge.textContent = fileEntry?.label || "Training file";

  if (fileEntry?.id === "core-definitions") {
    sourceBadge.hidden = false;
    sourceBadge.textContent =
      appState.definitionScope === "all"
        ? "All definition sources"
        : formatDefinitionScope(appState.definitionScope);
  } else {
    sourceBadge.hidden = true;
  }

  if (fileEntry?.id === "multi-round-cloze") {
    roundBadge.hidden = false;
    roundBadge.textContent = appState.round === "all" ? "All rounds" : `Round ${appState.round}`;
  } else {
    roundBadge.hidden = true;
  }
}

function updateAnswerPanel(unit) {
  if (!unit || !appState.revealed) {
    answerPanel.hidden = true;
    answerText.textContent = "";
    answerNote.textContent = "";
    return;
  }

  const isFullAnswerUnit =
    unit.kind === "guided-cloze" ||
    unit.kind === "multi-round-cloze" ||
    unit.kind === "full-reconstruction";

  answerPanel.hidden = false;
  answerLabel.textContent = isFullAnswerUnit ? "Canonical full answer" : "Canonical answer";
  answerText.textContent = isFullAnswerUnit ? unit.full_answer || unit.answer : unit.answer;
  answerNote.textContent =
    unit.kind === "guided-cloze" || unit.kind === "multi-round-cloze"
      ? "Reveal shows the stored full explanation answer for this prompt. Formatting, spelling, punctuation, and article variants are normalized; prepositions stay strict."
      : getFileEntry()?.id === "core-equations"
        ? "Equation matching normalizes spacing, arrow variants, and optional state symbols unless the prompt explicitly requires them."
        : "Formatting, spelling, quote, punctuation, hyphen, and article variants are normalized during checking. Prepositions stay strict.";
}

function updateActionButtons(unit) {
  const revealLabel = unit && unit.kind !== "single" ? "Show full answer" : "Show answer";

  revealAnswerButton.textContent = appState.revealed
    ? unit && unit.kind !== "single"
      ? "Full answer shown"
      : "Answer shown"
    : revealLabel;
  revealAnswerButton.disabled = !unit || appState.revealed;
  nextItemButton.disabled = !unit;
}

function renderEmptyState(message) {
  renderStats();
  updateBadges(null);
  questionLabel.textContent = "No drill units";
  questionTitle.textContent = "Nothing matches the current selection.";
  questionCopy.textContent = message;
  renderStatusCard(message);
  appState.revealed = false;
  updateAnswerPanel(null);
  updateActionButtons(null);
  updateUrlFromState();
}

function renderCatalogErrorState(message) {
  appState.activePool = [];
  appState.sequence = [];
  appState.sequenceIndex = 0;
  appState.currentUnitId = "";
  renderStats();
  updateBadges(null);
  questionLabel.textContent = "Memorisation bank unavailable";
  questionTitle.textContent = "Could not load memorisation data.";
  questionCopy.textContent =
    "The catalog or its supporting files could not be loaded. Retry this page in a moment.";
  renderStatusCard(message, "Retry loading", () => {
    bootRuntime({ preserveSelection: false });
  });
  appState.revealed = false;
  updateAnswerPanel(null);
  updateActionButtons(null);
}

function renderFileErrorState(fileEntry, message) {
  appState.activePool = [];
  appState.sequence = [];
  appState.sequenceIndex = 0;
  appState.currentUnitId = "";
  renderStats();
  updateBadges(null);
  questionLabel.textContent = "Loading error";
  questionTitle.textContent = `Could not load ${fileEntry?.label || "the selected training file"}.`;
  questionCopy.textContent = message;
  renderStatusCard(message, "Retry loading", () => {
    refreshPool({ resetSequence: true, allowCatalogResync: true });
  });
  answerPanel.hidden = true;
  revealAnswerButton.disabled = true;
  nextItemButton.disabled = true;
  updateUrlFromState();
}

function renderSinglePrompt(unit) {
  const matcherConfig = getMatcherConfig(unit);
  const fieldWrapper = document.createElement("label");
  fieldWrapper.className = "memorisation-field";

  const fieldLabel = document.createElement("span");
  fieldLabel.className = "memorisation-field__label";
  fieldLabel.textContent = "Your answer";

  const field = document.createElement("input");
  field.type = "text";
  field.className = "memorisation-input memorisation-input--single";
  field.spellcheck = false;
  field.autocomplete = "off";
  field.autocapitalize = "off";
  field.placeholder = "Type the canonical answer.";
  applyFieldState(field, "untouched");

  const feedback = document.createElement("p");
  feedback.className = "memorisation-feedback";
  feedback.setAttribute("aria-live", "polite");

  const guide = document.createElement("p");
  guide.className = "memorisation-match-guide";

  resetFieldToUntouched(
    field,
    feedback,
    guide,
    unit.answer,
    matcherConfig,
    "Check on blur or Enter.",
    "Match guide",
  );

  field.addEventListener("input", () => {
    applyFieldState(field, "untouched");
    setFeedbackMessage(feedback, getUntouchedMessage(matcherConfig, "Check on blur or Enter."));
    updateDraftGuide(guide, field.value, unit.answer, matcherConfig, "Match guide");
  });

  field.addEventListener("blur", () => {
    applyMatchResultToField(
      field,
      feedback,
      guide,
      evaluateMatchResult(field.value, unit.answer, matcherConfig),
      matcherConfig,
      "Match guide",
    );
  });

  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    applyMatchResultToField(
      field,
      feedback,
      guide,
      evaluateMatchResult(field.value, unit.answer, matcherConfig),
      matcherConfig,
      "Match guide",
    );
  });

  fieldWrapper.append(fieldLabel, field, feedback, guide);
  promptCard.replaceChildren(fieldWrapper);
}

function renderReconstructionPrompt(unit) {
  const matcherConfig = getMatcherConfig(unit);
  const fieldWrapper = document.createElement("label");
  fieldWrapper.className = "memorisation-field";

  const fieldLabel = document.createElement("span");
  fieldLabel.className = "memorisation-field__label";
  fieldLabel.textContent = "Your full answer";

  const field = document.createElement("textarea");
  field.className = "memorisation-input memorisation-input--reconstruction";
  field.rows = 6;
  field.spellcheck = false;
  field.autocomplete = "off";
  field.autocapitalize = "off";
  field.placeholder = "Type the full canonical answer.";
  applyFieldState(field, "untouched");

  const feedback = document.createElement("p");
  feedback.className = "memorisation-feedback";
  feedback.setAttribute("aria-live", "polite");

  const guide = document.createElement("p");
  guide.className = "memorisation-match-guide";

  resetFieldToUntouched(
    field,
    feedback,
    guide,
    unit.answer,
    matcherConfig,
    "Check on blur or Ctrl/Cmd+Enter.",
    "Match guide",
  );

  field.addEventListener("input", () => {
    applyFieldState(field, "untouched");
    setFeedbackMessage(
      feedback,
      getUntouchedMessage(matcherConfig, "Check on blur or Ctrl/Cmd+Enter."),
    );
    updateDraftGuide(guide, field.value, unit.answer, matcherConfig, "Match guide");
  });

  field.addEventListener("blur", () => {
    applyMatchResultToField(
      field,
      feedback,
      guide,
      evaluateMatchResult(field.value, unit.answer, matcherConfig),
      matcherConfig,
      "Match guide",
    );
  });

  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) {
      return;
    }

    event.preventDefault();
    applyMatchResultToField(
      field,
      feedback,
      guide,
      evaluateMatchResult(field.value, unit.answer, matcherConfig),
      matcherConfig,
      "Match guide",
    );
  });

  fieldWrapper.append(fieldLabel, field, feedback, guide);
  promptCard.replaceChildren(fieldWrapper);
}

function updateClozeSummary(summaryElement, inputs) {
  const correctCount = inputs.filter((input) => isSuccessfulMatchState(input.dataset.state)).length;
  const nearMissCount = inputs.filter(
    (input) => input.dataset.state === "near_miss_preposition",
  ).length;
  const incorrectCount = inputs.filter((input) => input.dataset.state === "incorrect").length;
  const untouchedCount = inputs.filter((input) => input.dataset.state === "untouched").length;

  if (correctCount === 0 && nearMissCount === 0 && incorrectCount === 0) {
    setFeedbackMessage(
      summaryElement,
      "Each blank checks independently on blur or Enter. Formatting, spelling, punctuation, and articles are normalized; prepositions stay strict.",
    );
    return;
  }

  setFeedbackMessage(
    summaryElement,
    `${pluralise(correctCount, "blank")} correct · ${pluralise(
      nearMissCount,
      "blank",
    )} almost there · ${pluralise(
      incorrectCount,
      "blank",
    )} incorrect · ${pluralise(untouchedCount, "blank")} untouched`,
    incorrectCount > 0 ? "incorrect" : nearMissCount > 0 ? "warning" : "correct",
  );
}

function applyClozeBlankResult(
  field,
  answer,
  feedbackElement,
  guideElement,
  matcherConfig,
  summaryElement,
  inputs,
  blankLabel,
) {
  applyMatchResultToField(
    field,
    feedbackElement,
    guideElement,
    evaluateMatchResult(field.value, answer, matcherConfig),
    matcherConfig,
    `${blankLabel} guide`,
  );
  updateClozeSummary(summaryElement, inputs);
}

function renderClozePrompt(unit) {
  const matcherConfig = getMatcherConfig(unit);
  const shell = document.createElement("div");
  shell.className = "cloze-shell";

  const intro = document.createElement("p");
  intro.className = "cloze-intro";
  intro.textContent = "Fill each blank in prompt order. Each blank checks independently.";

  const summary = document.createElement("p");
  summary.className = "memorisation-feedback";
  summary.setAttribute("aria-live", "polite");
  setFeedbackMessage(
    summary,
    "Each blank checks independently on blur or Enter. Formatting, spelling, punctuation, and articles are normalized; prepositions stay strict.",
  );

  const promptLine = document.createElement("div");
  promptLine.className = "cloze-prompt-line";
  const detailList = document.createElement("div");
  detailList.className = "cloze-detail-list";
  const blankPattern = /_{4,}/g;
  const promptText = String(unit.prompt || "");
  const promptParts = promptText.split(blankPattern);
  const blankCount = (promptText.match(blankPattern) || []).length;

  if (blankCount !== unit.answers.length) {
    promptCard.innerHTML = `
      <p class="memorisation-empty">
        This cloze prompt could not be rendered because the blank count does not match the stored answers.
      </p>
    `;
    return;
  }

  const inputs = unit.answers.map((answer, index) => {
    const blankLabel = `Blank ${index + 1}`;
    promptLine.append(document.createTextNode(promptParts[index]));

    const input = document.createElement("input");
    input.type = "text";
    input.className = "cloze-input";
    input.placeholder = blankLabel;
    input.spellcheck = false;
    input.autocomplete = "off";
    input.autocapitalize = "off";
    applyFieldState(input, "untouched");

    const detail = document.createElement("div");
    detail.className = "cloze-detail";

    const detailLabel = document.createElement("span");
    detailLabel.className = "cloze-detail__label";
    detailLabel.textContent = blankLabel;

    const detailFeedback = document.createElement("p");
    detailFeedback.className = "memorisation-feedback";

    const detailGuide = document.createElement("p");
    detailGuide.className = "memorisation-match-guide";

    resetFieldToUntouched(
      input,
      detailFeedback,
      detailGuide,
      answer,
      matcherConfig,
      "Check on blur or Enter.",
      `${blankLabel} guide`,
    );

    input.addEventListener("input", () => {
      applyFieldState(input, "untouched");
      setFeedbackMessage(
        detailFeedback,
        getUntouchedMessage(matcherConfig, "Check on blur or Enter."),
      );
      updateDraftGuide(detailGuide, input.value, answer, matcherConfig, `${blankLabel} guide`);
      updateClozeSummary(summary, inputs);
    });

    input.addEventListener("blur", () => {
      applyClozeBlankResult(
        input,
        answer,
        detailFeedback,
        detailGuide,
        matcherConfig,
        summary,
        inputs,
        blankLabel,
      );
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      applyClozeBlankResult(
        input,
        answer,
        detailFeedback,
        detailGuide,
        matcherConfig,
        summary,
        inputs,
        blankLabel,
      );

      const nextInput = inputs[index + 1];

      if (nextInput) {
        nextInput.focus();
      }
    });

    promptLine.append(input);
    detail.append(detailLabel, detailFeedback, detailGuide);
    detailList.append(detail);
    return input;
  });

  promptLine.append(document.createTextNode(promptParts[promptParts.length - 1]));
  shell.append(intro, promptLine, summary, detailList);
  promptCard.replaceChildren(shell);
}

function renderCurrentUnit() {
  const currentUnit = getCurrentUnit();

  renderStats();

  if (!currentUnit) {
    renderEmptyState(getEmptyStateMessage());
    return;
  }

  updateBadges(currentUnit);
  questionLabel.textContent = getFileEntry()?.label || "Training file";
  questionTitle.textContent =
    currentUnit.kind === "single"
      ? currentUnit.prompt || currentUnit.question
      : currentUnit.question || currentUnit.prompt;
  questionCopy.textContent = buildQuestionMeta(currentUnit);

  if (currentUnit.kind === "guided-cloze" || currentUnit.kind === "multi-round-cloze") {
    renderClozePrompt(currentUnit);
  } else if (currentUnit.kind === "full-reconstruction") {
    renderReconstructionPrompt(currentUnit);
  } else {
    renderSinglePrompt(currentUnit);
  }

  updateAnswerPanel(currentUnit);
  updateActionButtons(currentUnit);
  updateUrlFromState();
}

async function refreshPool({ resetSequence = true, allowCatalogResync = true } = {}) {
  synchroniseSelection();
  const fileEntry = getFileEntry();

  if (!fileEntry) {
    appState.activePool = [];
    renderEmptyState("No training file is available for the current selection.");
    return;
  }

  setLoadingState(`Loading ${fileEntry.label.toLowerCase()}...`);

  const renderToken = ++appState.renderToken;

  try {
    const items = await loadCurrentFileItems();

    if (renderToken !== appState.renderToken) {
      return;
    }

    appState.activePool = buildActivePool(items, fileEntry);

    if (
      resetSequence ||
      !appState.activePool.some((unit) => unit.unitId === appState.currentUnitId)
    ) {
      appState.sequence = createShuffledSequence(appState.activePool.map((unit) => unit.unitId));
      appState.sequenceIndex = 0;
      appState.currentUnitId = appState.sequence[0] || "";
    } else {
      const currentIndex = appState.sequence.indexOf(appState.currentUnitId);
      appState.sequenceIndex = currentIndex >= 0 ? currentIndex : 0;
    }

    appState.revealed = false;
    renderCurrentUnit();
  } catch (error) {
    if (renderToken !== appState.renderToken) {
      return;
    }

    if (allowCatalogResync) {
      try {
        await loadCatalogResources({ preserveSelection: true });

        if (renderToken !== appState.renderToken) {
          return;
        }

        renderControls();
        updateUrlFromState();
        return refreshPool({ resetSequence, allowCatalogResync: false });
      } catch (catalogError) {
        if (renderToken !== appState.renderToken) {
          return;
        }

        renderFileErrorState(
          fileEntry,
          `${error.message} Retry to resync the current selection with the latest catalog.`,
        );
        return;
      }
    }

    renderFileErrorState(fileEntry, `${error.message} Retry to try the current selection again.`);
  }
}

function moveToNextUnit() {
  if (appState.activePool.length === 0) {
    refreshPool({ resetSequence: true });
    return;
  }

  if (appState.sequenceIndex < appState.sequence.length - 1) {
    appState.sequenceIndex += 1;
    appState.currentUnitId = appState.sequence[appState.sequenceIndex];
  } else {
    appState.sequence = createShuffledSequence(
      appState.activePool.map((unit) => unit.unitId),
      appState.currentUnitId,
    );
    appState.sequenceIndex = 0;
    appState.currentUnitId = appState.sequence[0] || "";
  }

  appState.revealed = false;
  renderCurrentUnit();
}

function registerStaticEvents() {
  if (appState.staticEventsRegistered) {
    return;
  }

  topicFilter.addEventListener("change", (event) => {
    applySelection(
      getSelectionSnapshot({
        topic: normalizeTopicKey(event.target.value || ""),
        file: "",
        definitionScope: "all",
        round: "all",
      }),
    );
  });

  revealAnswerButton.addEventListener("click", () => {
    appState.revealed = true;
    updateAnswerPanel(getCurrentUnit());
    updateActionButtons(getCurrentUnit());
  });

  nextItemButton.addEventListener("click", () => {
    moveToNextUnit();
  });

  appState.staticEventsRegistered = true;
}

async function bootRuntime({ preserveSelection = true } = {}) {
  setLoadingState("Loading memorisation bank...");

  try {
    await loadCatalogResources({ preserveSelection });
    renderControls();
    updateUrlFromState();
    await refreshPool({ resetSequence: true, allowCatalogResync: false });
  } catch (error) {
    renderCatalogErrorState(error.message);
  }
}

async function init() {
  registerStaticEvents();
  bootRuntime({ preserveSelection: false });
}

init();

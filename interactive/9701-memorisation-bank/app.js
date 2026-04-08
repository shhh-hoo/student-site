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

function normaliseExactMatch(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
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

function initializeSelection() {
  const requestedSelection = getInitialSelectionFromUrl();
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

      appState.stage = nextStage;
      appState.level = getDefaultLevelId(nextStage);
      appState.topic = getDefaultTopicId(appState.stage, appState.level);
      appState.file = getDefaultFileId(appState.stage, appState.level, appState.topic);
      appState.definitionScope = "all";
      appState.round = "all";
      renderControls();
      refreshPool({ resetSequence: true });
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

      appState.level = nextLevel;
      appState.topic = getDefaultTopicId(appState.stage, appState.level);
      appState.file = getDefaultFileId(appState.stage, appState.level, appState.topic);
      appState.definitionScope = "all";
      appState.round = "all";
      renderControls();
      refreshPool({ resetSequence: true });
    });
  });
}

function renderTopicFilter() {
  const topics = getTopicEntries()
    .slice()
    .sort((left, right) => collator.compare(left.label, right.label));

  topicFilter.innerHTML = topics
    .map((topic) => `<option value="${topic.id}">${topic.label}</option>`)
    .join("");

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

      appState.file = nextFile;
      appState.definitionScope = "all";
      appState.round = "all";
      renderControls();
      refreshPool({ resetSequence: true });
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
      ? "Reveal shows the stored full explanation answer for this prompt."
      : "Only outer whitespace and repeated internal whitespace are normalised during checking.";
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
  promptCard.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  appState.revealed = false;
  updateAnswerPanel(null);
  updateActionButtons(null);
  updateUrlFromState();
}

function renderErrorState(message) {
  questionLabel.textContent = "Memorisation bank unavailable";
  questionTitle.textContent = "Could not load the selected training file.";
  questionCopy.textContent = message;
  promptCard.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  answerPanel.hidden = true;
  revealAnswerButton.disabled = true;
  nextItemButton.disabled = true;
}

function checkExactMatch(field, answer, feedbackElement) {
  const currentValue = String(field.value || "");

  if (!currentValue.trim()) {
    applyFieldState(field, "untouched");
    setFeedbackMessage(
      feedbackElement,
      "Only outer whitespace and repeated internal whitespace are normalised.",
    );
    return;
  }

  const isCorrect = normaliseExactMatch(currentValue) === normaliseExactMatch(answer);

  applyFieldState(field, isCorrect ? "correct" : "incorrect");
  setFeedbackMessage(
    feedbackElement,
    isCorrect
      ? "Exact match under the current rules."
      : "Not an exact match under the current rules.",
    isCorrect ? "correct" : "incorrect",
  );
}

function renderSinglePrompt(unit) {
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
  field.placeholder = "Type the canonical answer exactly.";
  applyFieldState(field, "untouched");

  const feedback = document.createElement("p");
  feedback.className = "memorisation-feedback";
  feedback.setAttribute("aria-live", "polite");
  setFeedbackMessage(
    feedback,
    "Check on blur or Enter. Only outer whitespace and repeated internal whitespace are normalised.",
  );

  field.addEventListener("blur", () => {
    checkExactMatch(field, unit.answer, feedback);
  });

  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    checkExactMatch(field, unit.answer, feedback);
  });

  fieldWrapper.append(fieldLabel, field, feedback);
  promptCard.replaceChildren(fieldWrapper);
}

function renderReconstructionPrompt(unit) {
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
  setFeedbackMessage(
    feedback,
    "Check on blur or Ctrl/Cmd+Enter. Only outer whitespace and repeated internal whitespace are normalised.",
  );

  field.addEventListener("blur", () => {
    checkExactMatch(field, unit.answer, feedback);
  });

  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) {
      return;
    }

    event.preventDefault();
    checkExactMatch(field, unit.answer, feedback);
  });

  fieldWrapper.append(fieldLabel, field, feedback);
  promptCard.replaceChildren(fieldWrapper);
}

function updateClozeSummary(summaryElement, inputs) {
  const correctCount = inputs.filter((input) => input.dataset.state === "correct").length;
  const incorrectCount = inputs.filter((input) => input.dataset.state === "incorrect").length;
  const untouchedCount = inputs.length - correctCount - incorrectCount;

  if (correctCount === 0 && incorrectCount === 0) {
    setFeedbackMessage(summaryElement, "Each blank checks independently on blur or Enter.");
    return;
  }

  setFeedbackMessage(
    summaryElement,
    `${pluralise(correctCount, "blank")} correct · ${pluralise(
      incorrectCount,
      "blank",
    )} incorrect · ${pluralise(untouchedCount, "blank")} untouched`,
    incorrectCount > 0 ? "incorrect" : "correct",
  );
}

function checkClozeBlank(field, answer, summaryElement, inputs) {
  if (!String(field.value || "").trim()) {
    applyFieldState(field, "untouched");
    updateClozeSummary(summaryElement, inputs);
    return;
  }

  const isCorrect = normaliseExactMatch(field.value) === normaliseExactMatch(answer);

  applyFieldState(field, isCorrect ? "correct" : "incorrect");
  updateClozeSummary(summaryElement, inputs);
}

function renderClozePrompt(unit) {
  const shell = document.createElement("div");
  shell.className = "cloze-shell";

  const intro = document.createElement("p");
  intro.className = "cloze-intro";
  intro.textContent = "Fill each blank in prompt order. Each blank checks independently.";

  const summary = document.createElement("p");
  summary.className = "memorisation-feedback";
  summary.setAttribute("aria-live", "polite");
  setFeedbackMessage(summary, "Each blank checks independently on blur or Enter.");

  const promptLine = document.createElement("div");
  promptLine.className = "cloze-prompt-line";
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
    promptLine.append(document.createTextNode(promptParts[index]));

    const input = document.createElement("input");
    input.type = "text";
    input.className = "cloze-input";
    input.placeholder = `Blank ${index + 1}`;
    input.spellcheck = false;
    input.autocomplete = "off";
    input.autocapitalize = "off";
    applyFieldState(input, "untouched");

    input.addEventListener("blur", () => {
      checkClozeBlank(input, answer, summary, inputs);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      checkClozeBlank(input, answer, summary, inputs);

      const nextInput = inputs[index + 1];

      if (nextInput) {
        nextInput.focus();
      }
    });

    promptLine.append(input);
    return input;
  });

  promptLine.append(document.createTextNode(promptParts[promptParts.length - 1]));
  shell.append(intro, promptLine, summary);
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

async function refreshPool({ resetSequence = true } = {}) {
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

    renderErrorState(error.message);
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
  topicFilter.addEventListener("change", (event) => {
    appState.topic = normalizeTopicKey(event.target.value || "");
    appState.file = getDefaultFileId(appState.stage, appState.level, appState.topic);
    appState.definitionScope = "all";
    appState.round = "all";
    renderControls();
    refreshPool({ resetSequence: true });
  });

  revealAnswerButton.addEventListener("click", () => {
    appState.revealed = true;
    updateAnswerPanel(getCurrentUnit());
    updateActionButtons(getCurrentUnit());
  });

  nextItemButton.addEventListener("click", () => {
    moveToNextUnit();
  });
}

async function init() {
  registerStaticEvents();

  try {
    const [catalog, topicNormalizationMap] = await Promise.all([
      fetchJson("./data/catalog.json"),
      fetchJson("./data/context/topic_normalization_map.json"),
    ]);

    appState.catalog = catalog;
    appState.topicNormalizationMap = topicNormalizationMap;
    initializeSelection();
    renderControls();
    refreshPool({ resetSequence: true });
  } catch (error) {
    renderErrorState(error.message);
  }
}

init();

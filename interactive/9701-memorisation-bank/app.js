const stageConfig = [
  { id: "AS", slug: "as" },
  { id: "A2", slug: "a2" },
];

const modeConfig = [
  { id: "definition", label: "Definition" },
  { id: "reagent_condition", label: "Reagent + condition" },
  { id: "reaction_path", label: "Reaction path" },
  { id: "equation", label: "Equation" },
  { id: "explanation_cloze", label: "Explanation cloze" },
];

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const stageSwitcher = document.getElementById("stage-switcher");
const modeTabs = document.getElementById("mode-tabs");
const topicFilter = document.getElementById("topic-filter");
const modeManifestCount = document.getElementById("mode-manifest-count");
const poolCount = document.getElementById("pool-count");
const itemCounter = document.getElementById("item-counter");
const counterChip = document.getElementById("counter-chip");
const stageBadge = document.getElementById("stage-badge");
const modeBadge = document.getElementById("mode-badge");
const topicBadge = document.getElementById("topic-badge");
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
  manifests: {},
  unitsByStage: {},
  stage: "AS",
  mode: "definition",
  topic: "",
  sequence: [],
  sequenceIndex: 0,
  currentUnitId: "",
  revealed: false,
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
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normaliseExactMatch(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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

function buildRuntimeUnits(mode, items) {
  const sourceItems = Array.isArray(items) ? items : [];

  if (mode !== "explanation_cloze") {
    return sourceItems.map((item) => ({
      ...item,
      kind: "single",
      unitId: item.id,
    }));
  }

  return sourceItems.flatMap((item) => {
    const rounds = Array.isArray(item.rounds) ? item.rounds : [];

    return rounds.map((round, index) => ({
      ...item,
      kind: "cloze",
      unitId: `${item.id}::round-${round.round ?? index + 1}`,
      prompt: round.prompt,
      answers: Array.isArray(round.answers) ? round.answers.slice() : [],
      round: round.round ?? index + 1,
      roundTotal: rounds.length,
    }));
  });
}

function getManifestForStage(stageId) {
  return appState.manifests[stageId] || { modes: [] };
}

function getModeManifestEntry(stageId, modeId) {
  return (getManifestForStage(stageId).modes || []).find((mode) => mode.mode === modeId) || null;
}

function getStageSourceTotal(stageId) {
  return (getManifestForStage(stageId).modes || []).reduce(
    (sum, mode) => sum + Number(mode.count || 0),
    0,
  );
}

function getUnitsForStageMode(stageId, modeId) {
  return appState.unitsByStage[stageId]?.[modeId] || [];
}

function getActivePool() {
  const units = getUnitsForStageMode(appState.stage, appState.mode);

  if (!appState.topic) {
    return units;
  }

  return units.filter((unit) => unit.topic === appState.topic);
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
  const activePool = getActivePool();

  return activePool.find((unit) => unit.unitId === appState.currentUnitId) || activePool[0] || null;
}

function buildQuestionMeta(unit) {
  const parts = [formatLabel(unit.topic), formatLabel(unit.subtopic)].filter(Boolean);

  if (unit.kind === "cloze") {
    parts.push(`Round ${unit.round} of ${unit.roundTotal}`);
    parts.push(pluralise(unit.answers.length, "blank"));
  }

  return parts.join(" · ");
}

function renderStageSwitcher() {
  stageSwitcher.innerHTML = stageConfig
    .map((stage) => {
      const countLabel = pluralise(getStageSourceTotal(stage.id), "source item");

      return `
        <button
          class="memorisation-toggle"
          type="button"
          data-stage-id="${stage.id}"
          data-active="${stage.id === appState.stage ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${stage.id}</span>
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
      appState.topic = "";
      renderStageSwitcher();
      renderModeTabs();
      renderTopicFilter();
      resetSelection();
    });
  });
}

function renderModeTabs() {
  modeTabs.innerHTML = modeConfig
    .map((mode) => {
      const manifestEntry = getModeManifestEntry(appState.stage, mode.id);
      const countLabel = pluralise(Number(manifestEntry?.count || 0), "source item");

      return `
        <button
          class="memorisation-toggle"
          type="button"
          data-mode-id="${mode.id}"
          data-active="${mode.id === appState.mode ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${mode.label}</span>
          <span class="memorisation-toggle__count">${countLabel}</span>
        </button>
      `;
    })
    .join("");

  modeTabs.querySelectorAll("[data-mode-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.modeId;

      if (!nextMode || nextMode === appState.mode) {
        return;
      }

      appState.mode = nextMode;
      appState.topic = "";
      renderModeTabs();
      renderTopicFilter();
      resetSelection();
    });
  });
}

function renderTopicFilter() {
  const topics = [
    ...new Set(getUnitsForStageMode(appState.stage, appState.mode).map((unit) => unit.topic)),
  ]
    .filter(Boolean)
    .sort(collator.compare);

  topicFilter.innerHTML = [
    `<option value="">All topics</option>`,
    ...topics.map((topic) => `<option value="${topic}">${formatLabel(topic)}</option>`),
  ].join("");

  if (!topics.includes(appState.topic)) {
    appState.topic = "";
  }

  topicFilter.value = appState.topic;
}

function renderStats() {
  const manifestEntry = getModeManifestEntry(appState.stage, appState.mode);
  const activePool = getActivePool();
  const counterValue =
    activePool.length === 0 ? "0 / 0" : `${appState.sequenceIndex + 1} / ${activePool.length}`;

  modeManifestCount.textContent = pluralise(Number(manifestEntry?.count || 0), "source item");
  poolCount.textContent = pluralise(activePool.length, "runtime unit");
  itemCounter.textContent = counterValue;
  counterChip.textContent = counterValue;
}

function updateAnswerPanel(unit) {
  if (!unit || !appState.revealed) {
    answerPanel.hidden = true;
    answerText.textContent = "";
    answerNote.textContent = "";
    return;
  }

  answerPanel.hidden = false;
  answerLabel.textContent = unit.kind === "cloze" ? "Canonical full answer" : "Canonical answer";
  answerText.textContent = unit.kind === "cloze" ? unit.full_answer : unit.answer;
  answerNote.textContent =
    unit.kind === "cloze"
      ? "Cloze rounds are flattened for drilling, but reveal always shows the stored full_answer."
      : "Only leading or trailing spaces, repeated spaces, and case are ignored during checking.";
}

function updateActionButtons(unit) {
  const revealLabel = unit?.kind === "cloze" ? "Show full answer" : "Show answer";

  revealAnswerButton.textContent = appState.revealed
    ? unit?.kind === "cloze"
      ? "Full answer shown"
      : "Answer shown"
    : revealLabel;
  revealAnswerButton.disabled = !unit || appState.revealed;
  nextItemButton.disabled = !unit;
}

function renderEmptyState(message) {
  questionLabel.textContent = "No drill units";
  questionTitle.textContent = "Nothing matches the current filters.";
  questionCopy.textContent = message;
  stageBadge.textContent = appState.stage;
  modeBadge.textContent =
    modeConfig.find((mode) => mode.id === appState.mode)?.label || "Mode unavailable";
  topicBadge.textContent = appState.topic ? formatLabel(appState.topic) : "All topics";
  roundBadge.hidden = true;
  promptCard.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  appState.revealed = false;
  updateAnswerPanel(null);
  updateActionButtons(null);
}

function checkSingleAnswer(field, answer, feedbackElement) {
  if (!field.value.trim()) {
    applyFieldState(field, "untouched");
    setFeedbackMessage(
      feedbackElement,
      "Checked on blur or Enter. Only spaces and case are ignored.",
    );
    return;
  }

  const isCorrect = normaliseExactMatch(field.value) === normaliseExactMatch(answer);

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

  const field = document.createElement("textarea");
  field.className = "memorisation-input";
  field.rows = 4;
  field.spellcheck = false;
  field.autocomplete = "off";
  field.autocapitalize = "off";
  field.placeholder = "Type the stored answer exactly.";
  applyFieldState(field, "untouched");

  const feedback = document.createElement("p");
  feedback.className = "memorisation-feedback";
  feedback.setAttribute("aria-live", "polite");
  setFeedbackMessage(feedback, "Checked on blur or Enter. Only spaces and case are ignored.");

  field.addEventListener("blur", () => {
    checkSingleAnswer(field, unit.answer, feedback);
  });

  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    checkSingleAnswer(field, unit.answer, feedback);
  });

  fieldWrapper.append(fieldLabel, field, feedback);
  promptCard.replaceChildren(fieldWrapper);
}

function updateClozeSummary(summaryElement, inputs) {
  const correct = inputs.filter((input) => input.dataset.state === "correct").length;
  const incorrect = inputs.filter((input) => input.dataset.state === "incorrect").length;
  const untouched = inputs.length - correct - incorrect;

  if (correct === 0 && incorrect === 0) {
    setFeedbackMessage(
      summaryElement,
      "Each blank checks independently on blur or Enter.",
      "neutral",
    );
    return;
  }

  setFeedbackMessage(
    summaryElement,
    `${pluralise(correct, "blank")} correct · ${pluralise(incorrect, "blank")} incorrect · ${pluralise(
      untouched,
      "blank",
    )} untouched`,
    incorrect > 0 ? "incorrect" : "correct",
  );
}

function checkClozeBlank(field, answer, summaryElement, inputs) {
  if (!field.value.trim()) {
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
  intro.textContent = "Fill each blank in prompt order. Each blank is checked independently.";

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
        This cloze round could not be rendered because the prompt blank count does not match the stored answers.
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
    renderEmptyState("Choose a different topic or mode to rebuild the active drill pool.");
    return;
  }

  stageBadge.textContent = currentUnit.stage;
  modeBadge.textContent =
    modeConfig.find((mode) => mode.id === currentUnit.mode)?.label || formatLabel(currentUnit.mode);
  topicBadge.textContent = formatLabel(currentUnit.topic);
  roundBadge.hidden = currentUnit.kind !== "cloze";
  roundBadge.textContent =
    currentUnit.kind === "cloze" ? `Round ${currentUnit.round} of ${currentUnit.roundTotal}` : "";

  questionLabel.textContent =
    currentUnit.kind === "cloze"
      ? "Explanation cloze"
      : modeConfig.find((mode) => mode.id === currentUnit.mode)?.label || "Memorisation prompt";
  questionTitle.textContent =
    currentUnit.kind === "cloze" ? currentUnit.question : currentUnit.prompt;
  questionCopy.textContent = buildQuestionMeta(currentUnit);

  if (currentUnit.kind === "cloze") {
    renderClozePrompt(currentUnit);
  } else {
    renderSinglePrompt(currentUnit);
  }

  updateAnswerPanel(currentUnit);
  updateActionButtons(currentUnit);
}

function resetSelection() {
  const activePool = getActivePool();

  appState.sequence = createShuffledSequence(activePool.map((unit) => unit.unitId));
  appState.sequenceIndex = 0;
  appState.currentUnitId = appState.sequence[0] || "";
  appState.revealed = false;
  renderCurrentUnit();
}

function moveToNextUnit() {
  const activePool = getActivePool();

  if (!activePool.length) {
    resetSelection();
    return;
  }

  if (appState.sequenceIndex < appState.sequence.length - 1) {
    appState.sequenceIndex += 1;
    appState.currentUnitId = appState.sequence[appState.sequenceIndex];
  } else {
    appState.sequence = createShuffledSequence(
      activePool.map((unit) => unit.unitId),
      appState.currentUnitId,
    );
    appState.sequenceIndex = 0;
    appState.currentUnitId = appState.sequence[0] || "";
  }

  appState.revealed = false;
  renderCurrentUnit();
}

async function loadAllData() {
  const stageEntries = await Promise.all(
    stageConfig.map(async (stage) => {
      const manifest = await fetchJson(`./data/${stage.slug}/manifest.json`);
      const unitsByModeEntries = await Promise.all(
        (manifest.modes || []).map(async (modeEntry) => {
          const items = await fetchJson(`./data/${stage.slug}/${modeEntry.file}`);
          return [modeEntry.mode, buildRuntimeUnits(modeEntry.mode, items)];
        }),
      );

      return [stage.id, { manifest, unitsByMode: Object.fromEntries(unitsByModeEntries) }];
    }),
  );

  for (const [stageId, data] of stageEntries) {
    appState.manifests[stageId] = data.manifest;
    appState.unitsByStage[stageId] = data.unitsByMode;
  }
}

function renderErrorState(message) {
  questionLabel.textContent = "Memorisation bank unavailable";
  questionTitle.textContent = "Could not load memorisation data.";
  questionCopy.textContent = message;
  promptCard.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  answerPanel.hidden = true;
  revealAnswerButton.disabled = true;
  nextItemButton.disabled = true;
}

async function init() {
  revealAnswerButton.addEventListener("click", () => {
    appState.revealed = true;
    updateAnswerPanel(getCurrentUnit());
    updateActionButtons(getCurrentUnit());
  });

  nextItemButton.addEventListener("click", () => {
    moveToNextUnit();
  });

  topicFilter.addEventListener("change", (event) => {
    appState.topic = event.target.value || "";
    resetSelection();
  });

  try {
    await loadAllData();
    renderStageSwitcher();
    renderModeTabs();
    renderTopicFilter();
    resetSelection();
  } catch (error) {
    renderErrorState(error.message);
  }
}

init();

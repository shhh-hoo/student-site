const stageOrder = ["AS", "A2"];
const levelDefinitions = [
  {
    value: 1,
    key: "level-1-core",
    label: "Level 1",
    shortLabel: "1",
    summary: "Core AO1 dictation",
  },
  {
    value: 2,
    key: "level-2-guided-cloze",
    label: "Level 2",
    shortLabel: "2",
    summary: "Guided cloze",
  },
  {
    value: 3,
    key: "level-3-multi-round-cloze",
    label: "Level 3",
    shortLabel: "3",
    summary: "Multi-round cloze",
  },
  {
    value: 4,
    key: "level-4-full-reconstruction",
    label: "Level 4",
    shortLabel: "4",
    summary: "Full reconstruction",
  },
];
const typeOrder = [
  "definition",
  "reagent_condition",
  "reaction_path",
  "equation",
  "standard_observation",
  "test_outcome",
  "fixed_conclusion",
  "guided_cloze",
  "multi_round_cloze",
  "full_reconstruction",
];
const typeLabelMap = {
  definition: "Definition",
  reagent_condition: "Reagent / condition",
  reaction_path: "Reaction path",
  equation: "Equation",
  standard_observation: "Standard observation",
  test_outcome: "Test outcome",
  fixed_conclusion: "Fixed conclusion",
  guided_cloze: "Guided cloze",
  multi_round_cloze: "Multi-round cloze",
  full_reconstruction: "Full reconstruction",
};
const sourceScopeLabelMap = {
  paper_only: "Past paper only",
  syllabus_only: "Syllabus only",
  paper_and_syllabus: "Past paper + syllabus",
};
const dataFiles = stageOrder.flatMap((stage) =>
  levelDefinitions.map((levelDefinition) => ({
    stage,
    level: levelDefinition.value,
    levelKey: levelDefinition.key,
    path: `./data/${stage.toLowerCase()}/${levelDefinition.key}.json`,
  })),
);
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const stageSwitcher = document.getElementById("stage-switcher");
const levelSwitcher = document.getElementById("level-switcher");
const topicFilter = document.getElementById("topic-filter");
const typeFilter = document.getElementById("type-filter");
const sourceFileCount = document.getElementById("source-file-count");
const activeItemCount = document.getElementById("active-item-count");
const topicCount = document.getElementById("topic-count");
const cardCounter = document.getElementById("card-counter");
const stageBadge = document.getElementById("stage-badge");
const levelBadge = document.getElementById("level-badge");
const topicBadge = document.getElementById("topic-badge");
const typeBadge = document.getElementById("type-badge");
const counterChip = document.getElementById("counter-chip");
const questionEyebrow = document.getElementById("question-eyebrow");
const questionTitle = document.getElementById("question-title");
const questionCopy = document.getElementById("question-copy");
const roundSwitcher = document.getElementById("round-switcher");
const promptCard = document.getElementById("prompt-card");
const checkAnswerButton = document.getElementById("check-answer");
const showAnswerButton = document.getElementById("show-answer");
const previousItemButton = document.getElementById("previous-item");
const nextItemButton = document.getElementById("next-item");
const feedbackPanel = document.getElementById("feedback-panel");
const feedbackStatus = document.getElementById("feedback-status");
const feedbackCopy = document.getElementById("feedback-copy");
const answerPanel = document.getElementById("answer-panel");
const answerText = document.getElementById("answer-text");
const answerNote = document.getElementById("answer-note");

const state = {
  items: [],
  stage: "AS",
  level: 1,
  topic: "",
  type: "",
  currentIndex: 0,
  currentRoundIndex: 0,
  responses: {},
  checked: false,
  showAnswer: false,
  loading: true,
  error: "",
};

function fetchJson(path) {
  return fetch(path, { cache: "no-store" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed for ${path} (${response.status}).`);
    }

    return response.json();
  });
}

function getLevelDefinition(level) {
  return levelDefinitions.find((entry) => entry.value === level) || levelDefinitions[0];
}

function formatLooseLabel(value) {
  return String(value || "")
    .trim()
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatTypeLabel(type) {
  if (!type) {
    return "All types";
  }

  return typeLabelMap[type] || formatLooseLabel(type);
}

function formatTopicLabel(topic) {
  if (!topic) {
    return "All topics";
  }

  return formatLooseLabel(topic);
}

function formatSourceScope(sourceScope) {
  return sourceScopeLabelMap[sourceScope] || formatLooseLabel(sourceScope);
}

function normaliseAnswer(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function compareText(left, right) {
  return collator.compare(left, right);
}

function looksChemicalToken(token) {
  if (!token || !/[A-Z]/.test(token)) {
    return false;
  }

  return /[\d[\]()+\-<>=/]/.test(token) || /^(?:[A-Z][a-z]?){2,}$/.test(token);
}

function shouldUseChargeDigits(prefix, digits) {
  if (!prefix || !digits) {
    return false;
  }

  const lastCharacter = prefix.at(-1);

  if (lastCharacter === "]" || lastCharacter === ")") {
    return true;
  }

  return /[a-z]/.test(lastCharacter) && !/\d/.test(prefix);
}

function shouldSuperscriptInlineSign(formula, index) {
  const previousCharacter = formula[index - 1] || "";
  const nextCharacter = formula[index + 1] || "";

  if (!/[A-Za-z0-9\])]/.test(previousCharacter) || nextCharacter === ">") {
    return false;
  }

  return nextCharacter === "" || /[A-Z[(]/.test(nextCharacter);
}

function appendStyledChemicalText(parent, text, mode = "plain") {
  if (!text) {
    return;
  }

  if (mode === "plain") {
    parent.append(document.createTextNode(text));
    return;
  }

  const element = document.createElement(mode);
  element.textContent = text;
  parent.append(element);
}

function appendFormulaContent(parent, formula) {
  let currentMode = "plain";
  let currentText = "";

  const flush = () => {
    appendStyledChemicalText(parent, currentText, currentMode);
    currentText = "";
  };

  Array.from(formula).forEach((character, index) => {
    const previousCharacter = formula[index - 1] || "";
    let nextMode = "plain";

    if (/\d/.test(character) && /[A-Za-z\])]/.test(previousCharacter)) {
      nextMode = "sub";
    } else if (
      (character === "+" || character === "-") &&
      shouldSuperscriptInlineSign(formula, index)
    ) {
      nextMode = "sup";
    }

    if (nextMode !== currentMode) {
      flush();
      currentMode = nextMode;
    }

    currentText += character;
  });

  flush();
}

function buildChemistryFragment(text) {
  const fragment = document.createDocumentFragment();

  String(text || "")
    .split(/(\s+)/)
    .forEach((part) => {
      if (!part) {
        return;
      }

      if (/^\s+$/.test(part)) {
        fragment.append(document.createTextNode(part));
        return;
      }

      const match = part.match(/^(.*?)([.,;:!?]+)?$/);
      const core = match?.[1] || part;
      const suffix = match?.[2] || "";

      if (!looksChemicalToken(core)) {
        fragment.append(document.createTextNode(part));
        return;
      }

      const token = document.createElement("span");
      const slashParts = core.split("/");

      token.className = "chem-inline";

      slashParts.forEach((slashPart, slashIndex) => {
        if (slashIndex > 0) {
          token.append(document.createTextNode("/"));
        }

        const signMatch = slashPart.match(/^(.*?)([+-])$/);
        let formula = slashPart;
        let chargeDigits = "";
        let chargeSign = "";

        if (signMatch && looksChemicalToken(signMatch[1])) {
          formula = signMatch[1];
          chargeSign = signMatch[2];

          const digitMatch = formula.match(/^(.*?)(\d+)$/);

          if (digitMatch && shouldUseChargeDigits(digitMatch[1], digitMatch[2])) {
            formula = digitMatch[1];
            chargeDigits = digitMatch[2];
          }
        }

        appendFormulaContent(token, formula);
        appendStyledChemicalText(token, `${chargeDigits}${chargeSign}`, "sup");
      });

      fragment.append(token);

      if (suffix) {
        fragment.append(document.createTextNode(suffix));
      }
    });

  return fragment;
}

function sortByDefinedOrder(values, order) {
  const orderLookup = new Map(order.map((value, index) => [value, index]));

  return [...values].sort((left, right) => {
    const leftOrder = orderLookup.has(left) ? orderLookup.get(left) : Number.POSITIVE_INFINITY;
    const rightOrder = orderLookup.has(right)
      ? orderLookup.get(right)
      : Number.POSITIVE_INFINITY;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return compareText(left, right);
  });
}

function getStageItems(stage) {
  return state.items.filter((item) => item.stage === stage);
}

function getStageLevelItems(stage, level) {
  return state.items.filter((item) => item.stage === stage && item.level === level);
}

function getAvailableTopics(items) {
  const uniqueTopics = [...new Set(items.map((item) => item.topic).filter(Boolean))];
  return uniqueTopics.sort((left, right) => compareText(formatTopicLabel(left), formatTopicLabel(right)));
}

function getAvailableTypes(items) {
  const uniqueTypes = [...new Set(items.map((item) => item.type).filter(Boolean))];
  return sortByDefinedOrder(uniqueTypes, typeOrder);
}

function resetInteraction({ resetIndex = false, resetRound = true } = {}) {
  if (resetIndex) {
    state.currentIndex = 0;
  }

  if (resetRound) {
    state.currentRoundIndex = 0;
  }

  state.responses = {};
  state.checked = false;
  state.showAnswer = false;
}

function clearCheckStateForEditing() {
  if (!state.checked) {
    return;
  }

  state.checked = false;
  feedbackPanel.hidden = true;
  feedbackPanel.dataset.tone = "";

  promptCard
    .querySelectorAll(".memorisation-response, .memorisation-cloze__input")
    .forEach((field) => {
      field.dataset.state = "";
    });
}

function buildFilterModel() {
  const stageLevelItems = getStageLevelItems(state.stage, state.level);
  const availableTopics = getAvailableTopics(stageLevelItems);

  if (state.topic && !availableTopics.includes(state.topic)) {
    state.topic = "";
  }

  const topicItems = state.topic
    ? stageLevelItems.filter((item) => item.topic === state.topic)
    : stageLevelItems;
  const availableTypes = getAvailableTypes(topicItems);

  if (state.type && !availableTypes.includes(state.type)) {
    state.type = "";
  }

  const filteredItems = state.type
    ? topicItems.filter((item) => item.type === state.type)
    : topicItems;

  if (!filteredItems.length) {
    state.currentIndex = 0;
  } else if (state.currentIndex >= filteredItems.length) {
    state.currentIndex = 0;
  }

  return {
    stageLevelItems,
    availableTopics,
    availableTypes,
    filteredItems,
  };
}

function getPromptModel(item) {
  if (!item) {
    return {
      kind: "empty",
      promptText: "",
      answers: [],
      canonicalAnswer: "",
      rounds: [],
    };
  }

  if (item.level === 2) {
    return {
      kind: "guided_cloze",
      promptText: item.prompt || "",
      answers: Array.isArray(item.answers) ? item.answers : [],
      canonicalAnswer: item.full_answer || "",
      rounds: [],
    };
  }

  if (item.level === 3) {
    const rounds = Array.isArray(item.rounds) ? item.rounds : [];

    if (state.currentRoundIndex >= rounds.length) {
      state.currentRoundIndex = 0;
    }

    const currentRound = rounds[state.currentRoundIndex] || rounds[0] || {
      prompt: "",
      answers: [],
    };

    return {
      kind: "multi_round_cloze",
      promptText: currentRound.prompt || "",
      answers: Array.isArray(currentRound.answers) ? currentRound.answers : [],
      canonicalAnswer: item.full_answer || "",
      rounds,
    };
  }

  if (item.level === 4) {
    return {
      kind: "full_reconstruction",
      promptText: "",
      answers: [],
      canonicalAnswer: item.answer || "",
      rounds: [],
    };
  }

  return {
    kind: "core",
    promptText: "",
    answers: [],
    canonicalAnswer: item.answer || "",
    rounds: [],
  };
}

function evaluateCurrentItem(item, promptModel) {
  if (!item) {
    return null;
  }

  if (item.level === 2 || item.level === 3) {
    const comparisons = promptModel.answers.map((expectedAnswer, index) => {
      const fieldKey = `gap-${index}`;
      const rawValue = state.responses[fieldKey] || "";

      return {
        fieldKey,
        rawValue,
        expectedAnswer,
        matched:
          normaliseAnswer(rawValue) !== "" &&
          normaliseAnswer(rawValue) === normaliseAnswer(expectedAnswer),
      };
    });
    const matchedCount = comparisons.filter((comparison) => comparison.matched).length;
    const answeredCount = comparisons.filter(
      (comparison) => normaliseAnswer(comparison.rawValue) !== "",
    ).length;

    return {
      kind: "cloze",
      comparisons,
      matchedCount,
      answeredCount,
      total: comparisons.length,
      hasValue: answeredCount > 0,
      isCorrect: comparisons.length > 0 && matchedCount === comparisons.length,
    };
  }

  const rawValue = state.responses.main || "";

  return {
    kind: "free-text",
    rawValue,
    hasValue: normaliseAnswer(rawValue) !== "",
    isCorrect:
      normaliseAnswer(rawValue) !== "" &&
      normaliseAnswer(rawValue) === normaliseAnswer(promptModel.canonicalAnswer),
  };
}

function buildQuestionCopy(item, promptModel) {
  const details = [formatTopicLabel(item.topic)];

  if (item.subtopic) {
    details.push(formatLooseLabel(item.subtopic));
  }

  if (item.level === 3 && promptModel.rounds.length > 1) {
    details.push(`Round ${state.currentRoundIndex + 1} of ${promptModel.rounds.length}`);
  }

  return details.join(" · ");
}

function buildAnswerNote(item, promptModel) {
  const notes = [];

  if (item.type === "definition" && item.source_scope) {
    notes.push(`Definition source: ${formatSourceScope(item.source_scope)}.`);
  }

  if (item.level === 2) {
    notes.push("Guided cloze accepts only the stored gap answers.");
  } else if (item.level === 3) {
    notes.push("Every round points back to the same full canonical answer.");
  } else if (item.level === 4) {
    notes.push("Full reconstruction accepts only the stored canonical sentence.");
  } else {
    notes.push("Level 1 keeps the stored wording strict.");
  }

  if ((item.level === 2 || item.level === 3) && promptModel.answers.length) {
    notes.push(`Gap answers: ${promptModel.answers.join(" · ")}.`);
  }

  return notes.join(" ");
}

function buildFeedbackModel(evaluation) {
  if (!evaluation) {
    return null;
  }

  if (!evaluation.hasValue) {
    return {
      tone: "warning",
      status: "Add an answer first.",
      copy: "The checker only runs once you have entered something to compare.",
    };
  }

  if (evaluation.kind === "free-text") {
    if (evaluation.isCorrect) {
      return {
        tone: "success",
        status: "Correct.",
        copy:
          "The answer matches the canonical wording after trimming the ends and collapsing repeated spaces.",
      };
    }

    return {
      tone: "danger",
      status: "Not yet.",
      copy:
        "The wording still has to match the stored answer exactly after the route's space normalization.",
    };
  }

  if (evaluation.isCorrect) {
    return {
      tone: "success",
      status: "Correct.",
      copy: `All ${evaluation.total} gap${evaluation.total === 1 ? "" : "s"} match the stored answers.`,
    };
  }

  if (evaluation.matchedCount > 0) {
    return {
      tone: "warning",
      status: "Partly correct.",
      copy: `${evaluation.matchedCount} of ${evaluation.total} gaps match exactly. The remaining gaps still need the stored wording.`,
    };
  }

  return {
    tone: "danger",
    status: "Not yet.",
    copy: "None of the current gap answers match the stored wording exactly.",
  };
}

function createFilterButton({ value, label, meta, active, dataKey }) {
  const button = document.createElement("button");
  const labelSpan = document.createElement("span");
  const metaSpan = document.createElement("span");

  button.type = "button";
  button.className = "memorisation-filter-button";
  button.dataset[dataKey] = value;
  button.dataset.active = String(active);
  button.setAttribute("aria-pressed", String(active));

  labelSpan.className = "memorisation-filter-button__label";
  labelSpan.textContent = label;
  metaSpan.className = "memorisation-filter-button__meta";
  metaSpan.textContent = meta;

  button.append(labelSpan, metaSpan);
  return button;
}

function renderStageButtons() {
  stageSwitcher.replaceChildren();

  stageOrder.forEach((stage) => {
    const stageItems = getStageItems(stage);
    stageSwitcher.append(
      createFilterButton({
        value: stage,
        label: stage,
        meta: `${stageItems.length} item${stageItems.length === 1 ? "" : "s"}`,
        active: state.stage === stage,
        dataKey: "stage",
      }),
    );
  });
}

function renderLevelButtons() {
  levelSwitcher.replaceChildren();

  levelDefinitions.forEach((levelDefinition) => {
    const levelItems = getStageLevelItems(state.stage, levelDefinition.value);
    levelSwitcher.append(
      createFilterButton({
        value: String(levelDefinition.value),
        label: levelDefinition.shortLabel,
        meta: `${levelItems.length} item${levelItems.length === 1 ? "" : "s"}`,
        active: state.level === levelDefinition.value,
        dataKey: "level",
      }),
    );
  });
}

function renderSelect(selectElement, { options, currentValue, allLabel }) {
  selectElement.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  selectElement.append(allOption);

  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent =
      selectElement === topicFilter ? formatTopicLabel(optionValue) : formatTypeLabel(optionValue);
    selectElement.append(option);
  });

  selectElement.value = currentValue;
}

function renderRoundButtons(promptModel) {
  roundSwitcher.replaceChildren();

  if (promptModel.kind !== "multi_round_cloze" || promptModel.rounds.length < 2) {
    roundSwitcher.hidden = true;
    return;
  }

  roundSwitcher.hidden = false;

  promptModel.rounds.forEach((round, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memorisation-round-button";
    button.dataset.round = String(index);
    button.dataset.active = String(index === state.currentRoundIndex);
    button.textContent = `Round ${round.round || index + 1}`;
    roundSwitcher.append(button);
  });
}

function renderPromptCard(item, promptModel, evaluation) {
  promptCard.replaceChildren();

  if (state.loading) {
    const placeholder = document.createElement("p");
    placeholder.className = "memorisation-placeholder";
    placeholder.textContent = "Loading the eight source files for this route...";
    promptCard.append(placeholder);
    return;
  }

  if (state.error) {
    const placeholder = document.createElement("p");
    placeholder.className = "memorisation-placeholder";
    placeholder.textContent = state.error;
    promptCard.append(placeholder);
    return;
  }

  if (!item) {
    const placeholder = document.createElement("p");
    placeholder.className = "memorisation-placeholder";
    placeholder.textContent = "No items match the current filters.";
    promptCard.append(placeholder);
    return;
  }

  const header = document.createElement("div");
  const label = document.createElement("p");
  const copy = document.createElement("p");

  header.className = "memorisation-practice-card__header";
  label.className = "memorisation-practice-card__label";
  copy.className = "memorisation-practice-card__copy";

  if (item.level === 1) {
    label.textContent = "Type the stored answer exactly.";
    copy.textContent = "Level 1 checks one canonical answer for each prompt.";
  } else if (item.level === 2) {
    label.textContent = "Fill each guided gap exactly.";
    copy.textContent = "Each blank must match the stored gap answer.";
  } else if (item.level === 3) {
    label.textContent = "Work through the current cloze round.";
    copy.textContent = "Switch rounds without leaving the same question.";
  } else {
    label.textContent = "Write the full canonical answer.";
    copy.textContent = "Level 4 checks the whole stored reconstruction.";
  }

  header.append(label, copy);
  promptCard.append(header);

  if (item.level === 1 || item.level === 4) {
    const response = document.createElement("textarea");

    response.className = "memorisation-response";
    response.classList.toggle("memorisation-response--compact", item.level === 1);
    response.rows = item.level === 1 ? 4 : 6;
    response.placeholder =
      item.level === 1
        ? "Type the exact stored answer."
        : "Write the full canonical sentence.";
    response.value = state.responses.main || "";
    response.dataset.state =
      state.checked && evaluation?.kind === "free-text"
        ? evaluation.isCorrect
          ? "correct"
          : "incorrect"
        : "";
    response.addEventListener("input", () => {
      state.responses.main = response.value;
      clearCheckStateForEditing();
    });

    promptCard.append(response);
    return;
  }

  const clozePrompt = document.createElement("p");
  const promptParts = promptModel.promptText.split("____");

  clozePrompt.className = "memorisation-cloze";

  promptParts.forEach((part, index) => {
    clozePrompt.append(document.createTextNode(part));

    if (index >= promptModel.answers.length) {
      return;
    }

    const input = document.createElement("input");
    const fieldKey = `gap-${index}`;
    const comparison = evaluation?.kind === "cloze" ? evaluation.comparisons[index] : null;

    input.type = "text";
    input.className = "memorisation-cloze__input";
    input.size = Math.max(8, Math.min(20, promptModel.answers[index].length + 2));
    input.placeholder = `Gap ${index + 1}`;
    input.value = state.responses[fieldKey] || "";
    input.dataset.state =
      state.checked && comparison ? (comparison.matched ? "correct" : "incorrect") : "";
    input.setAttribute("aria-label", `Gap ${index + 1}`);
    input.addEventListener("input", () => {
      state.responses[fieldKey] = input.value;
      clearCheckStateForEditing();
    });

    clozePrompt.append(input);
  });

  promptCard.append(clozePrompt);
}

function renderFeedback(evaluation) {
  if (!state.checked || !evaluation) {
    feedbackPanel.hidden = true;
    feedbackPanel.dataset.tone = "";
    return;
  }

  const feedback = buildFeedbackModel(evaluation);

  if (!feedback) {
    feedbackPanel.hidden = true;
    feedbackPanel.dataset.tone = "";
    return;
  }

  feedbackPanel.hidden = false;
  feedbackPanel.dataset.tone = feedback.tone;
  feedbackStatus.textContent = feedback.status;
  feedbackCopy.textContent = feedback.copy;
}

function renderAnswer(item, promptModel) {
  if (!state.showAnswer || !item) {
    answerPanel.hidden = true;
    answerText.replaceChildren();
    answerNote.textContent = "";
    return;
  }

  answerPanel.hidden = false;
  answerText.replaceChildren(buildChemistryFragment(promptModel.canonicalAnswer));
  answerNote.textContent = buildAnswerNote(item, promptModel);
}

function renderWorkspace(filterModel) {
  const currentItem = filterModel.filteredItems[state.currentIndex] || null;
  const levelDefinition = getLevelDefinition(state.level);

  if (!currentItem) {
    state.currentRoundIndex = 0;
  }

  const promptModel = getPromptModel(currentItem);
  const evaluation = state.checked ? evaluateCurrentItem(currentItem, promptModel) : null;

  stageBadge.textContent = currentItem?.stage || state.stage;
  levelBadge.textContent = levelDefinition.label;
  topicBadge.textContent = currentItem ? formatTopicLabel(currentItem.topic) : formatTopicLabel(state.topic);
  typeBadge.textContent = currentItem ? formatTypeLabel(currentItem.type) : formatTypeLabel(state.type);
  counterChip.textContent = filterModel.filteredItems.length
    ? `${state.currentIndex + 1} / ${filterModel.filteredItems.length}`
    : "0 / 0";

  if (state.loading) {
    questionEyebrow.textContent = "Loading pack";
    questionTitle.textContent = "Loading memorisation bank...";
    questionCopy.textContent = "Reading the stage and level files for this integrated route.";
  } else if (state.error) {
    questionEyebrow.textContent = "Route unavailable";
    questionTitle.textContent = "Could not load the memorisation bank.";
    questionCopy.textContent = state.error;
  } else if (!currentItem) {
    questionEyebrow.textContent = `${levelDefinition.label} · ${levelDefinition.summary}`;
    questionTitle.textContent = "No drill items match the current filters.";
    questionCopy.textContent = "Try another topic or reset the type filter.";
  } else {
    questionEyebrow.textContent = `${levelDefinition.label} · ${levelDefinition.summary}`;
    questionTitle.textContent = currentItem.question || currentItem.prompt || "Untitled drill item";
    questionCopy.textContent = buildQuestionCopy(currentItem, promptModel);
  }

  renderRoundButtons(promptModel);
  renderPromptCard(currentItem, promptModel, evaluation);
  renderFeedback(evaluation);
  renderAnswer(currentItem, promptModel);

  const routeReady = !state.loading && !state.error && Boolean(currentItem);
  const canMoveWithinPool = routeReady && filterModel.filteredItems.length > 1;

  checkAnswerButton.disabled = !routeReady;
  showAnswerButton.disabled = !routeReady;
  previousItemButton.disabled = !canMoveWithinPool;
  nextItemButton.disabled = !canMoveWithinPool;
  showAnswerButton.textContent = state.showAnswer ? "Hide answer" : "Show answer";
}

function renderStats(filterModel) {
  sourceFileCount.textContent = String(dataFiles.length);
  activeItemCount.textContent = String(filterModel.filteredItems.length);
  topicCount.textContent = String(filterModel.availableTopics.length);
  cardCounter.textContent = filterModel.filteredItems.length
    ? `${state.currentIndex + 1} / ${filterModel.filteredItems.length}`
    : "0 / 0";
}

function render() {
  const filterModel = buildFilterModel();

  renderStageButtons();
  renderLevelButtons();
  renderSelect(topicFilter, {
    options: filterModel.availableTopics,
    currentValue: state.topic,
    allLabel: "All topics",
  });
  renderSelect(typeFilter, {
    options: filterModel.availableTypes,
    currentValue: state.type,
    allLabel: "All types",
  });
  renderStats(filterModel);
  renderWorkspace(filterModel);
}

function getCurrentFilteredItems() {
  return buildFilterModel().filteredItems;
}

function handleCheckAnswer() {
  state.checked = true;
  render();
}

function handleShowAnswer() {
  state.showAnswer = !state.showAnswer;
  render();
}

function handleNextItem() {
  const filteredItems = getCurrentFilteredItems();

  if (!filteredItems.length) {
    return;
  }

  state.currentIndex = (state.currentIndex + 1) % filteredItems.length;
  resetInteraction({ resetRound: true });
  render();
}

function handlePreviousItem() {
  const filteredItems = getCurrentFilteredItems();

  if (!filteredItems.length) {
    return;
  }

  state.currentIndex = (state.currentIndex - 1 + filteredItems.length) % filteredItems.length;
  resetInteraction({ resetRound: true });
  render();
}

function attachEventListeners() {
  stageSwitcher.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-stage]");

    if (!button || state.stage === button.dataset.stage) {
      return;
    }

    state.stage = button.dataset.stage;
    state.topic = "";
    state.type = "";
    resetInteraction({ resetIndex: true, resetRound: true });
    render();
  });

  levelSwitcher.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-level]");
    const nextLevel = Number(button?.dataset.level || 0);

    if (!button || !nextLevel || state.level === nextLevel) {
      return;
    }

    state.level = nextLevel;
    state.topic = "";
    state.type = "";
    resetInteraction({ resetIndex: true, resetRound: true });
    render();
  });

  topicFilter.addEventListener("change", () => {
    state.topic = topicFilter.value;
    state.type = "";
    resetInteraction({ resetIndex: true, resetRound: true });
    render();
  });

  typeFilter.addEventListener("change", () => {
    state.type = typeFilter.value;
    resetInteraction({ resetIndex: true, resetRound: true });
    render();
  });

  roundSwitcher.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-round]");
    const nextRoundIndex = Number(button?.dataset.round || 0);

    if (!button || state.currentRoundIndex === nextRoundIndex) {
      return;
    }

    state.currentRoundIndex = nextRoundIndex;
    resetInteraction({ resetRound: false });
    render();
  });

  checkAnswerButton.addEventListener("click", handleCheckAnswer);
  showAnswerButton.addEventListener("click", handleShowAnswer);
  previousItemButton.addEventListener("click", handlePreviousItem);
  nextItemButton.addEventListener("click", handleNextItem);
}

async function loadPack() {
  state.loading = true;
  state.error = "";
  render();

  try {
    const loadedFiles = await Promise.all(
      dataFiles.map(async (fileDefinition) => {
        const records = await fetchJson(fileDefinition.path);
        return Array.isArray(records)
          ? records.map((record) => ({
              ...record,
              stage: record.stage || fileDefinition.stage,
              level: Number(record.level || fileDefinition.level),
            }))
          : [];
      }),
    );

    state.items = loadedFiles.flat();
    state.loading = false;
    render();
  } catch (error) {
    state.loading = false;
    state.error = error.message;
    render();
  }
}

attachEventListeners();
loadPack();

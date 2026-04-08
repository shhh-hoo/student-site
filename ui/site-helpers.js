export const filterQueryKeys = {
  stage: "stage",
  part: "part",
  tags: "tags",
};

export const overviewTypeOptions = [
  "Equation",
  "Explanation",
  "Experiment",
  "Mechanism",
  "Comparison",
  "Practice",
];

export const overviewTopicOptions = [
  "Organic",
  "Physical",
  "Inorganic",
  "Analytical",
  "Practical",
  "Revision",
];

const structuralUiTags = new Set([
  "9701",
  "equation-bank",
  "as",
  "a2",
  "organic",
  "inorganic",
  "physical",
  "analysis",
  "equations",
  "index",
  "cross-stage",
  "cross-part",
]);

const uiTagAliasMap = {
  "ir-spectroscopy": "ir-spectroscopy",
  infrared: "ir-spectroscopy",
  spectroscopy: "ir-spectroscopy",
  "qualitative-tests": "qualitative-tests",
  tests: "qualitative-tests",
  "polymer-chemistry": "polymer-chemistry",
  polymerisation: "polymer-chemistry",
  polymers: "polymer-chemistry",
  "electronic-effects": "electronic-effects",
  "inductive-effect": "electronic-effects",
  delocalisation: "electronic-effects",
  "conjugate-base-stability": "electronic-effects",
  "lone-pair-availability": "electronic-effects",
};

const tagDisplayLabelMap = {
  "acyl-chlorides": "Acyl chlorides",
  acidity: "Acidity",
  alcohols: "Alcohols",
  alkenes: "Alkenes",
  amides: "Amides",
  amines: "Amines",
  "amino-acids": "Amino acids",
  arenes: "Arenes",
  "azo-coupling": "Azo coupling",
  basicity: "Basicity",
  buffers: "Buffers",
  carbonyls: "Carbonyls",
  "carboxylic-acids": "Carboxylic acids",
  electrochemistry: "Electrochemistry",
  "electronic-effects": "Electronic effects",
  "functional-groups": "Functional groups",
  "group-2": "Group 2",
  "group-17": "Group 17",
  halogenoalkanes: "Halogenoalkanes",
  halogenoarenes: "Halogenoarenes",
  "hcn-addition": "HCN addition",
  hydrocarbons: "Hydrocarbons",
  "ir-spectroscopy": "IR spectroscopy",
  mechanisms: "Mechanisms",
  nitriles: "Nitriles",
  "nitrogen-sulfur": "Nitrogen and sulfur",
  "past-paper": "Past paper",
  phenol: "Phenol",
  "period-3": "Period 3",
  pka: "pKa",
  pkb: "pKb",
  practical: "Practical",
  "polymer-chemistry": "Polymer chemistry",
  "qualitative-tests": "Qualitative tests",
  redox: "Redox",
  "transition-elements": "Transition elements",
};

const sourceKindLabelMap = {
  official: "Official",
  "teacher-made": "Teacher-made",
  "ai-generated": "AI-generated",
};

const analyticalOverviewTags = new Set(["ir-spectroscopy", "past-paper", "qualitative-tests"]);
const inorganicOverviewTags = new Set([
  "group-2",
  "group-17",
  "period-3",
  "nitrogen-sulfur",
  "transition-elements",
]);
const physicalOverviewTags = new Set(["buffers", "electrochemistry", "redox"]);
const practicalOverviewTags = new Set(["practical", "qualitative-tests"]);

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function getResolvedBaseUrl(sitePrefix = "./") {
  return new URL(sitePrefix, window.location.href);
}

function getExplicitTheme() {
  return window.StudentSiteTheme?.getExplicitTheme?.() || "";
}

function preserveExplicitTheme(destination) {
  const explicitTheme = getExplicitTheme();

  if (window.StudentSiteTheme?.isThemeValue?.(explicitTheme)) {
    destination.searchParams.set(window.StudentSiteTheme.themeQueryKey, explicitTheme);
  }

  return destination;
}

export function buildSiteHref(relativePath, sitePrefix = "./") {
  const normalizedPath = String(relativePath || "").trim();

  if (!normalizedPath) {
    return "#";
  }

  const destination = new URL(normalizedPath, getResolvedBaseUrl(sitePrefix));
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export function buildSitePageHref(relativePath, sitePrefix = "./") {
  const normalizedPath = String(relativePath || "").trim();

  if (!normalizedPath) {
    return "#";
  }

  const destination = new URL(normalizedPath, getResolvedBaseUrl(sitePrefix));
  preserveExplicitTheme(destination);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export function buildDocumentLinkHref(linkPath, { sitePrefix = "./", returnSearch = "" } = {}) {
  const normalizedLinkPath = typeof linkPath === "string" ? linkPath.trim() : "";

  if (!normalizedLinkPath) {
    return "#";
  }

  try {
    const destination = new URL(normalizedLinkPath, getResolvedBaseUrl(sitePrefix));

    if (!isDocumentViewerPath(destination.pathname)) {
      return `${destination.pathname}${destination.search}${destination.hash}`;
    }

    if (returnSearch) {
      destination.searchParams.set("from", returnSearch);
    } else {
      destination.searchParams.delete("from");
    }

    preserveExplicitTheme(destination);
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return encodeURI(normalizedLinkPath);
  }
}

export function buildLibraryHref(
  { stage = "", part = "", tags = [] } = {},
  { sitePrefix = "./", hashId = "library-panel" } = {},
) {
  const destination = new URL("index.html", getResolvedBaseUrl(sitePrefix));
  const normalizedTags = [
    ...new Set((Array.isArray(tags) ? tags : [tags]).map(normalizeUiTag).filter(Boolean)),
  ].sort(sortTagValues);

  if (stage) {
    destination.searchParams.set(filterQueryKeys.stage, stage);
  } else {
    destination.searchParams.delete(filterQueryKeys.stage);
  }

  if (part) {
    destination.searchParams.set(filterQueryKeys.part, part);
  } else {
    destination.searchParams.delete(filterQueryKeys.part);
  }

  if (normalizedTags.length > 0) {
    destination.searchParams.set(filterQueryKeys.tags, normalizedTags.join(","));
  } else {
    destination.searchParams.delete(filterQueryKeys.tags);
  }

  destination.hash = hashId ? `#${hashId}` : "";
  preserveExplicitTheme(destination);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export function isDocumentViewerPath(pathname) {
  const normalizedPath = String(pathname || "");
  return normalizedPath.endsWith("/document.html") || normalizedPath.endsWith("document.html");
}

export function normalizeTagSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^\w+\s-]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeUiTag(value) {
  const normalizedValue = normalizeTagSlug(value);

  if (!normalizedValue) {
    return "";
  }

  const canonicalValue = uiTagAliasMap[normalizedValue] || normalizedValue;

  if (structuralUiTags.has(canonicalValue)) {
    return "";
  }

  return canonicalValue;
}

function getNormalizedResourceTags(resource) {
  return [
    ...new Set(
      (Array.isArray(resource?.tags) ? resource.tags : []).map(normalizeTagSlug).filter(Boolean),
    ),
  ];
}

export function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w+\s-]/g, " ")
    .replace(/\s+/g, " ");
}

export function getReadableLabel(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue
    .split(/[\s-]+/)
    .map((word) => {
      if (word.toLowerCase() === "ai") {
        return "AI";
      }

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

export function getTagDisplayLabel(tag) {
  const normalizedTag = normalizeUiTag(tag);

  if (!normalizedTag) {
    return "";
  }

  if (tagDisplayLabelMap[normalizedTag]) {
    return tagDisplayLabelMap[normalizedTag];
  }

  return normalizedTag
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function getSourceKindLabel(sourceKind) {
  const normalizedSourceKind = normalizeTagSlug(sourceKind);

  if (sourceKindLabelMap[normalizedSourceKind]) {
    return sourceKindLabelMap[normalizedSourceKind];
  }

  return getReadableLabel(sourceKind || "Unknown source");
}

export function getContentFormatLabel(contentFormat) {
  switch (contentFormat) {
    case "html":
      return "Integrated HTML";
    case "markdown":
      return "Integrated Markdown";
    case "pdf":
      return "PDF";
    default:
      return "Document";
  }
}

export function getDocumentUiTags(documentItem) {
  const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];
  return [...new Set(tags.map(normalizeUiTag).filter(Boolean))].sort(sortTagValues);
}

export function getDocumentDisplayTitle(documentItem, { short = false } = {}) {
  if (short && documentItem?.short_title) {
    return String(documentItem.short_title).trim();
  }

  if (documentItem?.display_title) {
    return String(documentItem.display_title).trim();
  }

  return String(documentItem?.title || "Untitled document").trim() || "Untitled document";
}

export function getOverviewTypeLabel(resource) {
  const normalizedTags = new Set(getNormalizedResourceTags(resource));
  const overviewText = [
    resource?.title,
    resource?.display_title,
    resource?.kicker,
    resource?.description,
  ]
    .join(" ")
    .toLowerCase();

  if (overviewText.includes("equation bank") || resource?.topic === "equation-bank") {
    return "Equation";
  }

  if (normalizedTags.has("mechanisms") || overviewText.includes("mechanism")) {
    return "Mechanism";
  }

  if (
    resource?.kind === "interactive" ||
    normalizedTags.has("past-paper") ||
    overviewText.includes("practice") ||
    overviewText.includes("trainer")
  ) {
    return "Practice";
  }

  if (overviewText.includes("comparison")) {
    return "Comparison";
  }

  if (
    normalizedTags.has("practical") ||
    normalizedTags.has("qualitative-tests") ||
    overviewText.includes("experiment")
  ) {
    return "Experiment";
  }

  return "Explanation";
}

export function getOverviewTopicLabel(resource) {
  const normalizedTags = new Set(getNormalizedResourceTags(resource));
  const overviewText = [resource?.title, resource?.display_title, resource?.description]
    .join(" ")
    .toLowerCase();
  const partText = String(resource?.part || "").toLowerCase();

  if (
    normalizedTags.has("memorisation") ||
    normalizedTags.has("revision") ||
    overviewText.includes("memorisation")
  ) {
    return "Revision";
  }

  if (
    [...practicalOverviewTags].some((tag) => normalizedTags.has(tag)) ||
    overviewText.includes("practical")
  ) {
    return "Practical";
  }

  if (
    [...analyticalOverviewTags].some((tag) => normalizedTags.has(tag)) ||
    partText.includes("analysis") ||
    overviewText.includes("spectroscopy")
  ) {
    return "Analytical";
  }

  if (
    partText.includes("physical") ||
    [...physicalOverviewTags].some((tag) => normalizedTags.has(tag))
  ) {
    return "Physical";
  }

  if (
    partText.includes("inorganic") ||
    [...inorganicOverviewTags].some((tag) => normalizedTags.has(tag))
  ) {
    return "Inorganic";
  }

  return "Organic";
}

export function getOverviewStageValue(stage) {
  const normalizedStage = String(stage || "")
    .trim()
    .toUpperCase();

  if (normalizedStage === "AS" || normalizedStage === "A2") {
    return normalizedStage;
  }

  return "All";
}

export function matchesOverviewFilters(item, filters = {}) {
  const matchesType = !filters.type || item.typeLabel === filters.type;
  const matchesTopic = !filters.topic || item.topicLabel === filters.topic;
  const matchesStage =
    !filters.stage || item.stageValue === filters.stage || item.stageValue === "All";

  return matchesType && matchesTopic && matchesStage;
}

export function filterOverviewItems(items, filters = {}) {
  return (Array.isArray(items) ? items : []).filter((item) =>
    matchesOverviewFilters(item, filters),
  );
}

function countOverviewItems(items, filters, key, value) {
  const nextFilters = {
    type: filters.type || "",
    topic: filters.topic || "",
    stage: filters.stage || "",
  };

  nextFilters[key] = value;

  if (!value) {
    nextFilters[key] = "";
  }

  return filterOverviewItems(items, nextFilters).length;
}

function createOverviewFilterOption(items, filters, key, label) {
  const value = label === "All" ? "" : label;
  const active = value ? filters[key] === value : !filters[key];
  const count = countOverviewItems(items, filters, key, value);

  return {
    value,
    label,
    count,
    active,
    disabled: count === 0 && !active,
  };
}

export function buildOverviewFilterGroups(items, filters = {}, { includeStage = false } = {}) {
  const groups = [
    {
      key: "type",
      label: "Filter by type",
      options: ["All", ...overviewTypeOptions].map((label) =>
        createOverviewFilterOption(items, filters, "type", label),
      ),
    },
    {
      key: "topic",
      label: "Filter by topic",
      options: ["All", ...overviewTopicOptions].map((label) =>
        createOverviewFilterOption(items, filters, "topic", label),
      ),
    },
  ];

  if (includeStage) {
    groups.push({
      key: "stage",
      label: "Filter by stage",
      options: ["All", "AS", "A2"].map((label) =>
        createOverviewFilterOption(items, filters, "stage", label),
      ),
    });
  }

  return groups;
}

export function getDistinctValues(items, key) {
  return [
    ...new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => String(item?.[key] || "").trim())
        .filter(Boolean),
    ),
  ].sort(sortText);
}

export function sortText(left, right) {
  return textCollator.compare(left, right);
}

export function sortTagValues(left, right) {
  return sortText(getTagDisplayLabel(left), getTagDisplayLabel(right));
}

export function resourceOrDefault(value, fallback) {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || fallback;
}

export function truncateText(value, maxLength) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue || normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue
    .slice(0, maxLength)
    .trimEnd()
    .replace(/[.,;:!?-]+$/, "")}…`;
}

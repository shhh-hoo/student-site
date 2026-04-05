export const filterQueryKeys = {
  stage: "stage",
  part: "part",
  tags: "tags",
};

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
  "halogenoalkanes": "Halogenoalkanes",
  "halogenoarenes": "Halogenoarenes",
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

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function getResolvedBaseUrl(sitePrefix = "./") {
  return new URL(sitePrefix, window.location.href);
}

export function buildSiteHref(relativePath, sitePrefix = "./") {
  const normalizedPath = String(relativePath || "").trim();

  if (!normalizedPath) {
    return "#";
  }

  const destination = new URL(normalizedPath, getResolvedBaseUrl(sitePrefix));
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
  const normalizedTags = [...new Set(
    (Array.isArray(tags) ? tags : [tags])
      .map(normalizeUiTag)
      .filter(Boolean),
  )].sort(sortTagValues);

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

export function getDistinctValues(items, key) {
  return [...new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => String(item?.[key] || "").trim())
      .filter(Boolean),
  )].sort(sortText);
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

  return `${normalizedValue.slice(0, maxLength).trimEnd().replace(/[.,;:!?-]+$/, "")}…`;
}

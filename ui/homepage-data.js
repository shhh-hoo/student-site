const manualInteractiveEntries = [
  {
    href: "./interactive/ir-past-paper-trainer/",
    metaPath: "./interactive/ir-past-paper-trainer/meta.json",
  },
];

const featuredDocumentLimit = 3;
const routeToneSequence = ["teal", "gold", "ink"];
const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export async function loadInteractiveResources() {
  const resources = await Promise.all(
    manualInteractiveEntries.map(async (entry) => {
      try {
        const response = await fetch(entry.metaPath, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Interactive meta request failed with status ${response.status}.`);
        }

        const meta = await response.json();
        return {
          ...meta,
          href: entry.href,
          kind: "interactive",
        };
      } catch (error) {
        console.warn("Could not load interactive entry.", error);
        return null;
      }
    }),
  );

  return resources.filter(Boolean);
}

export function createDocumentResourceModel(documentItem, helpers, overrides = {}) {
  const uiTags = helpers.getDocumentUiTags(documentItem);
  const tagLimit = overrides.tagLimit ?? 4;
  const linkPath = documentItem.view_path || documentItem.public_file_path;
  const defaultChips = [
    documentItem.stage,
    documentItem.part,
    helpers.getContentFormatLabel(documentItem.content_format),
  ].filter(Boolean);
  const defaultTags = uiTags.slice(0, tagLimit).map((tag) => helpers.getTagDisplayLabel(tag));
  const defaultMetaLine = [
    helpers.getSourceKindLabel(documentItem.source_kind),
    helpers.getContentFormatLabel(documentItem.content_format),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    kind: "document",
    eyebrow: overrides.eyebrow || "Synced document",
    title: documentItem.title || "Untitled document",
    description: overrides.description || documentItem.description || "No description provided.",
    href: helpers.buildDocumentLinkHref(linkPath),
    ctaLabel: overrides.ctaLabel || "Open document",
    status: overrides.status || helpers.getReadableLabel(documentItem.status || "ready"),
    chips: Array.isArray(overrides.chips) ? overrides.chips.filter(Boolean) : defaultChips,
    tags: Array.isArray(overrides.tags) ? overrides.tags.filter(Boolean) : defaultTags,
    note: overrides.note || "",
    metaLine: overrides.metaLine ?? defaultMetaLine,
  };
}

export function createInteractiveResourceModel(resource, helpers, overrides = {}) {
  const tags = Array.isArray(resource.tags) ? resource.tags : [];
  const defaultChips = [resource.stage, resource.part, "Manual code entry"].filter(Boolean);
  const defaultTags = tags.slice(0, overrides.tagLimit ?? 4).map((tag) => helpers.getTagDisplayLabel(tag));
  const defaultMetaLine = [
    helpers.getSourceKindLabel(resource.source_kind),
    resource.content_format ? helpers.getContentFormatLabel(resource.content_format) : "Interactive",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    kind: "interactive",
    eyebrow: overrides.eyebrow || "Standalone interactive",
    title: resource.title || "Interactive practice",
    description: overrides.description || resource.description || "A manually integrated interactive resource.",
    href: resource.href,
    ctaLabel: overrides.ctaLabel || "Open interactive",
    status: overrides.status || helpers.getReadableLabel(resource.status || "ready"),
    chips: Array.isArray(overrides.chips) ? overrides.chips.filter(Boolean) : defaultChips,
    tags: Array.isArray(overrides.tags) ? overrides.tags.filter(Boolean) : defaultTags,
    note: overrides.note || "Separate route by design: code-based tools stay outside the document sync flow.",
    metaLine: overrides.metaLine ?? defaultMetaLine,
  };
}

export function buildHomepageViewModel(documents, interactiveResources, helpers) {
  const documentItems = Array.isArray(documents)
    ? documents.filter((item) => item.type === "document")
    : [];
  const distinctStages = getDistinctValues(documentItems, "stage");
  const distinctParts = getDistinctValues(documentItems, "part");
  const indexDocument = findIndexDocument(documentItems);
  const quickTags = getPopularTags(documentItems, helpers).slice(0, 4);
  const featuredResources = getFeaturedDocuments(documentItems, helpers);
  const interactiveResource = interactiveResources[0] || null;
  const routeCards = getRouteCards(documentItems, helpers);
  const searchIndex = buildSearchIndex({
    distinctParts,
    distinctStages,
    featuredResources,
    interactiveResource,
    quickTags,
    routeCards,
    helpers,
  });

  return {
    header: {
      eyebrow: "Student Site",
      title: "Chemistry Resource Bank",
      navLinks: [
        { href: "#study-routes", label: "Routes" },
        { href: "#featured-resources", label: "Featured" },
        { href: "#interactive-lab", label: "Interactive" },
        { href: "#library-panel", label: "Library" },
      ],
      quickAction: indexDocument
        ? {
            href: helpers.buildDocumentLinkHref(indexDocument.view_path || indexDocument.public_file_path),
            label: "Open index document",
          }
        : {
            href: "#library-panel",
            label: "Browse library",
          },
    },
    hero: {
      kicker: "Branded homepage",
      pill: "CAIE Chemistry 9701",
      title: "Start from the synced library, then jump into sharper chemistry practice.",
      copy:
        "The homepage is louder and more editorial, but the workflow underneath is still the same: synced documents keep the shared viewer route, while code-based tools stay visibly separate.",
      actions: [
        { href: "#library-panel", label: "Browse synced documents", variant: "primary" },
        {
          href: interactiveResource ? interactiveResource.href : "#study-routes",
          label: interactiveResource ? "Launch interactive" : "See study routes",
          variant: interactiveResource ? "interactive" : "secondary",
        },
      ],
      search: {
        label: "Quick search",
        placeholder: "Try AS organic, IR spectroscopy, or a document title",
        submitLabel: "Open match",
        browseHref: "#library-panel",
        browseLabel: "Browse library",
        helper:
          "Search by stage, topic, interactive title, or a specific document title.",
        quickLinks: quickTags.map((tag) => ({
          href: helpers.buildLibraryHref({ tags: [tag.slug] }, "library-panel"),
          label: tag.label,
        })),
        suggestions: searchIndex.map((item) => ({
          value: item.value,
          hint: item.hint,
        })),
      },
      panelKicker: "What is live now",
      stats: [
        {
          value: `${documentItems.length}`,
          label: `synced document${documentItems.length === 1 ? "" : "s"}`,
        },
        {
          value: `${distinctStages.length}`,
          label: `stage${distinctStages.length === 1 ? "" : "s"} represented`,
        },
        {
          value: `${interactiveResource ? 1 : 0}`,
          label: "manual interactive entry",
        },
      ],
      workflow: [
        {
          label: "Documents",
          title: "Shared viewer path stays intact",
          copy: "Featured cards and library links still point to the existing document viewer route.",
        },
        {
          label: "Interactive",
          title: "Code assets remain isolated on purpose",
          copy: "Interactive entries are manually linked from `student-site` instead of being pulled through the document sync flow.",
        },
      ],
    },
    routesSection: {
      kicker: "Study routes",
      title: "Pick a route without changing the library flow",
      copy:
        "A quieter set of entry cards that still resolves into the current Stage and Part filters.",
      cards: routeCards,
    },
    featuredSection: {
      kicker: "Featured documents",
      title: "Top picks from the synced document set",
      copy: "A tighter editorial cut from the current synced metadata.",
      action: {
        href: "#library-panel",
        label: "Browse all",
        variant: "secondary",
      },
      footerNote: {
        label: "Shared viewer path",
        title: "Same viewer route underneath.",
        copy: "Featured entries still open through the current viewer and return-to-library flow.",
      },
      resources: featuredResources,
    },
    interactiveSection: {
      kicker: "Interactive practice",
      title: "Give standalone drills a separate branded entry",
      copy:
        "Documents still open through the shared viewer. Interactives keep isolated routes so code-heavy practice stays out of the sync pipeline.",
      badge: "Separate code route",
      resource: interactiveResource
        ? createInteractiveResourceModel(interactiveResource, helpers, {
            eyebrow: "Isolated interactive route",
            ctaLabel: "Open trainer",
            description: truncateText(
              resourceOrDefault(
                interactiveResource.description,
                "A focused standalone practice route that stays outside the synced document flow.",
              ),
              92,
            ),
            chips: [interactiveResource.stage, "Manual route"].filter(Boolean),
            tagLimit: 2,
            metaLine: "Manual code route",
          })
        : null,
      noteCard: interactiveResource
        ? {
            label: "Why it is distinct",
            title: "The homepage can spotlight interactivity without pretending it is a document.",
            copy: "The trainer stays prominent without blurring the document sync rules.",
          }
        : null,
      supportNotes: interactiveResource
        ? [
            {
              label: "Route rule",
              title: "Code stays out of sync",
              copy: "The trainer remains manually linked from `student-site`, not pulled through the document sync flow.",
            },
          ]
        : [],
    },
    searchIndex,
  };
}

function getRouteCards(documents, helpers) {
  const groups = groupDocumentsByStageAndPart(documents).sort(compareRouteGroups);
  return groups.slice(0, 3).map((group, index) => {
    const topTags = getPopularTags(group.documents, helpers)
      .slice(0, 3)
      .map((tag) => tag.label);

    return {
      kind: "document",
      tone: routeToneSequence[index % routeToneSequence.length],
      eyebrow: "Document route",
      title: formatRouteTitle(group.stage, group.part),
      countLabel: `${group.documents.length} doc${group.documents.length === 1 ? "" : "s"}`,
      description: createRouteDescription(group.documents, helpers),
      href: helpers.buildLibraryHref(
        {
          stage: group.stage,
          part: group.part,
        },
        "library-panel",
      ),
      ctaLabel: "Browse route",
      chips: [group.stage].filter(Boolean),
      supportingTags: topTags.slice(0, 2),
    };
  });
}

function getFeaturedDocuments(documents, helpers) {
  const selectedDocuments = [];
  const buckets = [
    (documentItem) => isIndexDocument(documentItem),
    (documentItem) => documentItem.stage === "AS",
    (documentItem) => documentItem.stage === "A2",
    (documentItem) =>
      ["Inorganic chemistry", "Physical chemistry"].includes(documentItem.part || ""),
  ];

  buckets.forEach((matcher) => {
    const candidate = documents
      .filter((documentItem) => !selectedDocuments.includes(documentItem) && matcher(documentItem))
      .sort((left, right) => compareFeaturedDocuments(left, right, helpers))[0];

    if (candidate) {
      selectedDocuments.push(candidate);
    }
  });

  documents
    .filter((documentItem) => !selectedDocuments.includes(documentItem))
    .sort((left, right) => compareFeaturedDocuments(left, right, helpers))
    .forEach((documentItem) => {
      if (selectedDocuments.length < Math.min(featuredDocumentLimit, documents.length)) {
        selectedDocuments.push(documentItem);
      }
    });

  return selectedDocuments.slice(0, featuredDocumentLimit).map((documentItem, index) =>
    createDocumentResourceModel(documentItem, helpers, {
      eyebrow: index === 0 ? "Lead document" : "Featured document",
      description: createFeaturedDocumentDescription(documentItem, index),
      ctaLabel: index === 0 ? "Open document" : "Open",
      status: index === 0 ? helpers.getReadableLabel(documentItem.status || "ready") : "",
      chips: [documentItem.stage, documentItem.part].filter(Boolean).slice(0, index === 0 ? 2 : 1),
      tagLimit: index === 0 ? 2 : 0,
      metaLine: index === 0 ? helpers.getContentFormatLabel(documentItem.content_format) : "",
      note: index === 0 ? getFeaturedDocumentNote(documentItem, index) : "",
    }),
  );
}

function buildSearchIndex({
  routeCards,
  featuredResources,
  interactiveResource,
  quickTags,
  distinctStages,
  distinctParts,
  helpers,
}) {
  const entries = [];

  routeCards.forEach((routeCard) => {
    pushSearchEntry(entries, {
      value: routeCard.title,
      hint: routeCard.eyebrow,
      href: routeCard.href,
      aliases: [...(routeCard.chips || []), ...(routeCard.supportingTags || [])],
    });
  });

  featuredResources.forEach((resource) => {
    pushSearchEntry(entries, {
      value: resource.title,
      hint: resource.eyebrow,
      href: resource.href,
      aliases: [...(resource.tags || []), ...(resource.chips || [])],
    });
  });

  if (interactiveResource) {
    pushSearchEntry(entries, {
      value: interactiveResource.title || "Interactive practice",
      hint: "Interactive",
      href: interactiveResource.href,
      aliases: [...(interactiveResource.tags || []), interactiveResource.part, interactiveResource.stage],
    });
  }

  quickTags.forEach((tag) => {
    pushSearchEntry(entries, {
      value: tag.label,
      hint: "Topic",
      href: helpers.buildLibraryHref({ tags: [tag.slug] }, "library-panel"),
      aliases: [tag.slug],
    });
  });

  distinctStages.forEach((stage) => {
    pushSearchEntry(entries, {
      value: stage,
      hint: "Stage",
      href: helpers.buildLibraryHref({ stage }, "library-panel"),
      aliases: [],
    });
  });

  distinctParts.forEach((part) => {
    pushSearchEntry(entries, {
      value: part,
      hint: "Part",
      href: helpers.buildLibraryHref({ part }, "library-panel"),
      aliases: [],
    });
  });

  return entries.slice(0, 18);
}

function pushSearchEntry(entries, entry) {
  const tokens = [entry.value]
    .concat(Array.isArray(entry.aliases) ? entry.aliases : [])
    .map(normalizeSearchText)
    .filter(Boolean);

  if (tokens.length === 0) {
    return;
  }

  const duplicateEntry = entries.find((existingEntry) => existingEntry.tokens[0] === tokens[0]);

  if (duplicateEntry) {
    duplicateEntry.tokens = [...new Set(duplicateEntry.tokens.concat(tokens))];
    return;
  }

  entries.push({
    ...entry,
    tokens,
  });
}

function groupDocumentsByStageAndPart(documents) {
  const groupMap = new Map();

  documents.forEach((documentItem) => {
    const stage = String(documentItem.stage || "").trim();
    const part = String(documentItem.part || "").trim();
    const key = `${stage}::${part}`;

    if (!stage || !part) {
      return;
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        stage,
        part,
        documents: [],
      });
    }

    groupMap.get(key).documents.push(documentItem);
  });

  return [...groupMap.values()];
}

function compareRouteGroups(left, right) {
  const countDelta = right.documents.length - left.documents.length;

  if (countDelta !== 0) {
    return countDelta;
  }

  return textCollator.compare(formatRouteTitle(left.stage, left.part), formatRouteTitle(right.stage, right.part));
}

function compareFeaturedDocuments(left, right, helpers) {
  return scoreDocument(right, helpers) - scoreDocument(left, helpers);
}

function scoreDocument(documentItem, helpers) {
  const tagCount = helpers.getDocumentUiTags(documentItem).length;
  const syllabusRefs = Array.isArray(documentItem.syllabus_refs) ? documentItem.syllabus_refs.length : 0;
  const partBonus =
    documentItem.part === "Physical chemistry" || documentItem.part === "Inorganic chemistry"
      ? 6
      : 0;
  const indexBonus = isIndexDocument(documentItem) ? 8 : 0;

  return tagCount * 4 + syllabusRefs * 2 + partBonus + indexBonus;
}

function createRouteDescription(documents, helpers) {
  const tagLabels = getPopularTags(documents, helpers)
    .slice(0, 2)
    .map((tag) => tag.label);

  if (tagLabels.length === 0) {
    return `${documents.length} synced document${documents.length === 1 ? "" : "s"} on the current viewer route.`;
  }

  return `Focus on ${joinLabels(tagLabels)}.`;
}

function createFeaturedDocumentDescription(documentItem, index) {
  const fallbackDescription = resourceOrDefault(documentItem.description, "No description provided.");

  return truncateText(fallbackDescription, index === 0 ? 112 : 60);
}

function getFeaturedDocumentNote(documentItem, index = 0) {
  if (index > 0) {
    return "";
  }

  if (isIndexDocument(documentItem)) {
    return "Best first stop for the wider equation-bank set.";
  }

  if (documentItem.stage === "AS") {
    return "Strong starting point for AS-focused revision.";
  }

  if (documentItem.stage === "A2") {
    return "Useful when revision shifts into A2-heavy content.";
  }

  if (documentItem.part) {
    return `${documentItem.part} represented from the current synced metadata.`;
  }

  return "Pulled from the existing student-site data layer.";
}

function resourceOrDefault(value, fallback) {
  const normalizedValue = String(value || "").trim();

  return normalizedValue || fallback;
}

function truncateText(value, maxLength) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue || normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength).trimEnd().replace(/[.,;:!?-]+$/, "")}…`;
}

function getPopularTags(documents, helpers) {
  const tagCounts = new Map();

  documents.forEach((documentItem) => {
    helpers.getDocumentUiTags(documentItem).forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  return [...tagCounts.entries()]
    .map(([slug, count]) => ({
      slug,
      count,
      label: helpers.getTagDisplayLabel(slug),
    }))
    .sort((left, right) => right.count - left.count || textCollator.compare(left.label, right.label));
}

function getDistinctValues(items, key) {
  return [...new Set(
    items
      .map((item) => String(item[key] || "").trim())
      .filter(Boolean),
  )].sort((left, right) => textCollator.compare(left, right));
}

function findIndexDocument(documents) {
  return documents.find((documentItem) => isIndexDocument(documentItem)) || null;
}

function isIndexDocument(documentItem) {
  const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];

  return documentItem.topic === "equation-bank" || tags.includes("index");
}

function formatRouteTitle(stage, part) {
  const compactPartLabel = String(part || "")
    .replace(/\s+chemistry$/i, "")
    .trim();

  return [stage, compactPartLabel].filter(Boolean).join(" ");
}

function joinLabels(labels) {
  if (labels.length <= 1) {
    return labels[0] || "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w+\s-]/g, " ")
    .replace(/\s+/g, " ");
}

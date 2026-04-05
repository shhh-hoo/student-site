import {
  createDocumentResourceModel,
  createInteractiveResourceModel,
  loadCurationBundle,
  loadInteractiveResources,
} from "./site-data.js";
import {
  normalizeSearchText,
  resourceOrDefault,
  truncateText,
} from "./site-helpers.js";

const featuredDocumentLimit = 5;
const entryToneSequence = ["teal", "gold", "rust"];

export {
  createDocumentResourceModel,
  loadCurationBundle,
  loadInteractiveResources,
};

export function buildHomepageViewModel(documents, interactiveResources, curationBundle, helpers) {
  const documentItems = Array.isArray(documents)
    ? documents.filter((item) => item.type === "document")
    : [];
  const homepageCuration = curationBundle?.homepage || {};
  const interactiveCuration = curationBundle?.interactive || {};
  const documentMap = createDocumentMap(documentItems);
  const indexDocument = findIndexDocument(documentItems);
  const interactiveResource = interactiveResources[0] || null;
  const entryCards = getHomepageEntryCards(homepageCuration, interactiveResource, helpers);
  const featuredResources = getHomepageFeaturedResources(
    homepageCuration,
    documentMap,
    helpers,
  );
  const quickTags = getQuickSearchTags(homepageCuration, helpers);
  const searchIndex = buildSearchIndex({
    entryCards,
    featuredResources,
    interactiveResource,
    quickTags,
    helpers,
  });

  return {
    header: {
      eyebrow: "Student Site",
      title: "Chemistry Resource Bank",
      homeHref: helpers.buildSiteHref("index.html"),
      navLinks: [
        { href: helpers.buildSiteHref("as/"), label: "AS" },
        { href: helpers.buildSiteHref("a2/"), label: "A2" },
        { href: helpers.buildSiteHref("interactive/ir-past-paper-trainer/"), label: "Interactive" },
        { href: "#library-panel", label: "Library" },
      ],
      quickAction: indexDocument
        ? {
            href: helpers.buildDocumentLinkHref(indexDocument.view_path || indexDocument.public_file_path),
            label: "Open overview",
          }
        : {
            href: "#library-panel",
            label: "Browse library",
          },
    },
    hero: {
      kicker: "Start here",
      pill: "CAIE Chemistry 9701",
      title: resourceOrDefault(
        homepageCuration?.hero?.title,
        "Choose AS or A2, then move through one chemistry library.",
      ),
      copy: resourceOrDefault(
        homepageCuration?.hero?.subtitle,
        "Start with the stage you need, then use interactive practice when you want quick drills.",
      ),
      actions: [
        {
          href: toSiteHref(homepageCuration?.hero?.primary_cta?.href, helpers, "as/"),
          label: resourceOrDefault(homepageCuration?.hero?.primary_cta?.label, "Explore AS"),
          variant: "primary",
        },
        {
          href: toSiteHref(homepageCuration?.hero?.secondary_cta?.href, helpers, "a2/"),
          label: resourceOrDefault(homepageCuration?.hero?.secondary_cta?.label, "Explore A2"),
          variant: "secondary",
        },
      ],
      search: {
        label: "Quick search",
        placeholder: "Try AS Chemistry, electrochemistry, or IR trainer",
        submitLabel: "Open match",
        browseHref: "#library-panel",
        browseLabel: "Browse library",
        helper:
          "Search by stage, topic, interactive tool, or document title.",
        quickLinks: quickTags,
        suggestions: searchIndex.map((item) => ({
          value: item.value,
          hint: item.hint,
        })),
      },
      panelKicker: "At a glance",
      stats: [
        {
          value: `${documentItems.length}`,
          label: `document${documentItems.length === 1 ? "" : "s"} ready`,
        },
        {
          value: "2",
          label: "stage pages",
        },
        {
          value: `${interactiveResource ? 1 : 0}`,
          label: `interactive tool${interactiveResource ? "" : "s"}`,
        },
      ],
      workflow: [
        {
          label: "AS / A2",
          title: "Choose the stage you need first",
          copy: "Each stage page pulls together good starting documents and guided routes.",
        },
        {
          label: "Documents",
          title: "Go deeper once you know where to start",
          copy: "Featured picks and library results all open in the main document view.",
        },
      ],
    },
    routesSection: {
      kicker: "Choose your path",
      title: "Choose AS, A2, or interactive practice",
      copy:
        "Pick the kind of start you need, then go deeper from there.",
      cards: entryCards,
    },
    featuredSection: {
      kicker: "Featured documents",
      title: "Start with a few high-value documents",
      copy: "A short featured set chosen as strong starting points for revision.",
      action: {
        href: "#library-panel",
        label: "Browse all",
        variant: "secondary",
      },
      footerNote: {
        label: "How to begin",
        title: "Pick one and begin",
        copy: "Each featured document is chosen as a strong first step for revision.",
      },
      resources: featuredResources,
    },
    interactiveSection: buildInteractiveSection(
      interactiveResource,
      interactiveCuration,
      helpers,
    ),
    searchIndex,
  };
}

function buildInteractiveSection(interactiveResource, interactiveCuration, helpers) {
  const spotlight = interactiveCuration?.spotlight || {};

  return {
    kicker: "Interactive practice",
    title: "Use interactive practice for quick drills",
    copy:
      "Open quick drills and tools when you want short practice, then return to notes for fuller explanations.",
    badge: "Quick drills",
    resource: interactiveResource
      ? createInteractiveResourceModel(interactiveResource, helpers, {
          eyebrow: resourceOrDefault(spotlight.kicker, "Interactive practice"),
          title: resourceOrDefault(spotlight.title, interactiveResource.title),
          href: toSiteHref(spotlight?.cta?.href, helpers, interactiveResource.href),
          ctaLabel: resourceOrDefault(spotlight?.cta?.label, "Open trainer"),
          description: truncateText(
            resourceOrDefault(
              spotlight.summary,
              interactiveResource.description,
            ),
            116,
          ),
          chips: [interactiveResource.stage, "Interactive tool"].filter(Boolean),
          tagLimit: 2,
          metaLine: "Interactive tool",
        })
      : null,
    noteCard: interactiveResource
      ? {
          label: "When to use it",
          title: "Use this for short IR practice",
          copy: resourceOrDefault(
            spotlight.why_distinct,
            "Use the trainer for quick practice, then return to notes when you want the fuller explanation.",
          ),
        }
      : null,
    supportNotes: interactiveResource
      ? [
          {
            label: "What it covers",
            title: "Peaks, structure choice, and elimination",
            copy: "Good for short practice rounds before you go back to longer notes.",
          },
        ]
      : [],
  };
}

function getHomepageEntryCards(homepageCuration, interactiveResource, helpers) {
  const entryCards = Array.isArray(homepageCuration?.entry_cards)
    ? homepageCuration.entry_cards
    : [];

  return entryCards.map((card, index) => ({
    kind: card.kind === "interactive" ? "interactive" : "document",
    tone: entryToneSequence[index % entryToneSequence.length],
    eyebrow: resourceOrDefault(card.kicker, card.kind === "interactive" ? "Interactive" : "Stage page"),
      title: resourceOrDefault(card.title, "Entry page"),
      countLabel: resourceOrDefault(card.count_label, ""),
    description: resourceOrDefault(
      card.description,
      card.kind === "interactive"
        ? "Open the interactive practice page."
        : "Open the stage page.",
    ),
      href: normalizeEntryHref(card.href, card.kind, interactiveResource, helpers),
    ctaLabel: resourceOrDefault(
      card.cta_label,
      card.kind === "interactive" ? "Open interactive" : "Open page",
    ),
    ctaVariant: card.kind === "interactive" ? "interactive" : "primary",
    chips: Array.isArray(card.chips) ? card.chips.filter(Boolean) : [],
    supportingTags: Array.isArray(card.supporting_tags)
      ? card.supporting_tags.filter(Boolean)
      : [],
  }));
}

function normalizeEntryHref(href, kind, interactiveResource, helpers) {
  if (kind === "interactive" && interactiveResource?.href) {
    return interactiveResource.href;
  }

  return href ? helpers.buildSiteHref(href) : "#";
}

function getHomepageFeaturedResources(homepageCuration, documentMap, helpers) {
  const curatedIds = [
    ...(Array.isArray(homepageCuration?.spotlight_documents)
      ? homepageCuration.spotlight_documents
      : []),
    ...(Array.isArray(homepageCuration?.featured_documents)
      ? homepageCuration.featured_documents
      : []),
  ];
  const selectedDocuments = [...new Set(curatedIds)]
    .map((documentId) => documentMap.get(documentId))
    .filter(Boolean)
    .slice(0, featuredDocumentLimit);

  return selectedDocuments.map((documentItem, index) =>
    createDocumentResourceModel(documentItem, helpers, {
      eyebrow: index === 0 ? "Start here" : documentItem.kicker || "Featured document",
      description: truncateText(
        resourceOrDefault(documentItem.description, "No description provided."),
        index === 0 ? 120 : 72,
      ),
      ctaLabel: index === 0 ? "Open document" : "Open",
      status: index === 0 ? helpers.getReadableLabel(documentItem.status || "ready") : "",
      chips: [documentItem.stage, documentItem.part].filter(Boolean).slice(0, index === 0 ? 2 : 1),
      tagLimit: index === 0 ? 2 : 0,
      metaLine: index === 0 ? helpers.getContentFormatLabel(documentItem.content_format) : "",
      note: index === 0 ? getFeaturedDocumentNote(documentItem) : "",
      useShortTitle: index > 0,
    }),
  );
}

function getFeaturedDocumentNote(documentItem) {
  if (documentItem.topic === "equation-bank" || Array.isArray(documentItem.tags) && documentItem.tags.includes("index")) {
    return "Good first reading if you want the full equation-bank overview.";
  }

  if (documentItem.stage === "AS") {
    return "A good first document if you are working through AS.";
  }

  if (documentItem.stage === "A2") {
    return "A good first document if you are working through A2.";
  }

  return "A strong place to begin.";
}

function getQuickSearchTags(homepageCuration, helpers) {
  const topics = Array.isArray(homepageCuration?.quick_search_topics)
    ? homepageCuration.quick_search_topics
    : [];

  return topics.map((topic) => ({
    href: helpers.buildLibraryHref({ tags: [topic] }, "library-panel"),
    label: helpers.getTagDisplayLabel(topic),
  }));
}

function buildSearchIndex({
  entryCards,
  featuredResources,
  interactiveResource,
  quickTags,
  helpers,
}) {
  const entries = [];

  entryCards.forEach((card) => {
    pushSearchEntry(entries, {
      value: card.title,
      hint: card.eyebrow,
      href: card.href,
      aliases: [...(card.chips || []), ...(card.supportingTags || [])],
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
      href: tag.href,
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

function findIndexDocument(documents) {
  return documents.find((documentItem) => {
    const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];
    return documentItem.topic === "equation-bank" || tags.includes("index");
  }) || null;
}

function createDocumentMap(documents) {
  return new Map(
    documents.map((documentItem) => [documentItem.document_id, documentItem]),
  );
}

function toSiteHref(value, helpers, fallback) {
  const normalizedValue = String(value || "").trim();
  return normalizedValue ? helpers.buildSiteHref(normalizedValue) : helpers.buildSiteHref(fallback);
}

import { createDocumentResourceModel } from "./site-data.js";
import { resourceOrDefault, truncateText } from "./site-helpers.js";

const routeToneSequence = ["teal", "gold", "ink"];

export function buildStagePageViewModel({ stage, documents, curationBundle, helpers }) {
  const stageKey = String(stage || "").trim().toUpperCase();
  const stageCuration = stageKey === "A2" ? curationBundle?.a2 || {} : curationBundle?.as || {};
  const stageIdentity = getStageIdentity(stageKey);
  const documentItems = Array.isArray(documents)
    ? documents.filter((item) => item.type === "document")
    : [];
  const stageDocuments = documentItems.filter((item) => String(item.stage || "").trim() === stageKey);
  const documentMap = new Map(
    documentItems.map((documentItem) => [documentItem.document_id, documentItem]),
  );
  const indexDocument = findIndexDocument(documentItems);
  const stageSummary = stageKey === "A2"
    ? "Start with physical chemistry, transition elements, and the core A2 organic set."
    : "Start with foundations, inorganic chemistry, and the first organic routes.";

  return {
    header: {
      eyebrow: stageIdentity.headerEyebrow,
      title: "Chemistry Resource Bank",
      homeHref: helpers.buildSiteHref("index.html"),
      navLinks: [
        { href: helpers.buildSiteHref("index.html"), label: "Home" },
        { href: helpers.buildSiteHref("as/"), label: "AS" },
        { href: helpers.buildSiteHref("a2/"), label: "A2" },
        { href: helpers.buildSiteHref("interactive/ir-past-paper-trainer/"), label: "Interactive" },
      ],
      quickAction: {
        href: helpers.buildLibraryHref({ stage: stageKey }, "library-panel"),
        label: `Browse ${stageKey} library`,
      },
    },
    hero: {
      kicker: stageIdentity.heroKicker,
      pill: `CAIE Chemistry 9701 · ${stageKey}`,
      title: resourceOrDefault(stageCuration.title, `${stageKey} Chemistry`),
      copy: resourceOrDefault(stageCuration.intro, stageSummary),
      stageMark: stageKey,
      snapshotLabel: stageIdentity.snapshotLabel,
      supportingChips: stageIdentity.supportingChips,
      spotlight: stageIdentity.spotlight,
      actions: [
        {
          href: "#stage-featured",
          label: "See featured docs",
          variant: "primary",
        },
        {
          href: helpers.buildLibraryHref({ stage: stageKey }, "library-panel"),
          label: `Open ${stageKey} library`,
          variant: "secondary",
        },
      ],
      stats: [
        {
          value: `${stageDocuments.length}`,
          label: "documents",
        },
        {
          value: `${Array.isArray(stageCuration.routes) ? stageCuration.routes.length : 0}`,
          label: "routes",
        },
        {
          value: `${Array.isArray(stageCuration?.best_first_cuts?.topics) ? stageCuration.best_first_cuts.topics.length : 0}`,
          label: "topic links",
        },
      ],
      notes: buildHeroNotes(stageIdentity, stageSummary),
    },
    featuredSection: {
      kicker: "Featured documents",
      title: `Start with these ${stageKey} documents`,
      copy: stageIdentity.featuredCopy,
      stackLabel: stageIdentity.featuredStackLabel,
      action: {
        href: helpers.buildLibraryHref({ stage: stageKey }, "library-panel"),
        label: `Browse all ${stageKey}`,
        variant: "secondary",
      },
      footerNote: {
        label: "How to begin",
        title: "Start with one lead document",
        copy: "Open the lead card first if you want the clearest route into this stage.",
      },
      resources: buildFeaturedResources(stageCuration, documentMap, helpers),
    },
    routesSection: {
      kicker: "Follow a route",
      title: `Pick an ${stageKey} route`,
      copy: "Use these routes when you want a calmer order through the stage.",
      cards: buildRouteCards(stageKey, stageCuration, stageDocuments, helpers),
    },
    firstCutsSection: {
      kicker: "Topic entry points",
      title: "Start with these topics",
      copy: "Use topic links for a quicker way in, or open one of the paired documents below.",
      topicPanel: stageIdentity.topicPanel,
      topicLinks: buildFirstCutTopics(stageKey, stageCuration, helpers),
      resources: buildFirstCutResources(stageCuration, documentMap, helpers),
    },
    launchSection: {
      kicker: "Full document set",
      title: `See the current ${stageKey} set`,
      copy: `When you want more than the starting picks, keep going through the wider ${stageKey} document set.`,
      resources: buildLaunchResources(stageCuration, documentMap, stageDocuments, helpers),
    },
    handoffSection: {
      kicker: "Open the wider library",
      title: resourceOrDefault(
        stageCuration?.library_handoff?.label,
        `Browse the full ${stageKey} library`,
      ),
      copy: resourceOrDefault(
        stageCuration?.library_handoff?.copy,
        "Open the wider library when you want the full set of documents.",
      ),
      primaryAction: {
        href: helpers.buildLibraryHref({ stage: stageKey }, "library-panel"),
        label: `Open the full ${stageKey} library`,
      },
      secondaryAction: indexDocument
        ? {
            href: helpers.buildDocumentLinkHref(indexDocument.view_path || indexDocument.public_file_path),
            label: "Open bank overview",
          }
        : null,
    },
  };
}

function getStageIdentity(stageKey) {
  if (stageKey === "A2") {
    return {
      headerEyebrow: "Start with A2",
      heroKicker: "Start with A2",
      snapshotLabel: "A2 snapshot",
      supportingChips: ["Physical", "Transition", "Organic depth"],
      spotlight: {
        label: "Advanced stage",
        title: "Move through the sharper A2 set",
        copy: "Start with physical chemistry and transition elements, then move into the tighter organic comparison routes.",
      },
      focusTitle: "Physical chemistry, transition elements, and the core A2 organic set",
      howToBeginTitle: "Start with one featured document or one route",
      featuredCopy: "A tighter A2 set chosen as the clearest place to begin.",
      featuredStackLabel: "Also featured for A2",
      topicPanel: {
        label: "Topic links",
        title: "Jump straight into the denser topics",
        copy: "Use a topic link when you already know the area and want a faster way into the A2 set.",
      },
    };
  }

  return {
    headerEyebrow: "Start with AS",
    heroKicker: "Start with AS",
    snapshotLabel: "AS snapshot",
    supportingChips: ["Foundations", "Inorganic", "Organic start"],
    spotlight: {
      label: "Foundation stage",
      title: "Build from the core AS set",
      copy: "Start with the foundational inorganic material, then move into the first organic routes and reaction patterns.",
    },
    focusTitle: "Foundations, inorganic chemistry, and the first organic routes",
    howToBeginTitle: "Start with one featured document or one route",
    featuredCopy: "A short AS set chosen as the clearest place to begin.",
    featuredStackLabel: "Also featured for AS",
    topicPanel: {
      label: "Topic links",
      title: "Jump in by topic when you already know the chapter",
      copy: "Use a topic link when you want a quicker route into a familiar AS area without losing the stage context.",
    },
  };
}

function buildHeroNotes(stageIdentity, stageSummary) {
  return [
    {
      label: "Starting focus",
      title: stageIdentity.focusTitle,
      copy: stageSummary,
    },
    {
      label: "How to begin",
      title: stageIdentity.howToBeginTitle,
      copy: "Use the featured spread if you want one strong first document, or follow a route if you want a clearer order.",
    },
  ];
}

function buildFeaturedResources(stageCuration, documentMap, helpers) {
  const featuredIds = Array.isArray(stageCuration?.featured_documents)
    ? stageCuration.featured_documents
    : [];

  return featuredIds
    .map((documentId) => documentMap.get(documentId))
    .filter(Boolean)
    .map((documentItem, index) =>
      createDocumentResourceModel(documentItem, helpers, {
        eyebrow: index === 0 ? "Start here" : documentItem.kicker || "Featured document",
        description: truncateText(
          resourceOrDefault(documentItem.description, "No description provided."),
          index === 0 ? 128 : 78,
        ),
        ctaLabel: index === 0 ? "Open document" : "Open",
        status: index === 0 ? helpers.getReadableLabel(documentItem.status || "ready") : "",
        chips: [documentItem.stage, documentItem.part].filter(Boolean).slice(0, index === 0 ? 2 : 1),
        tagLimit: index === 0 ? 2 : 0,
        metaLine: index === 0 ? helpers.getContentFormatLabel(documentItem.content_format) : "",
        note: index === 0 ? "A strong first document for this stage." : "",
        useShortTitle: index > 0,
      }),
    );
}

function buildRouteCards(stageKey, stageCuration, stageDocuments, helpers) {
  const routeDefinitions = Array.isArray(stageCuration?.routes) ? stageCuration.routes : [];

  return routeDefinitions.map((route, index) => {
    const matchingDocuments = stageDocuments.filter((documentItem) => {
      const matchesPart = !route.part || String(documentItem.part || "").trim() === route.part;
      const documentTags = helpers.getDocumentUiTags(documentItem);
      const matchesTags =
        !Array.isArray(route.tags) ||
        route.tags.length === 0 ||
        route.tags.some((tag) => documentTags.includes(tag));

      return matchesPart && matchesTags;
    });

    return {
      kind: "document",
      tone: routeToneSequence[index % routeToneSequence.length],
      eyebrow: "Route",
      orderLabel: `Route ${index + 1}`,
      title: resourceOrDefault(route.title, `${stageKey} route`),
      countLabel: `${matchingDocuments.length} document${matchingDocuments.length === 1 ? "" : "s"}`,
      description: resourceOrDefault(route.description, "Open this route in the library."),
      href: helpers.buildLibraryHref(
        {
          stage: stageKey,
          part: route.part || "",
          tags: Array.isArray(route.tags) ? route.tags : [],
        },
        "library-panel",
      ),
      ctaLabel: "Follow route",
      chips: [stageKey, route.part].filter(Boolean),
      supportingTags: (Array.isArray(route.tags) ? route.tags : [])
        .slice(0, 3)
        .map((tag) => helpers.getTagDisplayLabel(tag)),
    };
  });
}

function buildFirstCutTopics(stageKey, stageCuration, helpers) {
  const topics = Array.isArray(stageCuration?.best_first_cuts?.topics)
    ? stageCuration.best_first_cuts.topics
    : [];

  return topics.map((topic) => ({
    label: helpers.getTagDisplayLabel(topic),
    href: helpers.buildLibraryHref({ stage: stageKey, tags: [topic] }, "library-panel"),
  }));
}

function buildFirstCutResources(stageCuration, documentMap, helpers) {
  const documentIds = Array.isArray(stageCuration?.best_first_cuts?.documents)
    ? stageCuration.best_first_cuts.documents
    : [];

  return documentIds
    .map((documentId) => documentMap.get(documentId))
    .filter(Boolean)
    .map((documentItem) =>
      createDocumentResourceModel(documentItem, helpers, {
        eyebrow: documentItem.kicker || "Topic pick",
        description: truncateText(
          resourceOrDefault(documentItem.description, "No description provided."),
          92,
        ),
        ctaLabel: "Open document",
        chips: [documentItem.stage, documentItem.part].filter(Boolean).slice(0, 2),
        tagLimit: 2,
        useShortTitle: true,
      }),
    );
}

function buildLaunchResources(stageCuration, documentMap, stageDocuments, helpers) {
  const launchIds = Array.isArray(stageCuration?.launch_documents)
    ? stageCuration.launch_documents
    : stageDocuments.map((documentItem) => documentItem.document_id);

  return launchIds
    .map((documentId) => documentMap.get(documentId))
    .filter(Boolean)
    .map((documentItem) =>
      createDocumentResourceModel(documentItem, helpers, {
        eyebrow: documentItem.kicker || "Document",
        description: truncateText(
          resourceOrDefault(documentItem.description, "No description provided."),
          84,
        ),
        ctaLabel: "Open document",
        chips: [documentItem.stage, documentItem.part].filter(Boolean).slice(0, 2),
        tagLimit: 2,
        useShortTitle: true,
      }),
    );
}

function findIndexDocument(documents) {
  return documents.find((documentItem) => {
    const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];
    return documentItem.topic === "equation-bank" || tags.includes("index");
  }) || null;
}

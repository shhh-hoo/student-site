import {
  buildSitePageHref,
  buildSiteHref,
  getContentFormatLabel,
  getDocumentDisplayTitle,
  getDocumentUiTags,
  getReadableLabel,
  getSourceKindLabel,
  getTagDisplayLabel,
} from "./site-helpers.js";

const fallbackInteractiveEntries = [
  {
    asset_id: "ir-past-paper-trainer",
    href: "interactive/ir-past-paper-trainer/",
    metaPath: "interactive/ir-past-paper-trainer/meta.json",
  },
  {
    asset_id: "9701-memorisation-bank",
    href: "interactive/9701-memorisation-bank/",
    metaPath: "interactive/9701-memorisation-bank/meta.json",
  },
];

const curationFileNames = ["homepage", "as", "a2", "interactive"];

async function fetchJson(relativePath, sitePrefix = "./") {
  const response = await fetch(buildSiteHref(relativePath, sitePrefix), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${relativePath} (${response.status}).`);
  }

  return response.json();
}

export async function fetchLibraryDocuments(sitePrefix = "./") {
  const documents = await fetchJson("public/data/library.json", sitePrefix);
  return Array.isArray(documents) ? documents : [];
}

export async function loadCurationBundle(sitePrefix = "./") {
  const entries = await Promise.all(
    curationFileNames.map(async fileName => [
      fileName,
      await fetchJson(`public/data/curation/${fileName}.json`, sitePrefix),
    ])
  );

  return Object.fromEntries(entries);
}

export async function loadInteractiveResources(sitePrefix = "./") {
  let interactiveEntries = fallbackInteractiveEntries;

  try {
    const registry = await fetchJson("public/data/curation/interactive.json", sitePrefix);

    if (Array.isArray(registry?.resources) && registry.resources.length > 0) {
      interactiveEntries = registry.resources;
    }
  } catch (error) {
    console.warn("Could not load interactive registry.", error);
  }

  const resources = await Promise.all(
    interactiveEntries.map(async entry => {
      try {
        const metaPath = entry.metaPath || entry.meta_path;

        if (!metaPath || !entry.href) {
          return null;
        }

        const meta = await fetchJson(metaPath, sitePrefix);

        return {
          ...meta,
          ...entry,
          href: buildSitePageHref(entry.href, sitePrefix),
          kind: "interactive",
        };
      } catch (error) {
        console.warn("Could not load interactive entry.", error);
        return null;
      }
    })
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
  const defaultTags = uiTags.slice(0, tagLimit).map(tag => helpers.getTagDisplayLabel(tag));
  const defaultMetaLine = [
    helpers.getSourceKindLabel(documentItem.source_kind),
    helpers.getContentFormatLabel(documentItem.content_format),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    kind: "document",
    eyebrow: overrides.eyebrow || documentItem.kicker || "Document",
    title:
      overrides.title ||
      helpers.getDocumentDisplayTitle(documentItem, {
        short: Boolean(overrides.useShortTitle),
      }),
    description: overrides.description || documentItem.description || "No description provided.",
    href: overrides.href || helpers.buildDocumentLinkHref(linkPath),
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
  const defaultChips = [resource.stage, resource.part, "Interactive tool"].filter(Boolean);
  const defaultTags = tags.slice(0, overrides.tagLimit ?? 4).map(tag => helpers.getTagDisplayLabel(tag));
  const defaultMetaLine = [
    helpers.getSourceKindLabel(resource.source_kind),
    resource.content_format ? helpers.getContentFormatLabel(resource.content_format) : "Interactive",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    kind: "interactive",
    eyebrow: overrides.eyebrow || resource.kicker || "Interactive practice",
    title: overrides.title || resource.display_title || resource.title || "Interactive practice",
    description: overrides.description || resource.description || "Interactive practice for quick revision.",
    href: overrides.href || resource.href,
    ctaLabel: overrides.ctaLabel || "Open interactive",
    status: overrides.status || helpers.getReadableLabel(resource.status || "ready"),
    chips: Array.isArray(overrides.chips) ? overrides.chips.filter(Boolean) : defaultChips,
    tags: Array.isArray(overrides.tags) ? overrides.tags.filter(Boolean) : defaultTags,
    note: overrides.note || "Use this when you want quick practice rather than a longer read.",
    metaLine: overrides.metaLine ?? defaultMetaLine,
  };
}

export function createViewModelHelpers({ buildDocumentLinkHref, buildLibraryHref }) {
  return {
    buildDocumentLinkHref,
    buildLibraryHref,
    buildSiteHref,
    getContentFormatLabel,
    getDocumentDisplayTitle,
    getDocumentUiTags,
    getReadableLabel,
    getSourceKindLabel,
    getTagDisplayLabel,
  };
}

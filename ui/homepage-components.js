function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinClasses(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

export function createTagMarkup({ label, tone = "neutral", href = "" }) {
  const className = joinClasses("brand-tag", `brand-tag--${tone}`, href && "brand-tag--link");

  if (href) {
    return `<a class="${className}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  }

  return `<span class="${className}">${escapeHtml(label)}</span>`;
}

export function createCTAButtonMarkup({ href, label, variant = "primary", compact = false }) {
  return `
    <a
      class="${joinClasses("cta-button", `cta-button--${variant}`, compact && "cta-button--compact")}"
      href="${escapeHtml(href)}"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

export function createSectionTitleMarkup({ kicker, title, copy, id }) {
  return `
    <div class="section-title">
      ${kicker ? `<p class="section-title__kicker">${escapeHtml(kicker)}</p>` : ""}
      <h2${id ? ` id="${escapeHtml(id)}"` : ""}>${escapeHtml(title)}</h2>
      ${copy ? `<p class="section-title__copy">${escapeHtml(copy)}</p>` : ""}
    </div>
  `;
}

export function createSiteHeaderMarkup(header) {
  const navMarkup = (header.navLinks || [])
    .map(
      (link) => `
        <a
          class="${joinClasses("site-header__nav-link", link.current && "site-header__nav-link--current")}"
          href="${escapeHtml(link.href)}"
          ${link.current ? 'aria-current="page"' : ""}
        >
          ${escapeHtml(link.label)}
        </a>
      `,
    )
    .join("");

  return `
    <div class="site-header">
      <div class="site-header__brand">
        <span class="site-header__mark" aria-hidden="true"></span>
        <div>
          <p class="site-header__eyebrow">${escapeHtml(header.eyebrow)}</p>
          <a class="site-header__title" href="${escapeHtml(header.homeHref || "./index.html")}">${escapeHtml(header.title)}</a>
        </div>
      </div>
      <nav class="site-header__nav" aria-label="Primary">
        ${navMarkup}
      </nav>
      <div class="site-header__action">
        ${
          header.quickAction
            ? createCTAButtonMarkup({
                href: header.quickAction.href,
                label: header.quickAction.label,
                variant: "secondary",
                compact: true,
              })
            : ""
        }
      </div>
    </div>
  `;
}

export function createHomepageHeroMarkup(hero) {
  const statsMarkup = (hero.stats || [])
    .map(
      (stat) => `
        <article class="hero-stat">
          <strong>${escapeHtml(stat.value)}</strong>
          <span>${escapeHtml(stat.label)}</span>
        </article>
      `,
    )
    .join("");
  const notesMarkup = (hero.notes || [])
    .map(
      (note) => `
        <article class="hero-note">
          <span>${escapeHtml(note.label)}</span>
          <strong>${escapeHtml(note.title)}</strong>
          <p>${escapeHtml(note.copy)}</p>
        </article>
      `,
    )
    .join("");

  return `
    <section class="homepage-hero" aria-labelledby="homepage-hero-title">
      <div class="homepage-hero__poster">
        <div class="homepage-hero__content">
          <div class="homepage-hero__intro">
            <p class="homepage-hero__kicker">${escapeHtml(hero.kicker)}</p>
            <span class="homepage-hero__pill">${escapeHtml(hero.pill)}</span>
          </div>
          <h1 id="homepage-hero-title">${escapeHtml(hero.title)}</h1>
          <p class="homepage-hero__copy">${escapeHtml(hero.copy)}</p>
          <div class="homepage-hero__actions">
            ${(hero.actions || [])
              .map((action) =>
                createCTAButtonMarkup({
                  href: action.href,
                  label: action.label,
                  variant: action.variant,
                }),
              )
              .join("")}
          </div>
        </div>
        <div class="homepage-hero__support">
          <div class="homepage-hero__panel homepage-hero__panel--stats">
            <p class="homepage-hero__panel-kicker">${escapeHtml(hero.panelKicker || "At a glance")}</p>
            <div class="homepage-hero__stats">${statsMarkup}</div>
          </div>
          <div class="homepage-hero__notes">${notesMarkup}</div>
        </div>
      </div>
    </section>
  `;
}

export function createEntrySectionMarkup(section) {
  return `
    <section class="homepage-section homepage-section--entry" aria-labelledby="homepage-entry-heading">
      ${createSectionTitleMarkup({
        kicker: section.kicker,
        title: section.title,
        copy: section.copy,
        id: "homepage-entry-heading",
      })}
      <div class="entry-grid">
        ${(section.cards || []).map((card) => createEntryCardMarkup(card)).join("")}
      </div>
    </section>
  `;
}

function createEntryCardMarkup(card) {
  return `
    <article class="entry-card">
      <div class="entry-card__topline">
        <span class="entry-card__eyebrow">${escapeHtml(card.eyebrow)}</span>
        <span class="entry-card__count">${escapeHtml(card.countLabel || "")}</span>
      </div>
      <h3>${escapeHtml(card.title)}</h3>
      <p class="entry-card__copy">${escapeHtml(card.description)}</p>
      ${
        (card.chips || []).length > 0
          ? `
          <div class="entry-card__chips">
            ${(card.chips || []).map((chip) => createTagMarkup({ label: chip, tone: "outline" })).join("")}
          </div>
        `
          : ""
      }
      <div class="entry-card__footer">
        ${createCTAButtonMarkup({
          href: card.href,
          label: card.ctaLabel,
          variant: "primary",
          compact: true,
        })}
      </div>
    </article>
  `;
}

export function createOverviewSummaryMarkup(summary) {
  if (!summary) {
    return "";
  }

  return `
    <div class="overview-summary">
      <div class="overview-summary__lead">
        ${summary.label ? `<p class="overview-summary__label">${escapeHtml(summary.label)}</p>` : ""}
        ${summary.copy ? `<p class="overview-summary__copy">${escapeHtml(summary.copy)}</p>` : ""}
      </div>
      ${
        summary.countLabel
          ? `<span class="overview-summary__count">${escapeHtml(summary.countLabel)}</span>`
          : ""
      }
    </div>
  `;
}

export function createOverviewFilterGroupsMarkup(groups) {
  return (groups || [])
    .map(
      (group) => `
        <div class="directory-filter-group">
          <p class="directory-filter-group__label">${escapeHtml(group.label)}</p>
          <div class="directory-filter-group__options">
            ${(group.options || [])
              .map(
                (option) => `
                  <button
                    type="button"
                    class="overview-filter"
                    data-filter-key="${escapeHtml(group.key)}"
                    data-filter-value="${escapeHtml(option.value)}"
                    aria-pressed="${option.active ? "true" : "false"}"
                    ${option.disabled ? "disabled" : ""}
                  >
                    <span class="overview-filter__label">${escapeHtml(option.label)}</span>
                    <span class="overview-filter__count">${escapeHtml(option.count)}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
      `,
    )
    .join("");
}

export function createOverviewResultsMarkup(
  results,
  {
    emptyTitle = "No matching results.",
    emptyCopy = "Try a different filter.",
    gridClass = "overview-results__grid",
    showStage = false,
  } = {},
) {
  if (!Array.isArray(results) || results.length === 0) {
    return `
      <article class="overview-results__empty">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <p>${escapeHtml(emptyCopy)}</p>
      </article>
    `;
  }

  return `
    <div class="${escapeHtml(gridClass)}">
      ${results
        .map((result) =>
          createOverviewCardMarkup(result, {
            showStage,
          }),
        )
        .join("")}
    </div>
  `;
}

function createOverviewCardMarkup(result, { showStage = false } = {}) {
  return `
    <article class="${joinClasses("overview-card", result.kind === "interactive" && "overview-card--interactive")}">
      <div class="overview-card__topline">
        <p class="overview-card__eyebrow">${escapeHtml(result.eyebrow)}</p>
        ${showStage ? `<span class="overview-card__stage">${escapeHtml(result.stageValue)}</span>` : ""}
      </div>
      <h3>${escapeHtml(result.title)}</h3>
      <p class="overview-card__copy">${escapeHtml(result.description)}</p>
      <div class="overview-card__tags">
        ${createTagMarkup({ label: result.typeLabel, tone: "outline" })}
        ${createTagMarkup({ label: result.topicLabel, tone: "soft" })}
      </div>
      <div class="overview-card__footer">
        ${createCTAButtonMarkup({
          href: result.href,
          label: result.ctaLabel,
          variant: result.kind === "interactive" ? "interactive" : "primary",
          compact: true,
        })}
      </div>
    </article>
  `;
}

export function createHomepageOverviewMarkup(section) {
  return `
    <section
      class="homepage-section homepage-section--overview"
      id="homepage-overview"
      aria-labelledby="homepage-overview-heading"
    >
      <div class="homepage-section__header homepage-section__header--split">
        ${createSectionTitleMarkup({
          kicker: section.kicker,
          title: section.title,
          copy: section.copy,
          id: "homepage-overview-heading",
        })}
        ${
          section.action
            ? createCTAButtonMarkup({
                href: section.action.href,
                label: section.action.label,
                variant: section.action.variant || "secondary",
                compact: true,
              })
            : ""
        }
      </div>
      ${createOverviewSummaryMarkup(section.summary)}
      <div class="homepage-overview__filters">
        ${createOverviewFilterGroupsMarkup(section.filterGroups)}
      </div>
      <div class="overview-results">
        ${createOverviewResultsMarkup(section.results, {
          emptyTitle: section.emptyTitle,
          emptyCopy: section.emptyCopy,
          gridClass: "overview-results__grid homepage-overview__grid",
          showStage: true,
        })}
      </div>
    </section>
  `;
}

export function createResourceCardMarkup(resource, { layout = "standard" } = {}) {
  const metaMarkup = createResourceMetaMarkup(resource, layout);

  return `
    <article
      class="${joinClasses(
        "resource-card",
        `resource-card--${resource.kind || "document"}`,
        `resource-card--${layout}`,
      )}"
    >
      <div class="resource-card__header">
        <div>
          <p class="resource-card__eyebrow">${escapeHtml(resource.eyebrow)}</p>
          <h3>${escapeHtml(resource.title)}</h3>
        </div>
        ${
          resource.status
            ? `<span class="resource-card__status">${escapeHtml(resource.status)}</span>`
            : ""
        }
      </div>
      <p class="resource-card__description">${escapeHtml(resource.description)}</p>
      ${
        (resource.chips || []).length > 0
          ? `
          <div class="resource-card__chips">
            ${(resource.chips || []).map((chip) => createTagMarkup({ label: chip, tone: "outline" })).join("")}
          </div>
        `
          : ""
      }
      ${
        (resource.tags || []).length > 0
          ? `
          <div class="resource-card__tags">
            ${(resource.tags || []).map((tag) => createTagMarkup({ label: tag, tone: "soft" })).join("")}
          </div>
        `
          : ""
      }
      ${resource.note ? `<p class="resource-card__note">${escapeHtml(resource.note)}</p>` : ""}
      <div class="resource-card__footer">
        ${metaMarkup}
        ${createCTAButtonMarkup({
          href: resource.href,
          label: resource.ctaLabel,
          variant: resource.kind === "interactive" ? "interactive" : "primary",
          compact: true,
        })}
      </div>
    </article>
  `;
}

function createResourceMetaMarkup(resource, layout) {
  const metaItems = getResourceMetaItems(resource, layout);

  if (metaItems.length === 0) {
    return "";
  }

  if (metaItems.length === 1) {
    return `<span class="resource-card__meta">${escapeHtml(metaItems[0])}</span>`;
  }

  return `
    <div class="resource-card__meta-list">
      ${metaItems
        .map((metaItem) => `<span class="resource-card__meta">${escapeHtml(metaItem)}</span>`)
        .join("")}
    </div>
  `;
}

function getResourceMetaItems(resource, layout) {
  if (Array.isArray(resource.metaItems)) {
    return resource.metaItems.filter(Boolean);
  }

  const metaLine = typeof resource.metaLine === "string" ? resource.metaLine.trim() : "";

  if (!metaLine) {
    return [];
  }

  if (
    layout.startsWith("stage-") &&
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 760px)").matches &&
    metaLine.includes(" · ")
  ) {
    return metaLine
      .split(/\s+·\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [metaLine];
}

export function createInteractiveSectionMarkup(section) {
  if (!Array.isArray(section.resources) || section.resources.length === 0) {
    return "";
  }

  return `
    <section
      class="homepage-section homepage-section--interactive"
      id="interactive-lab"
      aria-labelledby="interactive-heading"
    >
      <div class="homepage-section__header homepage-section__header--split">
        ${createSectionTitleMarkup({
          kicker: section.kicker,
          title: section.title,
          copy: section.copy,
          id: "interactive-heading",
        })}
        ${
          section.action
            ? createCTAButtonMarkup({
                href: section.action.href,
                label: section.action.label,
                variant: section.action.variant || "secondary",
                compact: true,
              })
            : ""
        }
      </div>
      <div class="overview-results">
        <div class="overview-results__grid homepage-overview__grid">
          ${(section.resources || [])
            .map((resource) => createResourceCardMarkup(resource, { layout: "standard" }))
            .join("")}
        </div>
      </div>
    </section>
  `;
}

import {
  createCTAButtonMarkup,
  createOverviewFilterGroupsMarkup,
  createOverviewResultsMarkup,
  createOverviewSummaryMarkup,
  createSectionTitleMarkup,
  createTagMarkup,
} from "./homepage-components.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createStageHeroMarkup(hero) {
  const statsMarkup = (hero.stats || [])
    .map(
      stat => `
        <article class="stage-stat">
          <strong>${escapeHtml(stat.value)}</strong>
          <span>${escapeHtml(stat.label)}</span>
        </article>
      `
    )
    .join("");
  const notesMarkup = (hero.notes || [])
    .map(
      note => `
        <article class="stage-note">
          <span class="stage-note__label">${escapeHtml(note.label)}</span>
          <strong>${escapeHtml(note.title)}</strong>
          <p>${escapeHtml(note.copy)}</p>
        </article>
      `
    )
    .join("");
  const chipMarkup = (hero.supportingChips || [])
    .map(chip => createTagMarkup({ label: chip, tone: "outline" }))
    .join("");

  return `
    <section class="stage-hero" aria-labelledby="stage-hero-title">
      <div class="stage-hero__poster">
        <div class="stage-hero__mark" aria-hidden="true">${escapeHtml(hero.stageMark || "")}</div>
        <div class="stage-hero__intro">
          <p class="stage-hero__kicker">${escapeHtml(hero.kicker)}</p>
          <span class="stage-hero__pill">${escapeHtml(hero.pill)}</span>
        </div>
        <div class="stage-hero__body">
          <div class="stage-hero__headline">
            <h1 id="stage-hero-title">${escapeHtml(hero.title)}</h1>
            <p class="stage-hero__copy">${escapeHtml(hero.copy)}</p>
          </div>
          ${
            hero.spotlight
              ? `
              <article class="stage-hero__spotlight">
                <span class="stage-hero__spotlight-label">${escapeHtml(hero.spotlight.label)}</span>
                <strong>${escapeHtml(hero.spotlight.title)}</strong>
                <p>${escapeHtml(hero.spotlight.copy)}</p>
              </article>
            `
              : ""
          }
        </div>
        ${chipMarkup ? `<div class="stage-hero__highlights">${chipMarkup}</div>` : ""}
        <div class="stage-hero__actions">
          ${(hero.actions || [])
            .map(action =>
              createCTAButtonMarkup({
                href: action.href,
                label: action.label,
                variant: action.variant,
              })
            )
            .join("")}
        </div>
      </div>
      <div class="stage-hero__support">
        <article class="stage-hero__panel">
          <p class="stage-hero__panel-kicker">${escapeHtml(hero.snapshotLabel || "Snapshot")}</p>
          <div class="stage-hero__stats">${statsMarkup}</div>
        </article>
        <div class="stage-hero__notes">${notesMarkup}</div>
      </div>
    </section>
  `;
}

export function createStageOverviewMarkup(section) {
  return `
    <section class="stage-section stage-section--overview" id="stage-overview">
      ${createSectionTitleMarkup({
        kicker: section.kicker,
        title: section.title,
        copy: section.copy,
        id: "stage-overview-heading",
      })}
      ${createOverviewSummaryMarkup(section.summary)}
      <div class="stage-overview__filters">
        ${createOverviewFilterGroupsMarkup(section.filterGroups)}
      </div>
    </section>
  `;
}

export function createStageDocumentsMarkup(section) {
  return `
    <section class="stage-section stage-section--documents" id="stage-documents">
      <div class="stage-section__header stage-section__header--split">
        ${createSectionTitleMarkup({
          kicker: section.kicker,
          title: section.title,
          copy: section.copy,
          id: "stage-documents-heading",
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
      <div class="overview-results">
        ${createOverviewResultsMarkup(section.results, {
          emptyTitle: section.emptyTitle,
          emptyCopy: section.emptyCopy,
          gridClass: "overview-results__grid stage-document-grid",
        })}
      </div>
    </section>
  `;
}

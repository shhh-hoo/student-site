# AGENTS.md

## Design system

Before making any student-facing UI changes, read these files in order:

1. `docs/design/LOCKED-DESIGN-SYSTEM.md`
2. `docs/design/visual-preview-guide.html`
3. `docs/design/style-guide.md`

These files are the current source of truth for the visual system.
Do not treat the current site implementation as the final visual target if it conflicts with them.
Use `docs/design/j2-homepage-light.tsx` and `docs/design/j2-homepage-dark.tsx` as historical composition references only.

Locked route assignments:

- Homepage = Lilac / Blush / Peach
- AS = Mint / Apple / Cream
- A2 = Coral / Apricot / Butter
- Interactive = Sky / Cyan / Sage

Hard UI rules:

- Buttons must be flat only.
- Do not use pseudo-3D depth, glossy highlights, bevels, or shadow-driven volume.
- Chips must stay soft and must not have card-level visual weight.
- Strong outline: page shells, major sections, hero frames.
- Medium outline: cards, major inputs, practice surfaces.
- Semi outline: chips, pills, tabs, passive controls.
- Hairline: metadata and separators only.
- Keep descriptive copy short and secondary.
- Interactive pages inside `student-site` must not look like external mini-sites.

## Project baseline

This repository contains the student-facing site.
Do not change the content workflow unless explicitly requested.

## Content pipeline constraints

- Do not modify `content-source/context/` from this repository.
- Do not redesign document sync rules.
- Do not route code-based interactive assets through the document flow.
- Interactive assets remain manually integrated and visually distinct from document resources, but must still use the shared `student-site` visual language.

## Visual baseline

Use these files as the binding design baseline, in this order:

1. `docs/design/LOCKED-DESIGN-SYSTEM.md`
2. `docs/design/visual-preview-guide.html`
3. `docs/design/style-guide.md`

Historical composition references only:

- `docs/design/j2-homepage-light.tsx`
- `docs/design/j2-homepage-dark.tsx`

If the current implementation differs from older site structure, prioritize the locked design system first, then the visual preview guide, then the structural style guide.

## Design interpretation rules

- Homepage is a brand page first, not a raw listing page.
- Library is calmer than homepage.
- Viewer is calmer than library.
- Do not use generic SaaS UI as a fallback if a branded solution is clearly intended.
- Prefer composition, hierarchy, and strong card language over decorative over-detailing.

## Implementation rules

- Reuse the shared branded layer instead of creating parallel style systems.
- Reuse the shared shell, tokens, and UI styles before adding route-local CSS.
- Add route-local CSS only when shared styles are not sufficient for a page's structure or interaction states.
- Promote repeated interactive patterns into shared styles or components instead of duplicating route-local CSS across pages.
- Keep comments in English.
- Prefer small, reviewable changes.
- Preserve existing behavior unless the task explicitly asks for behavior changes.

## Validation

Before finishing:

- run syntax checks for touched JS files
- run `git diff --check`
- provide exact run/test commands
- clearly separate visual changes from behavior changes

## Output

At the end, provide:

1. summary
2. changed files
3. diff
4. remaining follow-up

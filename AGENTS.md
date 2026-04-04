# Project Instructions

## Project baseline
This repository contains the student-facing site.
Do not change the content workflow unless explicitly requested.

## Content pipeline constraints
- Do not modify `content-source/context/` from this repository.
- Do not redesign document sync rules.
- Do not route code-based interactive assets through the document flow.
- Interactive assets remain manually integrated and visually distinct.

## Visual baseline
The binding design baseline is in:
- `docs/design/style-guide.md`

Canonical homepage prototypes are:
- `docs/design/j2-homepage-light.tsx`
- `docs/design/j2-homepage-dark.tsx`

If the current implementation differs from older site structure, prioritize matching the style guide and prototypes for homepage composition.

## Design interpretation rules
- Homepage is a brand page first, not a raw listing page.
- Library is calmer than homepage.
- Viewer is calmer than library.
- Do not use generic SaaS UI as a fallback if a branded solution is clearly intended.
- Prefer composition, hierarchy, and strong card language over decorative over-detailing.

## Implementation rules
- Reuse the shared branded layer instead of creating parallel style systems.
- Keep comments in English.
- Prefer small, reviewable changes.
- Preserve existing behavior unless the task explicitly asks for behavior changes.

## Validation
Before finishing:
- run syntax checks for touched JS files
- run `git diff --check`
- provide exact run/test commands
- clearly separate visual changes from behavior changes

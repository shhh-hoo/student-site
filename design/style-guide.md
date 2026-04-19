# Resource Bank Style Guide

## Status

This file defines the structural and product-level visual baseline for the site.

If the current implementation differs from this guide, follow this guide for composition, hierarchy, and page-role decisions.
For locked route colours and locked component rules, follow `LOCKED-DESIGN-SYSTEM.md`.

## Design intent

The site should feel like:

- a branded study platform
- a designed visual identity, not generic ed-tech UI
- paper-cut / poster / card-based composition
- clear hierarchy, large visual blocks, and memorable shapes

The homepage is a brand page first.
The library and viewer are product pages second.

## Visual baseline

Light mode should feel warm, paper-based, and clearly designed.
Dark mode should still feel like the same product family, not a separate product.

Historical note:
The J2 light and J2-dark prototypes remain useful references for composition, scale, and block rhythm.
They are not the binding source of truth for current colour assignments or component styling.

## Must

- Use strong visual hierarchy with large blocks and clear focal areas.
- Keep homepage composition poster-like, not dashboard-like.
- Keep library and viewer calmer than homepage.
- Distinguish document resources from interactive resources visually.
- Reuse one branded language across homepage, library, viewer, and interactive routes.
- Prefer custom-shaped surfaces, stickers, plaques, and tags over generic SaaS cards where appropriate.
- Keep product pages readable and usable even when the homepage is more expressive.

## Prefer

- Slight tilt or asymmetry on homepage cards where it helps composition.
- Big hero surface with layered paper shapes.
- Visually distinct tags and chips with clear silhouette.
- Decorative shapes that feel intentional and sparse.
- Warm paper-like backgrounds in light mode.
- Clear accent treatment in dark mode, but only where it supports hierarchy.

## Avoid

- Generic rounded SaaS cards
- default-looking pill buttons everywhere
- glassmorphism
- thin, delicate ornament as the main identity
- homepage layouts that look like a restyled library page
- visually dense homepage sections with too many equally weighted items
- interactive pages that look like foreign mini-sites

## Homepage composition rules

Homepage should include:

- strong branded header
- large hero
- primary CTA group
- search entry
- feature/category cards
- featured documents
- a clearly separate interactive section

Homepage should not:

- feel like a raw listing page
- expose too much dense filtering UI above the fold
- give equal weight to every content block
- become a generic dashboard

## Library rules

Library should:

- inherit the same brand language
- be calmer and more scan-friendly than homepage
- preserve usability over decoration
- use branded cards, tags, filters, and headings

Library should not:

- feel like the homepage poster duplicated
- overuse tilt, strong decorative clutter, or oversized stickers
- become visually louder than needed for browsing

## Viewer rules

Viewer should:

- feel part of the same family
- be the calmest of the three
- prioritize reading comfort
- keep branded shell, tags, metadata, and return controls

Viewer should not:

- become visually louder than the document content
- use decorative layout that competes with reading

## Interactive page rules

Interactive pages inside `student-site` are product pages, not external mini-sites.

Interactive pages should:

- reuse or closely match the site header / top-navigation logic where appropriate
- follow the existing back-navigation pattern
- use the same page width, container logic, spacing rhythm, and typography hierarchy
- use the shared colour system and the existing card / button / input / chip language
- prefer the shared shell, tokens, and existing UI primitives before adding route-local styles
- add route-local styles only when page-specific structure or interaction states require them
- keep local CSS aligned with existing `student-site` tokens
- promote repeated interactive patterns into shared styles or components rather than duplicating per-page CSS indefinitely
- preserve useful interaction logic while adapting the presentation layer to the site design system
- use matching site card language for homepage, library, and hub entries

Interactive pages should not:

- look like a foreign standalone prototype embedded unchanged
- invent a separate theme inside `student-site`
- assume every interactive asset needs its own local stylesheet
- use the document viewer shell unless the experience is actually document-like
- rely on iframe-like or bolted-on integration unless absolutely necessary

## Implementation priority

When trade-offs appear, prioritize in this order:

1. composition
2. hierarchy
3. route-level visual clarity
4. card / button / tag language
5. decorative details

## Reference files

Current binding references:

- `docs/design/LOCKED-DESIGN-SYSTEM.md`
- `docs/design/visual-preview-guide.html`

Structural baseline:

- `docs/design/style-guide.md`

Historical composition references:

- `docs/design/j2-homepage-light.tsx`
- `docs/design/j2-homepage-dark.tsx`

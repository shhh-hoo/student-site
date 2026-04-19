# Reference Notes

## What this pack is for

This pack is intended to be copied into the `student-site` repository so Codex has a stable and current visual baseline.

## Priority order

1. `docs/design/LOCKED-DESIGN-SYSTEM.md`
2. `docs/design/visual-preview-guide.html`
3. `docs/design/style-guide.md`
4. `docs/design/j2-homepage-light.tsx`
5. `docs/design/j2-homepage-dark.tsx`
6. current implementation in the site

## How to use with Codex

When prompting Codex, explicitly say:

- Use `docs/design/LOCKED-DESIGN-SYSTEM.md` as the binding source of truth for current visual decisions.
- Use `docs/design/visual-preview-guide.html` as the approved visual reference.
- Use `docs/design/style-guide.md` as the structural and product-level baseline.
- Use `docs/design/j2-homepage-light.tsx` and `docs/design/j2-homepage-dark.tsx` as historical composition references only.
- Do not treat the current site implementation as the final visual target if it conflicts with the locked design system.

## Why the prototype files are still kept

The J2 prototype files still contain useful information about block rhythm, hero scale, and poster-like composition.
However, they are no longer the binding colour or component source of truth.

## Practical interpretation

- Locked route colours, button rules, chip rules, outline hierarchy, and density rules come first.
- Structural guidance for homepage, library, viewer, and interactive pages comes second.
- J2 light and dark files are fallback references for composition only.

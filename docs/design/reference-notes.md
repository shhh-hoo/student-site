# Reference Notes

## What this pack is for
This pack is intended to be copied into the `student-site` repository so Codex has a stable visual baseline.

## Priority order
1. `docs/design/style-guide.md`
2. `docs/design/j2-homepage-light.tsx`
3. `docs/design/j2-homepage-dark.tsx`
4. current implementation in the site

## How to use with Codex
When prompting Codex, explicitly say:
- Use `docs/design/style-guide.md` as the binding baseline.
- Use `docs/design/j2-homepage-light.tsx` and `docs/design/j2-homepage-dark.tsx` as canonical visual prototypes.
- Do not treat the current site implementation as the final visual target.

## Why the prototype files are `.tsx`
These are the most faithful versions of the approved prototypes currently available.
Codex can read them directly from the repository, so they are suitable as implementation references.
If later needed, they can be converted into static HTML previews.

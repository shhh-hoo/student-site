# Design Reference Pack

Files included here:

- `LOCKED-DESIGN-SYSTEM.md`: binding locked visual rules for current implementation work
- `visual-preview-guide.html`: visual reference page for the locked design direction
- `style-guide.md`: structural and product-level visual baseline
- `reference-notes.md`: Codex usage notes and priority order
- `j2-homepage-light.tsx`: historical light composition reference
- `j2-homepage-dark.tsx`: historical dark composition reference

Recommended location:

- copy this whole `docs/design/` folder into the root of `student-site`
- update the repo root `AGENTS.md` so Codex reads the locked design files first

Recommended `AGENTS.md` note:

```md
## Design system

Before making any student-facing UI changes, read:

- `docs/design/LOCKED-DESIGN-SYSTEM.md`
- `docs/design/visual-preview-guide.html`
- `docs/design/style-guide.md`

Use the locked design system as the binding source of truth.
Use the J2 prototype files as historical composition references only.

Do not invent a separate visual system.
Do not reintroduce pseudo-3D buttons.
Do not give chips card-level visual weight.
```

# Locked Design System

## Status

This file is the binding source of truth for the current visual system.
If the current implementation or older design references differ from this file, follow this file.

## Locked route assignments

- Homepage = Lilac / Blush / Peach
- AS = Mint / Apple / Cream
- A2 = Coral / Apricot / Butter
- Interactive = Sky / Cyan / Sage

These route assignments are locked for the current implementation direction.

## Colour rules

- Use airy, readable ombres with softened contrast.
- Routes should have distinct colour identity.
- Avoid dark gradients, muddy colour mixes, harsh saturation, or neon-heavy accents.
- Do not force all routes into one shared ombre family.
- A wider palette library may be used later, but the core route assignments above are fixed.

## Button rules

Buttons are flat only.

### Must

- Use flat buttons only
- Use route-tinted primary buttons
- Keep secondary buttons pale and quiet
- Keep button borders light
- Keep button text optically centred

### Do not

- use pseudo-3D depth
- use glossy highlights
- use shadow-driven volume
- use bevel, emboss, or raised treatment
- use unrelated accent colours for primary actions

## Chip and pill rules

Chips must stay soft.

### Must

- Use semi-outline treatment
- Keep chip backgrounds light and quiet
- Use route tint only as a gentle selected-state cue
- Keep uppercase UI text optically centred

### Do not

- give chips card-level visual weight
- use thick shell-like outlines on chips
- make chips look like miniature cards
- rely on heavy contrast for passive controls

## Outline hierarchy

### Strong outline

Use for:

- page shells
- major sections
- hero frames

### Medium outline

Use for:

- cards
- major inputs
- practice surfaces
- important interaction containers

### Semi outline

Use for:

- chips
- pills
- tabs
- helper boxes
- passive controls

### Hairline

Use for:

- metadata
- separators
- low-priority grouping only

## Surface rules

- Keep the paper base warm and calm.
- Strong outer shells define the site identity.
- Internal UI should step back in weight.
- Product pages should stay cleaner than homepage.
- Decorative shapes should feel intentional and sparse.

## Typography rules

- Keep editorial serif for key headlines.
- Use one sans family for interface text.
- Do not introduce a third headline personality.
- Use soft uppercase tracking for chips, labels, and compact UI text.
- Prioritize optical alignment for pill-like components.

## Density rules

- Keep descriptive copy short and secondary.
- Pages should guide action, not over-explain themselves.
- Avoid stacking too many equally weighted text blocks.
- Keep the homepage expressive, but keep library, viewer, and interactive pages calmer.

## Implementation summary

The current visual system can be summarized as:

- airy ombre
- paper base
- flat route-tinted buttons
- soft chips
- strong outer shells
- restrained text density

# Benzene Nitration Chemical Correctness Blueprint v1.1

This blueprint defines the chemical correctness standard for the benzene nitration mechanism page. The page is meant to be a golden reference for future 9701 and first-year organic mechanism diagrams.

## Main reaction

C6H6 + HNO3 -> C6H5NO2 + H2O

Conditions: concentrated HNO3, concentrated H2SO4, 50–55 °C.

## Scope

This reference page covers the nitration of benzene as electrophilic aromatic substitution. It is not a general chemistry editor and does not use SMILES as the rendering source.

The mechanism must show:

1. generation of NO2+
2. electrophilic attack by the benzene pi system
3. Wheland intermediate / sigma complex
4. deprotonation by HSO4-
5. nitrobenzene product with aromaticity restored

## Global correctness rules

Curly arrows must not be decorative. Each curly arrow must have a chemically valid electron source and destination.

Allowed electron sources in this mechanism:

- benzene pi system / aromatic circle
- oxygen lone pair on HSO4-
- C-H bond in the sigma complex

Allowed targets in this mechanism:

- nitrogen atom of NO2+
- H attached to the sp3 carbon of the sigma complex
- broken delocalisation region / ring pi system that is restored during deprotonation

Formal charge and partial charge must be separate concepts.

- NO2+ uses formal positive charge.
- Wheland intermediate uses formal positive charge.
- HSO4- uses formal negative charge.
- Partial charge notation is available as a primitive, but is not required for benzene nitration because the active electrophile is a formal cation.
- Wheland and deprotonation views use an outer hexagon with a broken delocalisation horseshoe, not a full aromatic circle and not alternating double bonds.

## Step 1: Electrophile generation

Required:

- show NO2+ as electrophile
- show formal positive charge on NO2+
- do not label HNO3 simply as “base”
- use wording such as: nitric acid is protonated by sulfuric acid

Recommended equation:

HNO3 + 2H2SO4 ⇌ NO2+ + 2HSO4- + H3O+

Acceptable simplified teaching equation:

HNO3 + H2SO4 -> NO2+ + HSO4- + H2O

## Step 2: Electrophilic attack

Required:

- benzene ring shown with aromatic circle
- NO2+ shown as electrophile
- arrow starts from aromatic circle / benzene pi system
- arrow points to nitrogen of NO2+
- arrow must not point to oxygen

No partial charge is required in this step.

## Step 3: Wheland intermediate / sigma complex

Required:

- new C-N bond to NO2 shown
- attacked carbon still bonded to H
- ring is not shown as fully aromatic
- ring is not shown with alternating double bonds
- outer hexagon and broken delocalisation horseshoe are shown
- positive charge shown on the sigma complex

The supplied TSX file intentionally uses a broken delocalisation drawing for the arenium ion, not one localised resonance form.

## Step 4: Deprotonation

Required:

- HSO4- is the base
- oxygen lone pair on HSO4- is shown
- first curly arrow starts from oxygen lone pair and points to H
- second curly arrow starts from the C-H bond midpoint
- C-H bond electrons are shown returning to the broken delocalisation region of the ring
- the sigma complex is still shown with the broken delocalisation form during deprotonation

Common errors to reject:

- arrow starts from H
- arrow starts from the carbon label rather than the C-H bond
- arrow points away from the ring
- base shown without a lone pair or electron source

## Step 5: Product

Required:

- product is nitrobenzene
- aromatic circle restored
- NO2 replaces one H on the ring
- sulfuric acid regeneration may be shown as text

## Future extension policy

Add a resonance toggle only after the golden reference is accepted.
Add RDKit/Ketcher/Marvin only after the hand-authored SVG reference is stable.
Do not replace this mechanism diagram with automatic SMILES rendering.

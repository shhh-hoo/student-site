# Homepage Library Card Regression Checklist

Affected area: homepage document/resource cards in the overview grid and full library section, especially the A2 organic/comparison cards that previously showed large internal peach blocks.

## Expected result

- Cards render as clean flat surfaces with the existing locked card radius, border, spacing, typography, stage pill, tags, and `Open` button intact.
- A2 cards stay in the warm peach/orange family.
- AS cards stay in the green family.
- No large tiled, rectangular, or offset colour blocks appear inside the card body.

## Manual check

1. Open `/` in Chrome, Safari, and Firefox.
2. Check the homepage overview cards for `Acidity Comparisons`, `A2 Acyl, Nitrogen, and Polymers`, `Arenes & Phenol`, and `Basicity Comparisons`.
3. Scroll to `Browse the full document set` and re-check the same A2 cards plus `Alcohols & Carbonyls` and `AS Foundations & Inorganic`.
4. Confirm each card body is a single flat family tint with only the thin top accent visible.
5. Confirm the content sits above any accent layer and no internal rectangular blocks appear while hovering or scrolling.

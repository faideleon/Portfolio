# GitHub activity card + small-screen detail fix

Reference: a footer card (solid colour, links row, flowers on top, ordered-dither fade into the page with a
big name knocked out of the dots).

## Activity section → "GitHub card"
- Replaces the ACTIVITY heading word, stats row and dark heatmap panel.
- Above the card, one row: left caption "Made in Baguio City, PH" · centre a row of small pine silhouettes in
  the card colour, sitting on the card's top edge · right caption "<total> contributions in <year>, no plans to stop" (live).
- Card: dusk amber `#f8a060`, rounded top corners, dark ink text.
  - Eyebrow "Coding activity", title "GitHub contributions", live stats (total, longest streak, active days).
  - Heatmap in **ink mode**: squares in near-black at 5 strengths on the amber (labels and tooltip in ink).
  - Links row: github.com/faideleon · copy email · All projects · ↑ Back to top.
- Bottom of the card: ordered (Bayer 8×8) dither that fades the card colour into the black page, dots shifting
  amber → pink → purple as they thin out. "Faisal" is knocked out of the dots in huge type, cropped by the bottom edge.
  - Cells snapped to whole device pixels. Cursor wake ripples the dots (hover devices); otherwise static.
  - Reduced motion: static.

## Small-screen detail fix
- Phones: the hero scene no longer stretches to full screen height (that made ~8px cells). It covers a top band
  about 125vw tall and fades to black under the text, keeping cells close to the desktop card's size.
- Section words / contact lettering: cell size derives from the element's height too, so letters keep ~12+ rows
  of cells at any width instead of collapsing into random squares.

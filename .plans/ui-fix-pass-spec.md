# UI fix pass — square-cell pictures + polish

Follows `site-redesign-spec.md`. Goal: every picture on the home and projects pages uses the hero's
"Original" square-cell look (each cell a square, colored, sized by brightness) instead of halftone dots
or text glyphs, plus polish fixes found in the audit (better-ui).

## Pictures

### Shared renderer
One square-cell image renderer (`script/ascii/cells.js`) that:
- samples an image onto a grid (cell size in CSS px), 5–95% contrast stretch;
- draws each cell as a centred square, side `0.22 + 0.74*sqrt(v)` of the cell (mirrors scene.js), batched by colour;
- colour mode: `photo` (real colour of the cell) or `dusk` (luminance mapped through the dusk ramp
  `#1c1830 → #4a3a88 → #b05a88 → #f8a060 → #ffc478`);
- respects alpha masks (transparent background = no cell);
- optional cursor wake (engine `createWake`), fade-up intro, shimmer, hover reveal of the real image;
- pauses via engine `register` (near/far), reduced-motion = still frame, no hover reveal on touch.

### Hero portrait tile (replaces 68px halftone circle)
- Square tile ~88px (72px on mobile), 1px line border, no circle; head-and-shoulders crop with
  the whole head in frame.
- Dusk-tinted cells. Fade-up intro synced with the scene's sunset; then a sparse shimmer (a few cells
  flicker). No cursor wake.

### About portrait
- Dusk-tinted cells, cursor wake, real photo cross-fades in on hover (hover-capable pointers only).
- Wake must not leave stray cells outside the figure (mask-aware drawing).

### Project thumbnails (home Work grid + projects page)
- Square cells in the screenshot's real colours, ~5px cells; dissolve to the real screenshot on
  hover/focus (existing behaviour). Touch / reduced motion: real screenshot.
- Light screenshots must read (no empty dotted wall): dark cells on light images get drawn by
  colour/darkness, not left blank.

### Case-study galleries
- Unchanged: real screenshots.

## Lettering
- Section words (ABOUT, ACTIVITY, PROJECTS …): square cells, dusk gradient left→right, placed inline as a
  section header in normal flow — never under the nav.
- Contact "LET'S WORK TOGETHER": square cells, white, gentle shimmer.

## Polish
- Mobile hero: drop the floating "Available for work" badge; the "Open / to work" stat gets the green
  live dot. Blinking cursor must not wrap to its own line. Remove the stray pixel top-right.
- Desktop hero: remove dead space above/below; hero fills the viewport sensibly.
- Hover styles behind `@media (hover: hover)`; buttons/pills/chips press to `scale(0.96)` over 150ms
  ease-out (not disabled), transitions name properties, gated by reduced motion.
- `-webkit-tap-highlight-color: transparent` on controls that draw their own pressed state.

## Out of scope
- LinkedIn/Resume links (still pending URLs). Case-study gallery imagery.

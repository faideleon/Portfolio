# ASCII Hero — Spec

Replace the current cream hero (text + halftone photo card) with a dark, ASCII-magic–style hero built around a live, animated ASCII scene.

Reference: [ASCII Library by ASCII Magic](https://x.com/kail_designs/status/2112181119760376066) → <https://www.ascii-magic.com/ascii>, piece **Switchback Dusk Drive**.

---

## 1. Reference — notable features

- **Library**: 734 MIT-licensed animated pieces across 24 categories (landscapes, UI, live data, 3D solids, cosmos, mascots, loaders…).
- **Rendering**: each piece is a dense character grid (~4.7px font, line-height ≈0.6) drawn to `<canvas>` with a `<pre>` fallback.
- **Per-cell color**: every glyph is tinted from a palette, so it reads as a painting from afar and as characters up close.
- **Looks**: the same frame can be re-skinned as Original, Halftone dots, ASCII `*#$@`, Dense, Numbers, Binary, Letters, Blocks, Squares, Lines or Dither (glyphs are sorted by ink coverage and the nearest one is chosen per cell).
- **Ambient motion**: small localized loops (twinkling stars, headlights moving along a road, fog) rather than whole-frame movement.
- **Hero layout of the reference page**: dark page; left column has a breadcrumb, a large mono headline, a short paragraph, primary and secondary buttons, a stats row (`634 pieces · 24 categories · 18 guides · MIT licence`), a divider, and a pill row (`★ Star · Docs · npx ascii-magic-art ⧉`). Right column has the art in a bordered 16:9 card with a caption bar (`Switchback Dusk Drive · Random scene · 57 scenes · Shuffle`).
- **Embedding**: `<ascii-art piece="…">` web component, or import a piece module and call `draw(t)` yourself.

## 2. Decisions (from interview)

| Topic | Decision |
|---|---|
| Scene | `switchback-dusk-drive` from `kailashsr38/ascii-magic-art` (MIT), with **light Baguio touches** |
| Engine | **Import the piece module and render to our own canvas** (not the `<ascii-art>` tag, which has no pointer API) |
| Look | **Original** (the piece's native shade glyphs `▁▂▃▄▅▆▇█` etc.) |
| Color | **Full per-cell color**, as in the reference |
| Layout | **Desktop**: two columns like the reference (text left, art card right). **Mobile**: art becomes a full-bleed backdrop behind the text (cover + crop) |
| Motion | Ambient loop + cursor ripple + intro reveal + subtle scroll parallax |
| Intro | **Sunset fade-up** |
| Cursor | **Subtle wake** (push and spring back) |
| Scroll | **Subtle parallax only**; the hero stays sticky and the next section slides over it as it does today |
| Headline font | **Martian Mono, large** |
| Portrait | Re-rendered as **cream dots** through the same renderer, shown as a **small avatar** in the hero text column |
| Caption bar | `Switchback Dusk Drive · Baguio` left, `● Available for work` right |
| Nav | Adapts to light-on-dark while over the hero |
| Seam | Fade to cream at the hero → About handoff |

## 3. Layout

### Desktop (≥ 900px)

```
┌───────────────────────────────────────────────────────────────────────┐
│ [F] FAISAL / PORTFOLIO                                     [MENU +]   │  nav (dark variant)
│                                                                       │
│ BAGUIO CITY · PHILIPPINES            ┌────────────────────────────┐   │
│ (◉) Hi, I'm Faisal.                  │  * .   ·    *   .   *      │   │
│     Full-Stack Developer             │ ▂▃▄▅▆ sunset glow ▆▅▄▃▂    │   │
│                                      │ ▓▓ ridges ▓▓     ▌pines▐   │   │
│ Short 1–2 sentence blurb …           │    ~~~ switchback road ~~~ │   │
│                                      │          ◦ headlights      │   │
│ [ Resume ]  [ View projects ]        ├────────────────────────────┤   │
│                                      │ Switchback Dusk Drive ·    │   │
│ STAT    STAT     STAT    STAT        │ Baguio   ● Available       │   │
│ label   label    label   label       └────────────────────────────┘   │
│ ───────────────────────────────                                       │
│ [GitHub] [LinkedIn] [faideleon25@gmail.com ⧉]                         │
└───────────────────────────────────────────────────────────────────────┘
```

- Hero background: `rgb(29,30,32)` (existing `body` charcoal). Text is cream `rgb(231,227,223)`, secondary text at about 60% opacity.
- Left column is about 45% wide and right column about 55%. The art card is 16:9, has a 1px border (`rgba(255,255,255,.12)`) and a caption bar with a top border, styled like the reference.
- `(◉)` is the portrait avatar (about 56–72px, circular or square to match the logo pill), placed inline before or above the headline.
- Buttons: **Resume** (primary, cream fill and dark text) replaces the current `.resume` link. **View projects** (secondary, outlined) links to `projects.html`.
- Pill row: **GitHub** (`https://github.com/faideleon`), **LinkedIn** (URL TODO, there isn't one in the repo yet), and a dashed mono **copy-email chip** showing `faideleon25@gmail.com` with a copy icon. Clicking it copies and shows "Copied" for about 1.5s.

### Mobile (< 900px)

- The art canvas becomes `position:absolute; inset:0` behind the hero content and uses **cover and crop**: cell size is set so the 192×108 grid covers the viewport, centered horizontally on the road and vertically on the sunset band.
- A dark gradient scrim (`linear-gradient(to bottom, rgba(29,30,32,.85) 0%, rgba(29,30,32,.35) 45%, rgba(29,30,32,.9) 100%)`) sits between the art and the text for legibility.
- The caption bar collapses to a small `● Available for work` chip.
- Stats become a 2×2 grid, and the pills wrap.

## 4. Copy

- Place line: `BAGUIO CITY · PHILIPPINES` (existing)
- Headline: `Hi, I'm Faisal.` with the existing blinking `.cursor`
- Sub: `Full-Stack Developer`
- Blurb: **TODO** (1–2 sentences, e.g. building clean interfaces, PostgreSQL-backed systems, and data-driven tools)
- Stats row (4 items, values **TODO** by Faisal). Constraint: **Ruta must not be presented as finished.** Show it as **"currently building"**, e.g. a status stat `Ruta — currently building`, or count shipped projects without it.

## 5. Technical design

### 5.1 Files

```
script/vendor/ascii-magic/kit.js                    # vendored from ascii-magic-art/lib/kit.js (MIT)
script/vendor/ascii-magic/switchback-dusk-drive.js  # vendored piece, with Baguio edits
script/vendor/ascii-magic/LICENSE                   # MIT notice
script/ascii-hero.js                                # renderer + effects (ES module)
script/ascii-portrait.js                            # portrait → dot glyph avatar (or folded into ascii-hero.js)
styles/style.css                                    # hero restyle (dark), nav dark variant, pills, stats
index.html                                          # new hero markup
```

- Load with `<script type="module" src="script/ascii-hero.js">`. The rest of the site uses classic scripts, so the module must not depend on load order with `script.js`, except for the shared Lenis/ScrollTrigger instance (see 5.6).
- No build step. Vendor the files instead of importing from the CDN so the site works offline and isn't affected by upstream changes. Pin the upstream commit hash in a comment at the top of each vendored file.
- Leave a credit comment, and optionally a footer link: "Scene: ASCII Magic (MIT)".

### 5.2 Piece API

```js
import create, { meta } from "./vendor/ascii-magic/switchback-dusk-drive.js";
const draw = create();
const frame = draw(tSeconds);   // { text, color } — color chars index meta.palette; ' ' = default ink
```

- The grid is a fixed **192 × 108** cells (16:9). Respect `meta.fps` as the simulation rate.
- Each frame, split `text` and `color` by line and draw cell `(x, y)` = glyph `text[y][x]` filled with `meta.palette[color[y][x]]`.

### 5.3 Renderer (`ascii-hero.js`)

- **Canvas**: DPR-aware (`canvas.width = cssW * dpr`). Cell width is `cssW / 192`, and cell height keeps the reference aspect ratio (cell height ≈ cell width × 1.66 at line-height 0.6, so check that the grid ends up 16:9 overall and adjust the font box to match).
- **Font**: monospace stack (`"Martian Mono", ui-monospace, monospace`), sized to fill the cell. Measure the glyph advance once and cache it.
- **Glyph atlas**: pre-render each `(glyph, paletteIndex)` pair to an offscreen atlas on first use and `drawImage` from it. 192×108 is about 20.7k cells, so per-cell `fillText` is too slow at 30fps.
- **Frame loop**: one `requestAnimationFrame`, **30fps cap**. Advance `t` only while the loop is running so the scene doesn't jump after a pause.
- **Pause** when the hero is offscreen (IntersectionObserver) or the tab is hidden (`visibilitychange`).
- **Resize**: ResizeObserver on the card (desktop) or hero (mobile), debounced at 100ms. Recompute cell metrics and rebuild the atlas when the font size changes.

### 5.4 Effects

**Ambient loop**: comes from the piece itself (stars, headlights, sky). Nothing extra needed.

**Intro: sunset fade-up** (about 1.6s, once per page load):
- Every cell gets a reveal delay based on brightness and region. Horizon-glow cells (the warm palette band) start at 0ms, ridges and sky gradient follow, stars twinkle on at about 900ms, and headlight cells switch on last (about 1.3s) with a quick flash.
- Implement as a per-cell alpha multiplier `a = smoothstep(delay, delay+400ms, elapsed)`, starting from a black canvas.
- Fade in the left text column (`opacity` + 8px `translateY`, staggered 60ms) once the horizon has appeared, at about 300ms.

**Cursor: subtle wake**:
- Track the pointer in grid coordinates. Keep a small displacement field (`dx, dy` per cell, Float32Array, 192×108).
- On pointer move, push cells within **radius ≈ 6 cells** away from the pointer, scaled by pointer velocity (clamped so cells move at most about 2 cells).
- Each frame, ease displacement back to 0 with a damped spring (stiffness ≈ 0.12, damping ≈ 0.8) so fast movement leaves a short wake.
- Draw each displaced cell at `(x+dx, y+dy)` in pixels. Don't resample glyphs; move the existing ones.
- On touch, follow the finger during `pointermove` with the same parameters (no tap shockwave).

**Scroll: subtle parallax**:
- While the sticky hero is being covered by `.information`, translate the art canvas by up to about −40px Y and dim it to about 0.75 opacity, scrubbed by ScrollTrigger over the hero's height. No glyph changes.

### 5.5 Baguio touches (vendored piece edits)

These are edits to our copy of `switchback-dusk-drive.js`. Keep them minimal and commented.
- More and taller **pine silhouettes** along the ridges and foreground (the piece already has a few cypress-like spires).
- A soft **fog band** settling in the valley between the road switchbacks, using `fbm` noise drift and a low-opacity cool palette entry.
- Optional: sparse warm **city-light specks** on a distant ridge.
- The look stays **Original**, and the palette stays the piece's dusk ramp.
- Validate with the upstream `node scripts/validate.mjs` logic (frame size, charset, under 12ms per frame) if practical. Otherwise add a dev-only timing check in the console.

### 5.6 Integration with existing site

- `.hero` stays `position: sticky; top: 0; min-height: 100vh`. Change the `.main-container` background from cream to charcoal **only inside the hero**.
- **Nav adapts**: add a `.nav-bar.on-dark` class while the hero is in view (ScrollTrigger `onToggle`, or the same IntersectionObserver). This flips the logo pill, `.logo-name` and the `MENU` button to cream text on a translucent dark background, with a 0.3s transition.
- **Seam**: `.information` already slides over the hero with a curved top (`border-top-*-radius: 250% 100px`), which is the main handoff. Add a short dark-to-cream **dither band** (about 24–40px, CSS `mask-image` with a small dither PNG or a repeating pattern) at the curve's leading edge so the transition reads as ASCII and not as a flat edge.
- Lenis + ScrollTrigger are already set up in `script/script.js`. `ascii-hero.js` should run after it and use the global `ScrollTrigger`, without creating a second Lenis instance.
- Remove the old `.image-profile` card markup and styles from the hero. Keep `assets/Halftone.webp` as the source for the avatar.

### 5.7 Portrait avatar

- Load `assets/Halftone.webp` (or `Profile-halftone.png`) into an offscreen canvas and sample it onto a small grid (about 40×40 cells).
- Per cell, map **darkness** (inverted luminance) to dot radius and draw **cream** dots on a transparent background. The white background has zero darkness, so it disappears and the face shows as cream dots on charcoal.
- Render once (static), at about 64px CSS size, DPR-aware. Optionally apply the same subtle wake on hover.
- Alt text: "Faisal's portrait".

### 5.8 Accessibility & performance guardrails (defaults accepted)

- `prefers-reduced-motion: reduce` → render **one still frame** (`draw(2.0)` or another good frame), with no intro, no wake and no parallax.
- Pause offscreen and on hidden tabs. 30fps cap.
- The canvas is `aria-hidden="true"`. The card container has `role="img"` and `aria-label="Animated ASCII art: cars on a switchback mountain road at dusk"`.
- All hero text is real HTML (for SEO and screen readers). Only the art and avatar are canvas.
- Before JS runs, the card shows a solid charcoal background with the caption bar, so the layout doesn't shift. (A pre-rendered poster PNG is an optional later improvement.)
- Budget: under 4ms per frame for render plus effects on a mid-range laptop; check in DevTools Performance.

## 6. Acceptance criteria

1. Desktop: the hero matches the reference layout (text left, framed 16:9 scene right, caption bar `Switchback Dusk Drive · Baguio | ● Available for work`), on a charcoal background.
2. The scene renders in the Original look with full per-cell color and animates (stars, moving headlights, fog).
3. On load: the sunset glow appears first, then ridges and sky, then stars, then headlights; text fades in at about 300ms.
4. Moving the pointer over the art pushes nearby glyphs (radius ≈ 6 cells, at most about 2 cells of displacement) and they spring back smoothly.
5. Scrolling down: the art shifts and dims slightly while the cream About section with the dither seam slides over it. The nav switches back to its cream style once past the hero.
6. Mobile: the art fills the hero behind the text (cover + crop, road and sunset in frame) with a legibility scrim, and the stats show as a 2×2 grid.
7. The portrait avatar shows cream dots on charcoal with no white box.
8. The copy-email chip copies `faideleon25@gmail.com` and confirms. The GitHub and LinkedIn chips link correctly.
9. Ruta is never labeled as finished; it shows as "currently building".
10. Reduced motion shows a static frame. The art pauses offscreen. No console errors. 30fps or better on desktop.

## 7. Open items / TODO

- [ ] LinkedIn URL
- [ ] Blurb copy (1–2 sentences)
- [ ] Stats: labels and values (Ruta = "currently building")
- [ ] Confirm the exact upstream commit to vendor
- [ ] Decide whether to keep a visible "Scene: ASCII Magic" credit in the footer (MIT doesn't require it; appreciated)

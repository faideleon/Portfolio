# Full Site Redesign: Dark ASCII System

Extends the ASCII hero ([ascii-hero-spec.md](ascii-hero-spec.md), built on `feat/ascii-hero`) to the whole site: `index.html`, `projects.html`, `project-zer0ed.html`, `project-ruta.html`, `project-portfolio.html`.

Reference: ascii-magic.com/ascii (dark library page, framed art cards with caption bars, mono UI, thin borders).

---

## 1. Decisions (from interview)

| Topic | Decision |
|---|---|
| Scope | **All pages**: home, projects.html, all three case studies |
| Color rule | **Text and backgrounds are black and white only.** **Art keeps its color**: the hero scene, ASCII project thumbnails, and the GitHub heatmap (dusk ramp) |
| Type | **Martian Mono** for headings, labels, numbers, nav and buttons. **SF Pro** (`SFP`, already self-hosted) for body paragraphs. Instrument Serif is dropped. |
| Live ASCII beyond the hero | Project thumbnails, section-title glyph words, GitHub heatmap, Contact lettering |
| Avatar | `assets/Faisal-Profile.png` converted to **white halftone dots** on black. **Small chip in the hero, plus a large (~320px) version in About** |
| Contact art | **Typographic ASCII**: "LET'S WORK TOGETHER" as animated glyph lettering |
| Thumbnails | Shown as **ASCII by default, resolving to the real image on hover**. Touch devices show the real image. |
| Experience + Selected projects | **Merged into one "Work" grid** in the library-tile style |
| Section-title words | **Slow ambient shimmer** |
| Heatmap | Glyph cells in a **dusk color ramp** (violet → orange) |
| Ruta copy | Ruta is **"currently building"** everywhere; reword any "shipped" claim that includes it |
| Nav | **Reference-style top bar**: logo + name left, inline links + bordered Resume button right. The slide-out menu panel is used **on mobile only**. |
| Case studies | **Same structure, reskinned** |
| About | **Portrait left, statement right**, tech stack as chips |
| projects.html | **Mirrors the library page**: headline/blurb/stats left, featured art card right, then filter chips and the tile grid |
| Contact | Copy-email chip, link row, live local time + status, simple form |
| Contact form | **mailto: fallback** (opens the visitor's email app pre-filled) |
| Social links | **GitHub and LinkedIn only.** Resume and Instagram are removed from link rows. The LinkedIn URL is still TODO. |
| Motion stack | **Drop Lenis** (native scrolling). Keep GSAP + ScrollTrigger for reveals and parallax. |
| Canvas performance | **Animate when near the viewport, pause when far** (IntersectionObserver with a generous rootMargin) |
| Build order | **Shared system first**, then home sections, projects.html, case studies |

## 2. Design system

### 2.1 Tokens (`styles/tokens.css`, loaded first on every page)

```css
:root {
  --bg: #000;               /* page background (pure black) */
  --bg-raised: #0a0a0a;     /* cards, caption bars */
  --ink: #fff;              /* primary text */
  --ink-2: rgba(255,255,255,.62);  /* secondary text */
  --ink-3: rgba(255,255,255,.38);  /* labels, meta */
  --line: rgba(255,255,255,.12);   /* 1px borders, dividers */
  --line-strong: rgba(255,255,255,.32);
  --font-mono: 'Martian Mono', ui-monospace, monospace;
  --font-body: 'SFP', -apple-system, system-ui, sans-serif;
  --gutter: clamp(16px, 5vw, 80px);
  --maxw: 1320px;
}
```

- No other colors in UI chrome. The only exception is the **availability dot**, which stays green (a status signal, not decoration). Confirm during build.
- The hero's `--ascii-bg: #0b0a12` moves to `#000` so the hero blends into the black page. The scene's own darkest palette entry is near-black, so the card edge stays visible through its border.
- Fix **`.green-icon`**, which is still referenced by the caption. Everything else from the old cream/charcoal palette (`rgb(231,227,223)`, `rgb(29,30,32)`, `rgb(54,51,51)`) is removed.

### 2.2 Type scale

| Role | Font | Size |
|---|---|---|
| Display (hero name, page titles) | Mono 400, -0.04em | `clamp(30px, 3.3vw, 54px)` |
| Section title (visible H2) | Mono 400 | `clamp(22px, 2vw, 32px)` |
| Label / eyebrow | Mono, uppercase, +1.5px tracking | 11px, `--ink-3` |
| Body | SF Pro 400 | 15–16px / 1.65, `--ink-2` |
| Meta / chips / buttons | Mono | 11–12px |
| Stats numbers | Mono | 22px |

### 2.3 Components (shared, in `styles/components.css`)

- **Art card**: 1px `--line` border, `--bg-raised`, 16:9 (or the piece's own ratio) stage, plus a caption bar (title left, meta right, top border). Used by the hero, Work tiles, the featured project and the About portrait.
- **Buttons**: primary (white fill, black text) and ghost (1px border). Both are square-cornered, 42px tall, in mono.
- **Pill/chip**: 34px, 1px border. A dashed variant is used for the copy chip.
- **Filter chips**: like the library's category row. The active chip is white-filled.
- **Stats row**: number + label pairs with a bottom divider (already built in the hero).
- **Key/value list**: for case-study sidebars.
- **Section header**: eyebrow label + visible H2 + optional right-aligned meta link, plus the big glyph word behind it (see 3.2).

### 2.4 Nav (all pages)

- Fixed top bar, 64px, `--bg` at 80% with `backdrop-filter: blur(10px)` and a bottom `--line` border once scrolled.
- Left: `F` logo mark + `FAISAL / PORTFOLIO` (mono, 11px).
- Right (≥ 900px): `Work · About · Contact` links (mono, `--ink-2`, white on hover/active), plus a bordered **Resume** button (href TODO).
- < 900px: links collapse into a **MENU** button that opens the existing slide-out panel, restyled black/white with mono numbered links.
- Replace the hide-on-scroll logic (currently driven by Lenis) with a native `scroll` listener using rAF throttling and the scroll-direction delta.
- On projects.html and the case studies, `Work` links to projects.html, and `About`/`Contact` link to `index.html#about` / `#contact`.

## 3. Shared ASCII engine

Refactor `script/ascii-hero.js` into a small module set:

```
script/ascii/
  engine.js       # shared loop (one rAF for all canvases), near/far pausing, DPR, resize, reduced motion
  scene.js        # piece player: square-cell "Original" renderer, intro, cursor wake (from ascii-hero.js)
  image.js        # image → glyph grid sampler (thumbnails, portrait); halftone-dot + character renderers
  lettering.js    # text → glyph-word renderer with ambient shimmer (section titles, Contact)
  heatmap.js      # GitHub contributions → glyph cells with dusk ramp
script/vendor/ascii-magic/ (unchanged)
```

### 3.1 Engine rules

- **One shared `requestAnimationFrame` loop.** Each registered canvas has `update(dt)`, `paint()` and an `active` flag.
- **Near/far pausing**: one IntersectionObserver with `rootMargin: "50% 0px"`. A canvas starts animating when it's within half a viewport of the screen and pauses beyond that. Hidden tab → everything pauses.
- 30fps cap per canvas. A canvas only repaints when its state changes.
- `prefers-reduced-motion`: every canvas paints one still frame. No shimmer, wake, intro or hover transitions; thumbnails show the real image.
- DPR capped at 2.

### 3.2 Section-title glyph words (`lettering.js`)

- Large background words: **WORK**, **ABOUT**, **ACTIVITY**, **CONTACT** (and **PROJECTS** on projects.html). They replace the current faded text (`EXPERIENCE`, `CONTRIBUTION`, `CONTACT`).
- Render the word into an offscreen canvas in a heavy font (mono 800), sample it into a glyph grid (about 8–10px cells), and draw characters from a ramp (`" .:-=+*#%@"`) in **white at about 10–14% opacity** so it stays a background texture.
- **Ambient shimmer**: each frame, about 2% of the "on" cells swap to a random glyph of the same density for 150–300ms. The word always stays readable.
- `aria-hidden="true"`. The real section heading is a normal HTML H2.

### 3.3 Image → ASCII thumbnails (`image.js`)

- Each Work tile and the featured project use a `<canvas>` over the real `<img>`.
- Sample the image to a grid (about 6px cells at the card width). Each cell gets its **source color** (art keeps color) and a character by brightness (`.:-=+*#%@`).
- **Hover/focus** (pointer devices): a 450ms transition. Cells dissolve in random order (or radially from the cursor) and reveal the real `<img>` underneath. On leave, it reverses.
- **Touch** (`(hover: none)`): skip the ASCII layer and show the real image.
- Grids are sampled once per image and size (cache them). Drawing is static, so it costs nothing unless the canvas is hovered.

### 3.4 Avatar: white halftone dots

- Source: `assets/avatar-source.webp` (480px, made from `Faisal-Profile.png`, transparent background).
- Mask the transparent backdrop (flood fill from the edges on alpha, already implemented). Inside the figure, **dot radius = brightness** (white dots on black, so skin and shirt are dense, and hair and suit are sparse or empty).
- Add a contrast stretch inside the figure (levels from the 5th to 95th percentile) so facial features read. Use a 45° rotated grid for a true newspaper-halftone look.
- **Hero chip**: 68px, tight face crop (about 0.5 × image width, starting at about 14% height), about 28 cells across.
- **About portrait**: about 320 × 420px, head and shoulders, about 70 cells across. It gets the hero's **cursor wake** and a very subtle dot "breathing" (radius ±4% on slow noise).

### 3.5 Heatmap (`heatmap.js`)

- Keeps the existing data source (`github-contributions-api.jogruber.de/v4/faideleon`) and stats (total, streak, active days).
- Draw the 53×7 grid as square cells with sizes and colors from the **dusk ramp** taken from the hero palette: level 0 is `#1c1830` (small square), then `#4a3a88`, `#b05a88`, `#f8a060`, and level 4 is `#ffc478` (full square).
- Hovering a cell shows a mono tooltip: `14 contributions · Mar 3`.
- Intro: cells fade in column by column from left to right when scrolled near.

### 3.6 Contact lettering

- "LET'S WORK TOGETHER" as a large foreground glyph word (white, full opacity, about 12px cells on desktop, wraps to 3 lines on mobile).
- Ambient shimmer plus the **cursor wake** from the hero.
- Real text is in an `<h2>` that is visually hidden but readable by screen readers.

## 4. Home page (index.html), section by section

1. **Hero**: as built. Changes: background → `#000`, caption dot stays, avatar uses the new halftone, and the pills are just **GitHub + LinkedIn** (LinkedIn TODO) plus the copy chip.
2. **About** (`#about`): two columns.
   - Left: the large halftone portrait in an art card, captioned `@faii.dl · Baguio City`.
   - Right: eyebrow `ABOUT`, statement in SF Pro (rewritten so **Ruta is currently building**; e.g. "…from a hand-built portfolio to a survival game, and now Ruta, a crowdsourced transit map for Baguio I'm currently building."), then tech stack chips (`PostGIS · Flutter · Supabase · GSAP · C# · Unity · PostgreSQL · JavaScript`). The chips replace the marquee.
   - Background word: **ABOUT**.
3. **Work** (`#work`, replaces Experience + Selected projects):
   - Section header with eyebrow `SELECTED WORK`, H2, and a right link `View all projects →` to projects.html.
   - Grid of 3 tiles (2 columns ≥ 1024px with the first tile spanning both, 1 column on mobile). Each tile is an art card: ASCII → real thumbnail, and a caption bar with the name (`Zer0ed`), role (`Software Engineer`), status (`Shipped` / `Currently building`), a stack line, and the whole tile linking to the case study.
   - Remove the pinned horizontal scroll and its JS (`.horizontal-section`, `experience-*` carousel code).
   - Background word: **WORK**.
4. **Activity** (GitHub contributions): stats row (total this year · current streak · active days) plus the glyph heatmap in an art card captioned `github.com/faideleon · 2026`. Background word: **ACTIVITY**.
5. **Contact** (`#contact`):
   - ASCII lettering "LET'S WORK TOGETHER" (3.6).
   - Large dashed **copy-email chip** (`faideleon25@gmail.com`).
   - **Link row**: GitHub · LinkedIn.
   - **Local time + status**: `Baguio 14:32 · UTC+8 · ● Available for work`, ticking every 30s with `Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila' })`.
   - **Simple form**: name, email, message, and a Send button. On submit it builds `mailto:faideleon25@gmail.com?subject=Portfolio enquiry from {name}&body={message}\n\n— {name} ({email})` and sets `location.href`. Fields are required and validated client-side. Add a note under the button: "Opens your email app."
6. **Footer**: `© 2026 Faisal D. Khan` · `Scene: ASCII Magic (MIT)` · back-to-top.

## 5. projects.html

- **Header, mirroring the library hero**:
  - Left: breadcrumb `Home / Projects`, mono H1 `All projects`, SF Pro blurb, stats row (`03 projects · 02 shipped · 01 building · 3 disciplines`), and a filter chip row (`All 03 · Full-stack 02 · Web 01 · Game 01`, from the existing `data-discipline` values).
  - Right: **featured project art card**. Use Ruta with a "Currently building" caption, or Zer0ed (decide during build). Its ASCII → real hover works the same as the tiles.
- **Grid**: the same Work tiles as home. Filtering hides and shows tiles with a 200ms fade, and the counts update.
- **CTA block**: art-card style box, `Have a project in mind?` + `Start a conversation →` to `index.html#contact`. Background word: **PROJECTS**.

## 6. Case-study pages (reskin, same structure)

Applies to `project-zer0ed.html`, `project-ruta.html` and `project-portfolio.html`, plus `styles/style_project_detail.css` and `script/script_project_detail.js`.
- **Header**: `← All projects` link, eyebrow `PROJECT 0X / DISCIPLINE`, mono H1, SF Pro lede, ghost button `View project archive ↗`. The right sidebar becomes a key/value list (Role, Discipline, Status, Related).
- **Cover**: the gallery's first image as a large art card with an ASCII → real hover.
- **Gallery**: keep the existing carousel. Restyle the frames as art cards with caption bars (`01 / 03 · Live map & community`), and make the controls bordered mono buttons.
- **Contribution & impact**: numbered list in mono (`01`, `02`…) with SF Pro text. The impact card becomes white-on-black with a 1px border. Its stats (`63%`, `~28 KB`) use the stats-row component.
- **Technology**: chips.
- **Prev / Next**: two bordered halves with mono labels.
- **Ruta page**: status **Currently building** in the sidebar and header. Adjust any "shipped" wording in its copy.

## 7. Removals / migrations

- Remove Lenis: the script tag, the `lenis` init, the `gsap.ticker` bridge and `lenis.scrollTo` calls. Menu anchor links use `element.scrollIntoView({ behavior: 'smooth' })`. Add `scroll-behavior: smooth` in CSS behind `prefers-reduced-motion: no-preference`. Check that the remaining ScrollTrigger uses (reveals, parallax) work with native scroll.
- Remove the horizontal Experience pin, the overlay-holder margin trick and the `scroll-watcher` bar (or restyle the bar white, 1px; decide during build).
- Remove the old cream palette rules, Instrument Serif and the Montserrat font link.
- Delete `assets/Halftone.webp` only if nothing references it. Keep `Faisal-Profile.png` as the master and `avatar-source.webp` as the runtime copy.
- `script_preview.js` (portfolio preview card): check what it does, and restyle or remove it.

## 8. Accessibility

- All headings, links and stats are real HTML. Canvases are `aria-hidden`, with `role="img"` + `aria-label` on art containers.
- Focus-visible outlines: 2px white with an offset, on every interactive element.
- Contrast: body text `--ink-2` (62% white on black ≈ 9:1); labels `--ink-3` only for non-essential meta.
- Hover-only effects (ASCII → real) are also triggered by `:focus-visible` on the tile link.
- Reduced motion: still frames, real images, no shimmer.

## 9. Build order

1. **System**: `tokens.css`, `components.css`, fonts, the new nav (all pages), Lenis removal, and the `script/ascii/` engine refactor (port the hero onto it, no visual change).
2. **Home**: About (+ large portrait), Work grid (thumbnails), Activity (heatmap), Contact (lettering, form, clock), footer, glyph words.
3. **projects.html**.
4. **Case studies** (shared CSS first, then per-page copy fixes).
5. QA: desktop/tablet/phone widths, reduced motion, keyboard navigation, no console errors, performance check (only near-viewport canvases running).

## 10. Acceptance criteria

1. Every page uses only black/white/grey for text and backgrounds. Color appears only in the hero scene, ASCII thumbnails, the heatmap ramp and the availability dot.
2. Headings, labels and UI use Martian Mono; paragraphs use SF Pro. No Instrument Serif or Montserrat anywhere.
3. The nav is a top bar with inline links + Resume on desktop, and a MENU panel on mobile, consistent on all 5 pages.
4. Home order: Hero → About → Work → Activity → Contact → Footer. The Experience section and its horizontal pin are gone.
5. The hero chip and the About portrait both render `Faisal-Profile.png` as white halftone dots with no background box. The About portrait responds to the cursor.
6. Work tiles show ASCII thumbnails and resolve to the real image on hover/focus. Touch shows real images.
7. Section glyph words shimmer subtly and stay readable. "LET'S WORK TOGETHER" is glyph lettering with a cursor wake.
8. The heatmap shows real GitHub data as dusk-colored glyph cells with tooltips.
9. The contact form opens a pre-filled email to `faideleon25@gmail.com`. The clock shows Baguio time.
10. Ruta is labeled "currently building" everywhere, and no copy says it shipped.
11. Lenis is removed; scrolling is native. Canvases pause when far from the viewport and the hidden tab, and resume when near.
12. Link rows show only GitHub and LinkedIn. No link points to `#`. (LinkedIn and Resume stay commented TODOs until URLs are provided.)

## 11. Open items / TODO

- [ ] LinkedIn URL
- [ ] Resume file/URL (nav Resume button and hero Resume button are hidden or commented until provided)
- [ ] Featured project on projects.html: Ruta (building) or Zer0ed (shipped)?
- [ ] Hero blurb and About statement: final copy review
- [ ] Keep the green availability dot as the single UI color exception? (assumed yes)

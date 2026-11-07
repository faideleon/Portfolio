/*
 * Image → square cells, in the hero scene's "Original" look: every cell is a centred square,
 * sized by brightness.
 *  - mountCellPortrait: a cut-out photo tinted through the dusk ramp (hero tile, About portrait)
 *  - mountAsciiThumb:   a screenshot in its real colours that dissolves into the real image on hover
 */
import { register, fitCanvas, createWake, reduceMotion, canHover, hash01, wake as wakeLoop } from "./engine.js";

const loaded = new Map();
export function loadImage(src) {
    if (!loaded.has(src)) {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
        loaded.set(src, img.decode().then(() => img));
    }
    return loaded.get(src);
}

/** Read pixels of a source rect, scaled to w x h. */
function pixels(img, sx, sy, sw, sh, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    return x.getImageData(0, 0, w, h).data;
}

/** Source rect that matches CSS object-fit: cover with an object-position (fractions). */
function coverRect(img, boxW, boxH, posX = 0.5, posY = 0.5) {
    const s = Math.max(boxW / img.width, boxH / img.height);
    const sw = boxW / s, sh = boxH / s;
    return [(img.width - sw) * posX, (img.height - sh) * posY, sw, sh];
}

const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/* ------------------------------------------------------------- dusk ramp */

// same family as the scene and the heatmap; the darkest stop is lifted so dark hair still reads on black
const DUSK = ["#2a2250", "#4a3a88", "#b05a88", "#f8a060", "#ffc478"].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
export function duskAt(v) {
    const p = Math.max(0, Math.min(1, v)) * (DUSK.length - 1), i = Math.min(DUSK.length - 2, Math.floor(p)), f = p - i;
    const [a, b] = [DUSK[i], DUSK[i + 1]];
    return `rgb(${a.map((c, k) => Math.round(c + (b[k] - c) * f)).join(",")})`;
}

/* ------------------------------------------------------------- portraits */

/** Position (0..1, bottom to top, overshooting both ends) of a light band that sweeps every few seconds. */
export function sweepPos(t, period = 5, travel = 1.6) {
    const p = (t % period) / travel;
    return p > 1 ? -9 : -0.2 + p * 1.4;
}

const LEVELS = 16, ALPHAS = 8;
const P_COLOR = Array.from({ length: LEVELS }, (_, q) => duskAt(q / (LEVELS - 1)));
const P_SIDE = Array.from({ length: LEVELS }, (_, q) => Math.min(0.92, 0.34 + 0.6 * Math.sqrt(q / (LEVELS - 1))));
const REVEAL_MS = 420;

/**
 * el: element with a <canvas> (and optionally an <img class="cell-photo"> for the hover reveal).
 *  src, crop: [x, y, w] as fractions of the image (height follows the element's aspect),
 *  cellPx: cell size in CSS px, intro: fade up from the bottom, shimmer: a soft band of light sweeps up the figure,
 *  wake: cursor pushes cells, reveal: the real photo cross-fades in on hover (hover-capable pointers only)
 */
export function mountCellPortrait(el, { src, crop = [0, 0, 1], cellPx = 6, intro = false, shimmer = false, wake: withWake = false, reveal = false } = {}) {
    const canvas = el.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const photo = el.querySelector(".cell-photo");
    let g = null, size = null, wake = null;
    let introStart = -1, introDone = !intro || reduceMotion, t = 0;
    const buckets = Array.from({ length: LEVELS * ALPHAS }, () => []);

    async function build() {
        const img = await loadImage(src);
        size = fitCanvas(canvas, el);
        const cell = cellPx * size.dpr;
        const cols = Math.max(6, Math.floor(size.w / cell)), rows = Math.max(6, Math.floor(size.h / cell));
        const cw = size.w / cols;                                  // stretch cells to fill exactly
        const sw = img.width * crop[2], sh = sw * (size.h / size.w);
        const sx = img.width * crop[0], sy = img.height * crop[1];
        const S = 3, px = pixels(img, sx, sy, sw, sh, cols * S, rows * S);
        const vals = new Float32Array(cols * rows), inside = new Uint8Array(cols * rows), figure = [];
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            let sum = 0, a = 0;
            for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) {
                const i = ((y * S + j) * cols * S + (x * S + k)) * 4, al = px[i + 3] / 255;
                sum += al * lum(px[i], px[i + 1], px[i + 2]);
                a += al;
            }
            const c = y * cols + x;
            if (a / (S * S) > 0.5) { inside[c] = 1; vals[c] = sum / a; figure.push(vals[c]); }
        }
        // stretch contrast inside the figure so features read at small sizes
        figure.sort((p, q) => p - q);
        const lo = figure[Math.floor(figure.length * 0.05)] ?? 0, hi = figure[Math.floor(figure.length * 0.95)] ?? 1;
        const level = new Int8Array(cols * rows).fill(-1);
        for (let c = 0; c < vals.length; c++) if (inside[c]) {
            const v = Math.min(1, Math.max(0, (vals[c] - lo) / (hi - lo || 1)));
            level[c] = Math.round(v * (LEVELS - 1));
        }
        const delay = new Float32Array(cols * rows);
        for (let c = 0; c < delay.length; c++) delay[c] = (1 - ((c / cols) | 0) / rows) * 650 + hash01(c) * 220;
        const cells = [];
        for (let c = 0; c < level.length; c++) if (level[c] >= 0) cells.push(c);
        g = { cols, rows, cw, ch: size.h / rows, level, delay, cells };
        if (withWake && !wake) wake = createWake(cols, rows, { radius: 5, maxD: 1.2, strength: 0.2 });
        // line the photo up with the crop, so the reveal swaps in place
        if (photo) {
            const w = size.cssW / crop[2];
            Object.assign(photo.style, { width: `${w}px`, left: `${-crop[0] * w}px`, top: `${-crop[1] * w * (img.height / img.width)}px` });
        }
        paint(introDone ? Infinity : introStart < 0 ? 0 : performance.now() - introStart);
        el.classList.add("cells-ready");
    }

    function paint(introT) {
        if (!g) return;
        for (const b of buckets) b.length = 0;
        const { cols, rows, cw, ch, level, delay, cells } = g;
        const band = shimmer && !reduceMotion ? sweepPos(t) : -9;
        for (const c of cells) {
            let a = 1;
            if (introT !== Infinity) {
                const p = (introT - delay[c]) / REVEAL_MS;
                if (p <= 0) continue;
                if (p < 1) a = p * p * (3 - 2 * p);
            }
            let lv = level[c];
            if (band > -9) {
                // distance from the travelling band, slightly tilted; cells in it glow up a few steps
                const d = Math.abs((1 - ((c / cols) | 0) / rows) * 0.85 + (c % cols) / cols * 0.15 - band);
                if (d < 0.12) lv = Math.min(LEVELS - 1, lv + Math.round(4 * (1 - d / 0.12) ** 2));
            }
            const ai = Math.round(a * (ALPHAS - 1));
            if (ai > 0) buckets[lv * ALPHAS + ai].push(c);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let b = 0; b < buckets.length; b++) {
            const list = buckets[b];
            if (!list.length) continue;
            const q = (b / ALPHAS) | 0, side = P_SIDE[q];
            ctx.fillStyle = P_COLOR[q];
            ctx.globalAlpha = (b % ALPHAS) / (ALPHAS - 1);
            ctx.beginPath();
            for (const c of list) {
                const x = c % cols, y = (c / cols) | 0;
                const sx = cw * side, sy = ch * side;
                const ox = wake ? wake.dx[c] : 0, oy = wake ? wake.dy[c] : 0;
                ctx.rect((x + ox) * cw + (cw - sx) / 2, (y + oy) * ch + (ch - sy) / 2, sx, sy);
            }
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    const animated = !reduceMotion && (intro || shimmer || withWake);
    const item = register(el, {
        fps: 30,
        running: animated,
        resize: () => build().catch(() => el.classList.add("is-fallback")),
        tick(now, dt) {
            if (!g) return;
            t += dt;
            let dirty = false;
            if (!introDone) {
                if (introStart < 0) introStart = now;
                if (now - introStart > 650 + 220 + REVEAL_MS) introDone = true;
                dirty = true;
            }
            if (shimmer) dirty = true;
            if (wake?.active) { wake.step(); dirty = true; }
            if (dirty) paint(introDone ? Infinity : now - introStart);
        },
    });

    if (withWake && !reduceMotion) {
        el.addEventListener("pointermove", (e) => {
            if (!g) return;
            const r = canvas.getBoundingClientRect(), s = size.dpr;
            wake.move(((e.clientX - r.left) * s) / g.cw, ((e.clientY - r.top) * s) / g.ch);
        }, { passive: true });
        el.addEventListener("pointerleave", () => wake?.leave());
    }
    if (reveal && photo && canHover) el.classList.add("can-reveal");
    if (photo) loadImage(src).then(() => (photo.src = src)).catch(() => {});
    build().catch(() => el.classList.add("is-fallback"));
    return item;
}

/* ------------------------------------------------------------- thumbnails */

// hover reveal: a diagonal wipe from the top-left; cells near the front shrink smoothly to nothing
const WIPE_SOFT = 0.12;
const wipeAt = (x, y, cols, rows) => (x / cols) * 0.65 + (y / rows) * 0.35;
const shrink = (h, progress) => {
    const p = progress * (1 + WIPE_SOFT);
    return Math.max(0, Math.min(1, (h + WIPE_SOFT - p) / WIPE_SOFT));
};

/**
 * thumb: element containing the real <img> and a <canvas class="thumb-ascii">.
 * Shows coloured square cells until hover/focus, then dissolves to the image. Touch and reduced
 * motion skip the effect entirely (the real image shows).
 */
export function mountAsciiThumb(thumb, { trigger = thumb, cellPx = 5 } = {}) {
    if (!canHover || reduceMotion) return;
    const img = thumb.querySelector("img");
    const canvas = thumb.querySelector(".thumb-ascii");
    const ctx = canvas.getContext("2d");
    let g = null, progress = 0, target = 0, raf = 0;

    async function build() {
        const im = await loadImage(img.currentSrc || img.src);
        const size = fitCanvas(canvas, thumb);
        const cell = cellPx * size.dpr;
        const cols = Math.max(8, Math.round(size.w / cell)), rows = Math.max(5, Math.round(size.h / cell));
        const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
        const [sx, sy, sw, sh] = coverRect(im, size.w, size.h, pos[0] ?? 0.5, pos[1] ?? 0.5);
        const px = pixels(im, sx, sy, sw, sh, cols, rows);
        // light UI screenshots would become a solid wall of squares; for those, draw the "ink"
        // (dark lines and coloured accents) and let the white background fall away
        let mean = 0;
        for (let i = 0; i < px.length; i += 4) mean += lum(px[i], px[i + 1], px[i + 2]);
        const invert = mean / (px.length / 4) > 0.6;
        const groups = new Map();
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            let r = px[i], gg = px[i + 1], b = px[i + 2];
            const l = lum(r, gg, b), sat = (Math.max(r, gg, b) - Math.min(r, gg, b)) / 255;
            const level = invert ? Math.max(1 - l, sat * 0.9) : Math.pow(l, 0.8);
            if (level < 0.06) continue;
            if (invert && sat < 0.25) r = gg = b = 60 + level * 195;        // neutral ink: dim grey paper, light grey lines
            const k = invert ? 1.1 : 1.3, q = (v) => Math.min(255, Math.round((v * k) / 20) * 20);
            const side = Math.min(0.94, 0.28 + 0.7 * Math.sqrt(level));
            const key = `rgb(${q(r)},${q(gg)},${q(b)})`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push([x, y, side, wipeAt(x, y, cols, rows)]);
        }
        const hashes = new Float32Array(cols * rows);
        for (let c = 0; c < hashes.length; c++) hashes[c] = wipeAt(c % cols, (c / cols) | 0, cols, rows);
        g = { cols, rows, cw: size.w / cols, ch: size.h / rows, groups, hashes };
        paint();
        thumb.classList.add("ascii-ready");
    }

    function paint() {
        if (!g) return;
        const { cols, cw, ch, groups, hashes } = g;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // black under every cell that has not dissolved yet
        ctx.fillStyle = "#000";
        if (progress <= 0) ctx.fillRect(0, 0, canvas.width, canvas.height);
        else {
            ctx.beginPath();
            for (let c = 0; c < hashes.length; c++) {
                const f = shrink(hashes[c], progress);
                if (f <= 0) continue;
                const x = c % cols, y = (c / cols) | 0;
                if (f >= 1) ctx.rect(x * cw, y * ch, cw + 0.5, ch + 0.5);
                else ctx.rect(x * cw + (cw * (1 - f)) / 2, y * ch + (ch * (1 - f)) / 2, cw * f, ch * f);
            }
            ctx.fill();
        }
        for (const [color, list] of groups) {
            ctx.fillStyle = color;
            ctx.beginPath();
            for (const [x, y, side, h] of list) {
                const f = shrink(h, progress);
                if (f <= 0) continue;
                const sx = cw * side * f, sy = ch * side * f;
                ctx.rect(x * cw + (cw - sx) / 2, y * ch + (ch - sy) / 2, sx, sy);
            }
            ctx.fill();
        }
    }

    function animate() {
        raf = 0;
        const step = 1 / (0.6 * 60);
        progress = target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step);
        paint();
        if (progress !== target) raf = requestAnimationFrame(animate);
    }
    const go = (v) => { target = v; if (!raf) raf = requestAnimationFrame(animate); };
    trigger.addEventListener("pointerenter", () => go(1));
    trigger.addEventListener("pointerleave", () => go(0));
    trigger.addEventListener("focusin", () => go(1));
    trigger.addEventListener("focusout", () => go(0));

    const start = () => build().catch(() => {});
    if (img.complete && img.naturalWidth) start(); else img.addEventListener("load", start, { once: true });
    new ResizeObserver(() => g && start()).observe(thumb);
    wakeLoop();
}

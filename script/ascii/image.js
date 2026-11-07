/*
 * Image → glyph renderers.
 *  - mountHalftone: a photo as white halftone dots on black (hero chip, About portrait)
 *  - mountAsciiThumb: a screenshot as coloured ASCII that dissolves into the real image on hover
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

/* ------------------------------------------------------------------ halftone */

/**
 * el: element with a <canvas>. Options:
 *  src, cols (dots across), crop: [x, y, w] as fractions of the image (h follows the element's aspect),
 *  animate: breathing + cursor wake
 */
export function mountHalftone(el, { src, cols = 28, crop = [0.25, 0.14, 0.5], animate = false } = {}) {
    const canvas = el.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let grid = null, size = null, t = 0, wake = null;

    async function build() {
        const img = await loadImage(src);
        size = fitCanvas(canvas, el);
        const aspect = size.h / size.w;
        const rows = Math.round(cols * aspect / 0.866);              // offset rows sit closer together
        const sw = img.width * crop[2], sh = sw * aspect;
        const sx = img.width * crop[0], sy = img.height * crop[1];
        const S = 3;                                                // supersample per cell
        const px = pixels(img, sx, sy, sw, sh, cols * S, rows * S);
        const vals = new Float32Array(cols * rows), inside = new Uint8Array(cols * rows);
        const figure = [];
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            let sum = 0, a = 0;
            for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) {
                const i = ((y * S + j) * cols * S + (x * S + k)) * 4, al = px[i + 3] / 255;
                sum += al * (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
                a += al;
            }
            const c = y * cols + x;
            if (a / (S * S) > 0.5) { inside[c] = 1; vals[c] = sum / a; figure.push(vals[c]); }
        }
        // stretch contrast inside the figure so features read at small sizes
        figure.sort((p, q) => p - q);
        const lo = figure[Math.floor(figure.length * 0.05)] ?? 0, hi = figure[Math.floor(figure.length * 0.95)] ?? 1;
        for (let c = 0; c < vals.length; c++) vals[c] = inside[c] ? Math.min(1, Math.max(0, (vals[c] - lo) / (hi - lo || 1))) : 0;
        grid = { cols, rows, vals };
        if (animate && !wake) wake = createWake(cols, rows, { radius: 5, maxD: 1.6, strength: 0.22 });
        paint();
    }

    function paint() {
        if (!grid) return;
        const { cols, rows, vals } = grid;
        const cw = size.w / cols, ch = cw * 0.866;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const i = y * cols + x, v = vals[i];
            if (v < 0.04) continue;
            let r = (cw / 2) * Math.min(1.05, Math.sqrt(v) * 1.05);
            if (animate) r *= 1 + 0.05 * Math.sin(t * 1.3 + hash01(i) * 6.28);
            const cx = (x + 0.5 + (y & 1) * 0.5 + (wake ? wake.dx[i] : 0)) * cw;
            const cy = (y + 0.5 + (wake ? wake.dy[i] : 0)) * ch;
            ctx.moveTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
        ctx.fill();
    }

    const item = register(el, {
        fps: 24,
        running: animate && !reduceMotion,
        resize: () => build(),
        tick(now, dt) {
            t += dt;
            if (wake?.active) wake.step();
            paint();
        },
    });

    if (animate && !reduceMotion) {
        el.addEventListener("pointermove", (e) => {
            if (!grid) return;
            const r = canvas.getBoundingClientRect(), cw = r.width / grid.cols;
            wake.move((e.clientX - r.left) / cw, (e.clientY - r.top) / (cw * 0.866));
        }, { passive: true });
        el.addEventListener("pointerleave", () => wake?.leave());
    }
    build().catch(() => el.classList.add("is-fallback"));
    return item;
}

/* ------------------------------------------------------------- ascii thumbs */

const RAMP = " .:-=+*#%@";

/**
 * thumb: element containing the real <img> and a <canvas class="thumb-ascii">.
 * Shows coloured ASCII until hover/focus, then dissolves to the image. Touch and reduced motion
 * skip the effect entirely (the real image shows).
 */
export function mountAsciiThumb(thumb, { trigger = thumb, cellPx = 7 } = {}) {
    if (!canHover || reduceMotion) return;
    const img = thumb.querySelector("img");
    const canvas = thumb.querySelector(".thumb-ascii");
    const ctx = canvas.getContext("2d");
    let cells = null, progress = 0, target = 0, raf = 0, size = null;

    async function build() {
        const src = img.currentSrc || img.src;
        const im = await loadImage(src);
        size = fitCanvas(canvas, thumb);
        const cell = cellPx * size.dpr;
        const cols = Math.max(8, Math.round(size.w / cell)), rows = Math.max(5, Math.round(size.h / (cell * 1.6)));
        const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
        const [sx, sy, sw, sh] = coverRect(im, size.w, size.h, pos[0] ?? 0.5, pos[1] ?? 0.5);
        const px = pixels(im, sx, sy, sw, sh, cols, rows);
        const lumAt = (i) => (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        // light UI screenshots would become a wall of dense glyphs; for those, draw the "ink"
        // instead (dark lines and coloured accents) and let the white background fall away
        let mean = 0;
        for (let i = 0; i < px.length; i += 4) mean += lumAt(i);
        const invert = mean / (px.length / 4) > 0.6;
        const groups = new Map();
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            let r = px[i], g = px[i + 1], b = px[i + 2];
            const lum = lumAt(i);
            const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
            const level = invert ? Math.max(1 - lum, sat * 0.9) : Math.pow(lum, 0.8);
            const ch = RAMP[Math.min(RAMP.length - 1, Math.round(level * (RAMP.length - 1)))];
            if (invert && sat < 0.25) r = g = b = 150 + (1 - lum) * 90;   // neutral ink → light grey
            // brighten so glyph colour reads on black; quantise to batch fillStyle changes
            const k = invert ? 1.1 : 1.35, q = (v) => Math.min(255, Math.round((v * k) / 24) * 24);
            const key = `rgb(${q(r)},${q(g)},${q(b)})`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push([x, y, ch, hash01(y * cols + x)]);
        }
        cells = { cols, rows, cw: size.w / cols, ch: size.h / rows, groups };
        ctx.font = `${Math.round(cells.ch * 0.95)}px "Martian Mono", ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        paint();
        thumb.classList.add("ascii-ready");
    }

    function paint() {
        if (!cells) return;
        const { cw, ch, groups } = cells;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // black under every cell that is still ASCII
        ctx.fillStyle = "#000";
        ctx.beginPath();
        for (const list of groups.values()) for (const [x, y, , h] of list) if (h >= progress) ctx.rect(x * cw, y * ch, cw + 0.5, ch + 0.5);
        ctx.fill();
        for (const [color, list] of groups) {
            ctx.fillStyle = color;
            for (const [x, y, c, h] of list) if (c !== " " && h >= progress) ctx.fillText(c, (x + 0.5) * cw, (y + 0.55) * ch);
        }
    }

    function animate() {
        raf = 0;
        const step = 1 / (0.45 * 60);
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
    new ResizeObserver(() => cells && start()).observe(thumb);
    wakeLoop();
}

/*
 * Plays the vendored "Switchback Dusk Drive" piece (ascii-magic, MIT) in the "Original" look:
 * each cell is a square in its palette colour, sized by brightness. On top: sunset fade-up intro,
 * cursor wake, and (on phones) a cover-and-crop fit.
 *
 * The piece returns frames as { text, color }: one glyph per cell from "▁▂▃▄▅▆▇█" and one palette key.
 */
import create, { meta } from "../vendor/ascii-magic/switchback-dusk-drive.js";
import { KEYS } from "../vendor/ascii-magic/kit.js";
import { register, fitCanvas, createWake, reduceMotion, hash01 } from "./engine.js";

const COLS = meta.cols, ROWS = meta.rows, N = COLS * ROWS;
const LEVELS = "▁▂▃▄▅▆▇█";
const PIECE_START = 8;            // seconds into the loop, so a few stars are already out
const STILL_T = 20;               // frame shown for reduced motion
const FOCUS = [104, 62];          // grid point kept in view when cropped (road + glow)
const REVEAL_MS = 450, INTRO_MS = 1250 + 80 + REVEAL_MS;

const palette = KEYS.slice(0, Object.keys(meta.palette).length).split("").map((k) => meta.palette[k]);
const keyIndex = new Map(KEYS.split("").map((k, i) => [k, i]));
const palLum = palette.map((h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
});
// square side (fraction of a cell) for each palette colour x brightness level: dark cells small, lit cells full
const SIDE = new Float32Array(palette.length * 8);
for (let c = 0; c < palette.length; c++) for (let lv = 0; lv < 8; lv++) {
    const y = Math.min(1, palLum[c] * (0.7 + lv * 0.08));
    SIDE[c * 8 + lv] = Math.min(0.94, 0.22 + 0.82 * Math.sqrt(y));
}
// palette groups, in the order the piece builds them
const group = (i) => (i < 14 ? "sky" : i < 17 ? "far" : i < 23 ? "land" : i < 25 ? "pine" : i < 30 ? "light" : i < 32 ? "star" : "fog");
function revealDelay(i, cell) {
    const j = hash01(cell);
    switch (group(i)) {
        case "sky": return 650 * (1 - i / 13) + j * 120;   // horizon gold first, deep blue last
        case "far": return 260 + j * 120;
        case "land": case "pine": case "fog": return 460 + j * 160;
        case "star": return 900 + j * 350;
        default: return 1250 + j * 80;                      // headlights, tail lights, town
    }
}

export function mountScene(stage, { onReady, coverQuery = "(max-width: 900px)", bg = "#000" } = {}) {
    const canvas = stage.querySelector("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    const cover = matchMedia(coverQuery);
    const draw = create();
    const level = new Uint8Array(N), colour = new Uint8Array(N), delay = new Float32Array(N);
    const wake = createWake(COLS, ROWS);
    const ALPHA_STEPS = 8;
    const buckets = Array.from({ length: palette.length * ALPHA_STEPS }, () => []);

    let cell = 1, ox = 0, oy = 0, dpr = 1;
    let clock = PIECE_START, frameIdx = -1, introStart = -1, introDone = reduceMotion, dirty = true;

    function loadFrame(t) {
        const { text, color } = draw(t);
        for (let y = 0, ti = 0, i = 0; y < ROWS; y++, ti++) for (let x = 0; x < COLS; x++, ti++, i++) {
            level[i] = LEVELS.indexOf(text[ti]);
            colour[i] = keyIndex.get(color[ti]) ?? 0;
        }
    }

    function resize() {
        const s = fitCanvas(canvas, stage);
        dpr = s.dpr;
        const fit = cover.matches ? Math.max : Math.min;
        cell = fit(s.w / COLS, s.h / ROWS);
        const gw = COLS * cell, gh = ROWS * cell;
        if (cover.matches) {
            ox = Math.min(0, Math.max(s.w - gw, s.w / 2 - FOCUS[0] * cell));
            oy = Math.min(0, Math.max(s.h - gh, s.h / 2 - FOCUS[1] * cell));
        } else { ox = (s.w - gw) / 2; oy = (s.h - gh) / 2; }
        dirty = true;
        // repaint now if the loop won't do it for us (still frame, or paused after the intro)
        if (reduceMotion || (introDone && !item.near)) paint(Infinity);
    }

    function paint(introT) {
        for (const b of buckets) b.length = 0;
        for (let i = 0; i < N; i++) {
            let a = ALPHA_STEPS - 1;
            if (introT !== Infinity) {
                const p = (introT - delay[i]) / REVEAL_MS;
                if (p <= 0) continue;
                if (p < 1) a = Math.floor(p * p * (3 - 2 * p) * (ALPHA_STEPS - 1));
                if (a <= 0) continue;
            }
            buckets[colour[i] * ALPHA_STEPS + a].push(i);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const { dx, dy } = wake;
        for (let b = 0; b < buckets.length; b++) {
            const list = buckets[b];
            if (!list.length) continue;
            ctx.fillStyle = palette[(b / ALPHA_STEPS) | 0];
            ctx.globalAlpha = ((b % ALPHA_STEPS) + 1) / ALPHA_STEPS;
            ctx.beginPath();
            for (const i of list) {
                const x = i % COLS, y = (i / COLS) | 0;
                const s = cell * SIDE[colour[i] * 8 + level[i]];
                ctx.rect(ox + (x + dx[i]) * cell + (cell - s) / 2, oy + (y + dy[i]) * cell + (cell - s) / 2, s, s);
            }
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    const item = register(stage, {
        fps: 30,
        resize,
        tick(now, dt) {
            clock += dt;
            const fi = Math.floor(clock * meta.fps);
            if (fi !== frameIdx) { frameIdx = fi; loadFrame(clock); dirty = true; }
            if (introStart < 0) {
                introStart = now;
                for (let i = 0; i < N; i++) delay[i] = revealDelay(colour[i], i);
                onReady?.();
            }
            if (!introDone && now - introStart > INTRO_MS) introDone = true;
            if (!introDone) dirty = true;
            if (wake.active) { wake.step(); dirty = true; }
            if (dirty) { paint(introDone ? Infinity : now - introStart); dirty = false; }
        },
    });

    loadFrame(reduceMotion ? STILL_T : PIECE_START);
    resize();

    if (reduceMotion) {
        item.running = false;
        paint(Infinity);
        onReady?.();
        return item;
    }

    const host = stage.closest("[data-ascii-pointer]") || stage;
    host.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        wake.move(((e.clientX - r.left) * dpr - ox) / cell, ((e.clientY - r.top) * dpr - oy) / cell);
    }, { passive: true });
    host.addEventListener("pointerleave", () => wake.leave());
    return item;
}

/*
 * Ordered-dither fade: the card colour breaks into a Bayer 8x8 dot pattern that thins out into the page,
 * shifting amber → pink → purple, with a huge word knocked out of the dots (cropped by the bottom edge).
 * Cells are whole device pixels. Optional cursor wake on hover devices.
 *
 * Markup: <div class="dither" data-text="Faisal"><canvas></canvas></div>
 */
import { register, fitCanvas, createWake, reduceMotion, canHover } from "./engine.js";

// 8x8 Bayer matrix, normalised to (0, 1)
const BAYER = (() => {
    const m = [[0]];
    let n = 1, out = m;
    while (n < 8) {
        const next = Array.from({ length: n * 2 }, () => new Array(n * 2));
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
            const v = out[y][x] * 4;
            next[y][x] = v; next[y][x + n] = v + 2; next[y + n][x] = v + 3; next[y + n][x + n] = v + 1;
        }
        out = next; n *= 2;
    }
    return out.map((r) => r.map((v) => (v + 0.5) / 64));
})();

const STOPS = [[248, 160, 96], [176, 90, 136], [74, 58, 136]];       // amber, pink, purple
const TONES = 10;
const toneColor = (t) => {
    const p = t * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(p)), f = p - i;
    return `rgb(${STOPS[i].map((c, k) => Math.round(c + (STOPS[i + 1][k] - c) * f)).join(",")})`;
};
const COLORS = Array.from({ length: TONES }, (_, i) => toneColor(i / (TONES - 1)));

export function mountDither(el, { cellPx = 4, weight = 700 } = {}) {
    const canvas = el.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let g = null, wake = null;

    function build() {
        const size = fitCanvas(canvas, el);
        const cell = Math.max(2, Math.round((size.cssW < 700 ? 3 : cellPx) * size.dpr));
        const cols = Math.ceil(size.w / cell), rows = Math.ceil(size.h / cell);
        // knockout word: fit ~94% of the width, baseline pushed below the bottom edge so it is cropped
        const m = document.createElement("canvas");
        m.width = cols; m.height = rows;
        const mx = m.getContext("2d", { willReadFrequently: true });
        const family = getComputedStyle(el).fontFamily || "sans-serif";
        mx.font = `${weight} 100px ${family}`;
        const word = el.dataset.text || "";
        const fs = Math.min((cols * 0.94) / mx.measureText(word).width * 100, rows * 1.15);
        mx.font = `${weight} ${fs}px ${family}`;
        mx.textAlign = "center";
        mx.textBaseline = "alphabetic";
        mx.fillStyle = "#fff";
        mx.fillText(word, cols / 2, rows + fs * (size.cssW < 700 ? 0.02 : 0.12));
        const mask = mx.getImageData(0, 0, cols, rows).data;

        const on = [], tone = [];
        for (let y = 0; y < rows; y++) {
            const t = y / Math.max(1, rows - 1);
            const density = Math.pow(1 - t, 0.85);
            const tn = Math.min(TONES - 1, Math.round(t * 1.15 * (TONES - 1)));
            for (let x = 0; x < cols; x++) {
                if (density <= BAYER[y & 7][x & 7]) continue;
                if (mask[(y * cols + x) * 4 + 3] > 110) continue;
                on.push(y * cols + x);
                tone.push(tn);
            }
        }
        g = { cols, rows, cell, on, tone };
        if (!reduceMotion && canHover) wake = createWake(cols, rows, { radius: 7, maxD: 2.2, strength: 0.22 });
        paint();
    }

    function paint() {
        if (!g) return;
        const { cols, cell, on, tone } = g;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let tn = 0; tn < TONES; tn++) {
            ctx.fillStyle = COLORS[tn];
            ctx.beginPath();
            for (let k = 0; k < on.length; k++) {
                if (tone[k] !== tn) continue;
                const i = on[k], x = i % cols, y = (i / cols) | 0;
                const ox = wake ? Math.round(wake.dx[i] * cell) : 0, oy = wake ? Math.round(wake.dy[i] * cell) : 0;
                ctx.rect(x * cell + ox, y * cell + oy, cell, cell);
            }
            ctx.fill();
        }
    }

    register(el, {
        fps: 30,
        running: !!(!reduceMotion && canHover),
        resize: build,
        tick() { if (wake?.active) { wake.step(); paint(); } },
    });

    if (!reduceMotion && canHover) {
        el.addEventListener("pointermove", (e) => {
            if (!g || !wake) return;
            const r = canvas.getBoundingClientRect(), s = canvas.width / r.width;
            wake.move(((e.clientX - r.left) * s) / g.cell, ((e.clientY - r.top) * s) / g.cell);
        }, { passive: true });
        el.addEventListener("pointerleave", () => wake?.leave());
    }
    document.fonts?.ready.then(build);
    build();
}

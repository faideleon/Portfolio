/*
 * Text → square-cell lettering, in the hero scene's look: each lit cell is a square sized by how much
 * of it the letter covers. Every few seconds a band of light sweeps across the word. Optional cursor wake.
 *
 * Markup: <div class="glyph-word" data-text="WORK" [data-text-narrow="LET'S|WORK|TOGETHER"]
 *              [data-color="dusk"] [data-align="left"]><canvas></canvas></div>
 * "|" breaks lines. Colour "white" (default) or "dusk" (purple → amber, left to right).
 */
import { register, fitCanvas, createWake, reduceMotion } from "./engine.js";
import { duskAt, sweepPos } from "./image.js";

const TONES = 12;

export function mountLettering(el, { cellPx = 10, alpha = 1, weight = 800, wake: withWake = false, narrowAt = 700, color = "white", align = "center" } = {}) {
    const canvas = el.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const colors = Array.from({ length: TONES }, (_, i) => (color === "dusk" ? duskAt(0.25 + 0.75 * (i / (TONES - 1))) : "#fff"));
    let g = null, wake = null, size = null;

    function build() {
        size = fitCanvas(canvas, el);
        const narrow = el.dataset.textNarrow && size.cssW < narrowAt;
        const lines = (narrow ? el.dataset.textNarrow : el.dataset.text).split("|");
        // keep at least ~6 cells per letter so narrow screens still read the word
        const longest = Math.max(...lines.map((l) => l.length));
        const cellCss = Math.max(3, Math.min(cellPx, size.cssW / (longest * 6)));
        const cell = cellCss * size.dpr;
        const cols = Math.max(4, Math.floor(size.w / cell)), rows = Math.max(2, Math.floor(size.h / cell));
        // draw the text into a cols x rows mask
        const S = 4, mw = cols * S, mh = rows * S;
        const m = document.createElement("canvas");
        m.width = mw; m.height = mh;
        const mx = m.getContext("2d", { willReadFrequently: true });
        const family = `"Martian Mono", ui-monospace, monospace`;
        mx.font = `${weight} 100px ${family}`;
        const widest = Math.max(...lines.map((l) => mx.measureText(l).width));
        let fs = (mw * 0.99) / widest * 100;
        if (fs * 0.9 * lines.length > mh * 0.98) fs = (mh * 0.98) / (0.9 * lines.length);
        const lh = fs * 0.9;
        mx.font = `${weight} ${fs}px ${family}`;
        mx.textAlign = align === "left" ? "left" : "center";
        mx.textBaseline = "middle";
        mx.fillStyle = "#fff";
        const top = (mh - lh * lines.length) / 2;
        lines.forEach((l, i) => mx.fillText(l, align === "left" ? 0 : mw / 2, top + lh * (i + 0.5)));
        const d = mx.getImageData(0, 0, mw, mh).data;
        const on = [], side = [];
        let minX = cols, maxX = 0;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            let s = 0;
            for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) s += d[((y * S + j) * mw + x * S + k) * 4 + 3];
            const c = s / (S * S * 255);
            if (c > 0.3) { on.push(y * cols + x); side.push(0.5 + 0.42 * c); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
        }
        const tone = on.map((i) => Math.round(((i % cols) - minX) / Math.max(1, maxX - minX) * (TONES - 1)));
        const pos = on.map((i) => ((i % cols) - minX) / Math.max(1, maxX - minX) * 0.8 + ((i / cols) | 0) / rows * 0.2);
        g = { cols, rows, cw: size.w / cols, ch: size.h / rows, on, side, tone, pos };
        if (withWake && !wake) wake = createWake(cols, rows, { radius: 5, maxD: 1.8, strength: 0.2 });
        paint();
    }

    function paint() {
        if (!g) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = alpha;
        const { cols, cw, ch, on, side, tone, pos } = g;
        const band = reduceMotion ? -9 : sweepPos(t, 6, 1.8);
        for (let tn = 0; tn < TONES; tn++) {
            ctx.fillStyle = colors[tn];
            ctx.beginPath();
            for (let k = 0; k < on.length; k++) {
                if (tone[k] !== tn) continue;
                const i = on[k], x = i % cols, y = (i / cols) | 0;
                const d = Math.abs(pos[k] - band);
                const s = d < 0.1 ? Math.min(1, side[k] + 0.14 * (1 - d / 0.1) ** 2) : side[k];
                const ox = wake ? wake.dx[i] : 0, oy = wake ? wake.dy[i] : 0;
                ctx.rect((x + ox) * cw + (cw * (1 - s)) / 2, (y + oy) * ch + (ch * (1 - s)) / 2, cw * s, ch * s);
            }
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    let t = 0, wasSweeping = false;
    const item = register(el, {
        fps: 30,
        running: !reduceMotion,
        resize: build,
        tick(now, dt) {
            t += dt;
            const sweeping = sweepPos(t, 6, 1.8) > -9;
            let dirty = sweeping || wasSweeping;      // one last paint to clear the band
            wasSweeping = sweeping;
            if (wake?.active) { wake.step(); dirty = true; }
            if (dirty) paint();
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
    // fonts may arrive after first layout; rebuild once they do
    document.fonts?.ready.then(build);
    build();
    return item;
}

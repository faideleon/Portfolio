/*
 * Text → ASCII lettering with a slow ambient shimmer (a few cells at a time flick to another glyph
 * of similar density, so the word always stays readable). Optional cursor wake.
 *
 * Markup: <div class="glyph-word" data-text="WORK" [data-text-narrow="LET'S|WORK|TOGETHER"]><canvas></canvas></div>
 * "|" breaks lines.
 */
import { register, fitCanvas, createWake, reduceMotion, hash01 } from "./engine.js";

const RAMP = ".:-=+*#%@";
const rampAt = (v) => RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))];

export function mountLettering(el, { cellPx = 10, alpha = 0.12, weight = 800, wake: withWake = false, narrowAt = 700 } = {}) {
    const canvas = el.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let g = null, wake = null, size = null;

    function build() {
        size = fitCanvas(canvas, el);
        const narrow = el.dataset.textNarrow && size.cssW < narrowAt;
        const lines = (narrow ? el.dataset.textNarrow : el.dataset.text).split("|");
        // keep at least ~7 cells per letter so narrow screens still read the word
        const longest = Math.max(...lines.map((l) => l.length));
        const cellCss = Math.max(3.5, Math.min(cellPx, size.cssW / (longest * 7)));
        const cw = cellCss * size.dpr, ch = cw * 1.5;
        const cols = Math.max(4, Math.floor(size.w / cw)), rows = Math.max(2, Math.floor(size.h / ch));
        // draw the text into a cols x rows mask (cells are 1:1.5, so squash vertically)
        const S = 4, mw = cols * S, mh = rows * S;
        const m = document.createElement("canvas");
        m.width = mw; m.height = mh;
        const mx = m.getContext("2d", { willReadFrequently: true });
        const family = `"Martian Mono", ui-monospace, monospace`;
        mx.font = `${weight} 100px ${family}`;
        const widest = Math.max(...lines.map((l) => mx.measureText(l).width));
        // fit width; line height in mask units accounts for the 1.5 cell aspect
        let fs = (mw * 0.98) / widest * 100;
        const lineH = (fs * 0.92) / 1.5;
        if (lineH * lines.length > mh * 0.96) fs *= (mh * 0.96) / (lineH * lines.length);
        const lh = (fs * 0.92) / 1.5;
        mx.font = `${weight} ${fs}px ${family}`;
        mx.textAlign = "center";
        mx.textBaseline = "middle";
        mx.fillStyle = "#fff";
        mx.save();
        mx.scale(1, 1 / 1.5);
        const top = (mh - lh * lines.length) / 2;
        lines.forEach((l, i) => mx.fillText(l, mw / 2, (top + lh * (i + 0.5)) * 1.5));
        mx.restore();
        const d = mx.getImageData(0, 0, mw, mh).data;
        const on = [], cov = [];
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            let s = 0;
            for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) s += d[((y * S + j) * mw + x * S + k) * 4 + 3];
            const c = s / (S * S * 255);
            if (c > 0.3) { on.push(y * cols + x); cov.push(c); }
        }
        const chars = on.map((_, i) => rampAt(0.45 + cov[i] * 0.55));
        g = { cols, rows, cw, ch, on, chars, alt: new Array(on.length).fill(null), until: new Float32Array(on.length) };
        if (withWake) wake = createWake(cols, rows, { radius: 5, maxD: 1.8, strength: 0.2 });
        ctx.font = `${Math.round(ch * 0.9)}px ${family}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        paint();
    }

    function paint() {
        if (!g) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fff";
        const { cols, cw, ch, on, chars, alt } = g;
        for (let k = 0; k < on.length; k++) {
            const i = on[k], x = i % cols, y = (i / cols) | 0;
            const ox = wake ? wake.dx[i] : 0, oy = wake ? wake.dy[i] : 0;
            ctx.fillText(alt[k] ?? chars[k], (x + 0.5 + ox) * cw, (y + 0.55 + oy) * ch);
        }
        ctx.globalAlpha = 1;
    }

    let t = 0, sinceShimmer = 0;
    const item = register(el, {
        fps: 30,
        running: !reduceMotion,
        resize: build,
        tick(now, dt) {
            t += dt; sinceShimmer += dt;
            let dirty = false;
            if (sinceShimmer > 1 / 12 && g) {
                sinceShimmer = 0;
                const { alt, until, chars } = g;
                for (let k = 0; k < alt.length; k++) if (alt[k] && until[k] < t) { alt[k] = null; dirty = true; }
                const n = Math.ceil(g.on.length * 0.02 / 4);     // ~2% of cells over a quarter second
                for (let j = 0; j < n; j++) {
                    const k = Math.floor(Math.random() * alt.length);
                    const idx = RAMP.indexOf(chars[k]);
                    alt[k] = RAMP[Math.max(0, Math.min(RAMP.length - 1, idx + (Math.random() < 0.5 ? -1 : 1)))];
                    until[k] = t + 0.15 + Math.random() * 0.15;
                    dirty = true;
                }
            }
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

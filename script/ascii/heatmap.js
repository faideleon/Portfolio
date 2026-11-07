/*
 * GitHub contributions as glyph cells: square cells sized and coloured by activity, using the
 * dusk ramp from the hero scene. Columns sweep in left to right the first time it comes near.
 *
 * Markup: <div class="heatmap"><canvas></canvas><div class="heatmap-tip" hidden></div></div>
 */
import { register, fitCanvas, reduceMotion } from "./engine.js";

const RAMP = ["#1c1830", "#4a3a88", "#b05a88", "#f8a060", "#ffc478"];
const SIDE = [0.42, 0.62, 0.76, 0.88, 0.96];
// ink mode: near-black squares at five strengths, for a light (amber) card
const INK = ["rgba(26,14,6,.12)", "rgba(26,14,6,.36)", "rgba(26,14,6,.56)", "rgba(26,14,6,.76)", "rgba(26,14,6,.94)"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const levelOf = (n) => (n <= 0 ? 0 : n >= 4 ? 4 : n);

export async function mountHeatmap(el, { user = "faideleon", onStats, ink = false } = {}) {
    const ramp = ink ? INK : RAMP;
    const canvas = el.querySelector("canvas");
    const tip = el.querySelector(".heatmap-tip");
    const ctx = canvas.getContext("2d");

    let data;
    try {
        const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}`);
        data = await res.json();
    } catch {
        el.classList.add("is-error");
        return;
    }
    const days = data.contributions;
    const pad = new Date(days[0].date + "T00:00:00").getDay();
    const cols = Math.ceil((pad + days.length) / 7);
    const year = Object.keys(data.total)[0];

    // stats
    let longest = 0, run = 0, active = 0;
    for (const d of days) { if (d.count > 0) { active++; run++; longest = Math.max(longest, run); } else run = 0; }
    onStats?.({ total: data.total[year], longest, active, year });

    let geo = null, reveal = reduceMotion ? 1 : 0, revealStart = -1;
    function layout() {
        const s = fitCanvas(canvas, el);
        const labelW = 34 * s.dpr, labelH = 20 * s.dpr;
        const cell = Math.max(4 * s.dpr, Math.floor((s.w - labelW) / cols));
        const h = labelH + cell * 7;
        if (canvas.height !== Math.round(h)) { canvas.height = Math.round(h); canvas.style.height = `${h / s.dpr}px`; }
        geo = { ...s, labelW, labelH, cell };
        paint();
    }

    function paint() {
        if (!geo) return;
        const { labelW, labelH, cell, dpr } = geo;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${10 * dpr}px "Martian Mono", ui-monospace, monospace`;
        ctx.fillStyle = ink ? "rgba(26,14,6,.6)" : "rgba(255,255,255,.38)";
        ctx.textBaseline = "middle";
        ["Mon", "Wed", "Fri"].forEach((l, i) => ctx.fillText(l, 0, labelH + cell * (i * 2 + 1.5)));
        let lastMonth = -1;
        days.forEach((d, i) => {
            const col = Math.floor((i + pad) / 7);
            const m = new Date(d.date + "T00:00:00").getMonth();
            if (m !== lastMonth && (i + pad) % 7 === 0) { lastMonth = m; ctx.fillText(MONTHS[m], labelW + col * cell, labelH / 2); }
        });
        const shown = reveal * (cols + 6);
        for (let lv = 0; lv < 5; lv++) {
            ctx.fillStyle = ramp[lv];
            ctx.beginPath();
            days.forEach((d, i) => {
                if (levelOf(d.count) !== lv) return;
                const k = i + pad, col = Math.floor(k / 7), row = k % 7;
                const a = Math.max(0, Math.min(1, shown - col));
                if (a <= 0) return;
                const s = cell * SIDE[lv] * (0.6 + 0.4 * a);
                ctx.rect(labelW + col * cell + (cell - s) / 2, labelH + row * cell + (cell - s) / 2, s, s);
            });
            ctx.fill();
        }
    }

    const item = register(el, {
        fps: 30,
        running: !reduceMotion,
        resize: layout,
        tick(now) {
            if (revealStart < 0) revealStart = now;
            reveal = Math.min(1, (now - revealStart) / 1100);
            paint();
            if (reveal >= 1) item.running = false;
        },
    });

    // tooltip
    el.addEventListener("pointermove", (e) => {
        if (!geo) return;
        const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * geo.dpr, y = (e.clientY - r.top) * geo.dpr;
        const col = Math.floor((x - geo.labelW) / geo.cell), row = Math.floor((y - geo.labelH) / geo.cell);
        const i = col * 7 + row - pad;
        if (col < 0 || row < 0 || row > 6 || i < 0 || i >= days.length) { tip.hidden = true; return; }
        const d = days[i], date = new Date(d.date + "T00:00:00");
        tip.textContent = `${d.count} contribution${d.count === 1 ? "" : "s"} · ${MONTHS[date.getMonth()]} ${date.getDate()}`;
        tip.hidden = false;
        tip.style.left = `${(geo.labelW + (col + 0.5) * geo.cell) / geo.dpr}px`;
        tip.style.top = `${(geo.labelH + row * geo.cell) / geo.dpr}px`;
    });
    el.addEventListener("pointerleave", () => (tip.hidden = true));

    layout();
    // narrow screens scroll sideways: start at the most recent weeks
    el.closest(".heatmap-scroll")?.scrollTo({ left: 1e6 });
}

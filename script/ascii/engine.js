/*
 * Shared loop for every ASCII canvas on a page.
 * - one requestAnimationFrame for all of them
 * - a canvas runs only while it is near the viewport (within half a screen) and the tab is visible
 * - each item is capped at its own fps and only repaints when it says it changed
 */
export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

const items = new Set();
let raf = 0;

const near = new IntersectionObserver((entries) => {
    for (const e of entries) {
        const item = e.target.__ascii;
        if (item) item.near = e.isIntersecting;
    }
    wake();
}, { rootMargin: "50% 0px 50% 0px" });

const sized = new ResizeObserver((entries) => {
    for (const e of entries) e.target.__ascii?.resize?.();
});

function loop(now) {
    raf = 0;
    if (document.hidden) return;
    let any = false;
    for (const it of items) {
        if (!it.near || !it.running) continue;
        any = true;
        if (now - it.last < 1000 / it.fps - 1) continue;
        const dt = it.last ? Math.min(0.1, (now - it.last) / 1000) : 0;
        it.last = now;
        it.tick(now, dt);
    }
    if (any) raf = requestAnimationFrame(loop);
}

export function wake() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
}

document.addEventListener("visibilitychange", () => {
    for (const it of items) it.last = 0;   // no time jump after a hidden tab
    wake();
});

/**
 * Register an animated element.
 * spec: { tick(now, dt), resize(), fps = 30, running = true }
 * Returns the item; set item.running = true/false and call wake() to start/stop it.
 */
export function register(el, spec) {
    const item = { fps: 30, running: true, near: false, last: 0, ...spec };
    el.__ascii = item;
    items.add(item);
    near.observe(el);
    if (spec.resize) sized.observe(el);
    return item;
}

/** Size a canvas to its CSS box at device pixel ratio (capped at 2). Returns { w, h, dpr } in device px. */
export function fitCanvas(canvas, box = canvas) {
    const r = box.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h, dpr, cssW: r.width, cssH: r.height };
}

/**
 * Cursor wake: cells near the pointer are pushed away and spring back.
 * Shared by the hero scene, the About portrait and the Contact lettering.
 */
export function createWake(cols, rows, { radius = 6, maxD = 2, strength = 0.18 } = {}) {
    const n = cols * rows;
    const dx = new Float32Array(n), dy = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
    let active = false, last = null;
    return {
        dx, dy,
        get active() { return active; },
        move(gx, gy) {
            if (last) {
                const speed = Math.min(3, Math.hypot(gx - last[0], gy - last[1]));
                if (speed > 0.05) this.push(gx, gy, speed);
            }
            last = [gx, gy];
        },
        leave() { last = null; },
        push(gx, gy, speed) {
            const x0 = Math.max(0, Math.floor(gx - radius)), x1 = Math.min(cols - 1, Math.ceil(gx + radius));
            const y0 = Math.max(0, Math.floor(gy - radius)), y1 = Math.min(rows - 1, Math.ceil(gy + radius));
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
                const ex = x + 0.5 - gx, ey = y + 0.5 - gy, d = Math.hypot(ex, ey);
                if (d >= radius || d < 0.001) continue;
                const f = (1 - d / radius) ** 2 * speed * strength, i = y * cols + x;
                vx[i] += (ex / d) * f; vy[i] += (ey / d) * f;
            }
            active = true;
        },
        step() {
            let moving = false;
            for (let i = 0; i < n; i++) {
                if (dx[i] === 0 && dy[i] === 0 && vx[i] === 0 && vy[i] === 0) continue;
                vx[i] = (vx[i] - dx[i] * 0.12) * 0.8;
                vy[i] = (vy[i] - dy[i] * 0.12) * 0.8;
                dx[i] = Math.max(-maxD, Math.min(maxD, dx[i] + vx[i]));
                dy[i] = Math.max(-maxD, Math.min(maxD, dy[i] + vy[i]));
                if (Math.abs(dx[i]) + Math.abs(dy[i]) + Math.abs(vx[i]) + Math.abs(vy[i]) < 0.004) dx[i] = dy[i] = vx[i] = vy[i] = 0;
                else moving = true;
            }
            active = moving;
            return moving;
        },
    };
}

/** Cheap deterministic hash in [0, 1). */
export const hash01 = (i) => (((i + 1) * 2654435761) >>> 0) / 4294967296;

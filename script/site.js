/*
 * Shared page behaviour for every page: nav, mobile menu, copy chips, reveals, Baguio clock,
 * mailto contact form, and mounting whichever ASCII pieces the page contains.
 */
import { reduceMotion } from "./ascii/engine.js";
import { mountScene } from "./ascii/scene.js";
import { mountCellPortrait, mountAsciiThumb } from "./ascii/image.js";
import { mountLettering } from "./ascii/lettering.js";
import { mountHeatmap } from "./ascii/heatmap.js";
import { mountDither } from "./ascii/dither.js";

/* ---------- nav: border once scrolled, hide on scroll down, show on scroll up ---------- */
const nav = document.querySelector(".site-nav");
const menu = document.querySelector(".menu-panel");
const menuBtn = document.querySelector(".nav-menu");
if (nav) {
    let lastY = scrollY, ticking = false;
    const update = () => {
        ticking = false;
        const y = scrollY;
        nav.classList.toggle("is-scrolled", y > 8);
        if (!menu?.classList.contains("is-open")) nav.classList.toggle("is-hidden", y > lastY && y > 200);
        lastY = y;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
}
if (menu && menuBtn) {
    const setOpen = (open) => {
        menu.classList.toggle("is-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.querySelector(".nav-menu-label").textContent = open ? "Close" : "Menu";
        document.body.classList.toggle("menu-open", open);
    };
    menuBtn.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
}

/* ---------- copy chips ---------- */
for (const chip of document.querySelectorAll("[data-copy]")) {
    chip.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(chip.dataset.copy); } catch { return; }
        const label = chip.querySelector(".chip-label");
        const prev = label.textContent;
        chip.classList.add("copied");
        label.textContent = "Copied";
        setTimeout(() => { chip.classList.remove("copied"); label.textContent = prev; }, 1500);
    });
}

/* ---------- reveal on scroll (sections below the hero) ---------- */
const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); }
}, { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll(".rise").forEach((el) => (reduceMotion ? el.classList.add("is-in") : revealIO.observe(el)));

/* ---------- Baguio clock ---------- */
const clock = document.querySelector("[data-clock]");
if (clock) {
    const fmt = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 30000);
}

/* ---------- contact form → visitor's email app ---------- */
const form = document.querySelector(".contact-form");
form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const f = new FormData(form);
    const name = String(f.get("name")).trim(), email = String(f.get("email")).trim(), msg = String(f.get("message")).trim();
    const subject = `Portfolio enquiry from ${name}`;
    const body = `${msg}\n\n— ${name} (${email})`;
    location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

/* ---------- project filters (projects.html) ---------- */
const filterButtons = document.querySelectorAll("[data-filter]");
if (filterButtons.length) {
    const tiles = document.querySelectorAll("[data-discipline]");
    const count = document.querySelector(".filter-count");
    filterButtons.forEach((btn) => btn.addEventListener("click", () => {
        const f = btn.dataset.filter;
        let shown = 0;
        filterButtons.forEach((b) => { b.classList.toggle("is-active", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
        tiles.forEach((t) => {
            const on = f === "all" || t.dataset.discipline === f;
            t.classList.toggle("is-filtered", !on);
            if (on) { shown++; t.classList.add("is-in"); }
        });
        if (count) count.textContent = `Showing ${String(shown).padStart(2, "0")} project${shown === 1 ? "" : "s"}`;
    }));
}

/* ---------- ASCII pieces ---------- */
document.querySelectorAll(".ascii-stage").forEach((stage) =>
    mountScene(stage, { onReady: () => stage.closest(".hero")?.classList.add("hero-ready") }));

document.querySelectorAll(".cell-portrait[data-src]").forEach((el) => mountCellPortrait(el, {
    src: el.dataset.src,
    crop: (el.dataset.crop || "0,0,1").split(",").map(Number),
    cellPx: Number(el.dataset.cell) || 6,
    sideScale: Number(el.dataset.side) || 1,
    intro: el.hasAttribute("data-intro"),
    shimmer: el.hasAttribute("data-shimmer"),
    wake: el.hasAttribute("data-wake"),
    reveal: el.hasAttribute("data-reveal"),
}));

document.querySelectorAll(".thumb:has(.thumb-ascii)").forEach((thumb) =>
    mountAsciiThumb(thumb, { trigger: thumb.closest("a, .tile") || thumb }));

document.querySelectorAll(".glyph-word").forEach((el) => mountLettering(el, {
    cellPx: Number(el.dataset.cell) || 10,
    alpha: Number(el.dataset.alpha) || 1,
    wake: el.hasAttribute("data-wake"),
    color: el.dataset.color || "white",
    align: el.dataset.align || "center",
}));

document.querySelectorAll(".dither").forEach((el) => mountDither(el));

document.querySelectorAll(".heatmap").forEach((el) => mountHeatmap(el, {
    ink: el.hasAttribute("data-ink"),
    onStats: (s) => {
        for (const [k, v] of Object.entries(s)) document.querySelectorAll(`[data-stat="${k}"]`).forEach((n) => (n.textContent = v));
    },
}));

/* ---------- hero parallax as the next section covers it ---------- */
// (targets the inner stage: the card itself has a CSS fade-in that would fight GSAP over opacity)
const stage = document.querySelector(".hero .ascii-stage");
if (stage && window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(stage, {
        y: -40, opacity: 0.6, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
}

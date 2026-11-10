// Shared helpers for the pixel friends: the hooks main.js offers (window.SITE), copy, maths and timing.
import { STRINGS } from "./i18n.js";
import { toSvg } from "./art/core.js";
import { EMOJI, KEYS } from "./art/icons.js";

export const S = window.SITE;
export const root = document.documentElement;
export const store = S.store;
export const $ = S.$;
// Copy for the friends in the site's current language: t("lines"), t("pet.food")…
export const t = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), STRINGS[S.lang()]);

export const now = () => performance.now();
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reduced = () => S.reduced();
export const GRAV = 2200;
export const SVGNS = "http://www.w3.org/2000/svg";
export const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
// zoom grows the whole little world (aquarium mode)
export const view = { zoom: 1 };
export const unit = () => (innerWidth < 640 ? 2 : 2.5) * view.zoom;   // CSS pixels per art pixel
// the hour of the day, with minutes as a fraction (QA can pretend it is another time)
let fakeHour = null;
export const setFakeHour = (h) => { fakeHour = h; };
export const hourNow = () => { if (fakeHour != null) return fakeHour; const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
export const isNight = () => { const h = hourNow(); return h >= 23 || h < 6; };
// true while the visitor is typing somewhere (keys belong to that field, not to the friends)
export const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) || !!(document.activeElement && document.activeElement.isContentEditable);

// Speech bubble bits: a pixel emoji, text with an optional emoji, and the ↓ ↘ → P key caps.
export const emo = (name) => `<span class="px-emo">${toSvg(EMOJI[name])}</span>`;
export const bubble = (text, icon, extra = "") => (icon ? emo(icon) : "") + `<span class="px-txt">${text}${extra}</span>`;
export const keyCaps = () => `<span class="px-keys">${["down", "diag", "right", "p"].map((k) => `<kbd>${toSvg(KEYS[k])}</kbd>`).join("")}</span>`;

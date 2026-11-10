// Achievements: a toast when one unlocks, a trophy button in the nav with the count, and the list.
// Each one has a pixel badge, a name and a hint; secret ones keep their name hidden until found.
import { $, t, store, pick } from "./util.js";
import { emit } from "./world.js";
import { openCard } from "./ui.js";
import { toSvg } from "./art/core.js";
import { BADGES } from "./art/badges.js";

// Grouped for the list; the order here is the order on screen.
const GROUPS = {
  cats: { pet: "heart", cats: "cat", treat: "fish", lap: "lap", tangle: "knot", spill: "coffee", litter: "litter" },
  dev: { toss: "dev", wake: "sun", dance: "note", flow: "fire", photo: "camera" },
  home: { water: "can", bloom: "bloom", feed: "bowl" },
  toys: { yarn: "yarn", laser: "laser", coin: "coin" },
  site: { perfect: "target", bottom: "down", terminal: "term", eggs: "choc", reader: "book" },
  events: { pingo: "pingo", pizza: "pizza", wish: "wish", aquarium: "bowlfish", fisher: "rod", goldfish: "goldfish" },
  power: { special: "blast", rebuild: "wrench", bug: "bug", conflict: "merge", friday: "skull" },
  secrets: { legacy: "crt", sudo: "lock", flag: "flag", lud: "lud" },
};
const SECRET = new Set(Object.keys(GROUPS.secrets));
const BADGE = Object.assign({}, ...Object.values(GROUPS));
export const ACHV = Object.keys(BADGE);
export let got = new Set();
try { got = new Set((JSON.parse(store.get("px-achv") || "[]") || []).filter((k) => ACHV.includes(k))); } catch (e) { /* corrupted: start over */ }

const badge = (k) => `<span class="px-emo px-badge">${toSvg(BADGES[BADGE[k]])}</span>`;

const toastEl = document.createElement("div");
toastEl.className = "px-achv";
toastEl.setAttribute("role", "status");
document.body.append(toastEl);
let toastTimer = 0;

const btn = document.createElement("button");
btn.className = "icon-btn achv-btn";
btn.type = "button";
btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/></svg><span class="achv-count"></span>';
const themeToggle = $("#toggle-theme");
if (themeToggle) themeToggle.parentNode.insertBefore(btn, themeToggle);
btn.addEventListener("click", () => showAchievements());
function updateButton() {
  btn.querySelector(".achv-count").textContent = got.size ? String(got.size) : "";
  btn.setAttribute("aria-label", `${t("achv.title")} (${got.size}/${ACHV.length})`);
}
document.addEventListener("site:lang", updateButton);
updateButton();

export const achvCount = () => `${got.size}/${ACHV.length}`;
export function unlock(k) {
  if (got.has(k) || !ACHV.includes(k)) return;
  got.add(k);
  store.set("px-achv", JSON.stringify([...got]));
  updateButton();
  toastEl.innerHTML = `${badge(k)}<span><small>${t("achv.unlocked")} · ${got.size}/${ACHV.length}</small><b>${t("achv.items." + k)}</b></span>`;
  toastEl.classList.remove("show"); void toastEl.offsetWidth; toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3800);
  emit("unlock", k);
}

// A hint for one you have not found yet (the dev drops these now and then): never a secret one.
export function hintLine() {
  const open = ACHV.filter((k) => !got.has(k) && !SECRET.has(k));
  if (!open.length) return null;
  return ["star", `${t("achv.tip")} ${t("achv.hints." + pick(open))}`];
}

// Start over (a speedrun begins): nothing found yet.
export function resetAchievements() {
  got.clear();
  store.set("px-achv", "[]");
  updateButton();
}

// Extra buttons on the list (the share card adds one), and extra lines above it (the speedrun timer).
export const listButtons = [];
export const listExtras = [];
export function showAchievements() {
  const row = (k) => {
    const has = got.has(k), hidden = SECRET.has(k) && !has;
    const name = hidden ? t("achv.locked") : t("achv.items." + k);
    const hint = t((hidden ? "achv.secretHints." : "achv.hints.") + k);
    return `<li class="${has ? "got" : ""}">${badge(k)}<span><b>${name}</b><small>${hint}</small></span>${has ? `<i class="px-check" aria-label="${t("achv.done")}">✓</i>` : ""}</li>`;
  };
  const html = Object.entries(GROUPS).map(([g, items]) => {
    const keys = Object.keys(items), n = keys.filter((k) => got.has(k)).length;
    return `<li class="px-achv-group"><h3>${t("achv.groups." + g)}</h3><span>${n}/${keys.length}</span></li>${keys.map(row).join("")}`;
  }).join("");
  const pct = Math.round((100 * got.size) / ACHV.length);
  const bar = `<div class="px-achv-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${ACHV.length}" aria-valuenow="${got.size}"><i style="width:${pct}%"></i></div>`;
  const extra = listExtras.map((f) => f()).join("");
  return openCard("px-achv-list", t("achv.title"), achvCount(), `${extra}${bar}<ul>${html}</ul>`, t("achv.close"), listButtons.map((b) => b()).filter(Boolean));
}

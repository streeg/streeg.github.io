// Achievements: a toast when one unlocks, a trophy button in the nav with the count, and the list.
import { $, t, store, emo } from "./util.js";
import { emit } from "./world.js";
import { openCard } from "./ui.js";

// The order here is the order of the list.
export const ACHV = ["pet", "toss", "coin", "perfect", "treat", "yarn", "tangle", "laser", "cats", "lap", "spill", "litter", "wake", "dance", "flow", "photo", "eggs",
  "bottom", "terminal", "sudo", "special", "rebuild", "bug", "conflict", "friday", "legacy", "flag"];
export let got = new Set();
try { got = new Set((JSON.parse(store.get("px-achv") || "[]") || []).filter((k) => ACHV.includes(k))); } catch (e) { /* corrupted: start over */ }

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
  toastEl.innerHTML = `${emo("trophy")}<span><small>${t("achv.unlocked")} · ${got.size}/${ACHV.length}</small><b>${t("achv.items." + k)}</b></span>`;
  toastEl.classList.remove("show"); void toastEl.offsetWidth; toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3800);
  emit("unlock", k);
}
// Extra buttons on the list (the share card adds one).
export const listButtons = [];
export function showAchievements() {
  const items = ACHV.map((k) => (got.has(k)
    ? `<li class="got">${emo("trophy")}<span>${t("achv.items." + k)}</span></li>`
    : `<li><span class="px-emo px-lock"></span><span>${t("achv.locked")}</span></li>`)).join("");
  return openCard("px-achv-list", t("achv.title"), achvCount(), `<ul>${items}</ul>`, t("achv.close"), listButtons.map((b) => b()));
}


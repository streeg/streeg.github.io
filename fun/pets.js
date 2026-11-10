// Virtual pets: food, energy and fun for each cat, plus the litter box.
// Values drift down over time (also while you are away, up to a day) and go up with treats, play, petting, naps and cleaning.
import { t, store, now, clamp, bubble } from "./util.js";
import { cats, addSystem } from "./world.js";
import { openCard } from "./ui.js";

export const CATS = { dark: { id: "capitu", name: "Capitu" }, light: { id: "sancho", name: "Sancho" } };
const freshPet = () => ({ food: 60, energy: 80, fun: 60 });
export const petState = { capitu: freshPet(), sancho: freshPet(), box: 65, t: Date.now() };
try {
  const saved = JSON.parse(store.get("px-pets") || "null");
  if (saved && saved.capitu && saved.sancho) Object.assign(petState, saved);
} catch (e) { /* start fresh */ }
function petDecay(mins) {
  for (const id of ["capitu", "sancho"]) {
    const q = petState[id];
    q.food = clamp(q.food - mins * 0.6, 0, 100);
    q.fun = clamp(q.fun - mins * 0.8, 0, 100);
    q.energy = clamp(q.energy - mins * 0.3, 0, 100);
  }
  petState.box = clamp(petState.box - mins * 0.4, 0, 100);
}
petDecay(clamp((Date.now() - (petState.t || Date.now())) / 60000, 0, 1440));

export const petOf = (c) => petState[c.catId];
export function petFeed(c, key, amount) { const q = c && petOf(c); if (q) q[key] = clamp(q[key] + amount, 0, 100); }
let saveAt = 0;
addSystem((dt) => {
  petDecay(dt / 60);
  cats().forEach((c) => { if (c.base === "sleep") petFeed(c, "energy", dt * 2.5); });
  if (now() > saveAt) { petState.t = Date.now(); store.set("px-pets", JSON.stringify(petState)); saveAt = now() + 5000; }
}, 40);

const bar = (v) => `<span class="px-bar"><i style="width:${Math.round(v)}%"></i></span>`;
// The bubble you get by hovering a cat.
export function petStatus(c) {
  const q = petOf(c);
  if (!q) return bubble(c.name, "cat");
  return `<span class="px-txt px-status"><b>${c.name}</b>` +
    `<span>${t("pet.food")}</span>${bar(q.food)}<span>${t("pet.energy")}</span>${bar(q.energy)}<span>${t("pet.fun")}</span>${bar(q.fun)}</span>`;
}
// The panel (palette: "How are the cats?").
export function showPets() {
  const rows = Object.values(CATS).map((info) => {
    const q = petState[info.id];
    return `<li><b>${info.name}</b><span>${t("pet.food")}</span>${bar(q.food)}<span>${t("pet.energy")}</span>${bar(q.energy)}<span>${t("pet.fun")}</span>${bar(q.fun)}</li>`;
  }).join("");
  openCard("px-pets", t("pet.title"), "", `<ul class="px-pet-list">${rows}<li><b>${t("pet.box")}</b>${bar(petState.box)}</li></ul>`, t("pet.close"));
}

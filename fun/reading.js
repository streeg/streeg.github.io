// Reading along: when the visitor stays on a section (after scrolling to it), the dev walks over under its
// heading, points at it and says something about it, as soon as he is free (once per section per visit).
// All of them read: an achievement.
import { $, t, now, pick, clamp, reduced, bubble } from "./util.js";
import { W, on, layer, wait, walk, act, addSystem } from "./world.js";
import { me } from "./me.js";
import { unlock } from "./achv.js";

const SECTIONS = ["impact", "experience", "stack", "security", "projects", "origin", "contact"];
const sectionEl = (k) => (k === "origin" ? $(".origin-section") : $("#" + k));
const seen = new Set();
let scrolledAt = 0, checkAt = 0;
on("speedrun", () => seen.clear());   // a new run: every section counts again

// the section across the upper part of the window (where the eyes are)
function current() {
  const y = innerHeight * 0.4;
  return SECTIONS.find((k) => { const s = sectionEl(k); if (!s) return false; const r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; });
}
const free = () => !W.ko && !W.event && !W.aquarium && !layer.hidden && !me.locked && me.mode === "ground" && me.soft;

export function readAlong() {
  const k = current();
  if (!k || seen.has(k) || !free()) return false;
  seen.add(k);
  const head = sectionEl(k).querySelector("h2") || sectionEl(k);
  const spot = () => { const r = head.getBoundingClientRect(); return clamp(r.left + Math.min(r.width, 320) / 2 - me.w / 2, 10, me.maxX()); };
  const line = () => pick(t("reading." + k)).replace("{name}", W.cat ? W.cat.name : "");
  me.interrupt([
    ...(reduced() ? [] : [walk(spot, 140)]),
    act(() => { me.face = 1; me.say(bubble(line(), "star"), 3200); }),
    wait(2600, "point"),
  ]);
  if (SECTIONS.every((s) => seen.has(s) || !sectionEl(s))) unlock("reader");
  return true;
}
window.addEventListener("scroll", () => { scrolledAt = now(); }, { passive: true });
// once the scrolling has stopped for a moment, try now and then until he is free
addSystem(() => {
  if (!scrolledAt || W.calm || now() - scrolledAt < 1400 || now() < checkAt) return;   // QA mode: only on request
  checkAt = now() + 700;
  readAlong();
}, 97);

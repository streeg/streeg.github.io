// Speedrun: a stopwatch on the shelf. Click it and (after a confirmation) every achievement is reset and the clock
// starts; a small timer floats over the stopwatch while it runs, the list shows it, and when the last achievement
// unlocks the time is kept and goes on the share card. Click the stopwatch again to see the list or give up.
import { t, store, now, bubble } from "./util.js";
import { W, on, emit, layer, addSystem, showFriends } from "./world.js";
import { me, setPower } from "./me.js";
import { openCard, burst } from "./ui.js";
import { ACHV, got, resetAchievements, showAchievements, listButtons, listExtras } from "./achv.js";
import { addFurniture, items, render, resetHome } from "./home.js";
import { GADGETS } from "./art/home.js";

let run = null;   // { start, end } (Date.now() times)
try { const r = JSON.parse(store.get("px-run") || "null"); if (r && typeof r.start === "number") run = r; } catch (e) { /* start over */ }
const save = () => store.set("px-run", run ? JSON.stringify(run) : "");
export const runState = () => run;
const running = () => !!run && !run.end;
// 14:32, or 1:02:09 past the hour
export function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}
export const runTime = () => (run ? fmt((run.end || Date.now()) - run.start) : null);

export function startRun() {
  resetAchievements();
  resetHome();
  run = { start: Date.now() };
  save();
  emit("speedrun", true);
  render(items.stopwatch);
  showFriends();
  emit("sfx", "on");
  me.say(bubble(t("run.go"), "fire"), 2200);
}
export function stopRun() {
  run = null; save();
  render(items.stopwatch);
}

// the stopwatch: start (with a warning: it resets everything), or, while running, the list
function clickWatch() {
  if (W.ko) return;
  if (running()) { showAchievements(); return; }
  openCard("px-run-card", t("run.title"), t("run.body"), "", t("run.cancel"),
    [{ text: t("run.start"), primary: true, run: (close) => { close(); startRun(); } }]);
}
addFurniture("stopwatch", () => (running() ? GADGETS.stopwatchOn : GADGETS.stopwatch), clickWatch);

// the timer over the stopwatch
const hud = document.createElement("div");
hud.className = "px-run-hud";
hud.hidden = true;
layer.append(hud);
let tick = 0;
addSystem(() => {
  const it = items.stopwatch, show = running() && !it.hidden && !layer.hidden && !W.ko;
  hud.hidden = !show;
  if (!show || now() < tick) return;
  tick = now() + 250;
  hud.textContent = `${runTime()} · ${got.size}/${ACHV.length}`;
  hud.style.transform = `translate(${Math.round(it.x + it.w / 2)}px, ${Math.round(it.y - 6)}px) translate(-50%, -100%)`;
  if (Math.floor(now() / 1000) % 2) render(it);
}, 98);

// done: the last achievement stops the clock
on("unlock", () => {
  if (!running() || got.size < ACHV.length) return;
  run.end = Date.now(); save();
  render(items.stopwatch);
  const text = t("run.done").replace("{time}", runTime());
  setTimeout(() => {
    if (!me.locked) { me.emoteFor("wave", 1800); me.say(bubble(text, "trophy"), 4000); setPower(true, 6000); }
    burst(innerWidth / 2, innerHeight * 0.4, ["#e11d48", "#a78bfa", "#facc15", "#38bdf8", "#4ade80"], 70, 1.6);
    emit("sfx", "win");
  }, 4000);   // after the last achievement's toast
});

// in the list: the time, and a way out
listExtras.push(() => (run ? `<p class="px-run-time">${t(run.end ? "run.finished" : "run.running").replace("{time}", runTime())}</p>` : ""));
listButtons.push(() => (running() ? { text: t("run.quit"), run: (close) => { close(); stopRun(); } } : null));

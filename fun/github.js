// My public GitHub activity: when I pushed something public today, the dev celebrates (once per visit) and
// mentions it now and then; after a long quiet stretch he says so, a bit sheepish. Only public events are
// visible (private work never shows up there). Cached for an hour, so a visitor makes at most one call an hour.
import { t, store, now, pick, reduced, bubble } from "./util.js";
import { W, emit, layer, wait, act, addSystem } from "./world.js";
import { me, addLineHook } from "./me.js";
import { burst } from "./ui.js";

const URL = "https://api.github.com/users/streeg/events/public?per_page=30";
const HOUR = 3600000;
let gh = null;   // { last: time of the latest public push (ms) or null, at }
try {
  const c = JSON.parse(store.get("px-gh") || "null");
  if (c && Date.now() - c.at < 6 * HOUR) gh = c;
} catch (e) { /* start over */ }
let cheered = false;
try { cheered = sessionStorage.getItem("px-gh-cheer") === "1"; } catch (e) { /* storage unavailable */ }

async function refresh() {
  if (gh && Date.now() - gh.at < HOUR) return;
  try {
    const r = await fetch(URL, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) return;
    const list = await r.json();
    if (!Array.isArray(list)) return;
    const push = list.find((e) => e && e.type === "PushEvent" && e.created_at);
    gh = { last: push ? Date.parse(push.created_at) : null, at: Date.now() };
    store.set("px-gh", JSON.stringify(gh));
  } catch (e) { /* offline or rate-limited: nothing to say */ }
}
const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
// whole days since the last public push (0 = today), null when unknown
export const daysSincePush = () => (gh && gh.last ? Math.round((startOfDay(Date.now()) - startOfDay(gh.last)) / 864e5) : null);
// QA: pretend the last public push was at this time
export const setLastPush = (ms) => { gh = { last: ms, at: Date.now() }; cheered = false; };

// ---------------------------------------------------------------- the celebration, once per visit
const loadedAt = now();
export function cheer() {
  cheered = true;
  try { sessionStorage.setItem("px-gh-cheer", "1"); } catch (e) { /* storage unavailable */ }
  me.interrupt([
    act(() => {
      me.face = 1; me.emoteFor("wave", 1600); me.pop("star");
      if (!reduced()) burst(me.cx(), me.y + 10, ["#16a34a", "#4ade80", "#bbf7d0"], 16);
      me.say(bubble(t("github.today"), "star"), 3200);
      emit("sfx", "collect");
    }),
    wait(2800, "idle"),
  ]);
}
addSystem(() => {
  if (cheered || daysSincePush() !== 0 || now() - loadedAt < 9000) return;
  if (W.ko || W.event || W.aquarium || layer.hidden || me.locked || me.mode !== "ground" || !me.soft) return;
  cheer();
}, 96);

addLineHook(() => {
  const d = daysSincePush();
  if (d === 0) return ["star", pick(t("github.todayLines"))];
  if (d != null && d >= 5) return ["coffee", t("github.quiet").replace("{n}", d)];
  return null;
});

refresh();

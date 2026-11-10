// The dev: a small version of me. He wanders, says things, points at the interesting parts of the page,
// codes (talking to Claude) when you go quiet, dozes, sleeps at night, and plays the scenes in scenes.js.
import { $, t, now, rand, pick, clamp, unit, isNight, finePointer, bubble, keyCaps } from "./util.js";
import { W, api, on, Actor, prop, wait, walk, act, launch, bind, mouse, input, addSystem } from "./world.js";
import { FRAMES } from "./art/dev.js";
import { PAL, PAL_POWER, toSvg } from "./art/core.js";
import { MARKER } from "./art/icons.js";
import { unlock } from "./achv.js";

export const me = new Actor("me", FRAMES, PAL, "idle", ["walk1", "walk2", "walk3", "walk4"], 150);
W.me = me;
me.palPower = PAL_POWER;
me.heldFrame = "held";
me.reply = document.createElement("div");
me.reply.className = "px-reply";
me.el.append(me.reply);
me.onLand = (hit) => { if (hit > 1100) { me.say(bubble(t("ouch"), "star"), 1400); me.emoteFor("held", 300); } };
me.onGrab = () => me.say(bubble(t("hey"), "skull"), 1200);
me.onThrow = () => unlock("toss");

const RESTING = ["code", "code2", "doze", "lie"];
export const resting = (a) => RESTING.includes(a.base);

let lineIdx = 0, lineHook = null;
// another feature can slip in its own lines now and then (holidays do): fn() → [icon, text] or null
export const setLineHook = (fn) => { lineHook = fn; };
export function nextLine() {
  const extra = lineHook && Math.random() < 0.35 ? lineHook() : null;
  if (extra) return bubble(extra[1], extra[0]);
  const lines = t("lines");
  const [icon, text, keys] = lines[lineIdx++ % lines.length];
  if (icon === "fire" && !finePointer.matches) return bubble(t("touchFire"), icon);
  return bubble(text, icon, keys ? keyCaps() : "");
}
export const lookAtCursor = (a) => { if (mouse.t && now() - mouse.t < 4000) a.face = mouse.x > a.cx() ? 1 : -1; };
export const snore = (a) => { if (now() > (a.nextZ || 0)) { a.say('<span class="px-z">z z z</span>', 1800); a.nextZ = now() + 3200; } };
// He reacts to something the visitor did on the page (unless he is busy being a hero or the page is down).
export function react(text, icon, emote) {
  if (W.ko || me.locked || me.el.closest("[hidden]")) return;
  if (!resting(me) && me.mode === "ground" && emote) me.emoteFor(emote, 1200);
  me.say(bubble(text, icon), 2200);
}

// ---------------------------------------------------------------- flow state: white hair and an aura, now and then while coding and after the special attack
let powerTimer = 0;
export function setPower(lit, ms) {
  clearTimeout(powerTimer);
  if (me.power !== lit) {
    me.power = lit;
    me.el.classList.toggle("px-aura", lit);
    if (lit) { unlock("flow"); me.pop("star"); }
  }
  if (lit && ms) powerTimer = setTimeout(() => setPower(false), ms);
}
export const startCoding = (a) => { a.flowAt = Math.random() < 0.45 ? now() + rand(2500, 5000) : 0; };
// A reply bubble next to the laptop, for the conversations with Claude while he codes.
function reply(text) {
  const r = me.reply;
  r.innerHTML = `<b>Claude</b><span>${text}</span>`;
  r.classList.toggle("left", me.x > innerWidth - 300);
  r.classList.add("show");
  clearTimeout(r.timer);
  r.timer = setTimeout(() => r.classList.remove("show"), 2800);
}
// typing: two frames, and now and then a thought about the work, a question for Claude or a little emoji
export const working = (a) => {
  if (a.flowAt && now() > a.flowAt) { a.flowAt = 0; a.flowFromCode = true; setPower(true); a.say(bubble(t("flow"), "fire"), 1800); }
  a.setFrame(Math.floor(now() / 170) % 2 ? "code" : "code2");
  if (!a.nextWork) a.nextWork = now() + rand(2500, 4500);
  else if (now() > a.nextWork) {
    if (Math.random() < 0.55) {
      const [ask, answer] = pick(t("claude"));
      a.say(bubble(ask, "heart"), 1800);
      setTimeout(() => { if (resting(me) && !W.ko) reply(answer); }, 1700);
    } else {
      const [icon, text] = pick(t("work"));
      if (Math.random() < 0.55) a.say(bubble(text, icon), 2200); else a.pop(icon);
    }
    a.nextWork = now() + rand(5500, 8500);
  }
};
addSystem(() => { if (me.power && me.flowFromCode && !me.base.startsWith("code")) { me.flowFromCode = false; setPower(false); } }, 60);

// ---------------------------------------------------------------- pointing at the interesting parts of the page
const POIS = [];
// key: copy under poi.<key>; get() → the element; urgent: ms between two urgent pointings (he drops everything for it)
export const addPoi = (k, get, urgent = 0) => POIS.push({ k, get, urgent });
[["coin", "#core"], ["game", "#game-stage"], ["impact", "#impact-grid"], ["iped", ".iped-art"], ["stack", "#stack-grid"], ["contact", "#contact .btn-primary"],
  ["theme", "#toggle-theme"], ["palette", "#open-palette"], ["job", "#jobs .job"]].forEach(([k, sel]) => addPoi(k, () => $(sel)));
const pointed = {};
let pointCool = now() + 9000;
export function poiVisible(el) {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, innerHeight - me.h - 30);
  return bottom - top >= Math.min(36, r.height) && r.right > 0 && r.left < innerWidth;
}
function findPoi() {
  const list = POIS.map((p) => ({ k: p.k, el: p.get() })).filter((p) => p.el && poiVisible(p.el));
  list.sort((a, b) => (pointed[a.k] || 0) - (pointed[b.k] || 0));
  return list.length ? list[Math.floor(Math.random() * Math.min(2, list.length))] : null;
}
function urgentPoi() {
  for (const p of POIS) {
    if (!p.urgent || now() - (pointed[p.k] || 0) < p.urgent) continue;
    const el = p.get();
    if (el && poiVisible(el)) return { k: p.k, el };
  }
  return null;
}
const marker = document.createElement("div");
marker.className = "px-marker";
marker.hidden = true;
marker.innerHTML = toSvg(MARKER);
me.el.parentNode.append(marker);
function placeMarker(el) {
  const r = el.getBoundingClientRect(), u = 3, w = 7 * u;
  const below = r.top < 64;                       // things in the top bar: point at them from below
  const y = below ? r.bottom + 8 : Math.max(r.top, 4) - w - 8;
  marker.classList.toggle("up", below);
  marker.style.transform = `translate(${Math.round(r.left + r.width / 2 - w / 2)}px, ${Math.round(y)}px)`;
  marker.hidden = !poiVisible(el);
}
function poiText(k) {
  const kbd = $("#open-palette kbd");
  return t("poi." + k).replace("{key}", kbd ? kbd.textContent : "Ctrl K");
}
function pointAt(p) {
  pointed[p.k] = now();
  pointCool = now() + rand(18000, 30000);
  me.soft = false;
  let face = 1;
  me.queue.push(
    walk(() => {
      const r = p.el.getBoundingClientRect(), cx = r.left + r.width / 2;
      face = cx > me.w + 30 ? 1 : -1;
      return face > 0 ? cx - me.w * 0.85 : cx - me.w * 0.15;
    }, 120),
    act(() => {
      if (!poiVisible(p.el)) return "stop";
      me.face = face;
      placeMarker(p.el);
      me.say(bubble(poiText(p.k), "star"), 3400);
    }),
    wait(3400, "point", () => placeMarker(p.el)),
    act(() => { marker.hidden = true; }));
}
addSystem(() => { if (!marker.hidden && (me.base !== "point" || W.ko)) marker.hidden = true; }, 60);

// ---------------------------------------------------------------- waking up
export function wake(a) {
  unlock("wake");
  const deep = a.base === "lie" || a.base === "doze";
  a.interrupt([
    ...(deep ? [act(() => a.say(bubble(t("yawn"), "coffee"), 1200)), wait(1000, "held")] : []),
    act(() => { a.emoteFor("wave", 1400); a.say(bubble(t("back"), "heart"), 2200); }),
    wait(1600, "idle"),
  ]);
}
// back after a while away: he wakes up
on("activity", (quiet) => { if (quiet > 20000 && !W.ko && resting(me) && me.mode === "ground") wake(me); });

// At night he sleeps with a lamp on and a few stars twinkling over him.
export function nightProps(a) {
  if (!isNight()) return;
  const u = unit(), keep = () => me.base === "lie" && !W.ko;
  prop(["lamp"], a.x - 7 * u - 2, { cls: "px-lamp", keep });
  for (let i = 0; i < 3; i++) prop(["twinkle"], a.x + rand(-10, a.w), { y: a.y + rand(-30, 20), cls: "px-twinkle", keep, quiet: true }).el.style.animationDelay = (i * 0.45) + "s";
}

// ---------------------------------------------------------------- the cats and his head
export const headPerch = (a) => (me.mode === "ground" && !me.locked ? { x: me.cx() - a.w / 2, y: me.y - a.h + unit() * 3 } : null);
export const catOnHead = () => W.cat && W.cat.mode === "perch" && W.cat.perch === headPerch;
// The cat of the theme, when it is free to join a scene.
export const freeCat = () => { const c = W.cat; return c && c.mode === "ground" && c.soft && !c.leaving && c.base !== "sleep" ? c : null; };
// x for him that leaves `right` px free on his right for a prop
export const roomFor = (a, right) => clamp(a.x, 10, innerWidth - a.w - right - 10);

// ---------------------------------------------------------------- scenes (registered by scenes.js and others)
const SCENES = [];
// run(): queue the scene on him. opts.urgent(): checked first, every time he is free (e.g. the litter box is dirty).
// opts.weight: how often it comes up among the random scenes (0 = never at random, only on request); a number or a function.
export function addScene(name, run, opts = {}) { SCENES.push({ name, run, weight: opts.weight == null ? 1 : opts.weight, urgent: opts.urgent }); }
const weightOf = (s) => (typeof s.weight === "function" ? s.weight() : s.weight);
export function playScene(name, ...args) {
  const s = SCENES.find((x) => x.name === name);
  if (!s || W.ko) return false;
  me.interrupt([]);
  me.soft = false;
  s.run(...args);
  return true;
}
let sceneCool = now() + 6000;
function randomScene() {
  const list = SCENES.map((s) => ({ s, w: weightOf(s) })).filter((x) => x.w > 0), total = list.reduce((n, x) => n + x.w, 0);
  let r = Math.random() * total;
  return (list.find((x) => (r -= x.w) < 0) || list[0]).s;
}

me.brain = (a) => {
  if (catOnHead()) { a.queue.push(wait(900, "idle", lookAtCursor)); return; }
  const quiet = now() - input.last;
  a.nextWork = 0;
  if (isNight() && quiet > 8000 && Math.random() < 0.6) { a.queue.push(walk(rand(20 + 8 * unit(), a.maxX()), 45), wait(rand(20000, 40000), "lie", snore, nightProps)); return; }
  if (quiet > 75000) { a.queue.push(wait(rand(20000, 40000), "lie", snore, nightProps)); return; }
  if (quiet > 45000) { a.queue.push(wait(rand(9000, 14000), "doze", snore)); return; }
  if (quiet > 20000) { a.queue.push(wait(rand(9000, 14000), "code", working, startCoding)); return; }
  const r = Math.random();
  const poi = urgentPoi() || (now() > pointCool && r < 0.3 ? findPoi() : null);
  if (poi) { pointAt(poi); return; }
  const urgent = SCENES.find((s) => s.urgent && s.urgent());
  if (urgent) { a.soft = false; urgent.run(); return; }
  if (now() > sceneCool && r > 0.55 && SCENES.length) {
    sceneCool = now() + rand(12000, 22000);
    a.soft = false;
    randomScene().run();
    return;
  }
  const cat = W.cat;
  if (r < 0.35) a.queue.push(wait(rand(1500, 4000), "idle", lookAtCursor));
  else if (r < 0.75) a.queue.push(walk(rand(20, a.maxX()), 48), wait(rand(800, 2000), "idle", lookAtCursor));
  else if (r < 0.83 && cat && cat.mode === "ground") {
    a.soft = false;
    a.queue.push(
      walk(() => (cat.cx() > a.cx() ? cat.x - a.w + 10 : cat.x + cat.w - 10), 48),
      act(() => {
        me.face = cat.cx() > me.cx() ? 1 : -1;
        me.emoteFor("wave", 1400);
        me.say(bubble(t("catHi").replace("{name}", cat.name), "heart"), 2200);
        cat.pop("heart");
      }),
      wait(1600, "idle"));
  } else if (r < 0.92) a.queue.push(act(() => me.say(nextLine(), 3200)), wait(3000, "idle", lookAtCursor));
  else a.queue.push(wait(rand(1500, 3000), "idle", lookAtCursor));
};

// ---------------------------------------------------------------- hover and tap (three quick taps: the special attack)
let taps = 0, tapTimer = 0;
function tapMe() {
  taps++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { taps = 0; }, 650);
  if (taps >= 3) { taps = 0; api.special(); return; }
  if (resting(me)) { wake(me); return; }
  me.emoteFor("wave", 1300);
  me.say(nextLine(), 3200);
}
function hoverMe() {
  if (now() - (me.saidAt || 0) < 2500) return;
  if (resting(me)) { wake(me); return; }
  if (me.mode === "ground") me.emoteFor("wave", 1300);
  me.say(nextLine(), 3200);
}
bind(me, tapMe, hoverMe);
// he hops when something rolls at him
export const hop = () => { launch(me, me.x, me.floor(), 0.42); me.setFrame("held"); };

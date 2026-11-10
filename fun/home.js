// The home corner: a wooden floor along the bottom and the furniture that stays there — a bookshelf, two cacti,
// a floor lamp, a little radio, the cats' bowl and the litter box. Click them: the dev waters the cacti, fills
// the bowl, reads from the shelf; the lamp switches on and off (it also comes on by itself at night) and the
// radio plays. The cacti grow one stage on each day you come back and water them, until one day they bloom.
import { t, store, now, rand, clamp, unit, reduced, bubble, emo } from "./util.js";
import { W, api, emit, on, layer, wait, walk, act, addSystem, showFriends } from "./world.js";
import { me, addScene, playScene } from "./me.js";
import { petFeed } from "./pets.js";
import { toSvg, PAL } from "./art/core.js";
import { HOME } from "./art/home.js";
import { PROPS } from "./art/props.js";
import { daylight } from "./clock.js";
import { unlock } from "./achv.js";

// ---------------------------------------------------------------- what is remembered between visits
const HOUR = 3600000;
let saved = {};
try { saved = JSON.parse(store.get("px-home") || "{}") || {}; } catch (e) { /* start over */ }
export const home = {
  cacti: Array.isArray(saved.cacti) && saved.cacti.length === 2 ? saved.cacti : [{ stage: 1, water: 0, grew: Date.now() }, { stage: 0, water: 0, grew: Date.now() }],
  bowl: typeof saved.bowl === "number" ? saved.bowl : 0.7,
  lamp: null,   // null: automatic (on in the dark); true / false: switched by hand until the light changes
};
const save = () => store.set("px-home", JSON.stringify({ cacti: home.cacti, bowl: home.bowl, t: Date.now() }));

// ---------------------------------------------------------------- the floor
const floor = document.createElement("div");
floor.className = "px-floor";
layer.insertBefore(floor, layer.firstChild);

// ---------------------------------------------------------------- the furniture
export const items = {};
function item(name, art, onClick, opts = {}) {
  const el = document.createElement("div");
  el.className = "px-furniture px-f-" + name + (opts.cls ? " " + opts.cls : "");
  layer.insertBefore(el, floor.nextSibling);
  const it = { name, el, art, x: 0, y: 0, w: 0, h: 0, key: "", hidden: false, lift: 0, pal: opts.pal || PAL };
  el.addEventListener("click", (e) => { e.preventDefault(); if (!W.ko && !me.locked) onClick(it); });
  items[name] = it;
  return it;
}
export function render(it) {
  const rows = it.art(), key = rows.join("");
  const u = unit();
  it.w = rows[0].length * u; it.h = rows.length * u;
  it.el.style.width = it.w + "px"; it.el.style.height = it.h + "px";
  it.y = innerHeight - it.h - 2 - it.lift * u;   // lift: hung on the wall, or standing on something
  it.el.style.transform = `translate(${Math.round(it.x)}px, ${Math.round(it.y)}px)`;
  if (key !== it.key) { it.key = key; it.el.innerHTML = toSvg(rows, "", it.pal); }
}
const lampOn = () => (home.lamp == null ? daylight() < 0.5 : home.lamp);
const cactusArt = (i) => () => (i ? HOME.ball : HOME.column)[clamp(home.cacti[i].stage, 0, 4)];
const bowlArt = () => (home.bowl > 0.55 ? HOME.bowlFull : home.bowl > 0.15 ? HOME.bowlHalf : HOME.bowlEmpty);
let radioFrame = 0;
item("shelf", () => HOME.shelf, () => { showFriends(); playScene("read"); });
item("cactus0", cactusArt(0), () => waterSoon(0));
item("cactus1", cactusArt(1), () => waterSoon(1));
item("lamp", () => (lampOn() ? HOME.lampOn : HOME.lampOff), () => { home.lamp = !lampOn(); emit("sfx", "click"); }, { cls: "px-lamp-home" });
item("radio", () => (W.radio && radioFrame ? HOME.radio2 : HOME.radio1), () => toggleRadio());
item("bowl", bowlArt, () => { showFriends(); playScene("feed"); });
item("litter", () => PROPS.litter, () => { showFriends(); playScene("litter"); });
item("table", () => HOME.table, () => {}, { cls: "px-f-static" });

// Where everything goes, as corners of one room (fewer things on small screens):
// the plants on the left (the shelf with the stopwatch on top, the cacti, the catnip), the lamp, the work corner
// (a side table with the radio and the phone, the headphones on the radio, the clock and the calendar on the wall
// above it) and the cats' corner (the bowl and the litter box, the window above them). Wall things share a top line.
const WALL_TOP = 50;   // art pixels above the floor
function layout() {
  const w = innerWidth, u = unit(), small = w < 700, gap = 2 * u;
  const size = (n) => { const it = items[n]; if (!it) return 0; render(it); return it.w; };
  const put = (n, x, opts = {}) => {
    const it = items[n];
    if (!it) return null;
    it.x = Math.round(x); it.lift = opts.lift || 0; it.hidden = opts.show === false; it.el.hidden = it.hidden;
    render(it);
    return it;
  };
  const hang = (n, x) => { const it = items[n]; if (!it) return null; size(n); return put(n, x, { lift: WALL_TOP - it.h / u }); };
  const right = (it) => (it ? it.x + it.w : 0);

  // the plant corner
  const shelf = put("shelf", 10, { show: !small });
  let x = small ? 10 : right(shelf) + gap;
  const c0 = put("cactus0", x);
  x = right(c0) + gap;
  const c1 = put("cactus1", x, { show: !small || w > 420 });
  if (!c1.hidden) x = right(c1) + gap;
  const nip = put("catnip", x, { show: !small || w > 380 });
  if (nip && !nip.hidden) x = right(nip) + gap;
  if (small) put("stopwatch", x);   // no shelf: next to the plants
  else put("stopwatch", shelf.x + shelf.w / 2 - size("stopwatch") / 2, { lift: shelf.h / u - 1 });

  put("lamp", w * (small ? 0.34 : 0.27));

  // the work corner
  let deskMid;
  if (small) {
    put("table", 0, { show: false });
    put("radio", 0, { show: false });
    const ph = put("phone", w * 0.48);
    const hp = put("headphones", right(ph) + gap);
    deskMid = ph ? (ph.x + right(hp || ph)) / 2 : w * 0.5;
  } else {
    const table = put("table", w * 0.4), top = table.h / u - 1;
    const radio = put("radio", table.x + 2 * u, { lift: top });
    put("phone", right(table) - size("phone") - 2 * u, { lift: top });
    put("headphones", radio.x + radio.w / 2 - size("headphones") / 2, { lift: top + radio.h / u - 1 });
    deskMid = table.x + table.w / 2;
  }
  const pair = size("clock") + 3 * u + size("calendar");
  const clock = hang("clock", deskMid - pair / 2);
  if (clock) hang("calendar", right(clock) + 3 * u);

  // the cats' corner
  const bowl = put("bowl", w * (small ? 0.66 : 0.62));
  const litter = put("litter", right(bowl) + 8 * u, { show: !small });
  const end = small ? right(bowl) : right(litter);
  hang("window", (bowl.x + end) / 2 - size("window") / 2);
}
// more furniture (gadgets.js, speedrun.js); layout() knows where each one goes
export function addFurniture(name, art, onClick, opts = {}) {
  const it = item(name, art, onClick, opts);
  layout();
  return it;
}
layout();
on("resize", layout);
// positions other features ask for
api.lampX = () => (items.lamp.hidden ? null : items.lamp.x + items.lamp.w / 2);
api.litterX = () => (items.litter.hidden ? null : items.litter.x);
api.bowlX = () => items.bowl.x + items.bowl.w / 2;
api.lampHead = () => (lampOn() && !items.lamp.hidden ? { x: items.lamp.x + items.lamp.w / 2, y: items.lamp.y + 2 * unit() } : null);

// ---------------------------------------------------------------- the cacti: water them, they grow day by day
// a day goes by (the calendar on the wall): as if the last watering and growth were a day earlier
export function passDay() {
  home.cacti.forEach((c) => { c.water -= 24 * HOUR; c.grew -= 24 * HOUR; });
  save();
}
// a whole season goes by (the season changed from the palette or the terminal): each cactus grows a stage
on("season", () => {
  let grew = false, bloomed = false;
  home.cacti.forEach((c, i) => {
    if (c.stage >= 4 || items["cactus" + i].hidden) return;
    c.stage++; c.grew = Date.now(); grew = true;
    if (c.stage === 4) bloomed = true;
    render(items["cactus" + i]);
  });
  if (!grew) return;
  save();
  if (bloomed) unlock("bloom");
  setTimeout(() => { if (!me.locked) me.say(bubble(t(bloomed ? "home.bloom" : "home.season"), "star"), 2400); }, 2800);   // after the holiday line
});

// back to the start (a speedrun begins)
export function resetHome() {
  home.cacti = [{ stage: 1, water: 0, grew: Date.now() }, { stage: 0, water: 0, grew: Date.now() }];
  home.bowl = 0.7;
  save();
  ["cactus0", "cactus1", "bowl"].forEach((k) => render(items[k]));
}
function water(i) {
  const c = home.cacti[i], t0 = Date.now();
  if (t0 - c.water < 2 * HOUR) { me.say(bubble(t("home.tooMuch"), "skull"), 2400); return; }
  c.water = t0;
  unlock("water");
  if (t0 - c.grew > 18 * HOUR && c.stage < 4) {
    c.stage++; c.grew = t0;
    render(items["cactus" + i]);
    me.say(bubble(t(c.stage === 4 ? "home.bloom" : "home.grew"), "star"), 2600);
    if (c.stage === 4) unlock("bloom");
  } else me.say(bubble(t("home.watered"), "heart"), 2200);
  save();
}
// the dev walks over with the watering can (the spout is at his right hand)
function sceneWater(i) {
  const u = unit();
  if (i == null) {   // on his own: the thirstier cactus (cactus 1 is not there on very small screens)
    const shown = [0, 1].filter((k) => !items["cactus" + k].hidden);
    i = shown.sort((a, b) => home.cacti[a].water - home.cacti[b].water)[0];
  }
  const it = items["cactus" + i];
  me.queue.push(
    walk(() => clamp(it.x + it.w / 2 - 31 * u, 4, me.maxX()), 140),
    wait(3200, "water1", (a) => { a.face = 1; a.setFrame(Math.floor(now() / 260) % 2 ? "water1" : "water2"); }),
    act(() => water(i)),
    wait(1400, "idle"));
}
function waterSoon(i) { showFriends(); playScene("water", i); }
addScene("water", sceneWater, { weight: () => (home.cacti.some((c) => Date.now() - c.water > 20 * HOUR) ? 0.6 : 0) });

// ---------------------------------------------------------------- the bowl: the cats eat from it, the dev fills it
function sceneFeed() {
  const it = items.bowl;
  me.queue.push(
    walk(() => clamp(it.x - me.w + 6 * unit(), 4, me.maxX()), 140),
    act(() => { me.face = 1; }),
    wait(900, "point"),
    act(() => {
      home.bowl = 1; save(); render(it);
      unlock("feed");
      me.say(bubble(t("home.fed"), "fish"), 2200);
      emit("sfx", "drop");
    }),
    wait(1200, "idle"));
}
addScene("feed", sceneFeed, { weight: 0, urgent: () => home.bowl < 0.15 && Math.random() < 0.3 });
// a hungry cat goes to the bowl first (see cats.js); null when it is empty
api.catEat = (c) => {
  if (home.bowl < 0.1) return null;
  const it = items.bowl;
  return [
    walk(() => clamp(it.x + it.w / 2 - c.w * 0.75, 4, c.maxX()), 80),
    act(() => { c.face = 1; }),
    wait(3200, "paw", (a) => a.setFrame(Math.floor(now() / 300) % 2 ? "paw" : "sit")),
    act(() => {
      home.bowl = Math.max(0, home.bowl - 0.3); save(); render(it);
      petFeed(c, "food", 35);
      emit("sfx", "nom");
      c.say(bubble(t("nom"), "fish"), 1400);
    }),
    wait(1500, "sit"),
  ];
};

// ---------------------------------------------------------------- the radio
export function toggleRadio(force) {
  W.radio = typeof force === "boolean" ? force : !W.radio;
  render(items.radio);
  emit("sfx", "click");
  if (W.radio && !me.locked) me.say(bubble(t("home.radioOn"), "note"), 1800);
}
let nextNote = 0;
function noteFromRadio() {
  const it = items.radio;
  if (it.hidden || reduced()) return;
  const el = document.createElement("span");
  el.className = "px-radio-note";
  el.innerHTML = emo("note");
  el.style.transform = `translate(${Math.round(it.x + rand(0, it.w))}px, ${Math.round(it.y - 10)}px)`;
  layer.append(el);
  setTimeout(() => el.remove(), 1100);
}

// ---------------------------------------------------------------- every frame
let lampKey = "", lightWas = null;
addSystem((dt, ts) => {
  const hide = !!W.ko;
  layer.classList.toggle("px-down", hide);
  // the lamp: back to automatic when day turns into night or night into day
  const light = daylight() < 0.5;
  if (lightWas !== null && light !== lightWas) home.lamp = null;
  lightWas = light;
  const lk = String(lampOn());
  if (lk !== lampKey) { lampKey = lk; render(items.lamp); items.lamp.el.classList.toggle("px-lit", lampOn()); }
  if (W.radio) {
    const f = Math.floor(ts / 400) % 2;
    if (f !== radioFrame) { radioFrame = f; render(items.radio); }
    if (now() > nextNote) { nextNote = now() + rand(500, 900); noteFromRadio(); }
  }
}, 45);
// days away: the bowl empties a little while you are gone
const away = clamp((Date.now() - (saved.t || Date.now())) / HOUR, 0, 48);
home.bowl = Math.max(0, home.bowl - away * 0.04);
setInterval(save, 15000);

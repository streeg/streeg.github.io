// Gadgets around the home corner, each a way to make something happen instead of waiting for it:
// the wall clock moves the day on (evening brings a cat to his lap, night a shooting star), the calendar tears
// off a day (the cacti can grow again), the phone orders a pizza, a knock on the window calls Pingo, the
// headphones get him into the flow, and catnip sends the cat into the yarn.
import { t, now, clamp, unit, reduced, bubble, hourNow, setFakeHour } from "./util.js";
import { W, emit, layer, wait, walk, act, hopDown, landed, addSystem, showFriends } from "./world.js";
import { me, freeCat, playScene, setPower } from "./me.js";
import { addFurniture, items, render, passDay } from "./home.js";
import { phase } from "./clock.js";
import { shootingStar } from "./daynight.js";
import { pizzaVisit, pingoVisit } from "./visits.js";
import { catnipRush, yarn } from "./toys.js";
import { toSvg } from "./art/core.js";
import { GADGETS } from "./art/home.js";

const busy = () => W.ko || me.locked;
const near = (it, dx = 0) => () => clamp(it.x + it.w / 2 - me.w / 2 + dx, 4, me.maxX());

// ---------------------------------------------------------------- the wall clock: on to the next part of the day
const STEPS = [["dawn", 5.5], ["morning", 8], ["afternoon", 13], ["dusk", 17.5], ["evening", 20], ["night", 23.5]];
export function windClock() {
  if (busy()) return;
  showFriends();
  const i = STEPS.findIndex(([p]) => p === phase());
  const [next, hour] = STEPS[(i + 1) % STEPS.length];
  setFakeHour(hour);
  emit("sfx", "click");
  render(items.clock);
  me.say(bubble(t("gadget.clock." + next), "star"), 2200);
  if (next === "evening") setTimeout(() => lapSoon(0), 1600);
  if (next === "night") setTimeout(() => shootingStar(), 2500);
}
// evening: the cat comes to his lap (woken up, or down from wherever it is; a few tries while it is busy)
function lapSoon(tries) {
  if (busy() || W.event || me.base.startsWith("lap") || phase() !== "evening") return;
  const c = W.cat;
  if (c && !c.leaving && !c.tangledUntil) {
    if (c.mode === "perch") c.interrupt([hopDown(0), landed()]);
    else if (c.mode === "ground") { c.interrupt([], true); c.setFrame("sit"); }   // even a sleeping cat comes
  }
  if (freeCat()) playScene("lap");
  else if (tries < 5) setTimeout(() => lapSoon(tries + 1), 1200);
}
addFurniture("clock", () => GADGETS.clock[Math.floor(hourNow() / 3) % 4], windClock);

// ---------------------------------------------------------------- the calendar: a day goes by
let page = new Date().getDate() % 12;
export function tearDay() {
  if (busy()) return;
  showFriends();
  page = (page + 1) % 12;
  passDay();
  render(items.calendar);
  emit("sfx", "tear");
  const it = items.calendar, u = unit();
  if (!reduced()) {   // the old page flutters down
    const leaf = document.createElement("div");
    leaf.className = "px-page";
    leaf.style.width = it.w + "px"; leaf.style.height = 4 * u + "px";
    layer.append(leaf);
    leaf.animate([
      { transform: `translate(${it.x}px, ${it.y}px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${it.x + 30}px, ${innerHeight - 8}px) rotate(70deg)`, opacity: 0 },
    ], { duration: 1100, easing: "ease-in" }).onfinish = () => leaf.remove();
  }
  me.say(bubble(t("gadget.day"), "star"), 2000);
}
addFurniture("calendar", () => GADGETS.calendar[page], tearDay);

// ---------------------------------------------------------------- the phone: he orders a pizza
export function callPizza() {
  if (busy()) return;
  showFriends();
  if (W.event) { me.say(bubble(t("gadget.later"), "skull"), 1800); return; }
  const it = items.phone;
  me.interrupt([
    walk(near(it, -me.w * 0.35), 140),
    act(() => { me.face = 1; emit("sfx", "beep"); }),
    wait(2600, "wave", null, (a) => a.say(bubble(t("gadget.phone"), "heart"), 2400)),
    act(() => { pizzaVisit(); }),
  ]);
}
addFurniture("phone", () => GADGETS.phone, callPizza);

// ---------------------------------------------------------------- the window: knock, and Pingo comes over
export function knock() {
  if (busy()) return;
  showFriends();
  emit("sfx", "knock");
  if (pingoVisit()) { me.say(bubble(t("gadget.knock"), "cat"), 2000); return; }
  if (W.cat && W.cat.mode === "ground") W.cat.say(bubble("?", "cat"), 1200);
}
const night = () => hourNow() >= 19 || hourNow() < 6;
addFurniture("window", () => (night() ? GADGETS.windowNight : GADGETS.windowDay), knock);

// ---------------------------------------------------------------- the headphones: he codes with them on and gets in the flow
let usingPhones = false;
export function focus() {
  if (busy()) return;
  showFriends();
  const it = items.headphones;
  me.interrupt([
    walk(near(it), 140),
    act(() => { usingPhones = true; it.el.hidden = true; me.face = 1; me.flowGo = now() + 1500; me.flowOn = false; me.say(bubble(t("gadget.focus"), "note"), 1600); }),
    wait(10000, "meet1", (a) => {
      a.face = 1;
      a.setFrame(me.noMug ? "meetN" : "meet1");
      if (!a.flowOn && now() > a.flowGo) { a.flowOn = true; setPower(true, 8000); a.say(bubble(t("flow"), "fire"), 1800); }
    }),
  ]);
}
addFurniture("headphones", () => GADGETS.headphones, focus);
addSystem(() => {   // back on the radio when he is done
  if (usingPhones && !me.base.startsWith("meet")) { usingPhones = false; items.headphones.el.hidden = items.headphones.hidden; }
}, 62);

// ---------------------------------------------------------------- catnip: a leaf near the yarn, and the cat goes wild
export function catnip() {
  if (busy()) return;
  showFriends();
  const it = items.catnip, c = W.cat;
  me.interrupt([
    walk(near(it, -me.w * 0.3), 140),
    act(() => { me.face = yarn.cx() > me.cx() ? 1 : -1; }),
    wait(500, "point"),
    act(() => {
      const u = unit(), leaf = document.createElement("div");
      leaf.className = "px-catch";
      leaf.innerHTML = toSvg(GADGETS.leaf);
      leaf.style.width = 4 * u + "px"; leaf.style.height = 5 * u + "px";
      layer.append(leaf);
      const from = { x: me.cx(), y: me.y + 10 * u }, to = { x: yarn.cx(), y: innerHeight - 6 * u };
      leaf.animate([
        { transform: `translate(${from.x}px, ${from.y}px)` },
        { transform: `translate(${(from.x + to.x) / 2}px, ${Math.min(from.y, to.y) - 60}px)`, offset: 0.5 },
        { transform: `translate(${to.x}px, ${to.y}px)` },
      ], { duration: reduced() ? 1 : 700, easing: "ease-in-out", fill: "forwards" }).onfinish = () => {
        setTimeout(() => leaf.remove(), 2500);
        if (c && !catnipRush(c)) c.say(bubble("…", "cat"), 1200);
      };
      me.say(bubble(t("gadget.catnip").replace("{cat}", c ? c.name : ""), "cat"), 1800);
    }),
    wait(1200, "idle"),
  ]);
}
addFurniture("catnip", () => GADGETS.catnip, catnip);

// the clock's hand and the window's sky follow the hour
let nextLook = 0;
addSystem(() => { if (now() < nextLook) return; nextLook = now() + 1000; render(items.clock); render(items.window); }, 46);

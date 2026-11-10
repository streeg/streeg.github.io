// Rare visits: Pingo, the neighbour's orange cat, who drops by, says hi to the cats and wanders off;
// and in the evening, a pizza delivery (the doorbell rings, the dev takes the box, then eats while the cats beg).
// Only one visit (or Lud's) happens at a time: W.event says who is here.
import { t, now, rand, pick, clamp, unit, reduced, bubble, hourNow } from "./util.js";
import { W, emit, layer, actors, catNamed, Actor, wait, walk, act, until, bind, addSystem } from "./world.js";
import { me, playScene } from "./me.js";
import { CAT } from "./art/cats.js";
import { FRAMES } from "./art/dev.js";
import { CRITTERS, PINGO_PAL, DELIVERY_PAL } from "./art/home.js";
import { toSvg, PAL } from "./art/core.js";
import { unlock } from "./achv.js";

const busy = () => W.ko || layer.hidden || W.event || me.locked;

// ---------------------------------------------------------------- Pingo
export function pingoVisit() {
  if (busy() || catNamed("Pingo")) return false;
  const p = new Actor("cat", CAT, PINGO_PAL, "sit", ["walk1", "walk2"], 120);
  p.name = "Pingo"; p.catId = "pingo"; p.jumpFrame = "jump";
  p.onLand = () => p.setFrame("sit");
  p.onGrab = () => p.say(bubble("mrrp?", "cat"), 1200);
  p.brain = (a) => a.queue.push(walk(rand(10, a.maxX()), 60), wait(rand(2000, 5000), pick(["sit", "sit", "sleep"])));
  bind(p, () => { p.pop("heart"); p.say(bubble(t("visit.pingoMeow"), "heart"), 1500); emit("sfx", "meow"); }, () => p.say(bubble(t("visit.pingoName"), "cat"), 1800));
  const fromLeft = Math.random() < 0.5;
  p.x = fromLeft ? -p.w - 10 : innerWidth + 10; p.face = fromLeft ? 1 : -1;
  p.visitor = true; p.entering = true; p.leaveAt = now() + rand(40000, 70000);
  const host = W.cat;
  p.interrupt([
    walk(() => clamp((host ? host.cx() : innerWidth / 2) + (fromLeft ? -120 : 120), 4, p.maxX()), 90),
    act(() => {
      p.say(bubble(t("visit.pingoMeow"), "heart"), 1500);
      if (host && host.mode === "ground") { host.face = p.cx() > host.cx() ? 1 : -1; host.pop("heart"); host.say(bubble("mrrp", "cat"), 1400); }
      if (!me.locked) me.say(bubble(t("visit.pingoHi"), "cat"), 2200);
      unlock("pingo");
    }),
    wait(2000, "sit"),
  ]);
  return true;
}

// ---------------------------------------------------------------- pizza
let pizzaDone = false;
export function pizzaVisit() {
  if (busy()) return false;
  W.event = "pizza";
  emit("sfx", "doorbell");
  const d = new Actor("delivery", FRAMES, DELIVERY_PAL, "idle", ["walk1", "walk2", "walk3", "walk4"], 150);
  const box = document.createElement("div");
  box.className = "px-carry";
  box.innerHTML = toSvg(CRITTERS.pizza, "", PAL);
  layer.append(box);
  let carrier = d;
  const u = unit();
  box.style.width = CRITTERS.pizza[0].length * u + "px"; box.style.height = CRITTERS.pizza.length * u + "px";
  d.carry = () => { const c = carrier; box.style.transform = `translate(${Math.round(c.cx() + c.face * 6 * u - 5 * u)}px, ${Math.round(c.y + 21 * u)}px)`; };
  d.x = innerWidth + 10; d.face = -1; d.entering = true;
  const end = () => { box.remove(); if (actors.includes(d)) d.remove(); W.event = null; };
  me.interrupt([until(() => d.arrived, 15000), act(() => { me.face = d.cx() > me.cx() ? 1 : -1; me.emoteFor("wave", 1200); me.say(bubble(t("visit.pizzaThanks"), "heart"), 2000); }), wait(1800, "idle")]);
  d.interrupt([
    walk(() => clamp(me.cx() + me.w * 0.9, 4, d.maxX()), 110),
    act(() => { d.face = -1; d.arrived = true; d.say(bubble(t("visit.pizza"), "star"), 2000); }),
    wait(1800, "idle"),
    act(() => { carrier = me; unlock("pizza"); }),
    wait(900, "wave"),
    walk(innerWidth + 60, 120),
    act(() => {
      end();
      if (!me.locked) playScene("eat");
      for (const c of [W.cat, W.visitor]) if (c && c.mode === "ground") c.say(bubble(t("visit.pizzaCat"), "fish"), 1800);
    }),
  ]);
  d.brain = () => {};
  d.onEnd = end;
  const tick = setInterval(() => { if (!actors.includes(d)) { clearInterval(tick); box.remove(); return; } d.carry(); if (W.ko || layer.hidden) { clearInterval(tick); end(); } }, 16);
  pizzaDone = true;
  return true;
}

// ---------------------------------------------------------------- when they come
let checkAt = now() + rand(50000, 90000);
addSystem(() => {
  if (now() < checkAt || reduced() || W.calm) return;
  checkAt = now() + rand(60000, 100000);
  const h = hourNow();
  if (!pizzaDone && h >= 18.5 && h < 23 && Math.random() < 0.18) { pizzaVisit(); return; }
  if (Math.random() < 0.15) pingoVisit();
}, 80);

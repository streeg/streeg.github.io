// Lud's visit, a rare event (more likely in the evening and at the weekend; or type "lud", or `ssh lud` in the
// terminal). She walks in, the dev goes to meet her and they hug; then two things together, picked at random:
// she picks Sancho up, they watch TV, dance, take a selfie, or he plays the guitar for her. Then she waves bye.
import { S, t, now, rand, pick, clamp, unit, sleep, typing, reduced, bubble } from "./util.js";
import { W, emit, layer, actors, catNamed, Actor, wait, walk, act, bind, prop, addSystem } from "./world.js";
import { me } from "./me.js";
import { summonVisitor } from "./cats.js";
import { flash } from "./ui.js";
import { LUD, LUD_PAL } from "./art/lud.js";
import { unlock } from "./achv.js";
import { phase, isWeekend } from "./clock.js";

let lud = null;
const hold = () => ({ update: () => false });   // keeps an actor still until the next step
// run tasks on an actor and wait for them to finish (or for the visit to be cut short: special attack, hidden)
const go = (a, tasks) => new Promise((res) => {
  const iv = setInterval(() => { if (gone() || !actors.includes(a)) done(); }, 250);
  const done = () => { clearInterval(iv); res(); };
  a.interrupt([...tasks, act(done), hold()]);
});
const say = (a, key, icon = "heart", ms = 2200) => a.say(bubble(t(key), icon), ms);
const gone = () => !lud || W.ko || layer.hidden || !actors.includes(lud);
const face = (a, b) => { a.face = b.cx() > a.cx() ? 1 : -1; };
const hearts = (...who) => who.forEach((a, i) => setTimeout(() => a.pop("heart"), i * 250));

function makeLud() {
  const l = new Actor("lud", LUD, LUD_PAL, "idle", ["walk1", "walk2", "walk3", "walk4"], 150);
  l.heldFrame = "held";
  l.onGrab = () => say(l, "lud.grabbed", "heart", 1400);
  l.brain = () => {};
  bind(l, () => { hearts(l); l.say(bubble(pick(t("lud.tap")), "heart"), 1800); }, () => { if (now() - (l.saidAt || 0) > 2500) l.say(bubble(pick(t("lud.tap")), "heart"), 1800); });
  return l;
}

// ---------------------------------------------------------------- things to do together
async function withCat() {
  let c = catNamed("Sancho");
  if (!c && W.cat && W.cat.name !== "Sancho") { summonVisitor(true); await sleep(5500); c = catNamed("Sancho"); }
  c = c || W.cat;
  if (!c || gone()) return;
  me.interrupt([act(() => me.setFrame("idle")), hold()]);
  say(lud, c.name === "Sancho" ? "lud.cats" : "lud.catsCapitu", "cat");
  await go(c, [walk(() => clamp(lud.cx() - c.w / 2 + (c.cx() < lud.cx() ? -50 : 50), 4, c.maxX()), 120), wait(500, "sit")]);
  if (gone()) return;
  // she picks the cat up: the cat is drawn in her arms while it hides on the floor
  const frame = c.name === "Sancho" ? "holdSancho" : "holdCapitu";
  c.el.style.visibility = "hidden";
  await go(lud, [wait(4200, frame, null, () => { say(lud, "lud.catHold", "heart"); hearts(lud); emit("sfx", "purr"); })]);
  c.el.style.visibility = "";
  c.x = clamp(lud.cx() + 20, 4, c.maxX());
  if (!me.locked) say(me, "lud.devCat", "cat");
  await go(c, [wait(1200, "sit")]);
  c.interrupt([]);
}
async function watchTV() {
  const u = unit();
  await Promise.all([go(me, [walk(() => clamp(lud.x - me.w - 4, 4, me.maxX()), 80), act(() => { me.face = 1; })]), go(lud, [act(() => { lud.face = 1; })])]);
  if (gone()) return;
  const keep = () => !!lud && lud.base.startsWith("watch");
  prop(["tvs1", "tvs2"], lud.x + lud.w + 2 * u, { every: 700, keep });
  say(lud, "lud.tv", "star");
  const tv = (a) => a.setFrame(now() % 2400 < 1900 ? "watch1" : "watch2");
  await Promise.all([go(me, [wait(8000, "watch1", tv)]), go(lud, [wait(8000, "watch1", tv)])]);
}
async function dance() {
  say(lud, "lud.dance", "note");
  const u = unit();
  const keep = () => !!lud && lud.base.startsWith("dance");
  prop(["boombox"], clamp(me.x - 14 * u - 6, 4, innerWidth - 40), { keep });
  const beat = ["dance1", "dance2", "dance3", "dance4"];
  const step = (a) => { const i = Math.floor(now() / 280); a.setFrame(beat[i % 4]); a.face = i % 8 < 4 ? 1 : -1; if (now() > (a.nextNote || 0)) { a.pop("note"); a.nextNote = now() + rand(500, 900); } };
  await Promise.all([go(me, [wait(7000, "dance1", step)]), go(lud, [wait(7000, "dance1", step)])]);
  unlock("dance");
}
async function selfie() {
  await go(me, [walk(() => clamp(lud.x - me.w + 10, 4, me.maxX()), 80), act(() => { me.face = 1; lud.face = 1; })]);
  if (gone()) return;
  say(lud, "lud.selfie", "star", 1600);
  await Promise.all([go(me, [wait(2400, "wave")]), go(lud, [wait(1200, "selfie"), act(() => { const u = unit(); flash(lud.x + 25 * u, lud.y + 12 * u); emit("sfx", "shutter"); hearts(me, lud); }), wait(1200, "selfie")])]);
}
async function serenade() {
  await Promise.all([go(me, [walk(() => clamp(lud.x - me.w - 6, 4, me.maxX()), 80), act(() => { me.face = 1; })]), go(lud, [act(() => { lud.face = -1; })])]);
  if (gone()) return;
  say(lud, "lud.violao", "note");
  const strum = (a) => { a.setFrame(Math.floor(now() / 380) % 2 ? "vio1" : "vio2"); if (now() > (a.nextNote || 0)) { a.pop("note"); a.nextNote = now() + rand(700, 1100); } };
  const listen = (a) => { a.setFrame(now() % 3000 < 2000 ? "lap2" : "lap1"); if (now() > (a.nextHeart || 0)) { a.pop("heart"); a.nextHeart = now() + rand(1500, 2500); } };
  await Promise.all([go(me, [wait(8000, "vio1", strum)]), go(lud, [wait(8000, "lap2", listen)])]);
}

// ---------------------------------------------------------------- the visit
// what: a list of activities to do (QA); otherwise two at random
export async function ludVisit(what) {
  if (lud || W.ko || layer.hidden || me.locked || W.event) return false;
  W.event = "lud";
  lud = makeLud();
  const fromRight = me.cx() > innerWidth / 2;   // from the nearest edge
  lud.x = fromRight ? innerWidth + 10 : -lud.w - 10; lud.face = fromRight ? -1 : 1; lud.entering = true;
  emit("sfx", "doorbell");
  try {
    const meet = () => clamp(me.x + (fromRight ? me.w * 0.62 : -me.w * 0.62), 4, lud.maxX());   // close enough to hug
    me.setFrame("idle");
    me.interrupt([act(() => { me.face = fromRight ? 1 : -1; me.emoteFor("wave", 1500); me.say(bubble(t(Math.random() < 0.5 ? "lud.princess" : "lud.devSees"), "heart"), 2400); }), hold()]);
    await go(lud, [walk(meet, 130)]);
    if (gone()) return true;
    say(lud, "lud.arrive", "heart");
    face(lud, me); face(me, lud);
    await Promise.all([go(me, [wait(2600, "hug")]), go(lud, [wait(2600, "hug", null, () => setTimeout(() => hearts(me, lud), 400))])]);
    unlock("lud");
    const all = { withCat, watchTV, dance, selfie, serenade };
    const todo = Array.isArray(what) ? what.map((k) => all[k]).filter(Boolean) : Object.values(all).sort(() => Math.random() - 0.5).slice(0, 2);
    for (const fn of todo) { if (gone()) break; await fn(); }
    if (!gone()) {
      face(lud, me); face(me, lud);
      say(lud, "lud.bye", "heart");
      await Promise.all([go(me, [wait(1600, "wave")]), go(lud, [wait(1600, "wave")])]);
      if (!me.locked) say(me, "lud.devBye", "heart");
      await go(lud, [walk(fromRight ? innerWidth + 60 : -lud.w - 60, 100)]);
    }
  } finally {
    if (lud && actors.includes(lud)) lud.remove();
    lud = null;
    W.event = null;
    if (!me.locked) me.interrupt([]);
  }
  return true;
}

// rare, by herself: once in a while, more likely in the evening and at the weekend (at most once per visit)
let checkAt = now() + rand(70000, 150000), came = false;
addSystem(() => {
  if (came || now() < checkAt || reduced() || W.calm) return;
  checkAt = now() + rand(90000, 150000);
  const chance = (phase() === "evening" || phase() === "dusk" ? 0.12 : 0.05) * (isWeekend() ? 2 : 1);
  if (Math.random() < chance) { came = true; ludVisit(); }
}, 85);
// type her name and she comes
let typed = "";
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || typing() || S.paletteOpen() || e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-3);
  if (typed === "lud") { typed = ""; ludVisit(); }
});

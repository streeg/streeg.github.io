// The cats: Capitu (dark theme) and Sancho (light theme). Their brain (needs first, then the coin, knocking
// things off the stack, the yarn, napping by the dev, sitting on his head), the theme switch (the new cat drops
// out of the button and the old one leaves) and the other cat's visits.
import { $, root, t, now, rand, pick, clamp, unit, isNight, finePointer, reduced, bubble } from "./util.js";
import { W, api, emit, actors, catNamed, Actor, layer, wait, walk, act, until, landed, launch, jumpTo, hopDown, bind, mouse, addActorHook, addSystem } from "./world.js";
import { me, headPerch, resting } from "./me.js";
import { CATS, petState, petOf, petFeed, petStatus } from "./pets.js";
import { chaseYarn } from "./toys.js";
import { CAT, CAT_PAL } from "./art/cats.js";
import { unlock } from "./achv.js";

let coinCool = 0, headCool = now() + 15000, huntCool = 0;
const coinPerch = (a) => {
  const c = $("#core");
  if (!c) return null;
  const r = c.getBoundingClientRect();
  if (r.width < 20 || r.top < 90 || r.bottom > innerHeight - 20) return null;
  return { x: r.left + r.width / 2 - a.w / 2, y: r.top - a.h + unit() * 3 };
};

function makeCat(theme) {
  const info = CATS[theme] || CATS.dark;
  const c = new Actor("cat", CAT, CAT_PAL[info.id], "sit", ["walk1", "walk2"], 120);
  c.name = info.name; c.catId = info.id; c.jumpFrame = "jump";
  c.onLand = () => { c.setFrame("sit"); };
  c.onGrab = () => c.say(bubble("mrrp?", "cat"), 1200);
  c.brain = catBrain;
  return c;
}
// ---------------------------------------------------------------- knocking things off: the cat sits on a stack tile and paws the next one off
let knockCool = now() + 20000;
const tilePerch = (tile, dir) => (a) => {
  const r = tile.getBoundingClientRect();
  if (r.top < 90 || r.bottom > innerHeight - 40 || r.width < 10) return null;
  return { x: r.left + r.width / 2 - a.w / 2 + dir * r.width * 0.2, y: r.top - a.h + unit() * 2 };
};
function findKnock(a) {
  const tiles = [...document.querySelectorAll("#stack-grid .tech")].filter((el) => { const r = el.getBoundingClientRect(); return r.top > 90 && r.bottom < innerHeight - 40 && r.width > 10; });
  for (const on of tiles.sort(() => Math.random() - 0.5)) {
    const ro = on.getBoundingClientRect();
    for (const [off, dir] of [[on.nextElementSibling, 1], [on.previousElementSibling, -1]]) {
      if (!off || off.dataset.knocked) continue;
      const rf = off.getBoundingClientRect();
      if (Math.abs(rf.top - ro.top) < 4 && tilePerch(on, dir)(a)) return { on, off, dir };
    }
  }
  return null;
}
export function knockOff(tile, dir) {
  if (!tile.animate || tile.dataset.knocked) return;
  tile.dataset.knocked = "1";
  const r = tile.getBoundingClientRect();
  const dy = Math.max(0, innerHeight - r.bottom - 4), dx = dir * rand(24, 56), d = dir;
  const anim = tile.animate([
    { translate: "0 0", rotate: "0deg", easing: "ease-out" },
    { translate: `${dx * 0.3}px -12px`, rotate: `${d * 14}deg`, offset: 0.06, easing: "cubic-bezier(.55,0,1,.45)" },
    { translate: `${dx}px ${dy}px`, rotate: `${d * 85}deg`, offset: 0.26, easing: "ease-out" },
    { translate: `${dx * 1.15}px ${dy - 20}px`, rotate: `${d * 96}deg`, offset: 0.32, easing: "ease-in" },
    { translate: `${dx * 1.25}px ${dy}px`, rotate: `${d * 90}deg`, offset: 0.38 },
    { translate: `${dx * 1.25}px ${dy}px`, rotate: `${d * 90}deg`, offset: 0.8, easing: "cubic-bezier(.3,1.35,.5,1)" },
    { translate: "0 0", rotate: "0deg" },
  ], { duration: 5200 });
  const done = () => { delete tile.dataset.knocked; };
  anim.onfinish = done; anim.oncancel = done;
  setTimeout(() => { if (!W.ko) { me.face = r.left + r.width / 2 > me.cx() ? 1 : -1; me.emoteFor("point", 1500); me.say(bubble(t("knock"), "skull"), 2000); } }, 1100);
}

function catBrain(a) {
  const r = Math.random(), need = petOf(a);
  // hungry: the bowl first (home.js), and if it is empty, ask the dev
  const meal = need && need.food < 45 && Math.random() < 0.4 && api.catEat ? api.catEat(a) : null;
  if (meal) { a.soft = false; a.queue.push(...meal); return; }
  if (need && need.food < 40 && Math.random() < 0.3 && me.mode === "ground") {
    a.soft = false;
    a.queue.push(walk(() => (me.cx() > a.cx() ? me.x - a.w + 12 : me.x + me.w - 12), 70), act(() => { a.face = me.cx() > a.cx() ? 1 : -1; a.say(bubble(t("pet.hungry"), "fish"), 2000); }), wait(2500, "sit"));
    return;
  }
  if (need && need.fun < 35 && Math.random() < 0.25) {
    a.queue.push(act(() => { a.face = me.cx() > a.cx() ? -1 : 1; a.say(bubble(t("pet.bored"), "cat"), 1800); }), wait(rand(3000, 5000), "sit"));
    return;
  }
  if (petState.box < 40 && Math.random() < 0.12) { a.queue.push(act(() => a.say(bubble(t("pet.boxHint"), "cat"), 1800)), wait(2000, "sit")); return; }
  if (need && need.energy < 30 && Math.random() < 0.5) { a.queue.push(wait(rand(15000, 25000), "sleep")); return; }
  if (now() > coinCool && Math.random() < 0.3 && coinPerch(a)) {
    coinCool = now() + 25000; a.soft = false;
    a.queue.push(
      walk(() => { const p = coinPerch(a); return p ? p.x + (a.x < p.x ? -70 : 70) : null; }, 70),
      wait(350, "sit"),
      jumpTo(coinPerch, 0.6),
      act(() => (a.mode === "perch" ? undefined : "stop")),
      wait(260, "paw"), wait(220, "sit"), wait(260, "paw"),
      act(() => { const c = $("#core"); if (c) c.click(); a.say(bubble(pick(t("meow")), "heart"), 1800); }),
      wait(2600, "sit"),
      hopDown(rand(-90, 90)), landed());
    return;
  }
  const knock = now() > knockCool && Math.random() < 0.35 ? findKnock(a) : null;
  if (knock) {
    knockCool = now() + rand(35000, 60000); a.soft = false;
    const perch = tilePerch(knock.on, knock.dir);
    a.queue.push(
      walk(() => { const p = perch(a); return p ? p.x - knock.dir * 70 : null; }, 75),
      wait(300, "sit"),
      jumpTo(perch, 0.6),
      act(() => { if (a.mode !== "perch") return "stop"; a.face = knock.dir; }),
      wait(500, "sit"), wait(240, "paw"), wait(300, "sit"), wait(240, "paw"),
      act(() => knockOff(knock.off, knock.dir)),
      wait(900, "sit"),
      act(() => a.say(bubble("mrrp", "cat"), 1400)),
      wait(1200, "sit"),
      hopDown(rand(-80, 80)), landed());
    return;
  }
  if (W.yarn && Math.random() < 0.1 && W.yarn.mode === "ground") { a.soft = false; a.queue.push(chaseYarn(), wait(1200, "sit")); return; }
  if (resting(me) && me.mode === "ground" && r < 0.55) {
    a.queue.push(walk(() => me.x + me.w - 6, 60), wait(rand(12000, 25000), "sleep")); return;
  }
  if (isNight() && r < 0.45) { a.queue.push(wait(rand(15000, 30000), "sleep")); return; }
  // in the daytime, a nap in the patch of sun on the floor (daynight.js)
  const nap = Math.random() < 0.12 && api.catNap ? api.catNap(a) : null;
  if (nap) { a.queue.push(...nap); return; }

  if (r < 0.42 && me.mode === "ground") {
    a.soft = false;
    a.queue.push(
      walk(() => (me.cx() > a.cx() ? me.x - a.w + 12 : me.x + me.w - 12), 60),
      act(() => { a.face = me.cx() > a.cx() ? 1 : -1; a.pop("heart"); a.say(bubble("prrr", "heart"), 1600); }),
      wait(rand(2500, 4500), "sit"));
    return;
  }
  if (r < 0.5 && now() > headCool && me.mode === "ground" && !me.locked && me.base === "idle") {
    headCool = now() + 40000; a.soft = false;
    a.queue.push(
      walk(() => me.x + (a.x < me.x ? -60 : me.w + 20), 70),
      wait(300, "sit"),
      jumpTo(headPerch, 0.55),
      act(() => { if (a.mode !== "perch") return "stop"; me.say(bubble(t("hey"), "cat"), 1800); }),
      wait(rand(3000, 5000), "sit"),
      hopDown(rand(-80, 80)), landed());
    return;
  }
  if (r < 0.75) a.queue.push(walk(rand(10, a.maxX()), 58), wait(rand(1000, 3000), "sit"));
  else if (r < 0.9) a.queue.push(wait(rand(3000, 6000), "sit"));
  else a.queue.push(wait(rand(8000, 14000), "sleep"));
}

function tapCat(a) {
  emit("sfx", "meow");
  unlock("pet");
  petFeed(a, "fun", 12);
  if (a.base === "sleep") a.interrupt([wait(1500, "sit")]);
  a.pop("heart");
  a.say(bubble(pick(t("meow")), "heart"), 1600);
}

function hoverCat(a) { if (now() - (a.saidAt || 0) > 3000) a.say(petStatus(a), 2600); }

export function spawnCat(theme, fromButton) {
  W.cat = makeCat(theme);
  bind(W.cat, tapCat, hoverCat);
  const btn = $("#toggle-theme");
  const b = btn && btn.getBoundingClientRect();
  if (fromButton && b && b.width) {
    W.cat.x = clamp(b.left + b.width / 2 - W.cat.w / 2, 4, W.cat.maxX()); W.cat.y = b.bottom - W.cat.h / 2;
    W.cat.mode = "air"; W.cat.vx = rand(-160, -60); W.cat.vy = -260; W.cat.setFrame("jump");
    W.cat.onLand = () => { W.cat.setFrame("sit"); W.cat.say(bubble(pick(t("meow")), "heart"), 1600); W.cat.onLand = () => W.cat.setFrame("sit"); };
  } else {
    W.cat.x = clamp(me.x + me.w + 40, 4, W.cat.maxX());
  }
}

// The theme button: the cat comes over to look at it; switching themes swaps the cats.
const themeBtn = $("#toggle-theme");
if (themeBtn) themeBtn.addEventListener("pointerenter", (e) => {
  if (e.pointerType !== "mouse" || !W.cat || W.ko || W.cat.mode !== "ground" || !W.cat.soft || W.cat.base === "sleep" || reduced()) return;
  const b = themeBtn.getBoundingClientRect();
  W.cat.interrupt([walk(b.left + b.width / 2 - W.cat.w / 2, 90), act(() => W.cat.say(bubble(t("curious"), "cat"), 1500)), wait(2200, "sit")]);
});
// Switching themes: the new cat drops out of the button, the two meet (a nose boop, or a chase), and the old one leaves.
const leaveDir = (c) => (c.cx() < innerWidth / 2 ? -1 : 1);
// Both cats walk up to each other until they are nose to nose.
function pairUp(a, b) {
  const left = a.cx() <= b.cx() ? a : b;
  const mid = clamp((a.cx() + b.cx()) / 2, a.w + 10, innerWidth - a.w - 10);
  const here = new Set();
  const arrive = (c) => {
    const isLeft = c === left;
    return [
      walk(isLeft ? mid - c.w + 6 : mid - 6, 110),
      act(() => { c.face = isLeft ? 1 : -1; c.setFrame("sit"); here.add(c); }),
      until(() => here.size === 2),
    ];
  };
  return arrive;
}
const meow = (c, icon) => act(() => c.say(bubble(pick(t("meow")), icon), 1400));
function greetCats(a, b) {
  if (!b || !actors.includes(b) || b.mode !== "ground" || b.leaving) return;
  unlock("cats");
  const arrive = pairUp(a, b);
  a.interrupt([...arrive(a), wait(300, "sit"), act(() => a.pop("heart")), meow(a, "heart"), wait(2200, "sit")]);
  b.interrupt([...arrive(b), wait(800, "sit"), act(() => b.pop("heart")), meow(b, "heart"), wait(2200, "sit")]);
}
function meetCats(old, fresh) {
  unlock("cats");
  const arrive = pairUp(old, fresh);
  if (Math.random() < 0.6) {   // boop
    old.interrupt([...arrive(old), wait(250, "sit"), act(() => old.pop("heart")), meow(old, "heart"), wait(1600, "sit"), act(() => { old.runOff = leaveDir(old); })]);
    fresh.interrupt([...arrive(fresh), wait(800, "sit"), act(() => fresh.pop("heart")), meow(fresh, "heart"), wait(2400, "sit")]);
  } else {                     // chase
    old.interrupt([...arrive(old), wait(600, "sit"), act(() => old.say(bubble(t("scared"), "cat"), 1000)), act(() => { old.runOff = leaveDir(old); })]);
    fresh.interrupt([...arrive(fresh), wait(500, "paw"), meow(fresh, "fire"), wait(150, "sit"),
      walk(() => (old.runOff < 0 ? 4 : fresh.maxX()), 260), wait(700, "sit"), act(() => fresh.say(bubble("prrr", "heart"), 1400))]);
  }
}
document.addEventListener("site:theme", (e) => {
  if (!W.cat || W.ko) return;
  const info = CATS[e.detail] || CATS.dark, old = W.cat;
  if (old.name === info.name) return;
  if (reduced() || layer.hidden) {
    actors.filter((a) => a.kind === "cat").forEach((a) => a.remove());
    W.visitor = null;
    spawnCat(e.detail, false);
    return;
  }
  // the incoming cat may already be here (visiting, or still running off after a quick double switch): bring that one back
  const back = catNamed(info.name);
  actors.forEach((a) => { if (a.kind === "cat" && a.leaving && !a.runOff && a !== back) a.runOff = leaveDir(a); });
  old.leaving = true; old.visitor = false; old.brain = () => {}; old.queue = []; old.task = null;
  if (old === W.visitor) W.visitor = null;
  if (back) {
    back.leaving = false; back.runOff = 0; back.visitor = false; back.brain = catBrain; back.queue = []; back.task = null;
    if (back.x < 4 || back.x > back.maxX()) back.entering = true;
    if (back === W.visitor) W.visitor = null;
    W.cat = back;
    if (old.mode === "ground" && back.mode === "ground" && !back.entering) meetCats(old, back); else old.runOff = leaveDir(old);
    return;
  }
  if (old.mode !== "ground") old.runOff = leaveDir(old);
  else old.interrupt([wait(5000, "sit")]);       // waits for the newcomer to land
  spawnCat(e.detail, true);
  const fresh = W.cat;
  fresh.onLand = () => {
    fresh.setFrame("sit");
    fresh.onLand = () => fresh.setFrame("sit");
    if (!old.runOff && old.mode === "ground" && actors.includes(old)) meetCats(old, fresh);
    else fresh.say(bubble(pick(t("meow")), "heart"), 1600);
  };
});

// ================================================================ the other cat drops by now and then
let visitCool = now() + rand(40000, 70000);
function maybeVisit() {
  if (W.visitor || W.ko || layer.hidden || reduced() || !W.cat || now() < visitCool) return;
  visitCool = now() + rand(80000, 140000);
  if (Math.random() < 0.35) return;
  summonVisitor(false);
}
export function summonVisitor(fromNearestEdge) {
  if (W.visitor || W.ko || layer.hidden || reduced() || !W.cat) return;
  const theme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  if (catNamed((CATS[theme] || CATS.dark).name)) return;   // that W.cat is already on screen
  const v = makeCat(theme);
  bind(v, tapCat, hoverCat);
  W.visitor = v; v.visitor = true; v.entering = true; v.leaveAt = now() + rand(45000, 80000);
  const fromLeft = fromNearestEdge ? me.cx() < innerWidth / 2 : Math.random() < 0.5;
  v.x = fromLeft ? -v.w - 10 : innerWidth + 10; v.face = fromLeft ? 1 : -1;
  v.interrupt([walk(() => clamp(W.cat.cx() + (fromLeft ? -150 : 150), 4, v.maxX()), 90), act(() => greetCats(v, W.cat))]);
}

// ---------------------------------------------------------------- every frame
const leaveDirOf = leaveDir;
// cats on their way out run off the screen; a visitor leaves when its time is up
addActorHook((a, dt, ts) => {
  if (a.runOff) {
    a.x += a.runOff * 340 * dt; a.face = a.runOff;
    a.setFrame(a.gait[Math.floor(ts / 70) % a.gait.length]);
    a.y = a.floor();
    if (a.x < -a.w - 20 || a.x > innerWidth + 20) { a.remove(); return "done"; }
    a.draw(); return "done";
  }
  if (a.leaving && a.mode === "ground" && !a.task && !a.queue.length) { a.runOff = leaveDirOf(a); return "done"; }
  if (a.visitor && now() > a.leaveAt && a.mode === "ground" && a.soft) {
    a.visitor = false; a.leaving = true; a.brain = () => {}; a.queue = []; a.task = null;
    a.say(bubble(pick(t("meow")), "heart"), 1200);
  }
  return null;
}, 10);
addSystem((dt, ts) => {
  if (reduced()) return;
  maybeVisit();
  // the cat chases the cursor when it comes down near the floor
  const cat = W.cat;
  if (cat && !W.ko && !W.laser && finePointer.matches && cat.mode === "ground" && cat.soft && cat.base !== "sleep" && ts > huntCool && now() - mouse.t < 1200) {
    const d = mouse.x - cat.cx();
    if (mouse.y > innerHeight - 110 && Math.abs(d) < 280 && Math.abs(d) > 30) {
      huntCool = ts + 4500;
      cat.interrupt([
        act(() => { cat.face = d > 0 ? 1 : -1; }),
        wait(450, "sit"),
        act(() => launch(cat, clamp(mouse.x - cat.w / 2, 4, cat.maxX()), cat.floor(), 0.42)),
        landed(),
        wait(900, "sit"),
      ]);
    }
  }
}, 70);

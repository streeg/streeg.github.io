// The red laser dot (hold Shift with a mouse). The cats drop everything for it and follow it wherever it goes:
// along the floor, up onto the card or button under it (running along its top edge and swatting at it, which
// makes it wobble, or knocks a stack tile off), onto the coin (flipping it), at the yarn, or onto the dev's head.
// Out of reach (up in the air, under the top bar) they sit below it, staring up and chattering.
import { S, root, t, now, rand, clamp, unit, finePointer, reduced, typing, bubble } from "./util.js";
import { W, emit, layer, isCat, wait, landed, launch, hopDown, mouse, addActorHook, addSystem } from "./world.js";
import { me, headPerch } from "./me.js";
import { petFeed } from "./pets.js";
import { yarn, kickYarn } from "./toys.js";
import { knockOff } from "./cats.js";
import { unlock } from "./achv.js";

const dot = document.createElement("div");
dot.className = "px-laser";
dot.hidden = true;
layer.append(dot);
let devCool = 0;
export function setLaser(on) {
  if (W.laser === on) return;
  W.laser = on; dot.hidden = !on;
  root.classList.toggle("px-laser-on", on);
  if (!on) {   // the cats come down from wherever the dot took them
    for (const c of [W.cat, W.visitor]) if (c && isCat(c) && c.mode === "perch") c.interrupt([wait(rand(600, 1400), "sit"), hopDown(rand(-60, 60)), landed()]);
    return;
  }
  unlock("laser");
  if (!me.locked && now() > devCool && W.cat) { devCool = now() + 30000; me.say(bubble(t("laser.devOn").replace("{name}", W.cat.name), "cat"), 2000); }
}
window.addEventListener("keydown", (e) => {
  if (e.key !== "Shift" || e.repeat || W.ko || layer.hidden || reduced() || !finePointer.matches || S.paletteOpen()) return;
  if (typing() || now() - mouse.t > 5000) return;
  setLaser(true);
});
window.addEventListener("keyup", (e) => { if (e.key === "Shift") setLaser(false); });
window.addEventListener("blur", () => setLaser(false));

// ---------------------------------------------------------------- what is under the dot (worked out a few times a second)
const PLATFORMS = "#core, .btn, .tech, .impact-card, .job, .chips li, .project, .contact-card, .filter, .section-head h2, .iped-art, .game-stage";
const within = (x, y, a, pad = 0) => x > a.x - pad && x < a.x + a.w + pad && y > a.y - pad && y < a.y + a.h + pad;
let target = null, targetAt = 0;
function findTarget(c) {
  const x = mouse.x, y = mouse.y;
  if (within(x, y, me, 4) && me.mode === "ground" && !me.locked) return { kind: "me" };
  if (yarn && within(x, y, yarn, 6)) return { kind: "yarn" };
  if (y > innerHeight - c.h * 2.2) return { kind: "floor" };
  const el = document.elementsFromPoint(x, y).find((e) => !e.closest(".px-world"));
  const host = el && el.closest(PLATFORMS);
  if (host) {
    const r = host.getBoundingClientRect();
    if (r.top > 96 && r.top < innerHeight - c.h - 30 && r.width > c.w * 0.6) return { kind: "el", el: host };
  }
  return { kind: "out" };
}
// where a cat stands on top of an element: anywhere along its top edge (the cat runs along it)
const topOf = (el) => (a) => {
  if (!document.contains(el)) return null;
  const r = el.getBoundingClientRect();
  if (r.top < 90 || r.top > innerHeight - a.h - 20) return null;
  return { x: clamp(a.x, r.left - a.w * 0.3, r.right - a.w * 0.7), y: r.top - a.h + unit() * 2 };
};

// ---------------------------------------------------------------- the chase
const run = (c, toX, dt, speed = 320) => {
  const d = toX - c.x;
  c.face = d > 0 ? 1 : -1;
  if (Math.abs(d) < 6) return true;
  c.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
  c.setFrame(c.gait[Math.floor(now() / 80) % c.gait.length]);
  return false;
};
function swat(c, el) {
  if (now() < (c.swatCool || 0)) return;
  c.swatCool = now() + rand(500, 900);
  c.emoteFor("paw", 220);
  emit("sfx", "kick");
  if (!el) return;
  if (el.id === "core") { el.click(); return; }   // flips the coin
  if (el.classList.contains("tech") && Math.random() < 0.2) {
    const next = c.face > 0 ? el.nextElementSibling : el.previousElementSibling;
    if (next) { knockOff(next, c.face); return; }
  }
  if (el.animate && !reduced()) el.animate([{ rotate: "0deg" }, { rotate: `${c.face * -2.5}deg` }, { rotate: `${c.face * 1.5}deg` }, { rotate: "0deg" }], { duration: 300, easing: "ease-out" });
}
function chase(c, dt) {
  c.queue = []; c.task = null; c.soft = false;
  petFeed(c, "fun", dt * 4);
  if (c.mode === "air" || c.mode === "held") return;
  if (now() > targetAt) { target = findTarget(c); targetAt = now() + 120; }
  const tg = target || { kind: "floor" }, aimX = clamp(mouse.x - c.w / 2, 4, c.maxX());

  // standing on something: follow the dot along it, swat at it, or leave
  if (c.mode === "perch") {
    if (c.perch === headPerch) {
      if (tg.kind === "me") {
        c.face = mouse.x > c.cx() ? 1 : -1;
        swat(c, null);
        if (now() > (me.laserCool || 0)) { me.laserCool = now() + 4000; me.emoteFor("held", 600); me.say(bubble(t("laser.onMe"), "skull"), 1800); }
      } else launch(c, aimX, c.floor(), 0.4);
      return;
    }
    if (tg.kind === "el" && c.perchEl === tg.el) {
      const r = tg.el.getBoundingClientRect();
      if (run(c, clamp(aimX, r.left - c.w * 0.3, r.right - c.w * 0.7), dt, 260)) { c.setFrame("sit"); swat(c, tg.el); }
      return;
    }
    if (tg.kind === "el" && Math.abs(tg.el.getBoundingClientRect().top - c.y) < 400) { jumpOnto(c, tg.el, aimX); return; }
    launch(c, aimX, c.floor(), 0.42);   // the dot went somewhere else: jump down towards it
    return;
  }

  // on the floor
  if (tg.kind === "me") {
    if (run(c, me.cx() - c.w / 2 + (c.cx() < me.cx() ? -40 : 40), dt)) launch(c, me.cx() - c.w / 2, me.y - c.h + unit() * 3, 0.5, headPerch);
    return;
  }
  if (tg.kind === "yarn") {
    if (run(c, yarn.cx() - c.w / 2, dt) && now() > (c.pounceCool || 0)) { c.pounceCool = now() + 900; c.emoteFor("paw", 250); kickYarn(yarn); }
    return;
  }
  if (tg.kind === "el") {
    if (run(c, aimX, dt)) jumpOnto(c, tg.el, aimX);
    return;
  }
  if (tg.kind === "out") {   // out of reach: sit under it, staring up, chattering
    if (run(c, aimX, dt)) {
      c.setFrame("sit");
      c.face = mouse.x > c.cx() ? 1 : -1;
      if (now() > (c.chatterCool || 0)) { c.chatterCool = now() + rand(2500, 4000); c.say(bubble(t("laser.chatter"), "cat"), 1200); }
    }
    return;
  }
  // the floor: run to it, pounce when it is close
  const d = mouse.x - c.cx();
  if (!run(c, aimX, dt)) {
    if (Math.abs(d) < 70 && Math.abs(d) > 10 && now() > (c.pounceCool || 0)) { c.pounceCool = now() + 1100; launch(c, aimX, c.floor(), 0.34); }
  } else c.setFrame("paw");
}
function jumpOnto(c, el, aimX) {
  const perch = topOf(el), r = el.getBoundingClientRect();
  const x = clamp(aimX, r.left - c.w * 0.3, r.right - c.w * 0.7);
  c.perchEl = el;
  const p = perch({ x, w: c.w, h: c.h });
  if (!p) return;
  launch(c, p.x, p.y, clamp(0.35 + (c.y - p.y) / 1200, 0.4, 0.75), perch);
}

addActorHook((a, dt) => {
  if (W.laser && isCat(a) && !a.tangledUntil && !W.ko && !reduced()) { chase(a, dt); return "skip"; }
  return null;
}, 25);
addSystem(() => { if (W.laser) dot.style.transform = `translate(${mouse.x - 5}px, ${mouse.y - 5}px)`; }, 21);

// Little critters that come and go: a bird that lands on top of a card and pecks (the cat sits below it,
// chattering, then pounces and the bird flies off; click it and it flies off too), a butterfly on spring and
// summer days that the cat chases, and a moth circling the lamp at night.
import { t, now, rand, pick, clamp, unit, reduced, bubble } from "./util.js";
import { W, api, emit, layer, wait, walk, act, launch, landed, addSystem } from "./world.js";
import { CRITTERS } from "./art/home.js";
import { toSvg, PAL } from "./art/core.js";
import { effSeason } from "./seasons.js";
import { daylight } from "./clock.js";

function critter(cls, frames) {
  const el = document.createElement("div");
  el.className = "px-critter " + cls;
  layer.append(el);
  const svgs = Object.fromEntries(Object.entries(frames).map(([k, f]) => [k, toSvg(f, "", PAL)]));
  const c = { el, x: 0, y: 0, frame: "", face: 1, set(f) { if (f !== c.frame) { c.frame = f; el.innerHTML = svgs[f]; const rows = frames[f], u = unit(); el.style.width = rows[0].length * u + "px"; el.style.height = rows.length * u + "px"; } },
    draw() { el.style.transform = `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px)` + (c.face < 0 ? " scaleX(-1)" : ""); } };
  return c;
}
const freeCat = () => { const c = W.cat; return c && c.mode === "ground" && c.soft && !c.leaving && c.base !== "sleep" && !W.laser ? c : null; };

// ---------------------------------------------------------------- the bird
const PERCHES = ".impact-card, .job, .project, .contact-card, .section-head h2, .btn";
let bird = null, birdCool = now() + rand(30000, 60000);
function birdTarget() {
  const els = [...document.querySelectorAll(PERCHES)].filter((el) => { const r = el.getBoundingClientRect(); return r.top > 110 && r.top < innerHeight - 160 && r.width > 60; });
  return els.length ? pick(els) : null;
}
export function spawnBird() {
  const el = birdTarget();
  if (!el) return;
  const b = critter("px-bird", { a: CRITTERS.flyA, b: CRITTERS.flyB, sit: CRITTERS.bird1, peck: CRITTERS.birdPeck });
  const from = Math.random() < 0.5 ? -40 : innerWidth + 40;
  bird = Object.assign(b, { host: el, k: rand(0.2, 0.8), state: "in", t0: now(), from: { x: from, y: rand(40, 160) }, until: now() + rand(15000, 25000), nextChirp: 0 });
  b.el.addEventListener("pointerdown", (e) => { e.preventDefault(); flyAway(); });
}
function perchOf(b) {
  const r = b.host.getBoundingClientRect(), u = unit();
  if (!document.contains(b.host) || r.top < 70 || r.top > innerHeight - 120) return null;
  return { x: r.left + b.k * (r.width - 10 * u), y: r.top - 6 * u };   // its (framed) feet on the top edge
}
function flyAway() {
  if (!bird || bird.state === "out") return;
  bird.state = "out"; bird.t0 = now();
  bird.from = { x: bird.x, y: bird.y };
  bird.to = { x: bird.x < innerWidth / 2 ? -60 : innerWidth + 60, y: -40 };
  emit("sfx", "chirp");
}
function tickBird(ts) {
  if (!bird) {
    if (!W.ko && !W.calm && !layer.hidden && !reduced() && !W.aquarium && daylight() > 0.4 && now() > birdCool) { birdCool = now() + rand(60000, 120000); if (Math.random() < 0.6) spawnBird(); }
    return;
  }
  const b = bird, p = perchOf(b);
  if (W.ko || layer.hidden) { b.el.remove(); bird = null; return; }
  if (W.aquarium && b.state !== "out") flyAway();
  if (b.state === "in") {
    if (!p) { flyAway(); return; }
    const k = Math.min(1, (now() - b.t0) / 2600), e = 1 - Math.pow(1 - k, 2);
    b.x = b.from.x + (p.x - b.from.x) * e; b.y = b.from.y + (p.y - b.from.y) * e - Math.sin(k * Math.PI) * 40;
    b.face = p.x > b.from.x ? 1 : -1;
    b.set(Math.floor(ts / 110) % 2 ? "a" : "b");
    if (k >= 1) { b.state = "sit"; b.t0 = now(); }
  } else if (b.state === "sit") {
    if (!p || now() > b.until) { flyAway(); return; }
    b.x = p.x; b.y = p.y;
    b.set(Math.floor(ts / 700) % 3 === 0 ? "peck" : "sit");
    if (now() > b.nextChirp) { b.nextChirp = now() + rand(3000, 6000); emit("sfx", "chirp"); if (Math.random() < 0.3) b.face *= -1; }
    stalk(b);
  } else {
    const k = Math.min(1, (now() - b.t0) / 1800);
    b.x = b.from.x + (b.to.x - b.from.x) * k; b.y = b.from.y + (b.to.y - b.from.y) * k;
    b.face = b.to.x > b.from.x ? 1 : -1;
    b.set(Math.floor(ts / 90) % 2 ? "a" : "b");
    if (k >= 1) { b.el.remove(); bird = null; }
  }
  if (bird) b.draw();
}
// the cat sees the bird: sits below it chattering, then pounces (and the bird is gone)
let stalkCool = 0;
function stalk(b) {
  const c = freeCat();
  if (!c || now() < stalkCool || b.stalked) return;
  stalkCool = now() + 20000; b.stalked = true;
  c.interrupt([
    walk(() => clamp(b.x - c.w / 2, 4, c.maxX()), 110),
    act(() => { c.face = 1; c.say(bubble(t("laser.chatter"), "cat"), 1500); }),
    wait(rand(2200, 3500), "sit"),
    act(() => { if (bird !== b || b.state !== "sit") return "stop"; launch(c, c.x, Math.max(b.y - 10, 120), 0.5); setTimeout(flyAway, 250); }),
    landed(),
    wait(1200, "sit"),
  ]);
}

// ---------------------------------------------------------------- the butterfly (spring and summer days)
let fly = null, flyCool = now() + rand(40000, 80000);
function tickButterfly(dt, ts) {
  if (!fly) {
    const warm = ["primavera", "verao", "pascoa", "festajunina", "carnaval"].includes(effSeason());
    if (warm && !W.ko && !W.calm && !layer.hidden && !reduced() && daylight() > 0.5 && now() > flyCool) {
      flyCool = now() + rand(70000, 140000);
      fly = Object.assign(critter("px-butterfly", { a: CRITTERS.butterfly1, b: CRITTERS.butterfly2 }), { x: -20, y: innerHeight - 120, vx: 40, t0: now(), until: now() + 30000 });
      fly.el.addEventListener("pointerdown", (e) => { e.preventDefault(); fly.until = 0; });
    }
    return;
  }
  const f = fly, leaving = now() > f.until || W.ko || layer.hidden;
  f.vx += rand(-60, 60) * dt; f.vx = clamp(f.vx, -70, 70);
  f.x += f.vx * dt; f.y = leaving ? f.y - 90 * dt : innerHeight - 110 + Math.sin(ts / 300) * 30 + Math.sin(ts / 1100) * 40;
  if (f.x < 10) f.vx = Math.abs(f.vx); if (f.x > innerWidth - 20) f.vx = -Math.abs(f.vx);
  f.face = f.vx > 0 ? 1 : -1;
  f.set(Math.floor(ts / 120) % 2 ? "a" : "b");
  f.draw();
  if (leaving && f.y < -30) { f.el.remove(); fly = null; return; }
  // the cat chases it and jumps at it
  const c = freeCat();
  if (c && !leaving && Math.abs(c.cx() - f.x) < 220 && now() > (c.flyCool || 0)) {
    c.flyCool = now() + 5000;
    c.interrupt([walk(() => clamp(f.x - c.w / 2, 4, c.maxX()), 200), act(() => launch(c, clamp(f.x - c.w / 2, 4, c.maxX()), c.floor(), 0.45)), landed(), wait(800, "sit")]);
  }
}

// ---------------------------------------------------------------- a moth around the lamp at night
let moth = null;
function tickMoth(ts) {
  const head = api.lampHead && api.lampHead();
  if (!head || W.ko || layer.hidden || reduced() || daylight() > 0.3) { if (moth) { moth.el.remove(); moth = null; } return; }
  if (!moth) moth = critter("px-moth", { a: CRITTERS.moth });
  moth.set("a");
  moth.x = head.x + Math.cos(ts / 260) * 14 - 4; moth.y = head.y + Math.sin(ts / 190) * 9 - 6;
  moth.draw();
}

addSystem((dt, ts) => { tickBird(ts); tickButterfly(dt, ts); tickMoth(ts); }, 48);

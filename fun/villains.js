// Villains: the Bug, Merge Conflict (two bugs, HEAD and main) and Friday Deploy (red, with a siren, eats fast).
// They fly in, glitch things and slowly eat the page, bite by bite; whatever they ate grows back when they leave or lose.
// Ways to call one: type bug / merge / sexta / friday, open an issue from the palette, click the tiny bug that crawls
// on the cards, or just be here on a Friday afternoon. The special attack (special.js) defeats them.
import { t, now, rand, pick, clamp, unit, finePointer, reduced, typing, bubble, keyCaps, S } from "./util.js";
import { W, layer, cats, launch, sayIn, on, emit, addSystem, showFriends } from "./world.js";
import { me, resting, addPoi } from "./me.js";
import { flash, burst, shake, cardOpen } from "./ui.js";
import { toSvg } from "./art/core.js";
import { BUG, BOSS } from "./art/villains.js";
import { got } from "./achv.js";
import { PROPS } from "./art/props.js";

// Villains: the Bug, Merge Conflict (two bugs, HEAD and main) and Friday Deploy (red, with a siren, eats fast).
export const VILLAINS = {
  bug: { cls: "", lines: "bug.lines", arrive: "bug.arrive", gap: [1400, 2600], achv: "bug" },
  conflict: { cls: "px-conflict", lines: "villain.conflict.lines", arrive: "villain.conflict.arrive", gap: [1000, 1900], achv: "conflict", twin: true },
  friday: { cls: "px-friday", lines: "villain.friday.lines", arrive: "villain.friday.arrive", gap: [700, 1300], achv: "friday" },
  // the secret boss: shows up after the other three were beaten (or when you type its name); it takes two hits and never leaves
  legacy: { cls: "px-legacy", lines: "boss.lines", arrive: "boss.arrive", hit: "boss.hit", gap: [1600, 2800], achv: "legacy", boss: true, hp: 2, scale: 1.4,
    art: [BOSS.legacy1, BOSS.legacy2], angry: [BOSS.angry1, BOSS.angry2] },
};
export function summonBug(kind = "bug", from, force) {
  if (W.bug || W.ko || W.fighting) return;
  if (layer.hidden) { if (!force) return; showFriends(); }
  const v = VILLAINS[kind] || VILLAINS.bug;
  const art = v.art || [BUG.bug1, BUG.bug2], k = unit() * (v.scale || 1.5);
  const w = art[0][0].length * k * (v.twin ? 2 : 1), h = art[0].length * k;
  const el = document.createElement("div");
  el.className = "px-bug " + v.cls;
  el.style.width = w + "px"; el.style.height = h + "px";
  const spr = document.createElement("div");
  spr.className = "px-sprite";
  const bub = document.createElement("div");
  bub.className = "px-bubble";
  el.append(spr, bub);
  if (v.hp > 1) { const hp = document.createElement("span"); hp.className = "px-hp"; hp.innerHTML = "<i></i>".repeat(v.hp); el.append(hp); }
  layer.append(el);
  W.bug = {
    el, spr, bub, w, h, kind, v, x: from ? from.x - w / 2 : innerWidth / 2 - w / 2, y: from ? from.y - h / 2 : -h - 30,
    tx: innerWidth * rand(0.3, 0.7) - w / 2, ty: rand(140, innerHeight * 0.45),
    svgs: art.map((f) => (v.twin ? toSvg(f) + toSvg(f) : toSvg(f))), frame: -1, leaveAt: v.boss ? Infinity : now() + 60000, leaving: false, hp: v.hp || 1,
    nextLine: now() + 5000, nextGlitch: now() + 3000, nextHiss: now() + 4000, nextBite: now() + 5000, bites: 0, food: null, eating: null,
  };
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); if (W.bug && !W.bug.leaving) bugSay(bubble(t("bug.poke"), "skull"), 2000); });
  if (from) { flash(from.x, from.y); burst(from.x, from.y, ["#7c3aed", "#a78bfa", "#e11d48"], 16); }
  if (v.boss && !reduced()) shake();
  emit("sfx", v.boss ? "boss" : "villain");
  setTimeout(() => { if (W.bug && !W.bug.leaving) bugSay(bubble(t(v.arrive), "skull"), 2800); }, 900);
  if (!me.locked) {
    me.face = W.bug.tx + w / 2 > me.cx() ? 1 : -1;
    if (me.mode === "ground" && !resting(me)) me.emoteFor("held", 900);
    me.say(bubble(t(v.boss ? "boss.meScared" : "bug.meScared"), "skull"), 2000);
  }
  cats().forEach((c) => { c.say(bubble(t("bug.hiss"), "cat"), 1500); if (c.mode === "ground" && !reduced()) launch(c, c.x, c.floor(), 0.4); });
}
export const bugSay = (html, ms) => sayIn(W.bug, html, ms);
export function removeBug() { if (!W.bug) return; clearTimeout(W.bug.bubTimer); W.bug.el.remove(); W.bug = null; }
// Bites: a clip-path whose left edge has teeth marks and moves right in steps.
const eaten = [];
const bite = (p) => {
  const pts = [`${p}% 0`, "100% 0", "100% 100%", `${p}% 100%`];
  for (let i = 1; i < 6; i++) pts.push(`${p + (i % 2 ? 5 : 0)}% ${(100 - (i * 100) / 6).toFixed(1)}%`);
  return `polygon(${pts.join(", ")})`;
};
const FOOD = "#main h2, #main .kicker, #main p, #main .btn, .chips li, .tech, .impact-card, .job-head, .nav-links a, .brand, .kbd-btn";
function pickFood() {
  const list = [...document.querySelectorAll(FOOD)].filter((el) => {
    if (el.closest("[data-eaten]")) return false;
    const r = el.getBoundingClientRect();
    return r.top > 70 && r.bottom < innerHeight - 100 && r.width > 20 && r.width < innerWidth * 0.85 && r.height < innerHeight * 0.5;
  });
  return list.length ? pick(list) : null;
}
function startEating(b, el) {
  const r = el.getBoundingClientRect(), dur = clamp(r.width * 7, 1000, 2800);
  el.dataset.eaten = "1";
  eaten.push(el);
  const anim = el.animate([-6, 15, 35, 55, 75, 100].map((pc) => ({ clipPath: bite(pc), easing: "steps(1, end)" })), { duration: dur, fill: "forwards" });
  anim.onfinish = () => { el.style.clipPath = bite(100); anim.cancel(); };
  b.eating = { el, r, t0: now(), dur, anim };
  bugSay(bubble(t("bug.chomp"), "skull"), 1400);
  if (b.bites === 0 && !me.locked) me.say(bubble(finePointer.matches ? t("bug.eating") : t("bug.eatingTouch"), "skull", finePointer.matches ? keyCaps() : ""), 3600);
}
export function regrow(slow) {
  const list = eaten.splice(0);
  list.forEach((el, i) => setTimeout(() => {
    el.getAnimations().forEach((an) => an.cancel());
    const back = el.animate([{ clipPath: bite(100) }, { clipPath: bite(-6) }], { duration: 500, easing: "steps(5, end)" });
    const done = () => { el.style.clipPath = ""; delete el.dataset.eaten; };
    back.onfinish = done; back.oncancel = done;
  }, i * (slow ? 260 : 70)));
  return list.length;
}
function glitchSomething() {
  const list = [...document.querySelectorAll("#main h2, #main .kicker, #main .btn, .nav-links a")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.width > 0;
  });
  const el = pick(list);
  if (!el) return;
  el.classList.add("px-glitch");
  setTimeout(() => el.classList.remove("px-glitch"), 650);
}
function tickBug(dt, ts) {
  const b = W.bug;
  if (!b) return;
  if (!b.leaving && !b.eating && !W.fighting && !b.v.boss && (now() > b.leaveAt || b.bites >= 10)) {
    b.leaving = true; b.food = null;
    bugSay(bubble(t("bug.leave"), "skull"), 2200);
    b.tx = b.x; b.ty = -b.h - 120;
  }
  if (b.eating && !W.fighting) {
    // chewing along the element, left to right
    const e = b.eating, k = clamp((now() - e.t0) / e.dur, 0, 1);
    b.x = e.r.left - b.w * 0.35 + e.r.width * k; b.y = e.r.top + e.r.height / 2 - b.h / 2;
    if (k >= 1) { b.eating = null; b.bites++; b.nextBite = now() + rand(b.v.gap[0], b.v.gap[1]); }
  } else {
    if (!b.leaving && !W.fighting && !b.food && now() > b.nextBite && b.bites < 14) {
      const el = pickFood();
      if (el) { const r = el.getBoundingClientRect(); b.food = el; b.tx = r.left - b.w * 0.35; b.ty = r.top + r.height / 2 - b.h / 2; }
      else b.nextBite = now() + 1200;
    }
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy), sp = b.leaving ? 240 : b.food ? 200 : 130;
    if (d > 3) { b.x += (dx / d) * Math.min(d, sp * dt); b.y += (dy / d) * Math.min(d, sp * dt); }
    else if (b.leaving) {
      removeBug();
      setTimeout(() => { if (regrow(true) && !me.locked) me.say(bubble(t("bug.regrow"), "heart"), 2600); }, 600);
      return;
    } else if (b.food) {
      const el = b.food; b.food = null;
      const r = el.getBoundingClientRect();
      if (r.top > 60 && r.bottom < innerHeight - 90 && !el.closest("[data-eaten]")) startEating(b, el); else b.nextBite = now() + 600;
    } else if (!W.fighting) { b.tx = rand(20, innerWidth - b.w - 20); b.ty = rand(140, innerHeight * 0.5); }
  }
  const f = Math.floor(ts / 140) % 2;
  if (f !== b.frame) { b.frame = f; b.spr.innerHTML = b.svgs[f]; }
  const bob = reduced() ? 0 : Math.sin(ts / 260) * 6;
  b.el.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y + bob)}px, 0)`;
  if (b.leaving || W.fighting) return;
  if (now() > b.nextLine) { bugSay(bubble(pick(t(b.v.lines)), "skull"), 2400); b.nextLine = now() + rand(5000, 8000); }
  if (now() > b.nextGlitch && !reduced() && !b.eating) { glitchSomething(); b.nextGlitch = now() + rand(3000, 5000); }
  if (now() > b.nextHiss) { const c = pick(cats()); if (c) c.say(bubble(t("bug.hiss"), "cat"), 1200); b.nextHiss = now() + rand(5000, 9000); }
}

// ================================================================ a tiny bug crawls along the top of a card now and then;
// the dev points at it ("don't click it!") and clicking it wakes a villain up
let tinyCool = now() + rand(25000, 45000);
export function spawnTiny() {
  const hosts = [...document.querySelectorAll(".impact-card, .tech, .job, .project, .contact-card, .chips li")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.top > 110 && r.bottom < innerHeight - 120 && r.width > 60;
  });
  const host = pick(hosts);
  if (!host) return;
  const el = document.createElement("div");
  el.className = "px-tiny";
  el.innerHTML = toSvg(PROPS.tiny);
  el.title = "?";
  layer.append(el);
  W.tiny = { el, host, k: Math.random(), dir: Math.random() < 0.5 ? -1 : 1, until: now() + 18000 };
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    removeTiny();
    summonBug(pick(["bug", "bug", "conflict", "friday"]), { x: r.left + r.width / 2, y: r.top + r.height / 2 }, true);
  });
}
function removeTiny() { if (W.tiny) { W.tiny.el.remove(); W.tiny = null; } }
function tickTiny(dt, ts) {
  if (!W.tiny) {
    if (!W.ko && !W.bug && !layer.hidden && !reduced() && now() > tinyCool) { tinyCool = now() + rand(60000, 110000); spawnTiny(); }
    return;
  }
  const r = W.tiny.host.getBoundingClientRect();
  if (now() > W.tiny.until || W.bug || W.ko || r.bottom < 0 || r.top > innerHeight) { removeTiny(); return; }
  W.tiny.k += W.tiny.dir * dt * (40 / Math.max(60, r.width));
  if (W.tiny.k < 0 || W.tiny.k > 1) { W.tiny.dir *= -1; W.tiny.k = clamp(W.tiny.k, 0, 1); }
  const step = Math.floor(ts / 120) % 2;
  W.tiny.el.style.transform = `translate(${Math.round(r.left + W.tiny.k * (r.width - 12))}px, ${Math.round(r.top - 9 - step)}px) scaleX(${W.tiny.dir})`;
}
export function issue() { summonBug(pick(["bug", "conflict", "friday"]), null, true); }

addPoi("tiny", () => W.tiny && W.tiny.el, 15000);

// The boss took a hit but is still standing: red eyes, one heart less, and it eats faster.
export function hurtBoss(b) {
  b.hp--;
  b.svgs = b.v.angry.map((f) => toSvg(f)); b.frame = -1;
  b.v = Object.assign({}, b.v, { gap: [700, 1300] });
  const hearts = b.el.querySelectorAll(".px-hp i");
  if (hearts.length) hearts[hearts.length - 1].remove();
  b.nextBite = now() + 1800; b.food = null; b.tx = b.x; b.ty = b.y;
  bugSay(bubble(t("boss.hurt"), "skull"), 2600);
}
// beat the other three and the boss comes for revenge (until it is beaten too)
on("defeated", (kind) => {
  if (kind === "legacy" || got.has("legacy") || !["bug", "conflict", "friday"].every((k) => got.has(k))) return;
  setTimeout(() => summonBug("legacy"), 9000);
});
addSystem((dt, ts) => { tickBug(dt, ts); tickTiny(dt, ts); }, 30);
// hiding the friends sends the villain away too
on("hide", () => { if (W.bug) { removeBug(); regrow(false); } });

// typing a villain's name calls it
const WORDS = { bug: "bug", merge: "conflict", sexta: "friday", friday: "friday", legado: "legacy", legacy: "legacy" };
let typed = "";
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing() || S.paletteOpen() || cardOpen()) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : "";
  if (!/^[a-z]$/.test(k)) return;
  typed = (typed + k).slice(-6);
  const word = Object.keys(WORDS).find((w) => typed.endsWith(w));
  if (word) { typed = ""; summonBug(WORDS[word]); }
});

// Friday afternoon: the Friday Deploy shows up once per visit
const today = new Date();
if (today.getDay() === 5 && today.getHours() >= 16) {
  let seen = false;
  try { seen = sessionStorage.getItem("px-friday") === "1"; sessionStorage.setItem("px-friday", "1"); } catch (e) { /* storage unavailable */ }
  if (!seen) setTimeout(() => summonBug("friday"), 40000);
}

// The special attack (↓ ↘ → P, the palette, or three quick taps on the dev): a red energy blast.
// With a villain on screen it is aimed at the villain and defeats it; with none, it takes the whole page
// down: the pieces fall, a card says production is down, and a button rebuilds everything.
import { S, $, root, t, store, rand, clamp, sleep, unit, reduced, typing, bubble, now } from "./util.js";
import { W, api, emit, actors, cats, props, dropProp, layer, launch, start, stop } from "./world.js";
import { me, setPower } from "./me.js";
import { flash, burst, shake, cardOpen } from "./ui.js";
import { bugSay, removeBug, regrow, hurtBoss } from "./villains.js";
import { ropeReset } from "./toys.js";
import { setLaser } from "./laser.js";
import { toSvg } from "./art/core.js";
import { BLAST } from "./art/villains.js";
import { unlock } from "./achv.js";

// ↓ ↘ → P: the diagonal arrives as ArrowDown then ArrowRight
const SEQ = ["ArrowDown", "ArrowRight", "p"];
let keys = [], lastKey = 0;
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing() || S.paletteOpen() || cardOpen()) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (now() - lastKey > 800) keys = [];
  lastKey = now();
  keys.push(k);
  if (keys.length > SEQ.length) keys.shift();
  if (keys.join() === SEQ.join()) { keys = []; e.preventDefault(); special(); }
});

async function fightBug() {
  if (W.fighting || !W.bug) return;
  W.fighting = true;
  const b = W.bug, still = reduced();
  b.leaveAt = Infinity; b.leaving = false; b.food = null; b.tx = b.x; b.ty = b.y;
  if (b.eating) { b.eating.anim.cancel(); b.eating = null; }
  me.locked = true; me.queue = []; me.task = null; me.perch = null; me.land = null;
  if (me.mode !== "ground") { me.mode = "ground"; me.vx = me.vy = 0; }
  me.y = me.floor();
  const dir = b.x + b.w / 2 > me.cx() ? 1 : -1;
  me.face = dir;
  setPower(true);
  me.setFrame("charge");
  me.say(bubble(t("shout"), "fire"), 1500);
  emit("sfx", "charge");
  await sleep(still ? 200 : 600);
  me.setFrame("release");
  emit("sfx", "blast");
  if (!still) await shoot(dir, b.x + b.w / 2, b.y + b.h / 2);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  flash(cx, cy);
  burst(cx, cy, ["#7c3aed", "#a78bfa", "#e11d48", "#18181b"], 28);
  emit("sfx", "hit");
  if (b.hp > 1) {   // the boss takes more than one hit
    hurtBoss(b);
    await sleep(350);
    me.locked = false; me.setFrame("idle");
    me.say(bubble(t("boss.again"), "fire"), 2400);
    setPower(true, 6000);
    W.fighting = false;
    return;
  }
  bugSay(bubble(t(b.v.hit || "bug.hit"), "skull"), 700);
  const beaten = b.v.achv, boss = b.v.boss;
  removeBug();
  unlock("bug"); unlock(beaten);
  regrow(false);
  if (boss) burst(cx, cy, ["#e5d3a8", "#16a34a", "#facc15", "#e11d48", "#a78bfa"], 80, 1.8);
  await sleep(350);
  me.locked = false; me.setFrame("idle");
  me.emoteFor("held", 1200);
  me.say(bubble(t(boss ? "boss.meWin" : "bug.meWin"), "star"), 2400);
  cats().forEach((c) => c.pop("heart"));
  setPower(true, 8000);
  W.fighting = false;
  emit("defeated", beaten);
}

function collectPieces() {
  const vw = innerWidth, vh = innerHeight, out = [];
  const visit = (el) => {
    if (out.length > 240) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === "contents" || r.width < 1 || r.height < 1) { [...el.children].forEach(visit); return; }   // zero-size wrappers (orbit nodes)
    if (r.bottom < -40 || r.top > vh + 40 || r.right < 0 || r.left > vw) return;
    if (cs.display === "inline") return;
    const kids = [...el.children].filter((k) => !/^(SCRIPT|STYLE|TEMPLATE)$/.test(k.tagName));
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const inlineKid = kids.some((k) => getComputedStyle(k).display === "inline");
    const animated = cs.animationName !== "none";   // spinning rings fall whole, still spinning
    const big = r.height > vh * 0.5 || r.width * r.height > vw * vh * 0.4;
    if (big && kids.length && !text && !inlineKid && !animated) kids.forEach(visit);
    else out.push(el);
  };
  ["#nav", "#main", ".footer"].forEach((s) => { const el = $(s); if (el) visit(el); });
  return out;
}
function makePiece(el) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  const tr = cs.translate === "none" ? ["0px", "0px"] : cs.translate.split(" ");
  const p = {
    el, r, x: 0, y: 0, rot: 0,
    bx: tr[0] || "0px", by: tr[1] || "0px", br: cs.rotate === "none" ? 0 : parseFloat(cs.rotate) || 0,
    saved: { translate: el.style.translate, rotate: el.style.rotate, transition: el.style.transition, visibility: el.style.visibility, willChange: el.style.willChange },
    apply() {
      el.style.translate = `calc(${p.bx} + ${p.x.toFixed(1)}px) calc(${p.by} + ${p.y.toFixed(1)}px)`;
      el.style.rotate = `${(p.br + p.rot).toFixed(2)}deg`;
    },
  };
  el.style.transition = "none";
  el.style.willChange = "translate, rotate";
  return p;
}
function fall(pieces, ix, iy) {
  return new Promise((resolve) => {
    const t0 = now();
    let prev = t0;
    pieces.forEach((p) => {
      const cx = p.r.left + p.r.width / 2, cy = p.r.top + p.r.height / 2;
      const dx = cx - ix, dy = cy - iy, d = Math.hypot(dx, dy) || 1;
      const push = Math.max(0, 1 - d / 900) * 1000;
      p.vx = (dx / d) * push + rand(-70, 70);
      p.vy = (dy / d) * push * 0.6 - rand(120, 320);
      p.vr = rand(-120, 120) * (1 + push / 700);
      p.delay = d * 0.42 + rand(0, 160);
      p.limit = innerHeight - p.r.top + p.r.height * 0.7 + 60;
    });
    const tick = () => {
      const tn = now(), dt = Math.min(0.05, (tn - prev) / 1000);
      prev = tn;
      let alive = 0;
      for (const p of pieces) {
        if (p.done) continue;
        alive++;
        if (tn - t0 < p.delay) continue;
        p.vy += 2100 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.y > p.limit) { p.done = true; p.el.style.visibility = "hidden"; }
        p.apply();
      }
      if (alive) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}
const easeOutBack = (k) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
function rise(pieces) {
  return new Promise((resolve) => {
    const order = pieces.slice().sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
    const gap = Math.min(16, 650 / Math.max(1, order.length)), D = 700, t0 = now();
    order.forEach((p, i) => { p.from = { x: p.x, y: p.y, rot: p.rot }; p.start = i * gap; p.el.style.visibility = p.saved.visibility; });
    const tick = () => {
      const tn = now() - t0;
      let alive = 0;
      for (const p of order) {
        const k = clamp((tn - p.start) / D, 0, 1);
        if (k < 1) alive++;
        const e = easeOutBack(k);
        p.x = p.from.x * (1 - e); p.y = p.from.y * (1 - e); p.rot = p.from.rot * (1 - e);
        p.apply();
      }
      if (alive) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}
function restore(pieces, opened) {
  pieces.forEach((p) => { Object.assign(p.el.style, p.saved); });
  opened.forEach(([el, v]) => { el.style.overflow = v; });
}
function shoot(dir, tx, ty) {
  const u = unit(), bw = BLAST[0].length * u * 1.6, bh = BLAST.length * u * 1.6;
  const hx = dir > 0 ? me.x + 31 * u : me.x + me.w - 31 * u;
  const hy = me.y + 20.5 * u;
  const endX = tx != null ? tx : dir > 0 ? innerWidth - bw * 0.6 : bw * 0.6;
  const endY = ty != null ? ty : hy;
  const ang = Math.atan2(endY - hy, endX - hx), deg = (ang * 180) / Math.PI;
  const ball = document.createElement("div");
  ball.className = "px-ball";
  ball.style.width = bw + "px"; ball.style.height = bh + "px";
  ball.innerHTML = toSvg(BLAST);
  layer.append(ball);
  const at = (x, y, s) => `translate(${x - bw / 2}px, ${y - bh / 2}px) rotate(${deg}deg) scale(${s})`;
  const dist = Math.hypot(endX - hx, endY - hy);
  const dur = Math.max(380, dist / 1.5);
  const anim = ball.animate([
    { transform: at(hx, hy, 0.3) },
    { transform: at(hx + Math.cos(ang) * 50, hy + Math.sin(ang) * 50, 1), offset: 0.12 },
    { transform: at(endX, endY, 1.15) },
  ], { duration: dur, easing: "cubic-bezier(.4,0,.9,.6)", fill: "forwards" });
  return anim.finished.then(() => { ball.remove(); return { x: endX, y: endY }; });
}

export async function special() {
  if (W.ko || W.fighting) return;
  if (W.bug) { fightBug(); return; }
  W.ko = { pieces: [], opened: [] };
  setPower(true);
  unlock("special");
  setLaser(false);
  props.forEach((pr) => dropProp(pr, true));
  document.querySelectorAll("[data-knocked]").forEach((el) => el.getAnimations().forEach((an) => an.cancel()));
  S.closeMenu();
  if (layer.hidden) { layer.hidden = false; W.ko.wasHidden = true; start(); }
  const still = reduced();
  // wake him and plant him on the floor
  me.locked = true; me.queue = []; me.task = null; me.perch = null; me.land = null;
  if (me.mode !== "ground") { me.mode = "ground"; me.vx = me.vy = 0; }
  me.y = me.floor();
  const dir = me.cx() < innerWidth / 2 ? 1 : -1;
  me.face = dir;
  me.setFrame("charge");
  me.say(bubble(t("shout"), "fire"), 1800);
  emit("sfx", "charge");
  if (W.cat) {
    W.cat.locked = true; W.cat.queue = []; W.cat.task = null;
    W.cat.say(bubble(t("scared"), "skull"), 1500);
    if (!still && W.cat.mode === "ground") launch(W.cat, clamp(W.cat.x - dir * 50, 4, W.cat.maxX()), W.cat.floor(), 0.45);
  }
  await sleep(still ? 300 : 600);
  me.setFrame("release");
  const html = root.style;
  W.ko.htmlSaved = { overflow: html.overflow, scrollbarGutter: html.scrollbarGutter };
  html.scrollbarGutter = "stable"; html.overflow = "hidden";
  if (still) {
    root.classList.add("ko-down");
  } else {
    emit("sfx", "blast");
    const hit = await shoot(dir);
    flash(hit.x, hit.y); shake();
    emit("sfx", "crash");
    await sleep(120);
    W.ko.pieces = collectPieces().map(makePiece);
    // let the pieces fall out of clipped containers
    const seen = new Set();
    W.ko.pieces.forEach((p) => { for (let el = p.el.parentElement; el && el !== document.body; el = el.parentElement) { if (seen.has(el)) break; seen.add(el); if (getComputedStyle(el).overflow !== "visible") { W.ko.opened.push([el, el.style.overflow]); el.style.overflow = "visible"; } } });
    actors.forEach((a) => { a.locked = true; a.mode = "air"; a.noFloor = true; a.perch = null; a.land = null; a.vx = rand(-120, 120); a.vy = -rand(300, 520); a.setFrame(a.jumpFrame || (a === me ? "held" : a.rest)); });
    await fall(W.ko.pieces, hit.x, hit.y);
  }
  showCard();
}

function showCard() {
  const card = document.createElement("div");
  card.className = "ko-card";
  card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "ko-title");
  card.innerHTML = `<p class="ko-cmd">$ git push --force origin main</p><h2 id="ko-title"></h2><p class="ko-body"></p><p class="ko-quote"></p><button class="btn btn-primary" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg><span></span></button>`;
  card.querySelector("h2").textContent = t("downTitle");
  card.querySelector(".ko-body").textContent = t("downBody");
  card.querySelector(".ko-quote").textContent = t("power");
  card.querySelector("button span").textContent = t("rebuild");
  document.body.append(card);
  S.pageRegions().forEach((el) => el.setAttribute("inert", ""));
  W.ko.card = card;
  const btn = card.querySelector("button");
  btn.addEventListener("click", rebuild);
  card.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); rebuild(); } else if (e.key === "Tab") { e.preventDefault(); btn.focus(); } });
  btn.focus();
}

async function rebuild() {
  if (!W.ko || W.ko.rebuilding) return;
  W.ko.rebuilding = true;
  const card = W.ko.card;
  card.querySelector(".ko-cmd").textContent = "$ npm run build";
  card.classList.add("leaving");
  S.pageRegions().forEach((el) => el.removeAttribute("inert"));
  setTimeout(() => card.remove(), 300);
  if (W.ko.pieces.length) await rise(W.ko.pieces);
  restore(W.ko.pieces, W.ko.opened);
  root.classList.remove("ko-down");
  Object.assign(root.style, W.ko.htmlSaved);
  ropeReset();
  // the friends drop back in
  actors.forEach((a) => {
    a.noFloor = false; a.locked = false; a.queue = []; a.task = null; a.runOff = 0;
    a.x = clamp(a.x, 4, a.maxX());
    if (reduced()) { a.mode = "ground"; a.y = a.floor(); a.setFrame(a.rest); }
    else { a.mode = "air"; a.y = -a.h - rand(0, 120); a.vx = 0; a.vy = 0; }
  });
  const focusBack = $("#main");
  if (document.activeElement === document.body || !document.activeElement) { if (focusBack) focusBack.focus && focusBack.focus({ preventScroll: true }); }
  S.toast(t("rebuilt"));
  emit("sfx", "rebuild");
  unlock("rebuild");
  setPower(true, 8000);
  if (W.ko.wasHidden) setTimeout(() => { if (!W.ko && store.get("pets") === "off") { layer.hidden = true; stop(); } }, 2500);
  W.ko = null;
}

api.special = special;

// The engine: the layer the friends live in, actors and props, the little task machines that drive them,
// physics (walking, jumping, perching, being thrown), pointer input and the main loop.
// Features plug in with addSystem (runs every frame) and addActorHook (runs per actor, before it thinks);
// they talk to each other through W (shared state), on/emit (events) and api (late-bound calls).
import { store, now, clamp, GRAV, unit, reduced, emo } from "./util.js";
import { toSvg, PAL } from "./art/core.js";
import { PROPS } from "./art/props.js";

// ---------------------------------------------------------------- shared state, events, late-bound calls
export const W = {
  me: null,          // the dev
  cat: null,         // the cat of the current theme
  visitor: null,     // the other theme's cat, when it drops by
  yarn: null,        // the ball of yarn on the floor
  ko: null,          // the page is down (special attack) until it is rebuilt
  bug: null,         // the villain on screen, if any
  fighting: false,   // a special attack against a villain is under way
  laser: false,      // the red dot is on (Shift held)
  tiny: null,        // the tiny bug crawling on a card
};
const listeners = {};
export const on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
export const emit = (name, ...args) => (listeners[name] || []).forEach((fn) => fn(...args));
// Features register the calls other features need (special, togglePets…), so modules never import in a circle.
export const api = {};

export const layer = document.createElement("div");
layer.className = "px-world";
layer.setAttribute("aria-hidden", "true");
document.body.append(layer);

// ---------------------------------------------------------------- actors
export const actors = [];
export class Actor {
  constructor(kind, frames, pal, rest, gait, stride) {
    Object.assign(this, { kind, frames, pal, rest, gait, stride });
    this.cache = {};
    this.el = document.createElement("div");
    this.el.className = "px-actor px-" + kind;
    this.spr = document.createElement("div");
    this.spr.className = "px-sprite";
    this.bub = document.createElement("div");
    this.bub.className = "px-bubble";
    this.el.append(this.spr, this.bub);
    layer.append(this.el);
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.face = 1;
    this.mode = "ground"; this.queue = []; this.task = null; this.base = rest; this.frame = "";
    this.emote = null; this.perch = null; this.land = null; this.locked = false; this.soft = true;
    this.brain = () => {};
    this.size();
    this.y = this.floor();
    actors.push(this);
  }
  size() {
    const u = unit(), f = this.frames[this.rest];
    this.w = f[0].length * u; this.h = f.length * u;
    this.el.style.width = this.w + "px"; this.el.style.height = this.h + "px";
  }
  floor() { return innerHeight - this.h - 2; }
  maxX() { return Math.max(4, innerWidth - this.w - 4); }
  cx() { return this.x + this.w / 2; }
  setFrame(f) { this.base = f; }
  emoteFor(frame, ms) { this.emote = { frame, until: now() + ms }; }
  shown() { return this.emote && now() < this.emote.until ? this.emote.frame : this.base; }   // the frame on screen
  draw() {
    const f = this.shown();
    const powered = this.power && this.palPower, key = (powered ? "p:" : "") + f;
    if (key !== this.frame) {
      this.frame = key;
      this.spr.innerHTML = this.cache[key] || (this.cache[key] = toSvg(this.frames[f], "", powered ? this.palPower : this.pal));
    }
    this.el.style.transform = `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0)`;
    const turn = this.spinStep ? Math.round((this.spin || 0) / this.spinStep) * this.spinStep : Math.round(this.spin || 0);
    this.spr.style.transform = this.rolls ? `rotate(${turn}deg)` : this.face < 0 ? "scaleX(-1)" : "";
  }
  say(html, ms = 2600) { sayIn(this, html, ms); }
  pop(icon) {
    const el = document.createElement("span");
    el.className = "px-pop";
    el.innerHTML = emo(icon);
    this.el.append(el);
    setTimeout(() => el.remove(), 1100);
  }
  interrupt(tasks, soft = false) { this.queue = tasks; this.task = null; this.soft = soft; }
  remove() { this.el.remove(); if (actors.includes(this)) actors.splice(actors.indexOf(this), 1); if (this === W.visitor) W.visitor = null; emit("removed", this); }
}
// A speech bubble for anything with .bub (actors, villains): kept inside the window.
export function sayIn(who, html, ms = 2600) {
  const b = who.bub;
  b.innerHTML = html;
  b.style.setProperty("--dx", "0px");
  b.classList.add("show");
  const r = b.getBoundingClientRect();
  const dx = r.left < 8 ? 8 - r.left : r.right > innerWidth - 8 ? innerWidth - 8 - r.right : 0;
  b.style.setProperty("--dx", dx + "px");
  clearTimeout(who.bubTimer);
  who.bubTimer = setTimeout(() => b.classList.remove("show"), ms);
  who.saidAt = now();
}
export const isCat = (a) => a.kind === "cat" && !a.leaving && !a.runOff;
// There is only one Capitu and one Sancho: never spawn a cat that is already on screen (even one on its way out).
export const catNamed = (name) => actors.find((a) => a.kind === "cat" && a.name === name);
export const cats = () => actors.filter(isCat);

// ---------------------------------------------------------------- props: things that show up for a scene and vanish after it
export const props = new Set();
export function poof(x, y) {
  const el = document.createElement("div");
  el.className = "px-poof";
  el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  layer.append(el);
  setTimeout(() => el.remove(), 520);
}
// names: prop names (or art grids); more than one animates every opts.every ms. opts.keep() says when it goes away.
export function prop(names, x, opts = {}) {
  const frames = names.map((n) => (typeof n === "string" ? PROPS[n] : n));
  const u = unit(), first = frames[0];
  const w = first[0].length * u, h = first.length * u;
  const el = document.createElement("div");
  el.className = "px-prop" + (opts.cls ? " " + opts.cls : "");
  el.style.width = w + "px"; el.style.height = h + "px";
  const pr = { el, w, h, x, fixedY: opts.y, svgs: frames.map((f) => toSvg(f, "", opts.pal || PAL)), i: 0, every: opts.every || 0, last: 0, keep: opts.keep || (() => true) };
  pr.y = opts.y != null ? opts.y : innerHeight - h - 2;
  el.innerHTML = pr.svgs[0];
  el.style.transform = `translate(${Math.round(pr.x)}px, ${Math.round(pr.y)}px)`;
  if (opts.front) layer.append(el); else layer.insertBefore(el, layer.firstChild);   // usually behind the characters
  props.add(pr);
  if (!opts.quiet) poof(x + w / 2 - 14, pr.y + h - 22);
  return pr;
}
export function dropProp(pr, quiet) {
  if (!props.has(pr)) return;
  props.delete(pr);
  if (!quiet) poof(pr.x + pr.w / 2 - 14, pr.y + pr.h - 22);
  pr.el.remove();
}
export function moveProp(pr, x, y) {
  pr.x = x; if (y != null) pr.y = y;
  pr.el.style.transform = `translate(${Math.round(pr.x)}px, ${Math.round(pr.y)}px)`;
}
function tickProps(dt, ts) {
  for (const pr of props) {
    if (!pr.keep()) { dropProp(pr, pr.fixedY != null); continue; }
    if (pr.every && ts - pr.last > pr.every) { pr.last = ts; pr.i = (pr.i + 1) % pr.svgs.length; pr.el.innerHTML = pr.svgs[pr.i]; }
  }
}

// ---------------------------------------------------------------- tasks (tiny state machines an actor runs one after the other)
export const wait = (ms, frame, each, begin) => ({
  start(a) { this.end = now() + ms; if (frame) a.setFrame(frame); if (begin) begin(a); },
  update(a, dt) { if (each) each(a, dt); return now() >= this.end; },
});
export const walk = (to, speed) => ({
  start(a) { this.tx = typeof to === "function" ? to(a) : to; },
  update(a, dt) {
    if (this.tx == null) return true;
    if (a.mode !== "ground") return false;
    const d = clamp(this.tx, 4, a.maxX()) - a.x;
    if (Math.abs(d) < 1.5) { a.setFrame(a.rest); return true; }
    a.face = d > 0 ? 1 : -1;
    a.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    a.setFrame(a.gait[Math.floor(now() / a.stride) % a.gait.length]);
    return false;
  },
});
// Runs fn once; returning "stop" drops the rest of the queue.
export const act = (fn) => ({ start(a) { if (fn(a) === "stop") a.queue = []; }, update() { return true; } });
export const until = (fn, ms = 5000) => ({ start() { this.end = now() + ms; }, update() { return fn() || now() > this.end; } });
export const landed = () => ({ update(a) { return a.mode === "ground" || a.mode === "perch"; } });
// Ballistic jump that reaches (tx, ty) after T seconds; with a perch it lands on it, otherwise on the floor.
export function launch(a, tx, ty, T, perch) {
  a.mode = "air"; a.perch = null;
  a.vx = (tx - a.x) / T;
  a.vy = (ty - a.y - 0.5 * GRAV * T * T) / T;
  a.land = perch || null;
  a.face = tx >= a.x ? 1 : -1;
  if (a.jumpFrame) a.setFrame(a.jumpFrame);
}
// perch(a) → { x, y } where the actor sits, or null when it is not available (scrolled away, gone).
export const jumpTo = (perch, T = 0.55) => ({
  start(a) {
    const p = perch(a);
    if (!p || (a.mode !== "ground" && a.mode !== "perch")) { this.done = true; a.queue = []; return; }
    launch(a, p.x, p.y, T, perch);
  },
  update(a) { return this.done || a.mode !== "air"; },
});
export const hopDown = (dx) => act((a) => { if (a.mode === "perch") launch(a, clamp(a.x + dx, 4, a.maxX()), a.floor(), 0.5); });

// ---------------------------------------------------------------- physics
export function step(a, dt, still) {
  if (a.mode === "held") return;
  if (a.mode === "air") {
    if (still && !a.noFloor) { a.mode = "ground"; a.vx = a.vy = 0; a.y = a.floor(); a.setFrame(a.rest); return; }
    a.vy += GRAV * dt; a.x += a.vx * dt; a.y += a.vy * dt;
    if (a.rolls) a.spin = (a.spin || 0) + a.vx * dt * 3;
    if (a.noFloor) return;
    if (a.x < 4) { a.x = 4; a.vx = Math.abs(a.vx) * 0.4; }
    if (a.x > a.maxX()) { a.x = a.maxX(); a.vx = -Math.abs(a.vx) * 0.4; }
    if (a.land && a.vy > 0) {
      const p = a.land(a);
      if (p && a.y >= p.y && Math.abs(a.x - p.x) < 40) {
        a.x = p.x; a.y = p.y; a.vx = a.vy = 0; a.mode = "perch"; a.perch = a.land; a.land = null; a.setFrame(a.rest);
        return;
      }
    }
    if (a.y >= a.floor()) {
      const hit = a.vy;
      a.y = a.floor();
      if (a.bouncy && hit > 260) { a.vy = -hit * 0.42; a.vx *= 0.8; return; }
      a.vy = 0; if (!a.rolls) a.vx = 0;
      a.mode = "ground"; a.land = null; a.setFrame(a.rest);
      if (a.onLand) a.onLand(hit);
    }
  } else if (a.mode === "perch") {
    const p = a.perch && a.perch(a);
    if (!p || Math.abs(p.x - a.x) > 3 || Math.abs(p.y - a.y) > 3) {   // the perch moved (scroll, its owner walked off): fall
      a.mode = "air"; a.perch = null; a.vx = 0; a.vy = 0; a.queue = []; a.task = null;
      if (a.jumpFrame) a.setFrame(a.jumpFrame);
    } else { a.x = p.x; a.y = p.y; }
  } else {
    a.y = a.floor();
    if (a.rolls && a.vx) {
      a.x += a.vx * dt; a.vx *= Math.pow(0.12, dt);
      if (Math.abs(a.vx) < 6) a.vx = 0;
      if (a.x < 4 || a.x > a.maxX()) a.vx = -a.vx * 0.6;
    }
    if (a.rolls) a.spin = (a.spin || 0) + a.vx * dt * 3;
    if (a.entering && a.x >= 4 && a.x <= a.maxX()) a.entering = false;
    if (!a.entering) a.x = clamp(a.x, 4, a.maxX());
  }
}
// Next task from the queue; with an empty queue the actor's brain decides what comes next.
function think(a, dt) {
  if (a.mode === "held" || a.locked) return;
  if (!a.task) {
    if (!a.queue.length) { a.soft = true; a.brain(a); }
    a.task = a.queue.shift() || null;
    if (a.task && a.task.start) a.task.start(a);
  }
  if (a.task && a.task.update(a, dt)) a.task = null;
}

// ---------------------------------------------------------------- pointer input: hover, tap, drag and throw
export const mouse = { x: -1, y: -1, t: 0 };
export const input = { last: now() };   // last time the visitor did anything
window.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now(); } }, { passive: true });
const activity = () => {
  const quiet = now() - input.last;
  input.last = now();
  emit("activity", quiet);
};
["pointermove", "keydown", "scroll", "touchstart"].forEach((ev) => window.addEventListener(ev, activity, { passive: true }));

export function grab(a) {
  a.mode = "held"; a.queue = []; a.task = null; a.perch = null; a.land = null;
  a.setFrame(a.heldFrame || a.jumpFrame || a.rest);
  if (a.onGrab) a.onGrab();
}
// Tap → onTap(a); drag → held, then thrown with the pointer's speed (a.onThrow); hover with a mouse → onHover(a).
export function bind(a, onTap, onHover) {
  a.el.addEventListener("pointerdown", (e) => {
    if (W.ko || a.locked) return;
    e.preventDefault();
    try { a.el.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
    const sx = e.clientX, sy = e.clientY, ox = e.clientX - a.x, oy = e.clientY - a.y;
    let dragging = false, lx = sx, ly = sy, lt = now(), vx = 0, vy = 0;
    const move = (ev) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { dragging = true; grab(a); }
      if (!dragging) return;
      const tn = now(), dt = Math.max(8, tn - lt) / 1000;
      vx = vx * 0.4 + 0.6 * (ev.clientX - lx) / dt; vy = vy * 0.4 + 0.6 * (ev.clientY - ly) / dt;
      lx = ev.clientX; ly = ev.clientY; lt = tn;
      a.x = clamp(ev.clientX - ox, 0, a.maxX()); a.y = clamp(ev.clientY - oy, 0, a.floor());
    };
    const up = () => {
      a.el.removeEventListener("pointermove", move);
      a.el.removeEventListener("pointerup", up);
      a.el.removeEventListener("pointercancel", up);
      if (dragging) {
        a.mode = "air"; a.vx = clamp(vx, -1400, 1400); a.vy = clamp(vy, -1400, 900);
        a.setFrame(a.heldFrame || a.jumpFrame || a.rest);
        if (a.onThrow) a.onThrow();
      }
      else onTap(a);
    };
    a.el.addEventListener("pointermove", move);
    a.el.addEventListener("pointerup", up);
    a.el.addEventListener("pointercancel", up);
  });
  a.el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !W.ko && a.mode !== "held") onHover(a); });
}

// ---------------------------------------------------------------- the main loop
// Actor hooks run (in order) before an actor thinks: return "skip" to keep it from thinking this frame
// (it still moves and is drawn), or "done" when the hook moved and drew it itself.
const actorHooks = [], systems = [];
const byOrder = (list) => list.sort((a, b) => a.order - b.order);
export function addActorHook(fn, order = 50) { actorHooks.push({ fn, order }); byOrder(actorHooks); }
export function addSystem(fn, order = 50) { systems.push({ fn, order }); byOrder(systems); }
addSystem(tickProps, 10);

let raf = 0, last = 0;
function loop(ts) {
  const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
  last = ts;
  const still = reduced();
  for (const a of actors.slice()) {
    let skip = false, done = false;
    for (const h of actorHooks) {
      const r = h.fn(a, dt, ts);
      if (r === "done") { done = true; break; }
      if (r === "skip") { skip = true; break; }
    }
    if (done || !actors.includes(a)) continue;
    if (!skip && !still && !W.ko) think(a, dt);
    step(a, dt, still);
    a.draw();
  }
  for (const s of systems) s.fn(dt, ts);
  raf = requestAnimationFrame(loop);
}
export function start() { if (!raf && !layer.hidden && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
export function stop() { cancelAnimationFrame(raf); raf = 0; }
document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
window.addEventListener("resize", () => {
  actors.forEach((a) => { a.size(); if (a.mode === "ground") a.y = a.floor(); a.x = clamp(a.x, 4, a.maxX()); a.cache = {}; a.frame = ""; });
  props.forEach((pr) => dropProp(pr, true));
  emit("resize");
});

// Show / hide the friends (palette, or remembered from last time).
export function togglePets() {
  if (!layer.hidden) emit("hide");
  layer.hidden = !layer.hidden;
  store.set("pets", layer.hidden ? "off" : "on");
  layer.hidden ? stop() : start();
}
// Anything the visitor asks for from the palette brings the friends back first.
export const showFriends = () => { if (layer.hidden) togglePets(); };

// Toys: the ball of yarn (tap to kick, drag to throw, hold and spin to wind it up) whose thread is a rope
// with physics, the red laser dot (hold Shift) and fish treats (double-click the floor).
import { S, root, t, now, rand, clamp, SVGNS, finePointer, reduced, typing, bubble } from "./util.js";
import { W, layer, actors, cats, isCat, Actor, wait, walk, until, act, launch, grab, mouse, addActorHook, addSystem, showFriends } from "./world.js";
import { me, hop } from "./me.js";
import { petFeed } from "./pets.js";
import { PROPS } from "./art/props.js";
import { PAL } from "./art/core.js";
import { unlock } from "./achv.js";

export const chaseYarn = () => ({
  start() { this.end = now() + 6000; },
  update(a, dt) {
    if (!yarn || now() > this.end) return true;
    if (a.mode !== "ground") return false;
    const d = yarn.cx() - a.cx();
    a.face = d > 0 ? 1 : -1;
    if (Math.abs(d) > a.w * 0.55) {
      a.x += Math.sign(d) * Math.min(Math.abs(d), 230 * dt);
      a.setFrame(a.gait[Math.floor(now() / 90) % a.gait.length]);
      return false;
    }
    if (yarn.mode === "ground") {
      petFeed(a, "fun", 15);
      if (rope.length > 12 && Math.random() < 0.3) { tangle(a); return true; }
      a.setFrame("paw"); yarn.mode = "air"; yarn.vx = a.face * rand(180, 380); yarn.vy = -rand(220, 420);
    }
    return true;
  },
});
function kickYarn(y) {
  unlock("yarn");
  y.mode = "air"; y.vx = (Math.random() < 0.5 ? -1 : 1) * rand(240, 460); y.vy = -rand(320, 520);
}

const dot = document.createElement("div");
dot.className = "px-laser";
dot.hidden = true;
layer.append(dot);
export function setLaser(on) {
  if (W.laser === on) return;
  W.laser = on; dot.hidden = !on;
  root.classList.toggle("px-laser-on", on);
  if (on) unlock("laser");
}
window.addEventListener("keydown", (e) => {
  if (e.key !== "Shift" || e.repeat || W.ko || layer.hidden || reduced() || !finePointer.matches || S.paletteOpen()) return;
  if (typing() || now() - mouse.t > 5000) return;
  setLaser(true);
});
window.addEventListener("keyup", (e) => { if (e.key === "Shift") setLaser(false); });
window.addEventListener("blur", () => setLaser(false));
function chaseLaser(c, dt) {
  c.queue = []; c.task = null; c.soft = false;
  petFeed(c, "fun", dt * 4);
  if (c.mode !== "ground") return;
  const d = mouse.x - c.cx();
  c.face = d > 0 ? 1 : -1;
  if (Math.abs(d) > 8) { c.x += Math.sign(d) * Math.min(Math.abs(d), 320 * dt); c.setFrame(c.gait[Math.floor(now() / 80) % c.gait.length]); }
  else c.setFrame(mouse.y > innerHeight - 120 ? "paw" : "sit");
  if (mouse.y > innerHeight - 150 && Math.abs(d) < 70 && Math.abs(d) > 10 && now() > (c.pounceCool || 0)) {
    c.pounceCool = now() + 1100;
    launch(c, clamp(mouse.x - c.w / 2, 4, c.maxX()), c.floor(), 0.34);
  }
}

// ================================================================ treats: double-click the floor (or use the palette) to drop a fish
function dropTreat(x, y) {
  if (W.ko || layer.hidden) return;
  const fish = new Actor("fish", { fish: PROPS.fish }, PAL, "fish", ["fish"], 100);
  fish.brain = () => {};
  fish.el.style.pointerEvents = "none";
  fish.x = clamp(x - fish.w / 2, 4, fish.maxX()); fish.y = y; fish.mode = "air"; fish.vy = -120;
  unlock("treat");
  setTimeout(() => { if (actors.includes(fish)) fish.remove(); }, 15000);
  const c = cats().filter((k) => k.mode !== "held").sort((p, q) => Math.abs(p.cx() - fish.cx()) - Math.abs(q.cx() - fish.cx()))[0];
  if (!c) return;
  c.interrupt([
    until(() => fish.mode === "ground", 2500),
    walk(() => (c.cx() < fish.cx() ? fish.x - c.w + 8 : fish.x + fish.w - 8), 220),
    act(() => { c.face = fish.cx() > c.cx() ? 1 : -1; }),
    wait(250, "sit"), wait(320, "paw"), wait(250, "sit"),
    act(() => { if (actors.includes(fish)) fish.remove(); petFeed(c, "food", 40); c.pop("heart"); c.say(bubble(t("nom"), "heart"), 1500); }),
    wait(1600, "sit"),
  ]);
}
window.addEventListener("dblclick", (e) => {
  const el = e.target instanceof Element ? e.target : null;
  if (W.ko || layer.hidden || e.clientY < innerHeight - 100 || (el && el.closest("a, button, input, textarea, select, label, [contenteditable]"))) return;
  try { getSelection().removeAllRanges(); } catch (err) { /* nothing selected */ }
  dropTreat(e.clientX, e.clientY - 24);
});
export function treatFromPalette() {
  showFriends();
  const c = W.cat;
  dropTreat(c ? c.cx() + (c.cx() < innerWidth / 2 ? 90 : -90) : innerWidth / 2, innerHeight * 0.5);
}

// ================================================================ the yarn's thread: a rope that unspools from the ball,
// hangs under gravity, drapes over the page's cards and buttons, snags on their edges and rides along when the page scrolls.
const thread = document.createElementNS(SVGNS, "svg");
thread.setAttribute("class", "px-thread");
const threadPath = document.createElementNS(SVGNS, "path");
thread.append(threadPath);
layer.insertBefore(thread, layer.firstChild);
// The simulation runs in fixed small steps (smooth whatever the frame rate): verlet points, then distance
// constraints solved in alternating sweeps (so a long thread does not stretch like a rubber band), with the
// collisions solved inside the same loop (so it rests on edges instead of jittering through them).
const SEG = 9, MAX_NODES = 240, STEP = 1 / 120, GRAVITY = 1500;
export const ROPE = { iter: 14, lra: true, drag: 0.995, floorFriction: 0.3, snag: 0.6, collideEvery: 3, sleep: 0.35 };   // tuning (QA can change it)
const SNAG = ".btn, .tech, .impact-card, .job, .chips li, .project, .contact-card, .filter, .section-head h2";
let rope = [], anchorX = null, rewinding = false, winding = false, colliders = [], collidersAt = 0, simTime = 0;
let lastBall = null;   // where the ball was on the previous step (new thread comes out of it with its speed)
let restFor = 0;       // how long the ball has been still: then the thread settles and stops creeping
// scrolling moves the cards under the thread: it wakes up and falls or gets carried along
window.addEventListener("scroll", () => { collidersAt = 0; restFor = 0; }, { passive: true });
window.addEventListener("resize", () => { collidersAt = 0; restFor = 0; });
function refreshColliders() {
  colliders = [...document.querySelectorAll(SNAG)].map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 8 && r.height > 8 && r.bottom > -80 && r.top < innerHeight + 80);
  collidersAt = now() + 160;
}
const ropeFloor = () => innerHeight - 3;
export function ropeReset() { rope = []; anchorX = null; lastBall = null; }
// push a point out of the floor and out of any card or button it went into; resting on a top edge snags it
function collide(q, near) {
  const floor = ropeFloor();
  // friction moves the point back toward where it was, so resting thread holds instead of sliding forever
  if (q.y > floor) { q.y = floor; q.x -= (q.x - q.px) * ROPE.floorFriction; }
  for (const r of near) {
    if (q.x <= r.left || q.x >= r.right || q.y <= r.top || q.y >= r.bottom) continue;
    const up = q.y - r.top, down = r.bottom - q.y, left = q.x - r.left, right = r.right - q.x, m = Math.min(up, down, left, right);
    if (m === up) { q.y = r.top; q.x -= (q.x - q.px) * ROPE.snag; }   // resting on a top edge: it snags
    else if (m === down) q.y = r.bottom;
    else if (m === left) q.x = r.left;
    else q.x = r.right;
  }
}
// keep segment i (point i to the next one, or to the ball) from being longer than SEG; the end on the floor,
// the ball (moved by its own physics) and points that settled on something do not give way
function solve(i, bx, by) {
  const a = rope[i], last = i === rope.length - 1, b = last ? null : rope[i + 1];
  const tx = last ? bx : b.x, ty = last ? by : b.y;
  const dx = tx - a.x, dy = ty - a.y, dist = Math.hypot(dx, dy);
  if (dist <= SEG || dist === 0) return;
  const wa = i === 0 || a.pin ? 0 : 1, wb = last || b.pin ? 0 : 1;
  if (!wa && !wb) return;
  const diff = (dist - SEG) / dist / (wa + wb);
  if (wa) { a.x += dx * diff; a.y += dy * diff; }
  if (wb) { b.x -= dx * diff; b.y -= dy * diff; }
}
// a point lying on the floor or on the top edge of a card or button
const supported = (q, near) => q.y >= ropeFloor() - 0.6 || near.some((r) => q.x > r.left && q.x < r.right && Math.abs(q.y - r.top) < 0.6);
function stepRope(bx, by, bvx, bvy, settled) {
  // unspool: always a bit more thread out than the straight distance back to where it started (never less than before);
  // new points come out of the ball spaced along the way it travelled, already moving with it
  const want = Math.min(MAX_NODES, Math.ceil((Math.hypot(bx - anchorX, by - ropeFloor()) * 1.25) / SEG) + 1);
  const tail = rope[rope.length - 1], gap = Math.hypot(bx - tail.x, by - tail.y);
  // a fast ball pulls thread out faster than the slack rule alone: never leave a gap longer than a segment
  const pulled = rope.length < want * 1.5 ? Math.ceil(gap / SEG) - 1 : 0;
  const need = Math.min(MAX_NODES - rope.length, Math.max(want - rope.length, pulled));
  if (need > 0 && !rewinding && !winding) {
    const from = tail, n = need;
    for (let k = 1; k <= n; k++) {
      const f = k / (n + 1), x = from.x + (bx - from.x) * f, y = from.y + (by - from.y) * f;
      rope.push({ x, y, px: x - bvx * STEP, py: y - bvy * STEP });
    }
  }
  // verlet: gravity and a little air drag
  const g = GRAVITY * STEP * STEP;
  // only the cards and buttons around the thread take part in the collisions
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of rope) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
  const near = colliders.filter((r) => r.right > x0 - SEG * 2 && r.left < x1 + SEG * 2 && r.bottom > y0 - SEG * 2 && r.top < y1 + SEG * 2);
  for (let i = 1; i < rope.length; i++) {
    const q = rope[i], vx = (q.x - q.px) * ROPE.drag, vy = (q.y - q.py) * ROPE.drag;
    // once the ball is still, thread that came to rest on something holds there (static friction): no creeping
    if (!settled) q.pin = false;
    else if (!q.pin && Math.abs(vx) + Math.abs(vy) < ROPE.sleep && supported(q, near)) q.pin = true;
    q.px = q.x; q.py = q.y;
    if (q.pin) continue;
    q.x += vx; q.y += vy + g;
  }
  const iter = ROPE.iter;
  for (let it = 0; it < iter; it++) {
    if (it % 2) for (let i = rope.length - 1; i >= 0; i--) solve(i, bx, by);
    else for (let i = 0; i < rope.length; i++) solve(i, bx, by);
    if (it % ROPE.collideEvery === ROPE.collideEvery - 1 || it === iter - 1) for (let i = 1; i < rope.length; i++) collide(rope[i], near);
  }
  // no point can be further from either end than the thread between them allows: this keeps a long, heavy
  // thread from stretching even when the sweeps above have not fully settled
  if (ROPE.lra) {
    const n = rope.length, a = rope[0];
    for (let i = 1; i < n; i++) {
      const q = rope[i];
      if (q.pin) continue;
      let dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy), max = i * SEG;
      if (d > max) { q.x = a.x + (dx / d) * max; q.y = a.y + (dy / d) * max; }
      dx = q.x - bx; dy = q.y - by; d = Math.hypot(dx, dy); max = (n - i) * SEG;
      if (d > max) { q.x = bx + (dx / d) * max; q.y = by + (dy / d) * max; }
    }
  }
}
function tickRope(dt) {
  if (!yarn || W.ko || layer.hidden) return;
  if (now() > collidersAt) refreshColliders();
  const bx = yarn.cx(), by = yarn.y + yarn.h / 2;
  if (anchorX == null) { anchorX = bx; rope = [{ x: bx, y: ropeFloor(), px: bx, py: ropeFloor() }]; lastBall = null; }
  const a0 = rope[0];
  a0.x = a0.px = anchorX; a0.y = a0.py = ropeFloor();
  // the ball's speed over this frame, and its position at each small step in between
  const from = lastBall || { x: bx, y: by };
  const bvx = dt ? clamp((bx - from.x) / dt, -2000, 2000) : 0, bvy = dt ? clamp((by - from.y) / dt, -2000, 2000) : 0;
  const still = yarn.mode === "ground" && Math.abs(yarn.vx) < 1 && !rewinding && !winding && Math.abs(bx - from.x) + Math.abs(by - from.y) < 0.5;
  restFor = still ? restFor + dt : 0;
  simTime = Math.min(simTime + dt, STEP * 6);
  const steps = Math.floor(simTime / STEP);
  for (let s = 1; s <= steps; s++) {
    const k = s / steps;
    stepRope(from.x + (bx - from.x) * k, from.y + (by - from.y) * k, bvx, bvy, restFor > 0.8);
  }
  simTime -= steps * STEP;
  lastBall = { x: bx, y: by };
  // all the thread is out: the rope holds the ball back (it loses the speed that pulls it away)
  if (rope.length >= MAX_NODES && yarn.mode !== "held") {
    const q = rope[rope.length - 1], dx = bx - q.x, dy = by - q.y, dist = Math.hypot(dx, dy);
    if (dist > SEG) {
      const nx = dx / dist, ny = dy / dist, k = (dist - SEG) * 0.5;
      yarn.x -= nx * k; yarn.y -= ny * k;
      const out = yarn.vx * nx + yarn.vy * ny;
      if (out > 0) { yarn.vx -= out * nx; yarn.vy -= out * ny; }
    }
  }
  // draw it smooth (quadratic curves through the midpoints)
  const pts = rope.concat([{ x: yarn.cx(), y: yarn.y + yarn.h / 2 }]);
  if (pts.length < 3 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 6) { threadPath.setAttribute("d", ""); return; }
  let path = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    path += ` Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  path += ` L${pts[pts.length - 1].x.toFixed(1)} ${pts[pts.length - 1].y.toFixed(1)}`;
  threadPath.setAttribute("d", path);
}
// Reset: the ball rolls back along its own thread, winding it up, to where it started.
export function rewindYarn() {
  if (!yarn || W.ko || rewinding) return;
  showFriends();
  rewinding = true;
  yarn.mode = "held"; yarn.vx = yarn.vy = 0; yarn.queue = []; yarn.task = null;
}
function tickRewind(dt) {
  if (!rewinding || !yarn) return;
  const target = rope.length > 1 ? rope[rope.length - 1] : { x: anchorX == null ? yarn.cx() : anchorX, y: yarn.floor() + yarn.h / 2 };
  const bx = yarn.cx(), by = yarn.y + yarn.h / 2, dx = target.x - bx, dy = target.y - by, d = Math.hypot(dx, dy), stepLen = 900 * dt;
  yarn.spin = (yarn.spin || 0) - 30;
  if (d > stepLen) { yarn.x += (dx / d) * stepLen; yarn.y += (dy / d) * stepLen; return; }
  yarn.x = target.x - yarn.w / 2; yarn.y = target.y - yarn.h / 2;
  if (rope.length > 1) rope.pop();
  else { rewinding = false; yarn.mode = "ground"; yarn.y = yarn.floor(); yarn.vx = 0; }
}
// Winding by hand: the ball stays put and the thread is reeled in; the loose end gets pulled along the floor.
function windIn(n) {
  const bx = yarn.cx(), by = yarn.y + yarn.h / 2;
  for (let i = 0; i < n && rope.length > 1; i++) {
    rope.pop();
    const left = ((rope.length - 1) * SEG) / 1.25, dy = ropeFloor() - by, dx = anchorX - bx;
    const reach = Math.sqrt(Math.max(0, left * left - dy * dy));
    if (Math.abs(dx) > reach) anchorX = bx + Math.sign(dx) * reach;
  }
  if (rope.length > 2) return false;
  ropeReset();
  yarn.pop("heart");
  yarn.say(bubble(t("wound"), "star"), 1400);
  return true;
}
// The yarn: a tap kicks it, a drag throws it, and holding it while turning circles (either way) winds the thread up.
let yarnHintAt = 0;
const wrapAngle = (d) => Math.atan2(Math.sin(d), Math.cos(d));
function yarnHint() {
  if (rope.length < 8 || now() < yarnHintAt) return;
  yarnHintAt = now() + 9000;
  yarn.say(bubble(t("windHint"), "star"), 1800);
}
function bindYarn() {
  yarn.el.addEventListener("pointerdown", (e) => {
    if (W.ko || rewinding || actors.some((a) => a.tangledUntil)) return;
    e.preventDefault();
    try { yarn.el.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
    // catching it stops it where it is
    yarn.mode = "held"; yarn.vx = yarn.vy = 0; yarn.queue = []; yarn.task = null;
    const sx = e.clientX, sy = e.clientY, ox = sx - yarn.x, oy = sy - yarn.y;
    let mode = "press", lx = sx, ly = sy, lt = now(), vx = 0, vy = 0, turn = 0, dir = null, ang = null, acc = 0;
    const startWind = () => {
      mode = "wind"; winding = true;
      yarn.mode = "held"; yarn.vx = yarn.vy = 0; yarn.queue = []; yarn.task = null;
      yarn.el.classList.add("px-winding");
      yarnHint();
    };
    const hold = setTimeout(() => { if (mode === "press") startWind(); }, 320);
    const move = (ev) => {
      const x = ev.clientX, y = ev.clientY;
      if (mode === "press" && Math.hypot(x - sx, y - sy) > 6) { mode = "drag"; clearTimeout(hold); grab(yarn); }
      if (mode === "drag") {
        const tn = now(), dt = Math.max(8, tn - lt) / 1000, mx = x - lx, my = y - ly;
        vx = vx * 0.4 + 0.6 * mx / dt; vy = vy * 0.4 + 0.6 * my / dt;
        lx = x; ly = y; lt = tn;
        yarn.x = clamp(x - ox, 0, yarn.maxX()); yarn.y = clamp(y - oy, 0, yarn.floor());
        // swinging it round in circles also winds it: add up how much the drag keeps turning
        if (Math.hypot(mx, my) > 3) { const d = Math.atan2(my, mx); if (dir != null) turn += wrapAngle(d - dir); dir = d; }
        if (Math.abs(turn) > Math.PI * 1.6) startWind();
        return;
      }
      if (mode !== "wind") return;
      const cx = yarn.cx(), cy = yarn.y + yarn.h / 2, a2 = Math.atan2(y - cy, x - cx);
      if (Math.hypot(x - cx, y - cy) < 5) return;
      if (ang != null) {
        const d = wrapAngle(a2 - ang);
        acc += Math.abs(d);
        yarn.spin = (yarn.spin || 0) + (d * 180) / Math.PI;
      }
      ang = a2;
      while (acc > 0.3) {
        acc -= 0.3;
        if (windIn(Math.ceil(Math.max(2, rope.length / 35)))) { unlock("yarn"); mode = "done"; break; }
      }
    };
    const up = () => {
      clearTimeout(hold);
      yarn.el.removeEventListener("pointermove", move);
      yarn.el.removeEventListener("pointerup", up);
      yarn.el.removeEventListener("pointercancel", up);
      yarn.el.classList.remove("px-winding");
      if (mode === "press") kickYarn(yarn);
      else if (mode === "drag") { yarn.mode = "air"; yarn.vx = clamp(vx, -1400, 1400); yarn.vy = clamp(vy, -1400, 900); unlock("yarn"); }
      else { winding = false; yarn.mode = "air"; yarn.vx = 0; yarn.vy = 0; }
    };
    yarn.el.addEventListener("pointermove", move);
    yarn.el.addEventListener("pointerup", up);
    yarn.el.addEventListener("pointercancel", up);
  });
  yarn.el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !W.ko && yarn.mode !== "held") yarnHint(); });
}
// The cat gets tangled in the thread and bolts, dragging the ball along.
const tangledRun = () => ({
  start(a) { this.tx = rand(10, a.maxX()); },
  update(a, dt) {
    if (!a.tangledUntil) return true;
    if (a.mode !== "ground") return false;
    const d = this.tx - a.x;
    if (Math.abs(d) < 10) this.tx = rand(10, a.maxX());
    a.face = d > 0 ? 1 : -1;
    a.x += Math.sign(d) * Math.min(Math.abs(d), 330 * dt);
    a.setFrame(a.gait[Math.floor(now() / 60) % a.gait.length]);
    if (Math.random() < 0.012) launch(a, clamp(a.x + a.face * 60, 4, a.maxX()), a.floor(), 0.35);
    if (yarn && yarn.mode === "held" && !rewinding && !winding) { yarn.x = a.cx() - a.face * a.w * 0.6 - yarn.w / 2; yarn.y = yarn.floor(); yarn.spin = (yarn.spin || 0) + a.face * 22; }
    return false;
  },
});
function tangle(c) {
  if (!yarn || rewinding || c.tangledUntil) return;
  c.tangledUntil = now() + rand(2800, 3800);
  c.el.classList.add("px-tangled");
  c.say(bubble(t("tangled"), "skull"), 1500);
  yarn.mode = "held"; yarn.vx = yarn.vy = 0;
  unlock("tangle");
  petFeed(c, "fun", 10);
  c.interrupt([tangledRun(), wait(1200, "sit"), act(() => c.say(bubble("…", "cat"), 1500)), wait(1500, "sit")]);
}
function untangle(c) {
  c.tangledUntil = 0;
  c.el.classList.remove("px-tangled");
  if (yarn && yarn.mode === "held" && !rewinding) { yarn.mode = "air"; yarn.vx = -c.face * rand(150, 300); yarn.vy = -260; }
}

// ---------------------------------------------------------------- the ball itself
export const yarn = new Actor("yarn", { ball: PROPS.yarn }, PAL, "ball", ["ball"], 100);
W.yarn = yarn;
yarn.rolls = true; yarn.bouncy = true; yarn.spinStep = 90;   // pixel art turns in quarter turns, so it stays crisp
yarn.x = Math.round(innerWidth * 0.8);
yarn.onThrow = () => unlock("yarn");
bindYarn();
export const ropePoints = () => rope;

// ---------------------------------------------------------------- every frame
// cats drop everything for the laser dot, and run after the yarn when it rolls or flies
addActorHook((a, dt) => {
  if (W.laser && isCat(a) && !a.tangledUntil && !W.ko && !reduced()) { chaseLaser(a, dt); return "skip"; }
  if (isCat(a) && !W.ko && !reduced() && a.mode === "ground" && a.soft && a.base !== "sleep" && now() > (a.yarnCool || 0)
    && (Math.abs(yarn.vx) > 80 || yarn.mode === "air")) {
    a.yarnCool = now() + 2500;
    a.interrupt([chaseYarn(), wait(900, "sit")]);
  }
  return null;
}, 30);
let meYarnCool = 0;
addSystem((dt) => {
  tickRewind(dt);
  tickRope(dt);
  // the dev and the yarn: he hops over it or stops it, or at least warns you
  if (!W.ko && !reduced() && !me.locked && me.mode === "ground" && now() > meYarnCool && yarn.mode !== "held" && (Math.abs(yarn.vx) > 140 || yarn.mode === "air")) {
    const d = yarn.cx() - me.cx();
    if (Math.abs(d) < me.w * 0.9 && Math.sign(yarn.vx || 1) === -Math.sign(d || 1)) {
      meYarnCool = now() + 4000;
      const casual = ["idle", "walk1", "walk2", "walk3", "walk4", "wave", "point"].includes(me.base);
      if (!casual) me.say(bubble(t("careful"), "skull"), 1600);
      else if (Math.random() < 0.5) { hop(); me.say(bubble(t("hop"), "star"), 1300); }
      else { yarn.vx = -yarn.vx * 0.5; yarn.mode = "air"; yarn.vy = -220; me.emoteFor("point", 700); me.say(bubble(t("careful"), "skull"), 1600); }
    }
  }
  actors.forEach((a) => { if (a.tangledUntil && now() > a.tangledUntil) untangle(a); });
  if (W.laser) dot.style.transform = `translate(${mouse.x - 5}px, ${mouse.y - 5}px)`;
}, 20);

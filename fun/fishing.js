// Fishing, in aquarium mode: a little pond sits on the floor. Press F (or tap the pond) and the dev casts a line;
// when the bobber goes under, press F, Space or click to reel in. Four kinds of fish, one of them rare and golden.
// The cat gets the catch (the golden one goes back to the pond). Esc leaves.
import { t, now, rand, unit, finePointer, reduced, bubble } from "./util.js";
import { W, emit, on, layer, prop, dropProp, wait, walk, act, until, addSystem } from "./world.js";
import { me } from "./me.js";
import { holdAquarium, setAquarium, aquaHint } from "./aquarium.js";
import { petFeed } from "./pets.js";
import { toSvg } from "./art/core.js";
import { POND, FISH } from "./art/life.js";
import { unlock } from "./achv.js";

let pond = null, game = null;
// game.state: walk → cast → wait (nibbles) → bite → show (the catch) or pause (a miss) → cast…

// ---------------------------------------------------------------- the pond (only in aquarium mode)
function placePond() {
  const u = unit(), w = POND[0].length * u;
  pond = prop([POND], Math.round(innerWidth * 0.84 - w / 2), { quiet: true, cls: "px-pond", keep: () => !!W.aquarium && !W.ko });
  layer.insertBefore(pond.el, me.el);   // over the sky and the furniture, under the characters
}
on("resize", () => { if (pond) { dropProp(pond, true); pond = null; } });
const bobber = () => ({ x: pond.x + pond.w * 0.58, y: pond.y + 2.2 * unit() });
const hand = () => ({ x: me.x + 30 * unit(), y: me.y + 11 * unit() });
const tip = () => { const h = hand(), u = unit(); return { x: h.x + 15 * u, y: h.y - 13 * u }; };

// ---------------------------------------------------------------- the game
export function startFishing() {
  if (game || !pond || W.ko || W.event || me.locked) return false;
  game = { state: "walk" };
  W.event = "fishing";
  aquaHint(t(finePointer.matches ? "fish.hintPlay" : "fish.hintPlayTouch"));
  me.interrupt([
    walk(() => pond.x - me.w + 3 * unit(), 160),   // at the edge, the rod over the water
    act(() => { if (!game) return "stop"; me.face = 1; me.setFrame("point"); cast(); }),
    until(() => !game, Infinity),
  ]);
  return true;
}
export function stopFishing() {
  if (!game) return;
  if (game.fish) game.fish.remove();
  game = null;
  if (W.event === "fishing") W.event = null;
  aquaHint(null);
  me.interrupt([]);
}
function cast() {
  game.state = "cast"; game.until = now() + 500; game.dip = 0;
  emit("sfx", "cast");
}
function press() {
  if (!game) return;
  if (game.state === "bite") reel();
  else if (game.state === "wait") miss("early");
}
function miss(why) {
  game.state = "pause"; game.until = now() + 1600;
  me.say(bubble(t("fish." + why), "skull"), 1600);
  emit("sfx", "splash");
}
function pickFish() {
  const r = Math.random();
  return r < 0.05 ? "golden" : r < 0.2 ? "tucunare" : r < 0.5 ? "tilapia" : "lambari";
}
// the fish jumps out of the water and over his head; then it goes to the cat (or back to the pond)
function reel(kind = pickFish()) {
  const u = unit(), art = FISH[kind], fw = art[0].length * u, fh = art.length * u, b = bobber();
  game.state = "show"; game.until = now() + 4200;
  unlock("fisher");
  if (kind === "golden") unlock("goldfish");
  emit("sfx", kind === "golden" ? "wish" : "collect");
  const el = document.createElement("div");
  el.className = "px-catch" + (kind === "golden" ? " px-glow" : "");
  el.innerHTML = toSvg(art);
  el.style.width = fw + "px"; el.style.height = fh + "px";
  layer.append(el);
  game.fish = el;
  const up = { x: me.cx() - fw / 2, y: me.y - fh - 6 * u };
  const move = (from, to, ms, spin) => el.animate([
    { transform: `translate(${from.x}px, ${from.y}px) rotate(0deg)` },
    { transform: `translate(${(from.x + to.x) / 2}px, ${Math.min(from.y, to.y) - 30 * u}px) rotate(${spin / 2}deg)`, offset: 0.5 },
    { transform: `translate(${to.x}px, ${to.y}px) rotate(${spin}deg)` },
  ], { duration: reduced() ? 1 : ms, easing: "ease-in-out", fill: "forwards" });
  move({ x: b.x - fw / 2, y: b.y - fh / 2 }, up, 700, -360);
  setTimeout(() => { if (game && game.fish === el) me.say(bubble(t("fish.kinds." + kind) + "!", "star"), 2400); }, 700);
  setTimeout(() => {
    if (!game || game.fish !== el) return;
    const c = W.cat;
    if (kind === "golden" || !c || c.mode !== "ground" || c.leaving) {
      if (kind === "golden") me.say(bubble(t("fish.release"), "heart"), 2000);
      move(up, { x: b.x - fw / 2, y: b.y }, 700, 180).onfinish = () => { el.remove(); emit("sfx", "splash"); };
      return;
    }
    const floor = { x: me.x + me.w + 2 * u, y: innerHeight - fh - 2 };
    move(up, floor, 600, 180);
    c.interrupt([
      walk(() => floor.x + fw - 2 * u, 170),
      act(() => { c.face = -1; }),
      wait(400, "paw"),
      act(() => { el.remove(); emit("sfx", "nom"); petFeed(c, "food", 30); c.pop("heart"); c.say(bubble(t("nom"), "fish"), 1400); }),
      wait(1500, "sit"),
    ]);
  }, 2300);
}

addSystem(() => {
  if (pond && !pond.el.isConnected) pond = null;
  if (W.aquarium && !pond && !W.ko) placePond();
  if (!game) return;
  if (!W.aquarium || W.ko || !pond) { stopFishing(); return; }
  const tm = now();
  if (game.state === "cast" && tm > game.until) { game.state = "wait"; game.until = tm + rand(2500, 6500); game.nibble = tm + rand(700, 1800); }
  else if (game.state === "wait") {
    if (game.nibble && tm > game.nibble) { game.dip = tm + 160; game.nibble = tm + rand(900, 2200) < game.until - 500 ? tm + rand(900, 2200) : 0; }
    if (tm > game.until) {
      game.state = "bite"; game.until = tm + (finePointer.matches ? 1000 : 1400);
      me.say(bubble("!", "star"), 900);
      emit("sfx", "bite");
    }
  } else if (game.state === "bite" && tm > game.until) miss("gone");
  else if ((game.state === "pause" || game.state === "show") && tm > game.until) { if (game.fish && game.state === "show") game.fish = null; cast(); }
}, 80);

// the rod, the line and the bobber, on a canvas of their own in front of the pond
const rod = document.createElement("canvas");
rod.className = "px-rod";
layer.append(rod);
let rodDrew = false;
addSystem((dt, ts) => {
  const busy = !!game && game.state !== "walk" && !!pond;
  if (!busy && !rodDrew) return;
  if (rod.width !== innerWidth || rod.height !== innerHeight) { rod.width = innerWidth; rod.height = innerHeight; }
  const g = rod.getContext("2d");
  g.clearRect(0, 0, rod.width, rod.height);
  rodDrew = busy;
  if (busy) drawRod(g, ts);
}, 85);
function drawRod(g, ts) {
  {
    const u = unit(), h = hand(), tp = tip(), b = bobber();
    g.strokeStyle = "#7c2d12"; g.lineWidth = Math.max(2, u * 0.8); g.lineCap = "round";
    g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(tp.x, tp.y); g.stroke();
    // the line: flying out while casting, then hanging down to the bobber
    const k = game.state === "cast" ? Math.min(1, 1 - (game.until - now()) / 500) : 1;
    const under = game.state === "bite", dip = (game.dip && now() < game.dip) || under;
    const bx = tp.x + (b.x - tp.x) * k, by = tp.y + (b.y - tp.y) * k + (dip ? u * (under ? 2 : 1) : Math.sin(ts / 420) * u * 0.4);
    g.strokeStyle = "rgba(30,41,59,.7)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(tp.x, tp.y); g.quadraticCurveTo((tp.x + bx) / 2, Math.max(tp.y, by) + 6 * u * k, bx, by); g.stroke();
    if (k < 1) return;
    if (under) {   // under the water: only the rings
      g.strokeStyle = "rgba(191,219,254,.9)";
      const r = 2 * u + ((ts / 12) % (3 * u));
      g.beginPath(); g.ellipse(b.x, b.y + u, r, r / 3, 0, 0, Math.PI * 2); g.stroke();
      return;
    }
    g.fillStyle = "#e11d48"; g.fillRect(Math.round(bx - u), Math.round(by - u), Math.round(2 * u), Math.round(u));
    g.fillStyle = "#f8fafc"; g.fillRect(Math.round(bx - u), Math.round(by), Math.round(2 * u), Math.round(u));
  }
}

// ---------------------------------------------------------------- input: F / Space / Enter / a click reel in, Esc leaves
const onPond = (e) => !!(e.target && e.target.closest && e.target.closest(".px-pond"));
holdAquarium((e) => !!game || (e.type === "keydown" && /^f$/i.test(e.key)) || onPond(e));
window.addEventListener("keydown", (e) => {
  if (!W.aquarium || e.repeat) return;
  if (!game) { if (/^f$/i.test(e.key)) startFishing(); return; }
  if (e.key === "Escape") { stopFishing(); setAquarium(false); return; }
  if (/^(f| |Enter)$/i.test(e.key)) { e.preventDefault(); press(); return; }
  stopFishing(); setAquarium(false);
});
window.addEventListener("pointerdown", (e) => {
  if (!W.aquarium) return;
  if (!game) { if (onPond(e)) startFishing(); return; }
  press();
});
window.addEventListener("wheel", () => { if (game) { stopFishing(); setAquarium(false); } }, { passive: true });

// QA: what is going on, and a bite right now
export const fishing = { get state() { return game ? game.state : null; }, bite() { if (game && game.state === "wait") game.until = 0; }, reel };

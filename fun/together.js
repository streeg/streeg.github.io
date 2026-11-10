// The dev and the cats together: the feather wand, a cat in his lap at the end of the day,
// and the coffee mug the cat knocks off while he codes.
import { t, now, rand, clamp, unit, bubble } from "./util.js";
import { W, api, emit, layer, prop, moveProp, wait, walk, act, launch, landed, jumpTo, addSystem } from "./world.js";
import { me, freeCat, roomFor, addScene } from "./me.js";
import { petFeed } from "./pets.js";
import { toSvg } from "./art/core.js";
import { PROPS } from "./art/props.js";
import { unlock } from "./achv.js";

const evening = () => { const h = new Date().getHours(); return h >= 18 && h < 23; };

// ---------------------------------------------------------------- the feather wand: he dangles it, the cat jumps for the feather
function sceneWand() {
  const u = unit(), c = freeCat();
  if (!c) return;
  let wand = null;
  // where the feather is (it swings between two spots), and where the stick sits in his raised hand
  const tip = () => (wand ? { x: wand.x + (wand.i ? 12.5 : 15.5) * u, y: wand.y + 8 * u } : null);   // the wand art is framed (+1 all round)
  const grip = () => ({ x: me.x + 29 * u, y: me.y + 4 * u });
  const jumps = (n) => Array.from({ length: n }, () => [
    walk(() => { const p = tip(); return p ? p.x - c.w / 2 : null; }, 160),
    act(() => { c.face = 1; }),
    wait(rand(350, 700), "sit"),
    act(() => { const p = tip(); if (!p) return "stop"; launch(c, clamp(p.x - c.w / 2 + rand(-6, 6), 4, c.maxX()), p.y - c.h * 0.4, 0.42); }),
    landed(),
    wait(rand(300, 600), "sit"),
  ]).flat();
  me.queue.push(
    walk(() => roomFor(me, 16 * u + 60), 60),
    wait(rand(8000, 10000), "point", (a) => {
      a.face = 1;
      if (wand) { const g = grip(); moveProp(wand, g.x, g.y); }
    }, (a) => {
      a.face = 1;
      const g = grip();
      wand = prop(["wand1", "wand2"], g.x, { y: g.y, every: 450, quiet: true, front: true, keep: () => me.base === "point" && !W.ko });
      a.say(bubble(t("together.wand"), "cat"), 1800);
      c.interrupt([
        ...jumps(4),
        act(() => { petFeed(c, "fun", 25); c.pop("heart"); me.say(bubble(t("together.wandEnd"), "heart"), 1800); }),
        wait(1500, "sit"),
      ]);
    }));
}

// ---------------------------------------------------------------- a cat in his lap (mostly in the evening)
function sceneLap() {
  const u = unit(), c = freeCat();
  if (!c) return;
  // the cat curls up against him, facing right (its body is drawn a little off-centre in the frame)
  const lap = (a) => (me.base.startsWith("lap") && !me.locked ? { x: me.x + (a.face < 0 ? 8 : 3) * u, y: me.y + me.h - a.h - u } : null);
  me.queue.push(
    walk(() => clamp(me.x, 40, innerWidth - me.w - 40), 50),
    wait(rand(11000, 14000), "lap1", (a) => {
      a.setFrame(now() % 3000 < 2200 ? "lap2" : "lap1");
      if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.pop("heart"); a.nextTalk = now() + rand(2200, 3200); }
    }, (a) => {
      a.nextTalk = 0;
      c.interrupt([
        walk(() => me.x + (c.cx() < me.cx() ? -c.w - 10 : me.w + 10), 90),
        wait(400, "sit"),
        jumpTo(lap, 0.5),
        act(() => {
          if (c.mode !== "perch") return "stop";
          c.face = 1;
          const p = lap(c); c.x = p.x; c.y = p.y;
          unlock("lap");
          petFeed(c, "energy", 20);
          c.say(bubble("prrr", "heart"), 1600);
          me.say(bubble(t("together.lap").replace("{name}", c.name), "heart"), 2200);
        }),
        wait(20000, "sleep"),
      ]);
    }));
}

// ---------------------------------------------------------------- the coffee: he codes, the cat paws the mug off, the mug falls
function knockMug(c) {
  const u = unit();
  const pw = PROPS.puddle[0].length * u, ph = PROPS.puddle.length * u;
  const puddle = prop(["puddle"], me.x + 27 * u, { quiet: true, keep: () => /^(code|meet|doze)/.test(me.base) && !W.ko });
  puddle.el.style.opacity = "0";
  // the mug falls from where it stood (next to the laptop) and ends up lying on its side in the puddle
  const mug = document.createElement("div");
  mug.className = "px-mug";
  mug.innerHTML = toSvg(PROPS.mug);
  const mw = PROPS.mug[0].length * u, mh = PROPS.mug.length * u;
  mug.style.width = mw + "px"; mug.style.height = mh + "px";
  puddle.el.append(mug);
  const sx = me.x + 26 * u - puddle.x, sy = me.y + 27 * u - puddle.y, ex = pw / 2 - mw / 2, ey = ph - mh;
  const anim = mug.animate([
    { transform: `translate(${sx}px, ${sy}px) rotate(0deg)` },
    { transform: `translate(${sx + 8 * u}px, ${sy - 3 * u}px) rotate(40deg)`, offset: 0.3 },
    { transform: `translate(${ex}px, ${ey}px) rotate(90deg)` },
  ], { duration: 520, easing: "cubic-bezier(.5,0,1,.6)", fill: "forwards" });
  anim.onfinish = () => { puddle.el.style.opacity = ""; };
  me.emoteFor("held", 900);
  me.say(bubble(t("together.spill").replace("{name}", c.name), "skull"), 2000);
  unlock("spill");
}
// the poses with the mug on the desk; after it falls he codes without it (me.noMug)
const MUG_POSES = ["code", "code2", "doze", "meet1", "meet2"];
const hasMug = () => !me.noMug && me.mode === "ground" && !me.locked && MUG_POSES.includes(me.base);
// the laser (laser.js) asks whether the dot is on the mug, and has the cat knock it off
api.mugAt = (x, y) => {
  if (!hasMug()) return false;
  const u = unit(), lx = me.face < 0 ? me.x + me.w - (x - me.x) : x;   // the frame is mirrored when he faces left
  return lx > me.x + 25 * u && lx < me.x + 33 * u && y > me.y + 25 * u && y < me.y + 34 * u;
};
api.knockMug = (c) => { if (!hasMug()) return; me.noMug = true; knockMug(c); };
addSystem(() => { if (me.noMug && !/^(code|meet|doze)/.test(me.base)) me.noMug = false; }, 61);

// Java's logo is a cup of coffee: a cat that swats the Java tile in the stack (with the laser, or knocking tiles
// off) spills it. A mug falls from the tile to the floor and leaves a puddle. (Lud's idea.)
api.isJava = (el) => !!el && el.classList && el.classList.contains("tech") && !!el.querySelector("span") && el.querySelector("span").textContent.trim() === "Java";
let javaCool = 0;
api.javaSpill = (tile, c) => {
  if (now() < javaCool || W.ko) return;
  javaCool = now() + 8000;
  const u = unit(), r = tile.getBoundingClientRect(), mw = PROPS.mug[0].length * u, mh = PROPS.mug.length * u;
  const x = r.left + r.width / 2 - mw / 2, floorY = innerHeight - mh - 2;
  const puddle = prop(["puddle"], r.left + r.width / 2 - (PROPS.puddle[0].length * u) / 2, { quiet: true, keep: () => now() < javaCool - 2000 && !W.ko });
  puddle.el.style.opacity = "0";
  const mug = document.createElement("div");
  mug.className = "px-catch";
  mug.innerHTML = toSvg(PROPS.mug);
  mug.style.width = mw + "px"; mug.style.height = mh + "px";
  layer.append(mug);
  const anim = mug.animate([
    { transform: `translate(${x}px, ${r.top - mh}px) rotate(0deg)` },
    { transform: `translate(${x + 10 * u}px, ${r.top - mh - 6 * u}px) rotate(60deg)`, offset: 0.2 },
    { transform: `translate(${x + 14 * u}px, ${floorY}px) rotate(90deg)` },
  ], { duration: 900, easing: "cubic-bezier(.5,0,1,.6)", fill: "forwards" });
  anim.onfinish = () => { puddle.el.style.opacity = ""; emit("sfx", "drop"); setTimeout(() => mug.remove(), 4000); };
  if (!me.locked) { me.face = r.left + r.width / 2 > me.cx() ? 1 : -1; me.emoteFor("held", 900); me.say(bubble(t("together.javaSpill").replace("{name}", c ? c.name : ""), "coffee"), 2400); }
  unlock("spill");
};

function sceneSpill() {
  const u = unit(), c = freeCat();
  if (!c) return;
  me.queue.push(
    walk(() => roomFor(me, 34 * u), 60),
    wait(rand(12000, 15000), "code", (a) => {
      const tap = Math.floor(now() / 170) % 2;
      a.setFrame(me.noMug ? (tap ? "codeN" : "code2N") : (tap ? "code" : "code2"));
    }, (a) => {
      a.face = 1;
      c.interrupt([
        wait(1800, "sit"),
        walk(() => me.x + 30 * u, 70),   // the mug stands at the right of the laptop
        act(() => { c.face = -1; }),
        wait(900, "sit"), wait(260, "paw"), wait(450, "sit"), wait(260, "paw"),
        act(() => { if (!me.base.startsWith("code") || me.noMug) return "stop"; me.noMug = true; knockMug(c); }),
        walk(() => (me.cx() < innerWidth / 2 ? c.maxX() : 4), 280),
        wait(1500, "sit"),
        act(() => c.say(bubble("mrrp?", "cat"), 1500)),
        wait(2000, "sit"),
        act(() => { if (me.noMug && me.base.startsWith("code")) me.say(bubble(t("together.spillAfter"), "coffee"), 2200); }),
      ]);
    }));
}

addScene("wand", sceneWand, { weight: () => (freeCat() ? 0.8 : 0) });
addScene("lap", sceneLap, { weight: () => (freeCat() ? (evening() ? 2.5 : 0.4) : 0) });
addScene("spill", sceneSpill, { weight: () => (freeCat() ? 0.5 : 0) });

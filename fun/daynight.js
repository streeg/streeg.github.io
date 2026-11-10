// Day and night along the floor, by the visitor's clock: a soft horizon glow behind the friends (orange at dawn,
// pink at dusk, deep blue at night), a patch of sunlight on the floor that moves through the day (the cats like
// to nap in it), stars and fireflies at night, now and then a shooting star you can click to make a wish, and
// a rainbow after the rain.
import { t, now, rand, unit, hourNow, reduced, bubble } from "./util.js";
import { W, api, emit, layer, addSystem, wait, walk } from "./world.js";
import { me } from "./me.js";
import { addSkyLayer, effWeather } from "./seasons.js";
import { phase, daylight } from "./clock.js";
import { unlock } from "./achv.js";

const horizon = document.createElement("div");
horizon.className = "px-horizon";
layer.insertBefore(horizon, layer.firstChild);
const sunspot = document.createElement("div");
sunspot.className = "px-sunspot";
layer.insertBefore(sunspot, horizon.nextSibling);

// ---------------------------------------------------------------- the sun spot: where the cats nap in the daytime
function placeSun() {
  const h = hourNow(), day = daylight() > 0.6 && effWeather() !== "chuva";
  sunspot.hidden = !day;
  if (!day) { W.sunX = null; return; }
  W.sunX = innerWidth * (0.1 + 0.8 * Math.min(1, Math.max(0, (h - 7) / 11)));   // left in the morning, right in the evening
  sunspot.style.transform = `translateX(${Math.round(W.sunX - 70)}px)`;
}

// ---------------------------------------------------------------- night: stars low over the floor, fireflies
let stars = [], flies = [];
const night = () => daylight() < 0.35;
addSkyLayer({
  active: () => night() && !reduced(),
  draw(g, dt, ts) {
    const H = innerHeight, u = unit();
    if (!stars.length || stars.w !== innerWidth || stars.aq !== !!W.aquarium) {
      stars = Array.from({ length: W.aquarium ? 70 : 26 }, () => ({ x: rand(0, innerWidth), y: W.aquarium ? rand(20, H * 0.75) : H - rand(60, 220) * (u / 2.5), p: rand(0, 6.28), s: rand(1, 2.2) }));
      stars.w = innerWidth; stars.aq = !!W.aquarium;
    }
    for (const s of stars) {
      g.globalAlpha = 0.25 + 0.35 * (Math.sin(ts / 900 + s.p) + 1) / 2;
      g.fillStyle = "#fef9c3"; g.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }
    while (flies.length < 7) flies.push({ x: rand(0, innerWidth), y: H - rand(20, 120), vx: rand(-20, 20), vy: rand(-10, 10), p: rand(0, 6.28) });
    for (const f of flies) {
      f.vx += rand(-30, 30) * dt; f.vy += rand(-30, 30) * dt;
      f.vx = Math.max(-28, Math.min(28, f.vx)); f.vy = Math.max(-16, Math.min(16, f.vy));
      f.x = (f.x + f.vx * dt + innerWidth) % innerWidth; f.y = Math.min(H - 12, Math.max(H - 160, f.y + f.vy * dt));
      const glow = (Math.sin(ts / 400 + f.p) + 1) / 2;
      g.globalAlpha = 0.25 + 0.75 * glow;
      g.fillStyle = "#d9f99d"; g.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
      g.globalAlpha = 0.18 * glow; g.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 6, 6);
    }
    g.globalAlpha = 1;
  },
});

// ---------------------------------------------------------------- a rainbow after the rain
let rainbowUntil = 0, wasRain = false;
addSkyLayer({
  active: () => now() < rainbowUntil,
  draw(g) {
    const k = Math.min(1, (rainbowUntil - now()) / 4000), cx = innerWidth * 0.78, cy = innerHeight + 40, r0 = Math.min(innerWidth * 0.32, 420);
    ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"].forEach((c, i) => {
      g.strokeStyle = c; g.globalAlpha = 0.22 * k; g.lineWidth = 8;
      g.beginPath(); g.arc(cx, cy, r0 - i * 8, Math.PI, 2 * Math.PI); g.stroke();
    });
    g.globalAlpha = 1;
  },
});

// ---------------------------------------------------------------- a shooting star (click it to make a wish)
let starCool = now() + rand(20000, 40000);
export function shootingStar() {
  if (W.ko || layer.hidden) return;
  const el = document.createElement("button");
  el.type = "button"; el.tabIndex = -1;
  el.className = "px-shooting";
  layer.append(el);
  const x0 = rand(innerWidth * 0.35, innerWidth * 0.9), y0 = innerHeight - rand(260, 420), dx = -rand(220, 340), dy = rand(90, 140);
  const anim = el.animate([
    { transform: `translate(${x0}px, ${y0}px) rotate(${Math.atan2(dy, dx)}rad)`, opacity: 0 },
    { opacity: 1, offset: 0.15 },
    { transform: `translate(${x0 + dx}px, ${y0 + dy}px) rotate(${Math.atan2(dy, dx)}rad)`, opacity: 0 },
  ], { duration: 2400, easing: "ease-in" });
  anim.onfinish = () => el.remove();
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    el.remove();
    unlock("wish");
    emit("sfx", "wish");
    if (!me.locked) { me.emoteFor("held", 1200); me.say(bubble(t("sky.wish"), "star"), 2600); }
  });
}

// ---------------------------------------------------------------- every frame
let last = "";
addSystem(() => {
  const p = phase(), rain = effWeather() === "chuva";
  if (p !== last) { last = p; horizon.dataset.phase = p; }
  placeSun();
  if (wasRain && !rain && daylight() > 0.4) { rainbowUntil = now() + 25000; if (!me.locked) me.say(bubble(t("sky.rainbow"), "star"), 2200); }
  wasRain = rain;
  if (night() && now() > starCool && !reduced() && !W.calm) { starCool = now() + rand(45000, 90000); if (Math.random() < 0.6) shootingStar(); }
}, 35);
// a cat looking for a warm spot: the sun on the floor (see cats.js)
api.catNap = (c) => (W.sunX != null && !sunspot.hidden ? [walk(() => W.sunX - c.w / 2, 70), wait(rand(12000, 20000), "sleep")] : null);

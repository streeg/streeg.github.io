// The weather outside, felt inside: puddles on the floor while it rains (and lightning when the real sky over
// Brasília has a thunderstorm), the dev holding an umbrella over the cat, and on hot days a fan and a popsicle.
// Now and then he mentions the real weather.
import { t, now, rand, pick, unit, reduced, bubble } from "./util.js";
import { W, emit, prop, moveProp, wait, walk, act } from "./world.js";
import { me, freeCat, roomFor, addScene, addLineHook } from "./me.js";
import { addSkyLayer, effWeather, weatherAuto } from "./seasons.js";
import { realKind, realWx } from "./forecast.js";
import { isDay } from "./clock.js";
import { UMBRELLA, UMBRELLA_GRIP, FAN } from "./art/life.js";

const raining = () => effWeather() === "chuva";
const stormy = () => raining() && weatherAuto() && realKind() === "storm";
const hot = () => weatherAuto() && realKind() === "hot" && isDay();

// ---------------------------------------------------------------- puddles and lightning
const PUDDLES = [0.16, 0.39, 0.57, 0.86];
let wet = 0, ripples = [], nextRipple = 0, flash = 0, nextFlash = now() + rand(6000, 12000);
addSkyLayer({
  active: () => !W.ko && (raining() || wet > 0.02 || flash > 0.01),
  draw(g, dt) {
    wet = raining() ? Math.min(1, wet + dt / 20) : Math.max(0, wet - dt / 60);
    const u = unit(), floorY = innerHeight - 3;
    // the puddles grow while it rains and dry out after
    g.fillStyle = "rgba(148,163,184,.42)";
    for (const k of PUDDLES) {
      const w = Math.round(18 * u * wet), x = Math.round(innerWidth * k - w / 2);
      if (w < 2) continue;
      g.fillRect(x + u, floorY - u, w - 2 * u, u);
      g.fillRect(x, floorY, w, u);
    }
    // drops landing in them
    if (raining() && !reduced() && now() > nextRipple && wet > 0.3) {
      nextRipple = now() + rand(150, 450);
      const k = pick(PUDDLES);
      ripples.push({ x: innerWidth * k + rand(-6, 6) * u * wet, r: 1, life: 1 });
    }
    g.strokeStyle = "rgba(203,213,225,.7)"; g.lineWidth = 1;
    ripples = ripples.filter((p) => {
      p.r += dt * 26; p.life -= dt * 1.6;
      g.globalAlpha = Math.max(0, p.life);
      g.beginPath(); g.ellipse(p.x, floorY, p.r * 2, p.r * 0.5, 0, 0, Math.PI * 2); g.stroke();
      return p.life > 0;
    });
    g.globalAlpha = 1;
    // a soft flash now and then in a real storm (never with reduced motion), then the thunder
    if (stormy() && !reduced() && now() > nextFlash) {
      nextFlash = now() + rand(9000, 22000);
      flash = 0.14;
      setTimeout(() => {
        emit("sfx", "thunder");
        const c = W.cat;
        if (c && c.mode === "ground" && c.base !== "sleep" && !W.ko) { c.pop("skull"); c.say(bubble(t("scared"), "cat"), 900); }
      }, rand(500, 1400));
    }
    if (flash > 0.01) { g.fillStyle = `rgba(241,245,249,${flash})`; g.fillRect(0, 0, innerWidth, innerHeight); flash *= Math.pow(0.02, dt); }
  },
});

// ---------------------------------------------------------------- the umbrella: he keeps the cat dry
function sceneUmbrella() {
  const u = unit(), c = freeCat();
  let umb = null;
  // the handle's bottom in his raised hand (the "wave" pose holds it at x 26, y 12)
  const at = () => ({ x: me.x + (26.5 - UMBRELLA_GRIP.x) * u, y: me.y + (12 - UMBRELLA_GRIP.y) * u });
  me.queue.push(
    walk(() => roomFor(me, 14 * u), 60),
    wait(rand(9000, 12000), "wave", (a) => {
      a.face = 1;
      if (umb) { const p = at(); moveProp(umb, p.x, p.y); }
    }, (a) => {
      a.face = 1;
      const p = at();
      umb = prop([UMBRELLA], p.x, { y: p.y, front: true, cls: "px-umbrella", keep: () => me.base === "wave" && !W.ko && raining() });
      a.say(bubble(c ? t("outside.umbrella").replace("{name}", c.name) : t("outside.umbrellaAlone"), "heart"), 2600);
      if (c) c.interrupt([walk(() => me.x + me.w - 4 * u, 120), act(() => { c.face = -1; c.pop("heart"); }), wait(rand(7000, 9000), "sit")]);
    }));
}
addScene("umbrella", sceneUmbrella, { weight: () => (raining() ? 3 : 0) });

// ---------------------------------------------------------------- a hot day: the fan and a popsicle (the cat lies flat in front of the fan)
function sceneHeat() {
  const u = unit(), c = freeCat(), fanW = FAN[0][0].length * u;
  me.queue.push(
    walk(() => roomFor(me, fanW + 20 * u), 60),
    wait(rand(10000, 13000), "pop1", (a) => { a.face = 1; a.setFrame(now() % 2200 < 1500 ? "pop1" : "pop2"); }, (a) => {
      a.face = 1;
      const fanX = me.x + me.w + u;
      prop(FAN, fanX, { every: 90, front: true, cls: "px-fan", keep: () => me.base.startsWith("pop") && !W.ko });
      const wx = realWx();
      a.say(bubble(wx && hot() ? t("outside.hot").replace("{t}", Math.round(wx.temp)) : t("outside.sunny"), "fire"), 2600);
      if (c) c.interrupt([walk(() => fanX + fanW + u, 110), act(() => { c.face = -1; }), wait(rand(8000, 10000), "sleep")]);
    }));
}
addScene("heat", sceneHeat, { weight: () => (hot() ? 2.5 : effWeather() === "sol" && isDay() ? 0.4 : 0) });

// ---------------------------------------------------------------- he mentions the real weather now and then
addLineHook(() => {
  const k = weatherAuto() && realKind(), wx = realWx();
  if (!k || !wx) return null;
  const text = t("outside.now." + k);
  return text ? [k === "hot" ? "fire" : k === "rain" || k === "storm" ? "cat" : "star", text.replace("{t}", Math.round(wx.temp))] : null;
});

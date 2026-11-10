// Seasons, holidays and weather, all switchable from the palette.
// Automatic: the holiday of the day when there is one (New Year, Carnival, Easter, Festa Junina, Halloween,
// Programmers' Day, Cat Day, Christmas from November on), otherwise the Brazilian season.
// Each one dresses the dev (and the cats, on holidays), may put something in the corner (a Christmas tree,
// a jack-o'-lantern, a bonfire) and in the sky (snow that piles up, rain, leaves, petals, confetti, fireworks,
// bats, a string of festa junina flags). At Easter three chocolate eggs hide on the page.
import { S, $, root, t, store, now, rand, pick, unit, reduced, bubble } from "./util.js";
import { W, layer, actors, prop, props, addSystem, on, emit, showFriends } from "./world.js";
import { me, addLineHook } from "./me.js";
import { burst } from "./ui.js";
import { HATS, CAT_HATS, PROPS } from "./art/props.js";
import { toSvg } from "./art/core.js";
import { unlock } from "./achv.js";
import { realKind, realWx } from "./forecast.js";
import { isDay } from "./clock.js";

// ---------------------------------------------------------------- the calendar
const HOLIDAYS = ["natal", "anonovo", "carnaval", "pascoa", "festajunina", "halloween", "programador", "diagato"];
const SEASONS = ["auto", ...HOLIDAYS, "verao", "outono", "inverno", "primavera"];
const WEATHERS = ["auto", "neve", "chuva", "sol", "folhas", "petalas", "confete", "limpo"];
let season = SEASONS.includes(store.get("px-season")) ? store.get("px-season") : "auto";
let weather = WEATHERS.includes(store.get("px-weather")) ? store.get("px-weather") : "auto";

// Easter Sunday (Gregorian computus); Carnival and Easter week are counted from it.
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
export function holidayOn(date) {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  const day0 = new Date(y, m, d), days = (a, b) => Math.round((a - b) / 864e5);
  if ((m === 11 && d === 31) || (m === 0 && d === 1)) return "anonovo";
  const toEaster = days(day0, easter(y));
  if (toEaster >= -50 && toEaster <= -46) return "carnaval";       // Saturday to Ash Wednesday
  if (toEaster >= -3 && toEaster <= 1) return "pascoa";             // Thursday to Monday
  if (m === 5) return "festajunina";
  if ((m === 9 && d >= 24) || (m === 10 && d <= 2)) return "halloween";
  if (days(day0, new Date(y, 0, 1)) + 1 === 256) return "programador";   // the 256th day of the year
  if ((m === 7 && d === 8) || (m === 1 && d === 17)) return "diagato";   // International Cat Day, and Cat Day in Brazil
  if (m >= 10) return "natal";
  return null;
}
function autoSeason() {
  const m = new Date().getMonth();
  return holidayOn(new Date()) || (m <= 1 ? "verao" : m <= 4 ? "outono" : m <= 7 ? "inverno" : "primavera");
}
export const effSeason = () => (season === "auto" ? autoSeason() : season);
const isHoliday = () => HOLIDAYS.includes(effSeason());
const WEATHER_OF = { natal: "neve", inverno: "neve", outono: "folhas", primavera: "petalas", verao: "sol", carnaval: "confete", programador: "confete", pascoa: "sol" };
// Automatic weather: real rain in Brasília always shows; otherwise a holiday keeps its own (snow at Christmas,
// confetti at Carnival), then the real sky (sun on a clear or hot day), and without it the season's.
const REAL_OF = { rain: "chuva", storm: "chuva", hot: "sol", clear: "sol", cloudy: "limpo", fog: "limpo" };
export const weatherAuto = () => weather === "auto";
export function effWeather() {
  if (weather !== "auto") return weather;
  const s = effSeason(), real = realKind();
  if (real === "rain" || real === "storm") return "chuva";
  if (isHoliday() && WEATHER_OF[s]) return WEATHER_OF[s];
  if (real) return REAL_OF[real] === "sol" && !isDay() ? "limpo" : REAL_OF[real];
  return WEATHER_OF[s] || "limpo";
}
const HAT_OF = { natal: "santa", inverno: "beanie", verao: "shades", primavera: "flower", anonovo: "party", carnaval: "mask", pascoa: "bunny", festajunina: "straw", halloween: "witch", programador: "party", diagato: "catears" };
const CAT_HAT_OF = { natal: "santa", anonovo: "party", programador: "party", halloween: "witch", festajunina: "straw", diagato: "crown" };
const DECOR_OF = { natal: { frames: ["tree1", "tree2"], every: 520 }, halloween: { frames: ["pumpkin1", "pumpkin2"], every: 380, cls: "px-glow" }, festajunina: { frames: ["fire1", "fire2"], every: 200, cls: "px-glow" } };

// ---------------------------------------------------------------- hats: over the head, wherever the head is in the frame
const headOf = {};
function headPos(a, f) {
  const key = a.kind + ":" + f;
  if (headOf[key]) return headOf[key];
  const rows = a.frames[f];
  let pos;
  if (a.kind === "me") pos = { x: f === "lie" ? 0 : 8, y: rows.findIndex((r) => r.includes("H")) };
  else {   // cats: centred on the ears (the first row with fur on the head side of the frame)
    const y = Math.max(0, rows.findIndex((r) => /b/.test(r.slice(13))));
    const row = rows[y] || "", first = row.indexOf("b", 13), last = row.lastIndexOf("b");
    pos = { x: Math.round((first + last) / 2) - 3, y };
  }
  return (headOf[key] = pos);
}
function hatFor(a) {
  const s = effSeason();
  // hats are framed (one pixel bigger all round): w is their full width, and they sit one pixel up and left
  if (a.kind === "me") { const h = HATS[HAT_OF[s]]; return h ? { rows: h.rows, dy: h.dy, w: h.rows[0].length } : null; }
  const rows = CAT_HATS[CAT_HAT_OF[s]];
  return rows ? { rows, dy: -(rows.length - 2), w: rows[0].length } : null;
}
function dress(a) {
  if (!a.hatEl) { a.hatEl = document.createElement("div"); a.hatEl.className = "px-hat"; a.el.append(a.hatEl); }
  const hat = hatFor(a);
  a.hat = hat;
  a.hatEl.innerHTML = hat ? toSvg(hat.rows) : "";
  a.hatEl.hidden = !hat;
  a.hatKey = "";
}
function placeHat(a) {
  if (!a.hat) return;
  const f = a.shown(), key = f + a.face;
  if (key === a.hatKey) return;
  a.hatKey = key;
  const u = unit(), hp = headPos(a, f), W0 = a.frames[f][0].length, x = a.face < 0 ? W0 - (hp.x - 1) - a.hat.w : hp.x - 1;
  a.hatEl.style.width = a.hat.w * u + "px";
  a.hatEl.style.transform = `translate(${x * u}px, ${(hp.y + a.hat.dy) * u}px)` + (a.face < 0 ? " scaleX(-1)" : "");
}
const wearsHats = (a) => a.kind === "me" || a.kind === "cat";
addSystem(() => actors.forEach((a) => { if (!wearsHats(a)) return; if (a.season !== effSeason()) { a.season = effSeason(); dress(a); } placeHat(a); }), 55);
on("resize", () => actors.forEach((a) => { a.hatKey = ""; }));

// a holiday line now and then, in between his usual ones
addLineHook(() => { const lines = isHoliday() && t("holiday." + effSeason()); return lines ? pick(lines) : null; });

// ---------------------------------------------------------------- the sky: a canvas behind everything
export const sky = document.createElement("canvas");
sky.className = "px-sky";
layer.insertBefore(sky, layer.firstChild);
let flakes = [], snowDepth = 0, decor = null, rockets = [], sparks = [], nextRocket = 0, bats = [];
const sizeSky = () => { sky.width = innerWidth; sky.height = innerHeight; };
sizeSky();
window.addEventListener("resize", sizeSky);
const SKY_N = { neve: 90, chuva: 110, folhas: 26, petalas: 30, confete: 60 };
const CONFETTI = ["#e11d48", "#facc15", "#38bdf8", "#4ade80", "#a78bfa", "#f97316"];
function newFlake(w, top) {
  return { x: rand(-20, innerWidth + 20), y: top ? rand(-innerHeight, 0) : -10, v: w === "chuva" ? rand(650, 850) : w === "neve" ? rand(35, 75) : rand(45, 80),
    ph: rand(0, 6.28), s: w === "neve" ? pick([2, 2, 3]) : 3,
    c: w === "folhas" ? pick(["#c2410c", "#d97706", "#92400e"]) : w === "petalas" ? pick(["#f9a8d4", "#fbcfe8", "#f472b6"]) : w === "confete" ? pick(CONFETTI) : "#fff" };
}
// New Year: rockets go up from the floor and burst into sparks
function fireworks(g, dt) {
  if (now() > nextRocket) {
    nextRocket = now() + rand(900, 2200);
    rockets.push({ x: rand(innerWidth * 0.15, innerWidth * 0.85), y: innerHeight, vy: -rand(520, 680), top: rand(90, innerHeight * 0.45), c: pick(CONFETTI) });
  }
  rockets = rockets.filter((r) => {
    r.y += r.vy * dt; r.vy += 260 * dt;
    g.fillStyle = r.c; g.fillRect(Math.round(r.x), Math.round(r.y), 2, 5);
    if (r.y > r.top && r.vy < -40) return true;
    emit("sfx", "firework");
    for (let i = 0; i < 34; i++) { const a = rand(0, 6.28), v = rand(50, 190); sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: r.c }); }
    return false;
  });
  sparks = sparks.filter((p) => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 110 * dt; p.life -= dt * 0.8;
    g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
    return p.life > 0;
  });
  g.globalAlpha = 1;
}
// Halloween: a few bats flap across the upper part of the window
const BAT = [["x.......x", "xx.xxx.xx", ".xxxxxxx.", "...x.x..."], ["...xxx...", ".xxxxxxx.", "xx..x..xx", "x.......x"]];
function flyBats(g, dt, ts) {
  while (bats.length < 4) bats.push({ x: rand(0, innerWidth), y: rand(90, innerHeight * 0.4), v: rand(50, 110) * pick([-1, 1]), ph: rand(0, 6.28) });
  g.fillStyle = "#7c3aed";
  for (const b of bats) {
    b.x += b.v * dt;
    if (b.x < -30) b.x = innerWidth + 20; else if (b.x > innerWidth + 30) b.x = -20;
    const y = b.y + Math.sin(ts / 500 + b.ph) * 14, art = BAT[Math.floor(ts / 160 + b.ph) % 2];
    art.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "x") g.fillRect(Math.round(b.x + i * 3), Math.round(y + j * 3), 3, 3); });
  }
}
// Festa junina: a string of little flags hanging under the top bar
function bunting(g, ts) {
  const nav = $("#nav"), top = (nav ? nav.getBoundingClientRect().bottom : 70) + 6, sag = 16, w = innerWidth;
  g.strokeStyle = "rgba(161,161,170,.8)"; g.lineWidth = 1; g.beginPath();
  for (let x = 0; x <= w; x += 8) { const y = top + sag * Math.sin((Math.PI * x) / w); x ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  for (let x = 10, i = 0; x < w - 6; x += 22, i++) {
    const y = top + sag * Math.sin((Math.PI * x) / w), sway = reduced() ? 0 : Math.sin(ts / 600 + i) * 1.5;
    g.fillStyle = CONFETTI[i % CONFETTI.length];
    g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.lineTo(x + sway, y + 12); g.closePath(); g.fill();
  }
}
let skyDrew = false;
// other features draw on the same sky (stars, fireflies, a rainbow): { active(): bool, draw(g, dt, ts) }
const skyLayers = [];
export const addSkyLayer = (l) => skyLayers.push(l);
function tickSky(dt, ts) {
  const w = effWeather(), s = effSeason(), g = sky.getContext("2d");
  const extras = s === "anonovo" || s === "halloween" || s === "festajunina" || skyLayers.some((l) => l.active());
  const draws = !W.ko && !layer.hidden && (w === "sol" || snowDepth > 0.5 || extras || (!reduced() && (SKY_N[w] || 0) > 0));
  if (!draws && !skyDrew) return;
  g.clearRect(0, 0, sky.width, sky.height);
  skyDrew = draws;
  if (!draws) return;
  if (w === "sol") {
    const grad = g.createRadialGradient(sky.width - 60, 80, 10, sky.width - 60, 80, 260);
    grad.addColorStop(0, "rgba(250,204,21,.22)"); grad.addColorStop(1, "rgba(250,204,21,0)");
    g.fillStyle = grad; g.fillRect(0, 0, sky.width, 360);
  }
  skyLayers.forEach((l) => { if (l.active()) l.draw(g, dt, ts); });
  if (s === "festajunina") bunting(g, ts);
  if (!reduced() && s === "anonovo") fireworks(g, dt);
  if (!reduced() && s === "halloween") flyBats(g, dt, ts);
  const n = reduced() ? 0 : SKY_N[w] || 0;
  if (flakes.length && flakes[0].w !== w) flakes = [];
  while (flakes.length < n) { const f = newFlake(w, true); f.w = w; flakes.push(f); }
  if (flakes.length > n) flakes.length = n;
  for (const f of flakes) {
    f.y += f.v * dt;
    if (w === "chuva") f.x += 160 * dt;
    else f.x += Math.sin(ts / 700 + f.ph) * (w === "neve" ? 14 : 34) * dt;
    if (f.y > innerHeight - snowDepth) {
      if (w === "neve") snowDepth = Math.min(7, snowDepth + 0.015);
      Object.assign(f, newFlake(w, false), { w });
    }
    if (w === "chuva") { g.strokeStyle = "rgba(148,163,184,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - 3, f.y - 12); g.stroke(); }
    else if (w === "confete") { g.fillStyle = f.c; g.fillRect(Math.round(f.x), Math.round(f.y), Math.sin(ts / 200 + f.ph) > 0 ? 4 : 2, 3); }
    else { g.fillStyle = f.c; g.globalAlpha = w === "neve" ? 0.85 : 1; g.fillRect(Math.round(f.x), Math.round(f.y), f.s, w === "neve" ? f.s : 2); g.globalAlpha = 1; }
  }
  if (w !== "neve") snowDepth = Math.max(0, snowDepth - dt * 0.4);
  if (snowDepth > 0.5) {
    g.fillStyle = "#f8fafc";
    const h = Math.round(snowDepth);
    for (let x = 0; x < sky.width; x += 6) { const bump = (Math.sin(x * 0.07) + 1) * 0.8; g.fillRect(x, innerHeight - h - Math.round(bump), 6, h + 2); }
  }
}
// the corner decoration of the season (Christmas tree, jack-o'-lantern, bonfire)
function tickDecor() {
  if (decor && !props.has(decor.pr)) decor = null;
  const want = DECOR_OF[effSeason()];
  if (decor && decor.season !== effSeason()) return;   // its keep() drops it next frame
  if (!want || decor || layer.hidden || W.ko) return;
  const u = unit(), w = PROPS[want.frames[0]][0].length * u, s = effSeason();
  decor = { season: s, pr: prop(want.frames, innerWidth - w - 12, { every: want.every, quiet: true, cls: want.cls, keep: () => effSeason() === s && !W.ko }) };
}

// ---------------------------------------------------------------- Easter: three chocolate eggs hidden on the page
const eggBox = document.createElement("div");
eggBox.className = "px-eggs";
eggBox.setAttribute("aria-hidden", "true");
document.body.append(eggBox);
const EGG_HOSTS = ".impact-card, .job, .tech, .project, .contact-card, .section-head h2";
let eggs = [], eggsFound = 0;
function placeEgg(e) {
  const host = document.querySelectorAll(EGG_HOSTS)[e.i];
  if (!host) { e.el.hidden = true; return; }
  const r = host.getBoundingClientRect(), u = unit();
  e.el.hidden = false;
  e.el.style.transform = `translate(${Math.round(r.left + scrollX + e.k * (r.width - 5 * u))}px, ${Math.round(r.top + scrollY - 6 * u + u)}px)`;
}
function hideEggs() {
  eggBox.textContent = ""; eggs = [];
  if (effSeason() !== "pascoa" || layer.hidden) return;
  const n = document.querySelectorAll(EGG_HOSTS).length, picked = new Set();
  while (picked.size < Math.min(3, n)) picked.add(Math.floor(rand(0, n)));
  eggsFound = 0;
  eggs = [...picked].map((i) => {
    const el = document.createElement("button");
    el.type = "button"; el.className = "px-egg"; el.tabIndex = -1;
    el.innerHTML = toSvg(PROPS.egg);
    const u = unit(); el.style.width = PROPS.egg[0].length * u + "px"; el.style.height = PROPS.egg.length * u + "px";
    eggBox.append(el);
    const e = { el, i, k: Math.random() };
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      el.remove(); eggs = eggs.filter((x) => x !== e); eggsFound++;
      burst(r.left + r.width / 2, r.top, ["#facc15", "#e11d48", "#7c2d12"], 14);
      emit("sfx", "collect");
      if (!me.locked) me.say(bubble(t(eggsFound >= 3 ? "holiday.eggsAll" : "holiday.eggFound").replace("{n}", eggsFound), "star"), 2200);
      if (eggsFound >= 3) unlock("eggs");
    });
    placeEgg(e);
    return e;
  });
}
const replaceEggs = () => eggs.forEach(placeEgg);
window.addEventListener("resize", replaceEggs);
document.addEventListener("site:lang", () => setTimeout(replaceEggs, 50));   // the cards were rendered again
on("hide", () => { eggBox.hidden = true; });
let eggSeason = null;
addSystem(() => {
  eggBox.hidden = layer.hidden;
  if (eggSeason !== effSeason()) { eggSeason = effSeason(); hideEggs(); }
}, 58);

// ---------------------------------------------------------------- palette
export const weatherName = () => {
  if (weather !== "auto") return t("weather." + weather);
  const wx = realWx();
  return `${t("weather.auto")} (${t("weather." + effWeather())}${wx ? ` · Brasília ${Math.round(wx.temp)}°C` : ""})`;
};
export const seasonName = () => (season === "auto" ? `${t("season.auto")} (${t("season." + effSeason())})` : t("season." + season));
export function cycleWeather() {
  weather = WEATHERS[(WEATHERS.indexOf(weather) + 1) % WEATHERS.length];
  store.set("px-weather", weather);
  flakes = [];
  showFriends();
  S.toast(t("cmds.weather").split("{v}")[0] + weatherName());
}
export function setSeason(next) {
  season = SEASONS.includes(next) ? next : "auto";
  store.set("px-season", season);
  root.dataset.season = effSeason();
  flakes = []; rockets = []; sparks = []; bats = [];
  showFriends();
  if (isHoliday() && !me.locked) { const lines = t("holiday." + effSeason()); if (lines) me.say(bubble(lines[0], "star"), 2600); }
}
export function cycleSeason() {
  setSeason(SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length]);
  S.toast(seasonName());
}
export const seasonList = () => SEASONS.slice();

root.dataset.season = effSeason();
addSystem((dt, ts) => { tickSky(dt, ts); tickDecor(); }, 50);

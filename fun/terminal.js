// A tiny pretend terminal (palette: "Terminal", or the ` key): ls, cat, whoami, neofetch, git, sudo…
// Some commands drive the friends (sudo make coffee, git blame, git push --force). Output is plain text only.
import { S, $, root, t, now, rand, typing, bubble } from "./util.js";
import { W, emit, wait, walk, act, jumpTo, hopDown, landed, showFriends, layer } from "./world.js";
import { toggleSound, soundName } from "./sound.js";
import { ludVisit } from "./lud.js";
import { setAquarium } from "./aquarium.js";
import { playScene } from "./me.js";
import { petState, CATS } from "./pets.js";
import { summonBug } from "./villains.js";
import { special } from "./special.js";
import { treatFromPalette } from "./toys.js";
import { dance } from "./scenes.js";
import { photo } from "./photo.js";
import { cycleWeather, cycleSeason, seasonName, weatherName } from "./seasons.js";
import { checkFlag } from "./ctf.js";
import { cardOpen } from "./ui.js";
import { unlock, achvCount, showAchievements } from "./achv.js";

const C = () => window.CONTENT[S.lang()], L = window.LINKS;
const pt = () => S.lang() === "pt";
const FILES = () => (pt()
  ? { "sobre.txt": "about", "contato.txt": "contact", "stack.txt": "stack", "projetos/": "dir", "gatos/": "dir" }
  : { "about.txt": "about", "contact.txt": "contact", "stack.txt": "stack", "projects/": "dir", "cats/": "dir" });
const started = now();
let box = null, out = null, input = null, history = [], hIdx = 0, back = null, idleTimer = 0;

// ---------------------------------------------------------------- output
function print(text, cls) {
  if (!out) return;   // the command closed the terminal
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = text;
  out.append(line);
  out.scrollTop = out.scrollHeight;
}
const lines = (list) => list.forEach((l) => print(l));
const bar = (v) => "█".repeat(Math.round(v / 10)).padEnd(10, "░") + " " + Math.round(v) + "%";
function catFile(info) {
  const q = petState[info.id];
  return [info.name, `${t("pet.food").padEnd(9)} ${bar(q.food)}`, `${t("pet.energy").padEnd(9)} ${bar(q.energy)}`, `${t("pet.fun").padEnd(9)} ${bar(q.fun)}`];
}
const catNames = () => Object.values(CATS).map((c) => c.id + ".txt");
const projects = () => ["riposte", "iped"];

// ---------------------------------------------------------------- commands
function readFile(path) {
  const f = path.replace(/^\.\//, "").replace(/^~\//, "");
  const files = FILES(), kind = files[f] || files[f + "/"];
  if (kind === "about") return [C().hero.sub];
  if (kind === "contact") return [`email     ${L.email}`, `linkedin  ${L.linkedin}`, `github    ${L.github}`];
  if (kind === "stack") return [window.STACK.map((s) => s.name).join(", ")];
  if (kind === "dir") return [t("term.isDir").replace("{f}", f)];
  if (f === ".segredo" || f === ".secret") return [t("term.secret")];
  const m = f.match(/^(?:gatos|cats)\/(\w+)\.txt$/);
  if (m) { const info = Object.values(CATS).find((c) => c.id === m[1]); if (info) return catFile(info); }
  const p = f.match(/^(?:projetos|projects)\/(\w+)\.txt$/);
  if (p && projects().includes(p[1])) { const pr = C().projects[p[1]]; return [pr.title, pr.body, L[p[1]] || ""].filter(Boolean); }
  return null;
}
function listDir(arg) {
  const all = arg === "-a" || arg === "-la";
  const dir = all ? "" : (arg || "").replace(/\/$/, "");
  if (dir === "gatos" || dir === "cats") return [catNames().join("  ")];
  if (dir === "projetos" || dir === "projects") return [projects().map((p) => p + ".txt").join("  ")];
  if (dir) return [t("term.noFile").replace("{f}", dir)];
  return [(all ? [".", "..", pt() ? ".segredo" : ".secret"] : []).concat(Object.keys(FILES())).join("  ")];
}
// the cat answers to `cat` with no file
function callCat() {
  const c = W.cat;
  if (!c || c.mode !== "ground" || c.leaving) return;
  showFriends();
  c.interrupt([walk(innerWidth / 2 - c.w / 2, 120), act(() => { c.pop("heart"); c.say(bubble(t("meow")[0], "cat"), 1500); }), wait(2000, "sit")]);
}
const uptime = () => { const s = Math.round((now() - started) / 1000); return `${Math.floor(s / 60)} min ${s % 60} s`; };
function neofetch() {
  const info = [
    ["guest@streeg.github.io", ""], ["-----------------------", ""],
    ["OS", "GitHub Pages"], ["Shell", "px-sh 1.0"], ["Uptime", uptime()],
    [t("term.theme"), t("term." + (root.getAttribute("data-theme") === "light" ? "light" : "dark"))], [t("term.season"), seasonName()], [t("term.weather"), weatherName()],
    [t("term.cats"), Object.values(CATS).map((c) => c.name).join(", ")], [t("achv.title"), achvCount()],
  ];
  const art = ["  /\\_/\\  ", " ( o.o ) ", "  > ^ <  ", "         ", "         "];
  return info.map(([k, v], i) => (art[i] || "         ") + "  " + (v ? `${k}: ${v}` : k));
}
const leave = (fn) => { close(); setTimeout(fn, 120); };
function git(args) {
  const sub = args[0] || "";
  if (sub === "status") return t("term.gitStatus");
  if (sub === "log") {
    if (/2009|legacy|legado/.test(args.join(" "))) { leave(() => summonBug("legacy", null, true)); return [t("term.legacy")]; }
    return t("term.gitLog");
  }
  if (sub === "blame") { leave(() => summonBug("bug", null, true)); return [t("term.blame")]; }
  if (sub === "merge") { leave(() => summonBug("conflict", null, true)); return [t("term.merge")]; }
  if (sub === "checkout" && /legacy|legado/.test(args[1] || "")) { leave(() => summonBug("legacy", null, true)); return [t("term.legacy")]; }
  if (sub === "push" && args.includes("--force")) { leave(special); return [t("term.forcePush")]; }
  return [t("term.gitUnknown").replace("{c}", sub)];
}
function sudo(args) {
  unlock("sudo");
  const cmd = args.join(" ");
  if (/^make (me a )?(coffee|cafe|café)/.test(cmd)) { leave(() => { showFriends(); playScene("coffee"); }); return [t("term.brewing")]; }
  if (/^rm -rf \/?\*?$/.test(cmd)) { leave(special); return [t("term.rmrf")]; }
  return [t("term.sudo").replace("{cat}", (W.cat && W.cat.name) || "Capitu")];
}
const COMMANDS = {
  help: () => t("term.help"),
  ls: (a) => listDir(a[0]),
  cat: (a) => {
    if (!a.length) { callCat(); return [t("term.catCalled")]; }
    return a.flatMap((f) => readFile(f) || [t("term.noFile").replace("{f}", f)]);
  },
  whoami: () => ["guest"],
  pwd: () => ["/home/guest"],
  date: () => [new Date().toLocaleString(pt() ? "pt-BR" : "en")],
  echo: (a) => [a.join(" ")],
  uptime: () => [uptime()],
  history: () => history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`),
  neofetch,
  git,
  sudo,
  rm: () => [t("term.permission")],
  ping: () => ["pong"],
  ssh: (a) => { if ((a[0] || "").toLowerCase().replace(/^.*@/, "") === "lud") { leave(ludVisit); return [t("term.sshLud")]; } return [`ssh: connect to host ${a[0] || "?"} port 22: Connection refused`]; },
  aquarium: () => { leave(() => setAquarium(true)); return []; },
  sound: (a) => { toggleSound(a[0] === "on" ? true : a[0] === "off" ? false : undefined); return [soundName()]; },
  theme: () => { $("#toggle-theme").click(); return [t("term." + (root.getAttribute("data-theme") === "light" ? "light" : "dark"))]; },
  lang: () => { leave(() => $("#toggle-lang").click()); return []; },
  pets: () => Object.values(CATS).flatMap(catFile),
  treat: () => { treatFromPalette(); return ["🐟"]; },
  coffee: () => { leave(() => { showFriends(); playScene("coffee"); }); return [t("term.brewing")]; },
  dance: () => { showFriends(); dance(); return ["♪ ♪"]; },
  photo: () => { leave(photo); return []; },
  weather: () => { cycleWeather(); return [weatherName()]; },
  season: () => { cycleSeason(); return [seasonName()]; },
  achievements: () => { leave(showAchievements); return []; },
  special: () => { leave(special); return []; },
  play: () => { leave(() => { const g = $("#game-stage"); if (g) { g.scrollIntoView({ block: "center" }); g.focus({ preventScroll: true }); } }); return []; },
  flag: (a) => { checkFlag(a.join(" ")); return []; },
  clear: () => { out.textContent = ""; return []; },
  exit: () => { close(); return []; },
};
const ALIAS = { aquario: "aquarium", "aquário": "aquarium", som: "sound", ajuda: "help", gatos: "pets", petisco: "treat", cafe: "coffee", "café": "coffee", foto: "photo", clima: "weather", estacao: "season", "estação": "season",
  conquistas: "achievements", jogar: "play", sair: "exit", quit: "exit", tema: "theme", idioma: "lang", cls: "clear", dir: "ls" };

function run(raw) {
  const line = raw.trim();
  print("$ " + line, "px-term-cmd");
  if (!line) return;
  history.push(line); hIdx = history.length;
  unlock("terminal");
  const [name, ...args] = line.split(/\s+/);
  const key = ALIAS[name.toLowerCase()] || name.toLowerCase();
  const fn = Object.prototype.hasOwnProperty.call(COMMANDS, key) ? COMMANDS[key] : null;
  if (!fn) { print(t("term.notFound").replace("{c}", name), "px-term-err"); emit("sfx", "beep"); return; }
  const res = fn(args);
  if (Array.isArray(res)) lines(res);
}
function complete() {
  const v = input.value, parts = v.split(" ");
  const word = parts[parts.length - 1];
  const pool = parts.length === 1 ? Object.keys(COMMANDS) : Object.keys(FILES()).concat(catNames().map((c) => (pt() ? "gatos/" : "cats/") + c), projects().map((p) => (pt() ? "projetos/" : "projects/") + p + ".txt"));
  const hits = pool.filter((p) => p.startsWith(word));
  if (hits.length === 1) { parts[parts.length - 1] = hits[0] + (parts.length === 1 ? " " : ""); input.value = parts.join(" "); }
  else if (hits.length > 1) print(hits.join("  "));
}

// ---------------------------------------------------------------- the cat walks on the keyboard (once per visit)
function catOnKeyboard() {
  const c = W.cat;
  let done = false;
  try { done = sessionStorage.getItem("px-keyboard") === "1"; } catch (e) { /* storage unavailable */ }
  if (done || !box || !c || c.mode !== "ground" || c.leaving || layer.hidden) return;
  try { sessionStorage.setItem("px-keyboard", "1"); } catch (e) { /* storage unavailable */ }
  const perch = (a) => { if (!box) return null; const r = box.getBoundingClientRect(); return { x: r.left + r.width * 0.7 - a.w / 2, y: r.top - a.h + 2 }; };
  c.interrupt([
    walk(() => { const p = perch(c); return p ? p.x - 60 : null; }, 110),
    jumpTo(perch, 0.55),
    act(() => {
      if (c.mode !== "perch" || !box) return "stop";
      const keys = "asdfjkl;ç~´", typed = [...Array(9)].map(() => keys[Math.floor(rand(0, keys.length))]).join("");
      [...typed].forEach((ch, i) => setTimeout(() => { if (input) input.value += ch; }, 90 * i));
      setTimeout(() => { if (box) print(t("term.catWalked").replace("{name}", c.name), "px-term-dim"); }, 900);
      c.say(bubble("mrrp", "cat"), 1400);
    }),
    wait(2600, "sit"),
    hopDown(rand(-80, 80)), landed(),
  ]);
}

// ---------------------------------------------------------------- open / close
export function open() {
  if (box || W.ko || cardOpen()) return;
  back = document.activeElement;
  box = document.createElement("div");
  box.className = "px-term";
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", t("term.title"));
  box.innerHTML = '<div class="px-term-bar"><span></span><button type="button" class="px-term-x"></button></div><div class="px-term-out" role="log"></div>' +
    '<form class="px-term-line"><label for="px-term-in">$</label><input id="px-term-in" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"></form>';
  box.querySelector(".px-term-bar span").textContent = "guest@streeg.github.io: ~";
  const x = box.querySelector(".px-term-x");
  x.textContent = "×"; x.setAttribute("aria-label", t("term.close"));
  x.addEventListener("click", close);
  out = box.querySelector(".px-term-out");
  input = box.querySelector("input");
  box.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; run(v); });
  box.addEventListener("keydown", (e) => {
    clearTimeout(idleTimer); idleTimer = setTimeout(catOnKeyboard, 9000);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab" && document.activeElement === input && input.value) { e.preventDefault(); complete(); }
    else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === input ? x : input).focus(); }
    else if (e.key === "ArrowUp" && history.length) { e.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx] || ""; }
    else if (e.key === "ArrowDown" && history.length) { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ""; }
    else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); out.textContent = ""; }
  });
  box.addEventListener("click", (e) => { if (e.target === out || e.target === box) input.focus(); });
  document.body.append(box);
  S.pageRegions().forEach((el) => el.setAttribute("inert", ""));
  lines(t("term.welcome"));
  input.focus();
  idleTimer = setTimeout(catOnKeyboard, 9000);
}
export function close() {
  if (!box) return;
  clearTimeout(idleTimer);
  box.remove(); box = null; out = null; input = null;
  S.pageRegions().forEach((el) => el.removeAttribute("inert"));
  if (back && document.contains(back)) back.focus({ preventScroll: true });
}
export const terminalOpen = () => !!box;

// the key left of 1 (` on US keyboards, ' on Brazilian ones) opens it, like the consoles in old games
window.addEventListener("keydown", (e) => {
  if ((e.code !== "Backquote" && e.key !== "`") || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing() || S.paletteOpen() || cardOpen() || box) return;
  e.preventDefault();
  open();
});

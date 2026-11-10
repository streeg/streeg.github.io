// Boot: loads every feature, adds their commands to the palette, and lets the friends in.
import { S, root, t, store, reduced } from "./util.js";
import { W, actors, layer, wait, walk, act, start, togglePets, showFriends } from "./world.js";
import { me, nextLine, playScene, addLineHook } from "./me.js";
import { showAchievements, achvCount, hintLine } from "./achv.js";
import { showPets } from "./pets.js";
import { dance } from "./scenes.js";
import { spawnCat } from "./cats.js";
import { treatFromPalette, rewindYarn } from "./toys.js";
import { summonBug, spawnTiny, issue } from "./villains.js";
import { special } from "./special.js";
import { cycleWeather, cycleSeason, weatherName, seasonName, setSeason, holidayOn } from "./seasons.js";
import { photo } from "./photo.js";
import { checkFlag } from "./ctf.js";
import { petState } from "./pets.js";
import { ropePoints, ROPE } from "./toys.js";
import { open as openTerminal } from "./terminal.js";
import { shareCard } from "./share.js";
import { toggleSound, soundOn } from "./sound.js";
import "./together.js";
import "./catreact.js";
import "./reactions.js";

// now and then the dev gives a tip for an achievement you have not found yet
addLineHook(hintLine);

// ---------------------------------------------------------------- palette commands
const cleanLitter = () => { showFriends(); playScene("litter"); };
S.addCommands((raw) => {
  const c = t("cmds");
  return [
    ...(/^flag\{.+\}$/i.test(raw) ? [{ k: raw.toLowerCase(), label: `${c.flag}: ${raw}`, icon: "game", run: () => checkFlag(raw), first: true }] : []),
    { k: "special attack ataque energia", label: c.special, icon: "game", run: special },
    { k: "pets friends cats", label: c.friends, icon: "game", run: togglePets },
    { k: "treat fish petisco peixe", label: c.treat, icon: "game", run: treatFromPalette },
    { k: "yarn rewind novelo enrolar linha", label: c.rewind, icon: "game", run: rewindYarn },
    { k: "issue bug report vilao villain", label: c.issue, icon: "game", run: issue },
    { k: "pets cats gatos status fome", label: c.pets, icon: "game", run: showPets },
    { k: "litter caixa areia limpar clean", label: c.litter, icon: "game", run: cleanLitter },
    { k: "photo foto camera print", label: c.photo, icon: "game", run: photo },
    { k: "weather clima tempo neve chuva sol", label: c.weather.replace("{v}", weatherName()), icon: "sun", run: cycleWeather },
    { k: "season estacao natal inverno verao", label: c.season.replace("{v}", seasonName()), icon: "sun", run: cycleSeason },
    { k: "music dance musica danca", label: c.music, icon: "game", run: () => { showFriends(); dance(); } },
    { k: "achievements conquistas trophy", label: `${c.achievements} (${achvCount()})`, icon: "game", run: showAchievements },
    { k: "share compartilhar conquistas achievements", label: c.share, icon: "game", run: shareCard },
    { k: "terminal console shell bash", label: c.terminal, icon: "game", run: openTerminal },
    { k: "sound som audio 8-bit musica music", label: c.sound.replace("{v}", t(soundOn() ? "sound.on" : "sound.off")), icon: "game", run: () => toggleSound() },
  ];
});

// QA only: /?pxdebug exposes the scenes and the villains so each can be checked without waiting for the dice.
if (/[?&]pxdebug\b/.test(location.search)) {
  window.PXDEBUG = { W, me, summonBug, spawnTiny, petState, setSeason, holidayOn, openTerminal, ROPE, get rope() { return ropePoints(); }, scene: (name, ...a) => playScene(name, ...a) };
}

// ---------------------------------------------------------------- the friends come in
me.x = Math.round(innerWidth * 0.06);
spawnCat(root.getAttribute("data-theme") === "light" ? "light" : "dark", false);
if (store.get("pets") === "off") layer.hidden = true;
let greeted = false;
try { greeted = sessionStorage.getItem("px-hi") === "1"; sessionStorage.setItem("px-hi", "1"); } catch (e) { /* storage unavailable */ }
if (!greeted && !reduced()) {
  const target = me.x;
  me.x = -me.w - 10;
  me.interrupt([wait(900, "idle"), walk(target, 70), act(() => { me.face = 1; me.emoteFor("wave", 1500); me.say(nextLine(), 3000); }), wait(1800, "idle")]);
}
actors.forEach((a) => a.draw());
start();

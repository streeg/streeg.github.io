// The little scenes on the floor (Castaway-style): games, food, books, music, coffee, TV, cooking, the daily, chores.
// Each one is registered with addScene; the dev's brain picks them at random (or the palette asks for one).
import { t, now, rand, pick, clamp, unit, bubble } from "./util.js";
import { W, prop, props, cats, wait, walk, act, launch, landed, jumpTo, hopDown } from "./world.js";
import { me, freeCat, roomFor, addScene, playScene, working, startCoding } from "./me.js";
import { summonVisitor } from "./cats.js";
import { petState } from "./pets.js";
import { unlock } from "./achv.js";

function sceneGame() {
  const u = unit(), tvW = 16 * u;
  let tv = null;
  const playing = (a) => {
    a.setFrame(Math.floor(now() / 210) % 2 ? "game1" : "game2");
    if (now() > (a.nextTalk || 0)) { if (a.nextTalk) Math.random() < 0.6 ? a.say(bubble(pick(t("gameTalk")), "star"), 1800) : a.pop("star"); a.nextTalk = now() + rand(3500, 6000); }
  };
  me.queue.push(
    walk(() => roomFor(me, tvW + 8), 60),
    wait(rand(10000, 15000), "game1", playing, (a) => {
      a.face = 1; a.nextTalk = 0;
      tv = prop(pick([["tv1", "tv2"], ["tvb1", "tvb2"], ["tvr1", "tvr2"]]), a.x + a.w - 3 * u, { every: 360, keep: () => me.base.startsWith("game") && !W.ko });
      const c = freeCat();
      if (c) c.interrupt([
        walk(() => tv.x + tv.w - 6 * u, 80),
        act(() => { c.face = -1; }),
        wait(1400, "sit"), wait(260, "paw"), wait(700, "sit"), wait(260, "paw"), wait(2600, "sit"),
        act(() => c.say(bubble(pick(t("meow")), "star"), 1400)), wait(2000, "sit"),
      ]);
    }));
}
function sceneEat() {
  const eating = (a) => {
    a.setFrame(now() % 1600 < 1000 ? "eat1" : "eat2");
    if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(t("nom"), "heart"), 1400); a.nextTalk = now() + rand(4000, 6000); }
  };
  me.queue.push(wait(rand(7000, 10000), "eat1", eating, (a) => {
    a.nextTalk = 0;
    const c = freeCat();
    if (c) c.interrupt([
      walk(() => (c.cx() < me.cx() ? me.x - c.w + 8 : me.x + me.w - 8), 90),
      act(() => { c.face = me.cx() > c.cx() ? 1 : -1; }),
      wait(1200, "sit"),
      act(() => c.say(bubble("mrrp?", "heart"), 1500)),
      wait(1600, "sit"),
      act(() => me.say(bubble(t("notYours"), "skull"), 1800)),
      wait(2400, "sit"),
    ]);
  }));
}
function sceneRead() {
  const reading = (a) => a.setFrame(now() % 3200 < 2900 ? "read1" : "read2");
  me.queue.push(wait(rand(8000, 12000), "read1", reading, () => {
    const c = freeCat();
    if (c && Math.random() < 0.6) c.interrupt([walk(() => me.x + me.w - 6, 70), wait(rand(7000, 10000), "sleep")]);
  }));
}
function sceneDance(ms) {
  const u = unit();
  const beat = ["dance1", "dance2", "dance3", "dance4"];
  const dancing = (a) => {
    const i = Math.floor(now() / 280);
    a.setFrame(beat[i % 4]);
    a.face = i % 8 < 4 ? 1 : -1;
    if (now() > (a.nextNote || 0)) { a.pop("note"); a.nextNote = now() + rand(500, 900); }
  };
  me.queue.push(
    walk(() => clamp(me.x, 14 * u + 16, me.maxX()), 70),
    wait(ms || rand(6000, 9000), "dance1", dancing, (a) => {
      prop(["boombox"], a.x - 14 * u - 6, { keep: () => me.base.startsWith("dance") && !W.ko });
      if (!document.hidden) unlock("dance");
      const c = freeCat();
      if (c) c.interrupt([
        walk(() => (c.cx() < me.cx() ? me.x - c.w - 10 : me.x + me.w + 10), 80),
        act(() => { c.face = me.cx() > c.cx() ? 1 : -1; c.say(bubble(t("music"), "note"), 1500); }),
        wait(500, "sit"),
        act(() => launch(c, c.x, c.floor(), 0.32)), landed(), wait(400, "sit"),
        act(() => launch(c, c.x, c.floor(), 0.32)), landed(), wait(1500, "sit"),
      ]);
    }));
}
// Coffee: the machine drips, then he drinks it.
function sceneCoffee() {
  const u = unit();
  me.queue.push(
    walk(() => roomFor(me, 10 * u + 8), 60),
    wait(3400, "idle", (a) => { a.face = 1; if (now() > (a.nextTalk || 0)) { a.pop("coffee"); a.nextTalk = now() + 1000; } }, (a) => {
      a.nextTalk = 0; a.inCoffee = true;
      prop(["coffee1", "coffee2"], a.x + a.w - 2 * u, { every: 420, keep: () => a.inCoffee && (me.base === "idle" || me.base === "sip") && !W.ko });
    }),
    wait(3600, "sip", null, (a) => a.say(bubble(t("coffee"), "coffee"), 2200)),
    act((a) => { a.inCoffee = false; }));
}
// Watching TV with popcorn; the cat naps in front of it.
function sceneTV() {
  const u = unit();
  me.queue.push(
    walk(() => roomFor(me, 16 * u + 8), 60),
    wait(rand(9000, 13000), "watch1", (a) => {
      a.setFrame(now() % 2400 < 1900 ? "watch1" : "watch2");
      if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(pick(t("tv")), "star"), 1800); a.nextTalk = now() + rand(4000, 6000); }
    }, (a) => {
      a.face = 1; a.nextTalk = 0;
      prop(["tvs1", "tvs2"], a.x + a.w - 3 * u, { every: 700, keep: () => me.base.startsWith("watch") && !W.ko });
      const c = freeCat();
      if (c) c.interrupt([walk(() => me.x + me.w - 4, 80), wait(rand(6000, 9000), "sleep")]);
    }));
}
// Red electric guitar, standing.
function sceneGuitar() {
  me.queue.push(wait(rand(6000, 9000), "gtr1", (a) => {
    a.setFrame(Math.floor(now() / 150) % 2 ? "gtr1" : "gtr2");
    if (now() > (a.nextNote || 0)) { a.pop("note"); a.nextNote = now() + rand(350, 700); }
    if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(t("rock"), "fire"), 1600); a.nextTalk = now() + rand(3500, 5000); }
  }, (a) => { a.nextTalk = 0; a.face = 1; }));
}
// Acoustic guitar, sitting.
function sceneViolao() {
  me.queue.push(wait(rand(7000, 10000), "vio1", (a) => {
    a.setFrame(Math.floor(now() / 380) % 2 ? "vio1" : "vio2");
    if (now() > (a.nextNote || 0)) { a.pop("note"); a.nextNote = now() + rand(700, 1100); }
    if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(pick(t("strum")), "note"), 1800); a.nextTalk = now() + rand(4000, 6000); }
  }, (a) => { a.nextTalk = 0; }));
}
// Studying Japanese and Italian (same lines in both languages of the site).
const LANGS = [["jp", "こんにちは!"], ["jp", "ありがとう"], ["jp", "がんばって!"], ["jp", "日本語、むずかしい…"], ["it", "ciao!"], ["it", "buongiorno!"], ["it", "grazie mille"], ["it", "mamma mia, i verbi…"]];
function sceneLang() {
  me.queue.push(wait(rand(9000, 12000), "read1", (a) => {
    a.setFrame(now() % 3200 < 2900 ? "read1" : "read2");
    if (now() > a.nextTalk) { const [flag, text] = pick(LANGS); a.say(bubble(text, flag), 2200); a.nextTalk = now() + rand(2600, 3600); }
  }, (a) => { a.nextTalk = now() + 600; }));
}
// The daily: headset on, the cats on top of the monitor and the chair.
function sceneDaily() {
  const u = unit();
  let desk = null, chair = null;
  me.queue.push(
    walk(() => clamp(me.x, 10 * u + 14, innerWidth - me.w - 18 * u - 14), 60),
    wait(13500, "meet1", (a) => {
      const lines = t("daily"), i = Math.floor((now() - a.dailyT0) / 2600);
      if (i !== a.dailyI && i < lines.length) { a.dailyI = i; a.say(bubble(lines[i], i === 3 ? "cat" : "heart"), 2400); }
      a.setFrame(now() - (a.saidAt || 0) < 1900 && Math.floor(now() / 160) % 2 ? "meet2" : "meet1");
    }, (a) => {
      a.dailyT0 = now(); a.dailyI = -1; a.face = 1;
      const keep = () => me.base.startsWith("meet") && !W.ko;
      chair = prop(["chair"], a.x - 10 * u - 4, { keep });
      desk = prop(["desk"], a.x + a.w - 2 * u, { keep });
      const onMonitor = (c) => (props.has(desk) ? { x: desk.x + 8 * u - c.w / 2, y: desk.y - c.h + 2 * u } : null);
      const onChair = (c) => (props.has(chair) ? { x: chair.x + 5 * u - c.w / 2, y: chair.y + 6 * u - c.h } : null);
      if (!W.visitor) summonVisitor(true);
      const seats = [onMonitor, onChair];
      cats().forEach((c, i) => {
        const seat = seats[i];
        if (!seat || c.mode === "held") return;
        c.interrupt([
          walk(() => { const q = seat(c); return q ? q.x + (c.cx() < q.x + c.w / 2 ? -50 : 50) : null; }, 140),
          jumpTo(seat, 0.55),
          act(() => (c.mode === "perch" ? undefined : "stop")),
          wait(rand(7000, 9000), "sit"),
          hopDown(rand(-60, 60)), landed(),
        ]);
      });
    }));
}

// Cooking an egg: the stove's flame flickers, the egg flips now and then; the cat comes to beg.
function sceneCook() {
  const u = unit();
  me.queue.push(
    walk(() => roomFor(me, 14 * u + 4), 60),
    wait(rand(8000, 11000), "cook1", (a) => {
      a.face = 1;
      a.setFrame(now() % 1800 < 1500 ? "cook1" : "cook2");
      if (now() > (a.nextTalk || 0)) {
        if (a.nextTalk) { if (Math.random() < 0.5) a.say(bubble(pick(t("cook")), "egg"), 1800); else a.pop("egg"); }
        a.nextTalk = now() + rand(2500, 4000);
      }
    }, (a) => {
      a.nextTalk = 0;
      prop(["stove1", "stove2"], a.x + 30 * u, { every: 260, keep: () => me.base.startsWith("cook") && !W.ko });
      const c = freeCat();
      if (c) c.interrupt([walk(() => me.x - c.w + 6, 80), act(() => { c.face = 1; }), wait(1500, "sit"), act(() => c.say(bubble("mrrp?", "egg"), 1500)), wait(3000, "sit")]);
    }));
}
// Cleaning the litter box: just the box, a little scoop and some sparkles.
function sceneLitter() {
  const u = unit();
  me.queue.push(
    walk(() => roomFor(me, 14 * u + 8), 60),
    wait(6000, "scoop1", (a) => {
      a.setFrame(now() % 900 < 450 ? "scoop1" : "scoop2");
      if (now() > (a.nextTalk || 0)) { a.pop("star"); a.nextTalk = now() + 900; }
    }, (a) => {
      a.face = 1; a.nextTalk = 0;
      prop(["litter"], a.x + a.w - 4 * u, { keep: () => me.base.startsWith("scoop") && !W.ko });
    }),
    act(() => {
      petState.box = 100;
      unlock("litter");
      me.say(bubble(t("boxClean"), "star"), 2400);
      const c = freeCat();
      if (c) c.interrupt([walk(() => me.x + me.w, 80), act(() => { c.pop("heart"); c.say(bubble("prrr", "heart"), 1500); }), wait(2000, "sit")]);
    }),
    wait(1500, "idle"));
}

addScene("game", sceneGame);
addScene("eat", sceneEat);
addScene("read", sceneRead);
addScene("dance", sceneDance);
addScene("coffee", sceneCoffee);
addScene("tv", sceneTV);
addScene("guitar", sceneGuitar);
addScene("violao", sceneViolao);
addScene("lang", sceneLang);
addScene("daily", sceneDaily);
addScene("cook", sceneCook);
addScene("code", () => me.queue.push(wait(rand(8000, 12000), "code", working, startCoding)));
// a dirty litter box comes first, now and then
addScene("litter", sceneLitter, { weight: 0, urgent: () => petState.box < 40 && Math.random() < 0.35 });

// Palette: put on some music.
export function dance() { playScene("dance", 9000); }

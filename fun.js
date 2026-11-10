(() => {
  "use strict";
  // Pixel friends: a small version of me and the cat of the current theme (Capitu in dark, Sancho in light)
  // live along the bottom of the window. They wander, nap, code when you go quiet, react to the cursor,
  // can be picked up and thrown, and visit the coin, the theme button and each other.
  // ↓ ↘ → P (or the command palette, or three taps on me) fires a red energy attack that knocks the
  // whole page down; a button rebuilds it.
  const S = window.SITE, P = window.PIXEL;
  if (!S || !P || !window.requestAnimationFrame) return;
  const { t, $ } = S;
  const root = document.documentElement;
  const store = S.store;
  const now = () => performance.now();
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const GRAV = 2200;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const unit = () => (innerWidth < 640 ? 2 : 2.5);   // CSS pixels per art pixel
  const isNight = () => { const h = new Date().getHours(); return h >= 23 || h < 6; };
  const emo = (name) => `<span class="px-emo">${P.toSvg(P.EMOJI[name])}</span>`;
  const bubble = (text, icon, extra = "") => (icon ? emo(icon) : "") + `<span class="px-txt">${text}${extra}</span>`;
  const keyCaps = () => `<span class="px-keys">${["down", "diag", "right", "p"].map((k) => `<kbd>${P.toSvg(P.KEYS[k])}</kbd>`).join("")}</span>`;
  const RESTING = ["code", "code2", "doze", "lie"];
  const resting = (a) => RESTING.includes(a.base);
  const CATS = { dark: { id: "capitu", name: "Capitu" }, light: { id: "sancho", name: "Sancho" } };
  let visitor = null;   // the other theme's cat, when it drops by
  let yarn = null;      // the ball of yarn on the floor

  const layer = document.createElement("div");
  layer.className = "px-world";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  // ================================================================ actors
  const actors = [];
  class Actor {
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
    draw() {
      const f = this.emote && now() < this.emote.until ? this.emote.frame : this.base;
      const powered = this.power && this.palPower, key = (powered ? "p:" : "") + f;
      if (key !== this.frame) {
        this.frame = key;
        this.spr.innerHTML = this.cache[key] || (this.cache[key] = P.toSvg(this.frames[f], "", powered ? this.palPower : this.pal));
      }
      this.el.style.transform = `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0)`;
      this.spr.style.transform = this.rolls ? `rotate(${Math.round(this.spin || 0)}deg)` : this.face < 0 ? "scaleX(-1)" : "";
    }
    say(html, ms = 2600) {
      const b = this.bub;
      b.innerHTML = html;
      b.style.setProperty("--dx", "0px");
      b.classList.add("show");
      const r = b.getBoundingClientRect();
      const dx = r.left < 8 ? 8 - r.left : r.right > innerWidth - 8 ? innerWidth - 8 - r.right : 0;
      b.style.setProperty("--dx", dx + "px");
      clearTimeout(this.bubTimer);
      this.bubTimer = setTimeout(() => b.classList.remove("show"), ms);
      this.saidAt = now();
    }
    pop(icon) {
      const el = document.createElement("span");
      el.className = "px-pop";
      el.innerHTML = emo(icon);
      this.el.append(el);
      setTimeout(() => el.remove(), 1100);
    }
    interrupt(tasks, soft = false) { this.queue = tasks; this.task = null; this.soft = soft; }
    remove() { this.el.remove(); if (actors.includes(this)) actors.splice(actors.indexOf(this), 1); if (this === visitor) visitor = null; }
  }
  const isCat = (a) => a.kind === "cat" && !a.leaving && !a.runOff;
  // There is only one Capitu and one Sancho: never spawn a cat that is already on screen (even one on its way out).
  const catNamed = (name) => actors.find((a) => a.kind === "cat" && a.name === name);
  const cats = () => actors.filter(isCat);

  // ================================================================ props: things that show up for a scene and vanish after it
  const props = new Set();
  function poof(x, y) {
    const el = document.createElement("div");
    el.className = "px-poof";
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    layer.append(el);
    setTimeout(() => el.remove(), 520);
  }
  function prop(names, x, opts = {}) {
    const u = unit(), first = P.PROPS[names[0]];
    const w = first[0].length * u, h = first.length * u;
    const el = document.createElement("div");
    el.className = "px-prop" + (opts.cls ? " " + opts.cls : "");
    el.style.width = w + "px"; el.style.height = h + "px";
    const pr = { el, w, h, x, fixedY: opts.y, svgs: names.map((n) => P.toSvg(P.PROPS[n])), i: 0, every: opts.every || 0, last: 0, keep: opts.keep || (() => true) };
    pr.y = opts.y != null ? opts.y : innerHeight - h - 2;
    el.innerHTML = pr.svgs[0];
    el.style.transform = `translate(${Math.round(pr.x)}px, ${Math.round(pr.y)}px)`;
    if (opts.front) layer.append(el); else layer.insertBefore(el, layer.firstChild);   // usually behind the characters
    props.add(pr);
    if (!opts.quiet) poof(x + w / 2 - 14, pr.y + h - 22);
    return pr;
  }
  function dropProp(pr, quiet) {
    if (!props.has(pr)) return;
    props.delete(pr);
    if (!quiet) poof(pr.x + pr.w / 2 - 14, pr.y + pr.h - 22);
    pr.el.remove();
  }
  function tickProps(ts) {
    for (const pr of props) {
      if (!pr.keep()) { dropProp(pr, pr.fixedY != null); continue; }
      if (pr.every && ts - pr.last > pr.every) { pr.last = ts; pr.i = (pr.i + 1) % pr.svgs.length; pr.el.innerHTML = pr.svgs[pr.i]; }
    }
  }

  // ================================================================ tasks (tiny state machines)
  const wait = (ms, frame, each, begin) => ({
    start(a) { this.end = now() + ms; if (frame) a.setFrame(frame); if (begin) begin(a); },
    update(a, dt) { if (each) each(a, dt); return now() >= this.end; },
  });
  const walk = (to, speed) => ({
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
  const act = (fn) => ({ start(a) { if (fn(a) === "stop") a.queue = []; }, update() { return true; } });
  const until = (fn, ms = 5000) => ({ start() { this.end = now() + ms; }, update() { return fn() || now() > this.end; } });
  const landed = () => ({ update(a) { return a.mode === "ground" || a.mode === "perch"; } });
  // Ballistic jump that reaches (tx, ty) after T seconds; with a perch it lands on it, otherwise on the floor.
  function launch(a, tx, ty, T, perch) {
    a.mode = "air"; a.perch = null;
    a.vx = (tx - a.x) / T;
    a.vy = (ty - a.y - 0.5 * GRAV * T * T) / T;
    a.land = perch || null;
    a.face = tx >= a.x ? 1 : -1;
    if (a.jumpFrame) a.setFrame(a.jumpFrame);
  }
  const jumpTo = (perch, T = 0.55) => ({
    start(a) {
      const p = perch(a);
      if (!p || (a.mode !== "ground" && a.mode !== "perch")) { this.done = true; a.queue = []; return; }
      launch(a, p.x, p.y, T, perch);
    },
    update(a) { return this.done || a.mode !== "air"; },
  });
  const hopDown = (dx) => act((a) => { if (a.mode === "perch") launch(a, clamp(a.x + dx, 4, a.maxX()), a.floor(), 0.5); });

  // ================================================================ physics
  function step(a, dt, reduced) {
    if (a.mode === "held") return;
    if (a.mode === "air") {
      if (reduced && !a.noFloor) { a.mode = "ground"; a.vx = a.vy = 0; a.y = a.floor(); a.setFrame(a.rest); return; }
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
  function think(a, dt) {
    if (a.mode === "held" || a.locked) return;
    if (!a.task) {
      if (!a.queue.length) { a.soft = true; a.brain(a); }
      a.task = a.queue.shift() || null;
      if (a.task && a.task.start) a.task.start(a);
    }
    if (a.task && a.task.update(a, dt)) a.task = null;
  }

  // ================================================================ me
  const mouse = { x: -1, y: -1, t: 0 };
  let lastInput = now();
  let lineIdx = 0;
  function nextLine() {
    const lines = t("fun.lines");
    const [icon, text, keys] = lines[lineIdx++ % lines.length];
    if (icon === "fire" && !finePointer.matches) return bubble(t("fun.touchFire"), icon);
    return bubble(text, icon, keys ? keyCaps() : "");
  }
  const lookAtCursor = (a) => { if (mouse.t && now() - mouse.t < 4000) a.face = mouse.x > a.cx() ? 1 : -1; };
  const snore = (a) => { if (now() > (a.nextZ || 0)) { a.say('<span class="px-z">z z z</span>', 1800); a.nextZ = now() + 3200; } };
  // Flow state: white hair and an aura, now and then while coding and right after the special attack.
  let powerTimer = 0;
  function setPower(on, ms) {
    clearTimeout(powerTimer);
    if (me.power !== on) {
      me.power = on;
      me.el.classList.toggle("px-aura", on);
      if (on) { unlock("flow"); me.pop("star"); }
    }
    if (on && ms) powerTimer = setTimeout(() => setPower(false), ms);
  }
  const startCoding = (a) => { a.flowAt = Math.random() < 0.45 ? now() + rand(2500, 5000) : 0; };
  // A reply bubble next to the laptop, for the conversations with Claude while he codes.
  function reply(text) {
    const r = me.reply;
    r.innerHTML = `<b>Claude</b><span>${text}</span>`;
    r.classList.toggle("left", me.x > innerWidth - 300);
    r.classList.add("show");
    clearTimeout(r.timer);
    r.timer = setTimeout(() => r.classList.remove("show"), 2800);
  }
  // typing: two frames, and now and then a thought about the work or a little emoji
  const working = (a) => {
    if (a.flowAt && now() > a.flowAt) { a.flowAt = 0; a.flowFromCode = true; setPower(true); a.say(bubble(t("fun.flow"), "fire"), 1800); }
    a.setFrame(Math.floor(now() / 170) % 2 ? "code" : "code2");
    if (!a.nextWork) a.nextWork = now() + rand(2500, 4500);
    else if (now() > a.nextWork) {
      if (Math.random() < 0.55) {
        const [ask, answer] = pick(t("fun.claude"));
        a.say(bubble(ask, "heart"), 1800);
        setTimeout(() => { if (resting(me) && !ko) reply(answer); }, 1700);
      } else {
        const [icon, text] = pick(t("fun.work"));
        if (Math.random() < 0.55) a.say(bubble(text, icon), 2200); else a.pop(icon);
      }
      a.nextWork = now() + rand(5500, 8500);
    }
  };

  // ---------------------------------------------------------------- pointing at the interesting parts of the page
  const POIS = [
    ["coin", () => $("#core")], ["game", () => $("#game-stage")], ["impact", () => $("#impact-grid")], ["iped", () => $(".iped-art")],
    ["stack", () => $("#stack-grid")], ["contact", () => $("#contact .btn-primary")], ["theme", () => $("#toggle-theme")],
    ["palette", () => $("#open-palette")], ["job", () => $("#jobs .job")], ["tiny", () => tiny && tiny.el],
  ];
  const pointed = {};
  let pointCool = now() + 9000;
  function poiVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, innerHeight - me.h - 30);
    return bottom - top >= Math.min(36, r.height) && r.right > 0 && r.left < innerWidth;
  }
  function findPoi() {
    const list = POIS.map(([k, get]) => ({ k, el: get() })).filter((p) => p.el && poiVisible(p.el));
    list.sort((a, b) => (pointed[a.k] || 0) - (pointed[b.k] || 0));
    return list.length ? list[Math.floor(Math.random() * Math.min(2, list.length))] : null;
  }
  const marker = document.createElement("div");
  marker.className = "px-marker";
  marker.hidden = true;
  marker.innerHTML = P.toSvg(P.MARKER);
  layer.append(marker);
  function placeMarker(el) {
    const r = el.getBoundingClientRect(), u = 3, w = 7 * u;
    const below = r.top < 64;                       // things in the top bar: point at them from below
    const y = below ? r.bottom + 8 : Math.max(r.top, 4) - w - 8;
    marker.classList.toggle("up", below);
    marker.style.transform = `translate(${Math.round(r.left + r.width / 2 - w / 2)}px, ${Math.round(y)}px)`;
    marker.hidden = !poiVisible(el);
  }
  function poiText(k) {
    const kbd = $("#open-palette kbd");
    return t("fun.poi." + k).replace("{key}", kbd ? kbd.textContent : "Ctrl K");
  }
  function pointAt(p) {
    pointed[p.k] = now();
    pointCool = now() + rand(18000, 30000);
    me.soft = false;
    let face = 1;
    me.queue.push(
      walk(() => {
        const r = p.el.getBoundingClientRect(), cx = r.left + r.width / 2;
        face = cx > me.w + 30 ? 1 : -1;
        return face > 0 ? cx - me.w * 0.85 : cx - me.w * 0.15;
      }, 120),
      act(() => {
        if (!poiVisible(p.el)) return "stop";
        me.face = face;
        placeMarker(p.el);
        me.say(bubble(poiText(p.k), "star"), 3400);
      }),
      wait(3400, "point", () => placeMarker(p.el)),
      act(() => { marker.hidden = true; }));
  }
  function wake(a) {
    unlock("wake");
    const deep = a.base === "lie" || a.base === "doze";
    a.interrupt([
      ...(deep ? [act(() => a.say(bubble(t("fun.yawn"), "coffee"), 1200)), wait(1000, "held")] : []),
      act(() => { a.emoteFor("wave", 1400); a.say(bubble(t("fun.back"), "heart"), 2200); }),
      wait(1600, "idle"),
    ]);
  }

  const me = new Actor("me", P.FRAMES, P.PAL, "idle", ["walk1", "walk2", "walk3", "walk4"], 150);
  me.palPower = P.PAL_POWER;
  me.reply = document.createElement("div");
  me.reply.className = "px-reply";
  me.el.append(me.reply);
  me.onLand = (hit) => { if (hit > 1100) { me.say(bubble(t("fun.ouch"), "star"), 1400); me.emoteFor("held", 300); } };
  const catOnHead = () => cat && cat.mode === "perch" && cat.perch === headPerch;
  // ---------------------------------------------------------------- little scenes on the floor (Castaway-style)
  let sceneCool = now() + 6000;
  const freeCat = () => (cat && cat.mode === "ground" && cat.soft && !cat.leaving && cat.base !== "sleep" ? cat : null);
  const roomFor = (a, right) => clamp(a.x, 10, innerWidth - a.w - right - 10);   // leave space on the right for a prop
  function sceneGame() {
    const u = unit(), tvW = 16 * u;
    let tv = null;
    const playing = (a) => {
      a.setFrame(Math.floor(now() / 210) % 2 ? "game1" : "game2");
      if (now() > (a.nextTalk || 0)) { if (a.nextTalk) Math.random() < 0.6 ? a.say(bubble(pick(t("fun.gameTalk")), "star"), 1800) : a.pop("star"); a.nextTalk = now() + rand(3500, 6000); }
    };
    me.queue.push(
      walk(() => roomFor(me, tvW + 8), 60),
      wait(rand(10000, 15000), "game1", playing, (a) => {
        a.face = 1; a.nextTalk = 0;
        tv = prop(pick([["tv1", "tv2"], ["tvb1", "tvb2"], ["tvr1", "tvr2"]]), a.x + a.w - 3 * u, { every: 360, keep: () => me.base.startsWith("game") && !ko });
        const c = freeCat();
        if (c) c.interrupt([
          walk(() => tv.x + tv.w - 6 * u, 80),
          act(() => { c.face = -1; }),
          wait(1400, "sit"), wait(260, "paw"), wait(700, "sit"), wait(260, "paw"), wait(2600, "sit"),
          act(() => c.say(bubble(pick(t("fun.meow")), "star"), 1400)), wait(2000, "sit"),
        ]);
      }));
  }
  function sceneEat() {
    const eating = (a) => {
      a.setFrame(now() % 1600 < 1000 ? "eat1" : "eat2");
      if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(t("fun.nom"), "heart"), 1400); a.nextTalk = now() + rand(4000, 6000); }
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
        act(() => me.say(bubble(t("fun.notYours"), "skull"), 1800)),
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
        prop(["boombox"], a.x - 14 * u - 6, { keep: () => me.base.startsWith("dance") && !ko });
        if (!document.hidden) unlock("dance");
        const c = freeCat();
        if (c) c.interrupt([
          walk(() => (c.cx() < me.cx() ? me.x - c.w - 10 : me.x + me.w + 10), 80),
          act(() => { c.face = me.cx() > c.cx() ? 1 : -1; c.say(bubble(t("fun.music"), "note"), 1500); }),
          wait(500, "sit"),
          act(() => launch(c, c.x, c.floor(), 0.32)), landed(), wait(400, "sit"),
          act(() => launch(c, c.x, c.floor(), 0.32)), landed(), wait(1500, "sit"),
        ]);
      }));
  }
  // At night he sleeps with a lamp on and a few stars twinkling over him.
  function nightProps(a) {
    if (!isNight()) return;
    const u = unit(), keep = () => me.base === "lie" && !ko;
    prop(["lamp"], a.x - 7 * u - 2, { cls: "px-lamp", keep });
    for (let i = 0; i < 3; i++) prop(["twinkle"], a.x + rand(-10, a.w), { y: a.y + rand(-30, 20), cls: "px-twinkle", keep, quiet: true }).el.style.animationDelay = (i * 0.45) + "s";
  }

  // Coffee: the machine drips, then he drinks it.
  function sceneCoffee() {
    const u = unit();
    me.queue.push(
      walk(() => roomFor(me, 10 * u + 8), 60),
      wait(3400, "idle", (a) => { a.face = 1; if (now() > (a.nextTalk || 0)) { a.pop("coffee"); a.nextTalk = now() + 1000; } }, (a) => {
        a.nextTalk = 0; a.inCoffee = true;
        prop(["coffee1", "coffee2"], a.x + a.w - 2 * u, { every: 420, keep: () => a.inCoffee && (me.base === "idle" || me.base === "sip") && !ko });
      }),
      wait(3600, "sip", null, (a) => a.say(bubble(t("fun.coffee"), "coffee"), 2200)),
      act((a) => { a.inCoffee = false; }));
  }
  // Watching TV with popcorn; the cat naps in front of it.
  function sceneTV() {
    const u = unit();
    me.queue.push(
      walk(() => roomFor(me, 16 * u + 8), 60),
      wait(rand(9000, 13000), "watch1", (a) => {
        a.setFrame(now() % 2400 < 1900 ? "watch1" : "watch2");
        if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(pick(t("fun.tv")), "star"), 1800); a.nextTalk = now() + rand(4000, 6000); }
      }, (a) => {
        a.face = 1; a.nextTalk = 0;
        prop(["tvs1", "tvs2"], a.x + a.w - 3 * u, { every: 700, keep: () => me.base.startsWith("watch") && !ko });
        const c = freeCat();
        if (c) c.interrupt([walk(() => me.x + me.w - 4, 80), wait(rand(6000, 9000), "sleep")]);
      }));
  }
  // Red electric guitar, standing.
  function sceneGuitar() {
    me.queue.push(wait(rand(6000, 9000), "gtr1", (a) => {
      a.setFrame(Math.floor(now() / 150) % 2 ? "gtr1" : "gtr2");
      if (now() > (a.nextNote || 0)) { a.pop("note"); a.nextNote = now() + rand(350, 700); }
      if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(t("fun.rock"), "fire"), 1600); a.nextTalk = now() + rand(3500, 5000); }
    }, (a) => { a.nextTalk = 0; a.face = 1; }));
  }
  // Acoustic guitar, sitting.
  function sceneViolao() {
    me.queue.push(wait(rand(7000, 10000), "vio1", (a) => {
      a.setFrame(Math.floor(now() / 380) % 2 ? "vio1" : "vio2");
      if (now() > (a.nextNote || 0)) { a.pop("note"); a.nextNote = now() + rand(700, 1100); }
      if (now() > (a.nextTalk || 0)) { if (a.nextTalk) a.say(bubble(pick(t("fun.strum")), "note"), 1800); a.nextTalk = now() + rand(4000, 6000); }
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
        const lines = t("fun.daily"), i = Math.floor((now() - a.dailyT0) / 2600);
        if (i !== a.dailyI && i < lines.length) { a.dailyI = i; a.say(bubble(lines[i], i === 3 ? "cat" : "heart"), 2400); }
        a.setFrame(now() - (a.saidAt || 0) < 1900 && Math.floor(now() / 160) % 2 ? "meet2" : "meet1");
      }, (a) => {
        a.dailyT0 = now(); a.dailyI = -1; a.face = 1;
        const keep = () => me.base.startsWith("meet") && !ko;
        chair = prop(["chair"], a.x - 10 * u - 4, { keep });
        desk = prop(["desk"], a.x + a.w - 2 * u, { keep });
        const onMonitor = (c) => (props.has(desk) ? { x: desk.x + 8 * u - c.w / 2, y: desk.y - c.h + 2 * u } : null);
        const onChair = (c) => (props.has(chair) ? { x: chair.x + 5 * u - c.w / 2, y: chair.y + 6 * u - c.h } : null);
        if (!visitor) summonVisitor(true);
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
          if (a.nextTalk) { if (Math.random() < 0.5) a.say(bubble(pick(t("fun.cook")), "egg"), 1800); else a.pop("egg"); }
          a.nextTalk = now() + rand(2500, 4000);
        }
      }, (a) => {
        a.nextTalk = 0;
        prop(["stove1", "stove2"], a.x + 30 * u, { every: 260, keep: () => me.base.startsWith("cook") && !ko });
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
        prop(["litter"], a.x + a.w - 4 * u, { keep: () => me.base.startsWith("scoop") && !ko });
      }),
      act(() => {
        petState.box = 100;
        unlock("litter");
        me.say(bubble(t("fun.boxClean"), "star"), 2400);
        const c = freeCat();
        if (c) c.interrupt([walk(() => me.x + me.w, 80), act(() => { c.pop("heart"); c.say(bubble("prrr", "heart"), 1500); }), wait(2000, "sit")]);
      }),
      wait(1500, "idle"));
  }

  me.brain = (a) => {
    if (catOnHead()) { a.queue.push(wait(900, "idle", lookAtCursor)); return; }
    const quiet = now() - lastInput;
    a.nextWork = 0;
    if (isNight() && quiet > 8000 && Math.random() < 0.6) { a.queue.push(walk(rand(20 + 8 * unit(), a.maxX()), 45), wait(rand(20000, 40000), "lie", snore, nightProps)); return; }
    if (quiet > 75000) { a.queue.push(wait(rand(20000, 40000), "lie", snore, nightProps)); return; }
    if (quiet > 45000) { a.queue.push(wait(rand(9000, 14000), "doze", snore)); return; }
    if (quiet > 20000) { a.queue.push(wait(rand(9000, 14000), "code", working, startCoding)); return; }
    const r = Math.random();
    const tinyPoi = tiny && poiVisible(tiny.el) && now() - (pointed.tiny || 0) > 15000 ? { k: "tiny", el: tiny.el } : null;
    const poi = tinyPoi || (now() > pointCool && r < 0.3 ? findPoi() : null);
    if (poi) { pointAt(poi); return; }
    if (petState.box < 40 && Math.random() < 0.35) { a.soft = false; sceneLitter(); return; }
    if (now() > sceneCool && r > 0.55) {
      sceneCool = now() + rand(12000, 22000);
      a.soft = false;
      const scenes = [sceneGame, sceneEat, sceneRead, sceneDance, sceneCoffee, sceneTV, sceneGuitar, sceneViolao, sceneLang, sceneDaily, sceneCook,
        () => a.queue.push(wait(rand(8000, 12000), "code", working, startCoding))];
      pick(scenes)();
      return;
    }
    if (r < 0.35) a.queue.push(wait(rand(1500, 4000), "idle", lookAtCursor));
    else if (r < 0.75) a.queue.push(walk(rand(20, a.maxX()), 48), wait(rand(800, 2000), "idle", lookAtCursor));
    else if (r < 0.83 && cat && cat.mode === "ground") {
      a.soft = false;
      a.queue.push(
        walk(() => (cat.cx() > a.cx() ? cat.x - a.w + 10 : cat.x + cat.w - 10), 48),
        act(() => {
          me.face = cat.cx() > me.cx() ? 1 : -1;
          me.emoteFor("wave", 1400);
          me.say(bubble(t("fun.catHi").replace("{name}", cat.name), "heart"), 2200);
          cat.pop("heart");
        }),
        wait(1600, "idle"));
    } else if (r < 0.92) a.queue.push(act(() => me.say(nextLine(), 3200)), wait(3000, "idle", lookAtCursor));
    else a.queue.push(wait(rand(1500, 3000), "idle", lookAtCursor));
  };

  // ================================================================ cat
  let cat = null, coinCool = 0, headCool = now() + 15000, huntCool = 0;
  const coinPerch = (a) => {
    const c = $("#core");
    if (!c) return null;
    const r = c.getBoundingClientRect();
    if (r.width < 20 || r.top < 90 || r.bottom > innerHeight - 20) return null;
    return { x: r.left + r.width / 2 - a.w / 2, y: r.top - a.h + unit() * 3 };
  };
  const headPerch = (a) => (me.mode === "ground" && !me.locked ? { x: me.cx() - a.w / 2, y: me.y - a.h + unit() * 3 } : null);
  function makeCat(theme) {
    const info = CATS[theme] || CATS.dark;
    const c = new Actor("cat", P.CAT, P.CAT_PAL[info.id], "sit", ["walk1", "walk2"], 120);
    c.name = info.name; c.catId = info.id; c.jumpFrame = "jump";
    c.onLand = () => { c.setFrame("sit"); };
    c.brain = catBrain;
    return c;
  }
  // ---------------------------------------------------------------- knocking things off: the cat sits on a stack tile and paws the next one off
  let knockCool = now() + 20000;
  const tilePerch = (tile, dir) => (a) => {
    const r = tile.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight - 40 || r.width < 10) return null;
    return { x: r.left + r.width / 2 - a.w / 2 + dir * r.width * 0.2, y: r.top - a.h + unit() * 2 };
  };
  function findKnock(a) {
    const tiles = [...document.querySelectorAll("#stack-grid .tech")].filter((el) => { const r = el.getBoundingClientRect(); return r.top > 90 && r.bottom < innerHeight - 40 && r.width > 10; });
    for (const on of tiles.sort(() => Math.random() - 0.5)) {
      const ro = on.getBoundingClientRect();
      for (const [off, dir] of [[on.nextElementSibling, 1], [on.previousElementSibling, -1]]) {
        if (!off || off.dataset.knocked) continue;
        const rf = off.getBoundingClientRect();
        if (Math.abs(rf.top - ro.top) < 4 && tilePerch(on, dir)(a)) return { on, off, dir };
      }
    }
    return null;
  }
  function knockOff(tile, dir) {
    if (!tile.animate || tile.dataset.knocked) return;
    tile.dataset.knocked = "1";
    const r = tile.getBoundingClientRect();
    const dy = Math.max(0, innerHeight - r.bottom - 4), dx = dir * rand(24, 56), d = dir;
    const anim = tile.animate([
      { translate: "0 0", rotate: "0deg", easing: "ease-out" },
      { translate: `${dx * 0.3}px -12px`, rotate: `${d * 14}deg`, offset: 0.06, easing: "cubic-bezier(.55,0,1,.45)" },
      { translate: `${dx}px ${dy}px`, rotate: `${d * 85}deg`, offset: 0.26, easing: "ease-out" },
      { translate: `${dx * 1.15}px ${dy - 20}px`, rotate: `${d * 96}deg`, offset: 0.32, easing: "ease-in" },
      { translate: `${dx * 1.25}px ${dy}px`, rotate: `${d * 90}deg`, offset: 0.38 },
      { translate: `${dx * 1.25}px ${dy}px`, rotate: `${d * 90}deg`, offset: 0.8, easing: "cubic-bezier(.3,1.35,.5,1)" },
      { translate: "0 0", rotate: "0deg" },
    ], { duration: 5200 });
    const done = () => { delete tile.dataset.knocked; };
    anim.onfinish = done; anim.oncancel = done;
    setTimeout(() => { if (!ko) { me.face = r.left + r.width / 2 > me.cx() ? 1 : -1; me.emoteFor("point", 1500); me.say(bubble(t("fun.knock"), "skull"), 2000); } }, 1100);
  }

  function catBrain(a) {
    const r = Math.random(), need = petOf(a);
    if (need && need.food < 40 && Math.random() < 0.3 && me.mode === "ground") {
      a.soft = false;
      a.queue.push(walk(() => (me.cx() > a.cx() ? me.x - a.w + 12 : me.x + me.w - 12), 70), act(() => { a.face = me.cx() > a.cx() ? 1 : -1; a.say(bubble(t("fun.pet.hungry"), "fish"), 2000); }), wait(2500, "sit"));
      return;
    }
    if (need && need.fun < 35 && Math.random() < 0.25) {
      a.queue.push(act(() => { a.face = me.cx() > a.cx() ? -1 : 1; a.say(bubble(t("fun.pet.bored"), "cat"), 1800); }), wait(rand(3000, 5000), "sit"));
      return;
    }
    if (petState.box < 40 && Math.random() < 0.12) { a.queue.push(act(() => a.say(bubble(t("fun.pet.boxHint"), "cat"), 1800)), wait(2000, "sit")); return; }
    if (need && need.energy < 30 && Math.random() < 0.5) { a.queue.push(wait(rand(15000, 25000), "sleep")); return; }
    if (now() > coinCool && Math.random() < 0.3 && coinPerch(a)) {
      coinCool = now() + 25000; a.soft = false;
      a.queue.push(
        walk(() => { const p = coinPerch(a); return p ? p.x + (a.x < p.x ? -70 : 70) : null; }, 70),
        wait(350, "sit"),
        jumpTo(coinPerch, 0.6),
        act(() => (a.mode === "perch" ? undefined : "stop")),
        wait(260, "paw"), wait(220, "sit"), wait(260, "paw"),
        act(() => { const c = $("#core"); if (c) c.click(); a.say(bubble(pick(t("fun.meow")), "heart"), 1800); }),
        wait(2600, "sit"),
        hopDown(rand(-90, 90)), landed());
      return;
    }
    const knock = now() > knockCool && Math.random() < 0.35 ? findKnock(a) : null;
    if (knock) {
      knockCool = now() + rand(35000, 60000); a.soft = false;
      const perch = tilePerch(knock.on, knock.dir);
      a.queue.push(
        walk(() => { const p = perch(a); return p ? p.x - knock.dir * 70 : null; }, 75),
        wait(300, "sit"),
        jumpTo(perch, 0.6),
        act(() => { if (a.mode !== "perch") return "stop"; a.face = knock.dir; }),
        wait(500, "sit"), wait(240, "paw"), wait(300, "sit"), wait(240, "paw"),
        act(() => knockOff(knock.off, knock.dir)),
        wait(900, "sit"),
        act(() => a.say(bubble("mrrp", "cat"), 1400)),
        wait(1200, "sit"),
        hopDown(rand(-80, 80)), landed());
      return;
    }
    if (yarn && Math.random() < 0.1 && yarn.mode === "ground") { a.soft = false; a.queue.push(chaseYarn(), wait(1200, "sit")); return; }
    if (resting(me) && me.mode === "ground" && r < 0.55) {
      a.queue.push(walk(() => me.x + me.w - 6, 60), wait(rand(12000, 25000), "sleep")); return;
    }
    if (isNight() && r < 0.45) { a.queue.push(wait(rand(15000, 30000), "sleep")); return; }

    if (r < 0.42 && me.mode === "ground") {
      a.soft = false;
      a.queue.push(
        walk(() => (me.cx() > a.cx() ? me.x - a.w + 12 : me.x + me.w - 12), 60),
        act(() => { a.face = me.cx() > a.cx() ? 1 : -1; a.pop("heart"); a.say(bubble("prrr", "heart"), 1600); }),
        wait(rand(2500, 4500), "sit"));
      return;
    }
    if (r < 0.5 && now() > headCool && me.mode === "ground" && !me.locked && me.base === "idle") {
      headCool = now() + 40000; a.soft = false;
      a.queue.push(
        walk(() => me.x + (a.x < me.x ? -60 : me.w + 20), 70),
        wait(300, "sit"),
        jumpTo(headPerch, 0.55),
        act(() => { if (a.mode !== "perch") return "stop"; me.say(bubble(t("fun.hey"), "cat"), 1800); }),
        wait(rand(3000, 5000), "sit"),
        hopDown(rand(-80, 80)), landed());
      return;
    }
    if (r < 0.75) a.queue.push(walk(rand(10, a.maxX()), 58), wait(rand(1000, 3000), "sit"));
    else if (r < 0.9) a.queue.push(wait(rand(3000, 6000), "sit"));
    else a.queue.push(wait(rand(8000, 14000), "sleep"));
  }

  // ================================================================ input: hover, tap, drag and throw
  let taps = 0, tapTimer = 0;
  function tapMe() {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 650);
    if (taps >= 3) { taps = 0; special(); return; }
    if (resting(me)) { wake(me); return; }
    me.emoteFor("wave", 1300);
    me.say(nextLine(), 3200);
  }
  function tapCat(a) {
    unlock("pet");
    petFeed(a, "fun", 12);
    if (a.base === "sleep") a.interrupt([wait(1500, "sit")]);
    a.pop("heart");
    a.say(bubble(pick(t("fun.meow")), "heart"), 1600);
  }
  function grab(a) {
    a.mode = "held"; a.queue = []; a.task = null; a.perch = null; a.land = null;
    a.setFrame(a === me ? "held" : a.jumpFrame || a.rest);
    if (a === me) me.say(bubble(t("fun.hey"), "skull"), 1200);
    else if (a.kind === "cat") a.say(bubble("mrrp?", "cat"), 1200);
  }
  function bind(a, onTap, onHover) {
    a.el.addEventListener("pointerdown", (e) => {
      if (ko || a.locked) return;
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
          a.setFrame(a === me ? "held" : a.jumpFrame || a.rest);
          if (a.onThrow) a.onThrow();
        }
        else onTap(a);
      };
      a.el.addEventListener("pointermove", move);
      a.el.addEventListener("pointerup", up);
      a.el.addEventListener("pointercancel", up);
    });
    a.el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && !ko && a.mode !== "held") onHover(a); });
  }
  function hoverMe() {
    if (now() - (me.saidAt || 0) < 2500) return;
    if (resting(me)) { wake(me); return; }
    if (me.mode === "ground") me.emoteFor("wave", 1300);
    me.say(nextLine(), 3200);
  }
  function hoverCat(a) { if (now() - (a.saidAt || 0) > 3000) a.say(petStatus(a), 2600); }
  bind(me, tapMe, hoverMe);
  me.onThrow = () => unlock("toss");

  function spawnCat(theme, fromButton) {
    cat = makeCat(theme);
    bind(cat, tapCat, hoverCat);
    const btn = $("#toggle-theme");
    const b = btn && btn.getBoundingClientRect();
    if (fromButton && b && b.width) {
      cat.x = clamp(b.left + b.width / 2 - cat.w / 2, 4, cat.maxX()); cat.y = b.bottom - cat.h / 2;
      cat.mode = "air"; cat.vx = rand(-160, -60); cat.vy = -260; cat.setFrame("jump");
      cat.onLand = () => { cat.setFrame("sit"); cat.say(bubble(pick(t("fun.meow")), "heart"), 1600); cat.onLand = () => cat.setFrame("sit"); };
    } else {
      cat.x = clamp(me.x + me.w + 40, 4, cat.maxX());
    }
  }

  // The theme button: the cat comes over to look at it; switching themes swaps the cats.
  const themeBtn = $("#toggle-theme");
  if (themeBtn) themeBtn.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse" || !cat || ko || cat.mode !== "ground" || !cat.soft || cat.base === "sleep" || S.reduced()) return;
    const b = themeBtn.getBoundingClientRect();
    cat.interrupt([walk(b.left + b.width / 2 - cat.w / 2, 90), act(() => cat.say(bubble(t("fun.curious"), "cat"), 1500)), wait(2200, "sit")]);
  });
  // Switching themes: the new cat drops out of the button, the two meet (a nose boop, or a chase), and the old one leaves.
  const leaveDir = (c) => (c.cx() < innerWidth / 2 ? -1 : 1);
  // Both cats walk up to each other until they are nose to nose.
  function pairUp(a, b) {
    const left = a.cx() <= b.cx() ? a : b;
    const mid = clamp((a.cx() + b.cx()) / 2, a.w + 10, innerWidth - a.w - 10);
    const here = new Set();
    const arrive = (c) => {
      const isLeft = c === left;
      return [
        walk(isLeft ? mid - c.w + 6 : mid - 6, 110),
        act(() => { c.face = isLeft ? 1 : -1; c.setFrame("sit"); here.add(c); }),
        until(() => here.size === 2),
      ];
    };
    return arrive;
  }
  const meow = (c, icon) => act(() => c.say(bubble(pick(t("fun.meow")), icon), 1400));
  function greetCats(a, b) {
    if (!b || !actors.includes(b) || b.mode !== "ground" || b.leaving) return;
    unlock("cats");
    const arrive = pairUp(a, b);
    a.interrupt([...arrive(a), wait(300, "sit"), act(() => a.pop("heart")), meow(a, "heart"), wait(2200, "sit")]);
    b.interrupt([...arrive(b), wait(800, "sit"), act(() => b.pop("heart")), meow(b, "heart"), wait(2200, "sit")]);
  }
  function meetCats(old, fresh) {
    unlock("cats");
    const arrive = pairUp(old, fresh);
    if (Math.random() < 0.6) {   // boop
      old.interrupt([...arrive(old), wait(250, "sit"), act(() => old.pop("heart")), meow(old, "heart"), wait(1600, "sit"), act(() => { old.runOff = leaveDir(old); })]);
      fresh.interrupt([...arrive(fresh), wait(800, "sit"), act(() => fresh.pop("heart")), meow(fresh, "heart"), wait(2400, "sit")]);
    } else {                     // chase
      old.interrupt([...arrive(old), wait(600, "sit"), act(() => old.say(bubble(t("fun.scared"), "cat"), 1000)), act(() => { old.runOff = leaveDir(old); })]);
      fresh.interrupt([...arrive(fresh), wait(500, "paw"), meow(fresh, "fire"), wait(150, "sit"),
        walk(() => (old.runOff < 0 ? 4 : fresh.maxX()), 260), wait(700, "sit"), act(() => fresh.say(bubble("prrr", "heart"), 1400))]);
    }
  }
  document.addEventListener("site:theme", (e) => {
    if (!cat || ko) return;
    const info = CATS[e.detail] || CATS.dark, old = cat;
    if (old.name === info.name) return;
    if (S.reduced() || layer.hidden) {
      actors.filter((a) => a.kind === "cat").forEach((a) => a.remove());
      visitor = null;
      spawnCat(e.detail, false);
      return;
    }
    // the incoming cat may already be here (visiting, or still running off after a quick double switch): bring that one back
    const back = catNamed(info.name);
    actors.forEach((a) => { if (a.kind === "cat" && a.leaving && !a.runOff && a !== back) a.runOff = leaveDir(a); });
    old.leaving = true; old.visitor = false; old.brain = () => {}; old.queue = []; old.task = null;
    if (old === visitor) visitor = null;
    if (back) {
      back.leaving = false; back.runOff = 0; back.visitor = false; back.brain = catBrain; back.queue = []; back.task = null;
      if (back.x < 4 || back.x > back.maxX()) back.entering = true;
      if (back === visitor) visitor = null;
      cat = back;
      if (old.mode === "ground" && back.mode === "ground" && !back.entering) meetCats(old, back); else old.runOff = leaveDir(old);
      return;
    }
    if (old.mode !== "ground") old.runOff = leaveDir(old);
    else old.interrupt([wait(5000, "sit")]);       // waits for the newcomer to land
    spawnCat(e.detail, true);
    const fresh = cat;
    fresh.onLand = () => {
      fresh.setFrame("sit");
      fresh.onLand = () => fresh.setFrame("sit");
      if (!old.runOff && old.mode === "ground" && actors.includes(old)) meetCats(old, fresh);
      else fresh.say(bubble(pick(t("fun.meow")), "heart"), 1600);
    };
  });

  // ================================================================ toys: yarn (drag, throw or tap it) and a laser dot (hold Shift)
  const chaseYarn = () => ({
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
  let laser = false;
  function setLaser(on) {
    if (laser === on) return;
    laser = on; dot.hidden = !on;
    root.classList.toggle("px-laser-on", on);
    if (on) unlock("laser");
  }
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Shift" || e.repeat || ko || layer.hidden || S.reduced() || !finePointer.matches || S.paletteOpen()) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) || now() - mouse.t > 5000) return;
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
    if (ko || layer.hidden) return;
    const fish = new Actor("fish", { fish: P.PROPS.fish }, P.PAL, "fish", ["fish"], 100);
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
      act(() => { if (actors.includes(fish)) fish.remove(); petFeed(c, "food", 40); c.pop("heart"); c.say(bubble(t("fun.nom"), "heart"), 1500); }),
      wait(1600, "sit"),
    ]);
  }
  window.addEventListener("dblclick", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (ko || layer.hidden || e.clientY < innerHeight - 100 || (el && el.closest("a, button, input, textarea, select, label, [contenteditable]"))) return;
    try { getSelection().removeAllRanges(); } catch (err) { /* nothing selected */ }
    dropTreat(e.clientX, e.clientY - 24);
  });
  function treatFromPalette() {
    if (layer.hidden) togglePets();
    const c = cat;
    dropTreat(c ? c.cx() + (c.cx() < innerWidth / 2 ? 90 : -90) : innerWidth / 2, innerHeight * 0.5);
  }

  // ================================================================ the other cat drops by now and then
  let visitCool = now() + rand(40000, 70000);
  function maybeVisit() {
    if (visitor || ko || layer.hidden || S.reduced() || !cat || now() < visitCool) return;
    visitCool = now() + rand(80000, 140000);
    if (Math.random() < 0.35) return;
    summonVisitor(false);
  }
  function summonVisitor(fromNearestEdge) {
    if (visitor || ko || layer.hidden || S.reduced() || !cat) return;
    const theme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    if (catNamed((CATS[theme] || CATS.dark).name)) return;   // that cat is already on screen
    const v = makeCat(theme);
    bind(v, tapCat, hoverCat);
    visitor = v; v.visitor = true; v.entering = true; v.leaveAt = now() + rand(45000, 80000);
    const fromLeft = fromNearestEdge ? me.cx() < innerWidth / 2 : Math.random() < 0.5;
    v.x = fromLeft ? -v.w - 10 : innerWidth + 10; v.face = fromLeft ? 1 : -1;
    v.interrupt([walk(() => clamp(cat.cx() + (fromLeft ? -150 : 150), 4, v.maxX()), 90), act(() => greetCats(v, cat))]);
  }

  // ================================================================ virtual pets: food, energy and fun for each cat, plus the litter box.
  // Values drift down over time (also while you are away, up to a day) and go up with treats, play, petting, naps and cleaning.
  const freshPet = () => ({ food: 60, energy: 80, fun: 60 });
  let petState = { capitu: freshPet(), sancho: freshPet(), box: 65, t: Date.now() };
  try {
    const saved = JSON.parse(store.get("px-pets") || "null");
    if (saved && saved.capitu && saved.sancho) petState = saved;
  } catch (e) { /* start fresh */ }
  function petDecay(mins) {
    for (const id of ["capitu", "sancho"]) {
      const q = petState[id];
      q.food = clamp(q.food - mins * 0.6, 0, 100);
      q.fun = clamp(q.fun - mins * 0.8, 0, 100);
      q.energy = clamp(q.energy - mins * 0.3, 0, 100);
    }
    petState.box = clamp(petState.box - mins * 0.4, 0, 100);
  }
  petDecay(clamp((Date.now() - (petState.t || Date.now())) / 60000, 0, 1440));
  const petOf = (c) => petState[c.catId];
  function petFeed(c, key, amount) { const q = c && petOf(c); if (q) q[key] = clamp(q[key] + amount, 0, 100); }
  let petSaveAt = 0;
  function tickPets(dt) {
    petDecay(dt / 60);
    cats().forEach((c) => { if (c.base === "sleep") petFeed(c, "energy", dt * 2.5); });
    if (now() > petSaveAt) { petState.t = Date.now(); store.set("px-pets", JSON.stringify(petState)); petSaveAt = now() + 5000; }
  }
  const bar = (v) => `<span class="px-bar"><i style="width:${Math.round(v)}%"></i></span>`;
  function petStatus(c) {
    const q = petOf(c);
    if (!q) return bubble(c.name, "cat");
    return `<span class="px-txt px-status"><b>${c.name}</b>` +
      `<span>${t("fun.pet.food")}</span>${bar(q.food)}<span>${t("fun.pet.energy")}</span>${bar(q.energy)}<span>${t("fun.pet.fun")}</span>${bar(q.fun)}</span>`;
  }
  // A small pixel card (dialog) used by the achievements list and the pets panel.
  function openCard(cls, title, sub, html, closeText) {
    if (ko || document.querySelector(".ko-card")) return null;
    const back = document.activeElement;
    const box = document.createElement("div");
    box.className = "ko-card " + cls;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", cls + "-title");
    box.innerHTML = `<h2 id="${cls}-title"></h2><p class="ko-body"></p>${html}<button class="btn btn-ghost" type="button"></button>`;
    box.querySelector("h2").textContent = title;
    box.querySelector(".ko-body").textContent = sub;
    const btn = box.querySelector("button");
    btn.textContent = closeText;
    const close = () => {
      box.remove();
      S.pageRegions().forEach((el) => el.removeAttribute("inert"));
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
    btn.addEventListener("click", close);
    box.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") { e.preventDefault(); btn.focus(); }
    });
    document.body.append(box);
    S.pageRegions().forEach((el) => el.setAttribute("inert", ""));
    btn.focus();
    return box;
  }
  function showPets() {
    const rows = Object.values(CATS).map((info) => {
      const q = petState[info.id];
      return `<li><b>${info.name}</b><span>${t("fun.pet.food")}</span>${bar(q.food)}<span>${t("fun.pet.energy")}</span>${bar(q.energy)}<span>${t("fun.pet.fun")}</span>${bar(q.fun)}</li>`;
    }).join("");
    openCard("px-pets", t("fun.pet.title"), "", `<ul class="px-pet-list">${rows}<li><b>${t("fun.pet.box")}</b>${bar(petState.box)}</li></ul>`, t("fun.pet.close"));
  }
  function cleanLitter() {
    if (ko) return;
    if (layer.hidden) togglePets();
    me.interrupt([]);
    me.soft = false;
    sceneLitter();
  }

  // ================================================================ seasons and weather (both can be switched from the palette)
  const SEASONS = ["auto", "natal", "inverno", "primavera", "verao", "outono"];
  const WEATHERS = ["auto", "neve", "chuva", "sol", "folhas", "petalas", "limpo"];
  let season = SEASONS.includes(store.get("px-season")) ? store.get("px-season") : "auto";
  let weather = WEATHERS.includes(store.get("px-weather")) ? store.get("px-weather") : "auto";
  function autoSeason() {   // Brazil: Christmas from November on, then summer, autumn, winter, spring
    const m = new Date().getMonth();
    return m >= 10 ? "natal" : m <= 1 ? "verao" : m <= 4 ? "outono" : m <= 7 ? "inverno" : "primavera";
  }
  const effSeason = () => (season === "auto" ? autoSeason() : season);
  const effWeather = () => (weather !== "auto" ? weather : { natal: "neve", inverno: "neve", outono: "folhas", primavera: "petalas", verao: "sol" }[effSeason()] || "limpo");
  const HAT_OF = { natal: "santa", inverno: "beanie", verao: "shades", primavera: "flower" };
  // headwear sits over the head; where the head is depends on the frame (standing, sitting, lying down)
  me.hat = document.createElement("div");
  me.hat.className = "px-hat";
  me.el.append(me.hat);
  const headOf = {};
  function headPos(f) {
    if (!headOf[f]) { const rows = P.FRAMES[f]; headOf[f] = { x: f === "lie" ? 0 : 8, y: rows.findIndex((r) => r.includes("H")) }; }
    return headOf[f];
  }
  function applySeason() {
    root.dataset.season = effSeason();
    const hat = P.HATS[HAT_OF[effSeason()]];
    me.hatDy = hat ? hat.dy : 0;
    me.hat.innerHTML = hat ? P.toSvg(hat.rows) : "";
    me.hat.hidden = !hat;
    me.hatFrame = "";
  }
  function placeHat() {
    if (me.hat.hidden) return;
    const f = me.emote && now() < me.emote.until ? me.emote.frame : me.base, key = f + me.face;
    if (key === me.hatFrame) return;
    me.hatFrame = key;
    const u = unit(), hp = headPos(f), x = me.face < 0 ? 32 - hp.x - 16 : hp.x;
    me.hat.style.width = 16 * u + "px";
    me.hat.style.transform = `translate(${x * u}px, ${(hp.y + me.hatDy) * u}px)` + (me.face < 0 ? " scaleX(-1)" : "");
  }
  // the sky: a canvas behind everything for snow, rain, leaves and petals; snow piles up on the floor
  const sky = document.createElement("canvas");
  sky.className = "px-sky";
  layer.insertBefore(sky, layer.firstChild);
  let flakes = [], snowDepth = 0, tree = null;
  const sizeSky = () => { sky.width = innerWidth; sky.height = innerHeight; };
  sizeSky();
  window.addEventListener("resize", sizeSky);
  const SKY_N = { neve: 90, chuva: 110, folhas: 26, petalas: 30 };
  function newFlake(w, top) {
    return { x: rand(-20, innerWidth + 20), y: top ? rand(-innerHeight, 0) : -10, v: w === "chuva" ? rand(650, 850) : w === "neve" ? rand(35, 75) : rand(45, 80),
      ph: rand(0, 6.28), s: w === "neve" ? pick([2, 2, 3]) : 3, c: w === "folhas" ? pick(["#c2410c", "#d97706", "#92400e"]) : w === "petalas" ? pick(["#f9a8d4", "#fbcfe8", "#f472b6"]) : "#fff" };
  }
  let skyDrew = false;
  function tickSky(dt, ts) {
    const w = effWeather(), g = sky.getContext("2d");
    const draws = !ko && (w === "sol" || snowDepth > 0.5 || (!S.reduced() && (SKY_N[w] || 0) > 0) || (effSeason() === "natal" && !tree));
    if (!draws && !skyDrew) return;
    g.clearRect(0, 0, sky.width, sky.height);
    skyDrew = draws;
    if (ko) return;
    if (w === "sol") {
      const grad = g.createRadialGradient(sky.width - 60, 80, 10, sky.width - 60, 80, 260);
      grad.addColorStop(0, "rgba(250,204,21,.22)"); grad.addColorStop(1, "rgba(250,204,21,0)");
      g.fillStyle = grad; g.fillRect(0, 0, sky.width, 360);
    }
    const n = S.reduced() ? 0 : SKY_N[w] || 0;
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
      else { g.fillStyle = f.c; g.globalAlpha = w === "neve" ? 0.85 : 1; g.fillRect(Math.round(f.x), Math.round(f.y), f.s, w === "neve" ? f.s : 2); g.globalAlpha = 1; }
    }
    if (w !== "neve") snowDepth = Math.max(0, snowDepth - dt * 0.4);
    if (snowDepth > 0.5) {
      g.fillStyle = "#f8fafc";
      const h = Math.round(snowDepth);
      for (let x = 0; x < sky.width; x += 6) { const bump = (Math.sin(x * 0.07) + 1) * 0.8; g.fillRect(x, innerHeight - h - Math.round(bump), 6, h + 2); }
    }
    // a little Christmas tree in the corner, lights blinking
    if (effSeason() === "natal" && !tree && !layer.hidden) {
      const u = unit();
      tree = prop(["tree1", "tree2"], innerWidth - 10 * u - 12, { every: 520, quiet: true, keep: () => effSeason() === "natal" && !ko });
    }
    if (tree && !props.has(tree)) tree = null;
  }
  const weatherName = () => (weather === "auto" ? `${t("fun.weather.auto")} (${t("fun.weather." + effWeather())})` : t("fun.weather." + weather));
  const seasonName = () => (season === "auto" ? `${t("fun.season.auto")} (${t("fun.season." + effSeason())})` : t("fun.season." + season));
  function cycleWeather() {
    weather = WEATHERS[(WEATHERS.indexOf(weather) + 1) % WEATHERS.length];
    store.set("px-weather", weather);
    flakes = [];
    if (layer.hidden) togglePets();
    S.toast(t("palette.cmds.weather").split("{v}")[0] + weatherName());
  }
  function cycleSeason() {
    season = SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length];
    store.set("px-season", season);
    applySeason();
    flakes = [];
    if (layer.hidden) togglePets();
    S.toast(seasonName());
  }

  // ================================================================ reacting to what the visitor does on the page
  function react(text, icon, emote) {
    if (ko || layer.hidden || me.locked) return;
    if (!resting(me) && me.mode === "ground" && emote) me.emoteFor(emote, 1200);
    me.say(bubble(text, icon), 2200);
  }
  document.addEventListener("click", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!e.isTrusted || !el) return;
    if (el.closest("[data-copy-email]")) react(t("fun.thanks"), "heart", "held");
    if (el.closest("#core")) unlock("coin");
  });
  document.addEventListener("site:lang", () => react(t("fun.hello"), "heart", "wave"));
  document.addEventListener("site:game", (e) => {
    const k = e.detail && e.detail.kind;
    if (k === "perfect") { unlock("perfect"); if (now() - (me.saidAt || 0) > 1500) react(t("fun.cheer"), "star", "held"); }
    else if (k === "miss") react(t("fun.almost"), "skull");
  });
  const footerEl = $(".footer");
  if (footerEl && "IntersectionObserver" in window) {
    let waved = false;
    new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || waved || ko) return;
      waved = true;
      unlock("bottom");
      react(t("fun.bye"), "heart", "wave");
    }, { threshold: 0.6 }).observe(footerEl);
  }

  // ================================================================ achievements
  const ACHV = ["pet", "toss", "coin", "perfect", "treat", "yarn", "tangle", "laser", "cats", "litter", "wake", "dance", "flow", "photo", "bottom", "special", "rebuild", "bug", "conflict", "friday", "flag"];
  let got = new Set();
  try { got = new Set((JSON.parse(store.get("px-achv") || "[]") || []).filter((k) => ACHV.includes(k))); } catch (e) { /* corrupted: start over */ }
  const achvEl = document.createElement("div");
  achvEl.className = "px-achv";
  achvEl.setAttribute("role", "status");
  document.body.append(achvEl);
  let achvTimer = 0;
  const achvBtn = document.createElement("button");
  achvBtn.className = "icon-btn achv-btn";
  achvBtn.type = "button";
  achvBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/></svg><span class="achv-count"></span>';
  const themeToggle = $("#toggle-theme");
  if (themeToggle) themeToggle.parentNode.insertBefore(achvBtn, themeToggle);
  achvBtn.addEventListener("click", () => showAchievements());
  function updateAchvBtn() {
    achvBtn.querySelector(".achv-count").textContent = got.size ? String(got.size) : "";
    achvBtn.setAttribute("aria-label", `${t("fun.achv.title")} (${got.size}/${ACHV.length})`);
  }
  document.addEventListener("site:lang", updateAchvBtn);
  function unlock(k) {
    if (got.has(k) || !ACHV.includes(k)) return;
    got.add(k);
    store.set("px-achv", JSON.stringify([...got]));
    updateAchvBtn();
    achvEl.innerHTML = `${emo("trophy")}<span><small>${t("fun.achv.unlocked")} · ${got.size}/${ACHV.length}</small><b>${t("fun.achv.items." + k)}</b></span>`;
    achvEl.classList.remove("show"); void achvEl.offsetWidth; achvEl.classList.add("show");
    clearTimeout(achvTimer);
    achvTimer = setTimeout(() => achvEl.classList.remove("show"), 3800);
  }
  function showAchievements() {
    const items = ACHV.map((k) => (got.has(k)
      ? `<li class="got">${emo("trophy")}<span>${t("fun.achv.items." + k)}</span></li>`
      : `<li><span class="px-emo px-lock"></span><span>${t("fun.achv.locked")}</span></li>`)).join("");
    openCard("px-achv-list", t("fun.achv.title"), `${got.size}/${ACHV.length}`, `<ul>${items}</ul>`, t("fun.achv.close"));
  }

  // ================================================================ "The Bug": type b-u-g to summon it; the special attack squashes it
  let bug = null, fighting = false;
  // Villains: the Bug, Merge Conflict (two bugs, HEAD and main) and Friday Deploy (red, with a siren, eats fast).
  const VILLAINS = {
    bug: { cls: "", lines: "fun.bug.lines", arrive: "fun.bug.arrive", gap: [1400, 2600], achv: "bug" },
    conflict: { cls: "px-conflict", lines: "fun.villain.conflict.lines", arrive: "fun.villain.conflict.arrive", gap: [1000, 1900], achv: "conflict", twin: true },
    friday: { cls: "px-friday", lines: "fun.villain.friday.lines", arrive: "fun.villain.friday.arrive", gap: [700, 1300], achv: "friday" },
  };
  function summonBug(kind = "bug", from, force) {
    if (bug || ko || fighting) return;
    if (layer.hidden) { if (!force) return; togglePets(); }
    const v = VILLAINS[kind] || VILLAINS.bug;
    const u = unit(), w = 16 * u * 1.5 * (v.twin ? 2 : 1), h = 13 * u * 1.5;
    const el = document.createElement("div");
    el.className = "px-bug " + v.cls;
    el.style.width = w + "px"; el.style.height = h + "px";
    const spr = document.createElement("div");
    spr.className = "px-sprite";
    const bub = document.createElement("div");
    bub.className = "px-bubble";
    el.append(spr, bub);
    layer.append(el);
    bug = {
      el, spr, bub, w, h, kind, v, x: from ? from.x - w / 2 : innerWidth / 2 - w / 2, y: from ? from.y - h / 2 : -h - 30,
      tx: innerWidth * rand(0.3, 0.7) - w / 2, ty: rand(140, innerHeight * 0.45),
      svgs: [P.BUG.bug1, P.BUG.bug2].map((f) => (v.twin ? P.toSvg(f) + P.toSvg(f) : P.toSvg(f))), frame: -1, leaveAt: now() + 60000, leaving: false,
      nextLine: now() + 5000, nextGlitch: now() + 3000, nextHiss: now() + 4000, nextBite: now() + 5000, bites: 0, food: null, eating: null,
    };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); if (bug && !bug.leaving) bugSay(bubble(t("fun.bug.poke"), "skull"), 2000); });
    if (from) { flash(from.x, from.y); burst(from.x, from.y, ["#7c3aed", "#a78bfa", "#e11d48"], 16); }
    setTimeout(() => { if (bug && !bug.leaving) bugSay(bubble(t(v.arrive), "skull"), 2800); }, 900);
    if (!me.locked) {
      me.face = bug.tx + w / 2 > me.cx() ? 1 : -1;
      if (me.mode === "ground" && !resting(me)) me.emoteFor("held", 900);
      me.say(bubble(t("fun.bug.meScared"), "skull"), 2000);
    }
    cats().forEach((c) => { c.say(bubble(t("fun.bug.hiss"), "cat"), 1500); if (c.mode === "ground" && !S.reduced()) launch(c, c.x, c.floor(), 0.4); });
  }
  const bugSay = (html, ms) => Actor.prototype.say.call(bug, html, ms);
  function removeBug() { if (!bug) return; clearTimeout(bug.bubTimer); bug.el.remove(); bug = null; }
  // Bites: a clip-path whose left edge has teeth marks and moves right in steps.
  const eaten = [];
  const bite = (p) => {
    const pts = [`${p}% 0`, "100% 0", "100% 100%", `${p}% 100%`];
    for (let i = 1; i < 6; i++) pts.push(`${p + (i % 2 ? 5 : 0)}% ${(100 - (i * 100) / 6).toFixed(1)}%`);
    return `polygon(${pts.join(", ")})`;
  };
  const FOOD = "#main h2, #main .kicker, #main p, #main .btn, .chips li, .tech, .impact-card, .job-head, .nav-links a, .brand, .kbd-btn";
  function pickFood() {
    const list = [...document.querySelectorAll(FOOD)].filter((el) => {
      if (el.closest("[data-eaten]")) return false;
      const r = el.getBoundingClientRect();
      return r.top > 70 && r.bottom < innerHeight - 100 && r.width > 20 && r.width < innerWidth * 0.85 && r.height < innerHeight * 0.5;
    });
    return list.length ? pick(list) : null;
  }
  function startEating(b, el) {
    const r = el.getBoundingClientRect(), dur = clamp(r.width * 7, 1000, 2800);
    el.dataset.eaten = "1";
    eaten.push(el);
    const anim = el.animate([-6, 15, 35, 55, 75, 100].map((pc) => ({ clipPath: bite(pc), easing: "steps(1, end)" })), { duration: dur, fill: "forwards" });
    anim.onfinish = () => { el.style.clipPath = bite(100); anim.cancel(); };
    b.eating = { el, r, t0: now(), dur, anim };
    bugSay(bubble(t("fun.bug.chomp"), "skull"), 1400);
    if (b.bites === 0 && !me.locked) me.say(bubble(finePointer.matches ? t("fun.bug.eating") : t("fun.bug.eatingTouch"), "skull", finePointer.matches ? keyCaps() : ""), 3600);
  }
  function regrow(slow) {
    const list = eaten.splice(0);
    list.forEach((el, i) => setTimeout(() => {
      el.getAnimations().forEach((an) => an.cancel());
      const back = el.animate([{ clipPath: bite(100) }, { clipPath: bite(-6) }], { duration: 500, easing: "steps(5, end)" });
      const done = () => { el.style.clipPath = ""; delete el.dataset.eaten; };
      back.onfinish = done; back.oncancel = done;
    }, i * (slow ? 260 : 70)));
    return list.length;
  }
  function glitchSomething() {
    const list = [...document.querySelectorAll("#main h2, #main .kicker, #main .btn, .nav-links a")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.width > 0;
    });
    const el = pick(list);
    if (!el) return;
    el.classList.add("px-glitch");
    setTimeout(() => el.classList.remove("px-glitch"), 650);
  }
  function tickBug(dt, ts) {
    const b = bug;
    if (!b) return;
    if (!b.leaving && !b.eating && !fighting && (now() > b.leaveAt || b.bites >= 10)) {
      b.leaving = true; b.food = null;
      bugSay(bubble(t("fun.bug.leave"), "skull"), 2200);
      b.tx = b.x; b.ty = -b.h - 120;
    }
    if (b.eating && !fighting) {
      // chewing along the element, left to right
      const e = b.eating, k = clamp((now() - e.t0) / e.dur, 0, 1);
      b.x = e.r.left - b.w * 0.35 + e.r.width * k; b.y = e.r.top + e.r.height / 2 - b.h / 2;
      if (k >= 1) { b.eating = null; b.bites++; b.nextBite = now() + rand(b.v.gap[0], b.v.gap[1]); }
    } else {
      if (!b.leaving && !fighting && !b.food && now() > b.nextBite) {
        const el = pickFood();
        if (el) { const r = el.getBoundingClientRect(); b.food = el; b.tx = r.left - b.w * 0.35; b.ty = r.top + r.height / 2 - b.h / 2; }
        else b.nextBite = now() + 1200;
      }
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy), sp = b.leaving ? 240 : b.food ? 200 : 130;
      if (d > 3) { b.x += (dx / d) * Math.min(d, sp * dt); b.y += (dy / d) * Math.min(d, sp * dt); }
      else if (b.leaving) {
        removeBug();
        setTimeout(() => { if (regrow(true) && !me.locked) me.say(bubble(t("fun.bug.regrow"), "heart"), 2600); }, 600);
        return;
      } else if (b.food) {
        const el = b.food; b.food = null;
        const r = el.getBoundingClientRect();
        if (r.top > 60 && r.bottom < innerHeight - 90 && !el.closest("[data-eaten]")) startEating(b, el); else b.nextBite = now() + 600;
      } else if (!fighting) { b.tx = rand(20, innerWidth - b.w - 20); b.ty = rand(140, innerHeight * 0.5); }
    }
    const f = Math.floor(ts / 140) % 2;
    if (f !== b.frame) { b.frame = f; b.spr.innerHTML = b.svgs[f]; }
    const bob = S.reduced() ? 0 : Math.sin(ts / 260) * 6;
    b.el.style.transform = `translate3d(${Math.round(b.x)}px, ${Math.round(b.y + bob)}px, 0)`;
    if (b.leaving || fighting) return;
    if (now() > b.nextLine) { bugSay(bubble(pick(t(b.v.lines)), "skull"), 2400); b.nextLine = now() + rand(5000, 8000); }
    if (now() > b.nextGlitch && !S.reduced() && !b.eating) { glitchSomething(); b.nextGlitch = now() + rand(3000, 5000); }
    if (now() > b.nextHiss) { const c = pick(cats()); if (c) c.say(bubble(t("fun.bug.hiss"), "cat"), 1200); b.nextHiss = now() + rand(5000, 9000); }
  }
  async function fightBug() {
    if (fighting || !bug) return;
    fighting = true;
    const b = bug, reduced = S.reduced();
    b.leaveAt = Infinity; b.leaving = false; b.food = null; b.tx = b.x; b.ty = b.y;
    if (b.eating) { b.eating.anim.cancel(); b.eating = null; }
    me.locked = true; me.queue = []; me.task = null; me.perch = null; me.land = null;
    if (me.mode !== "ground") { me.mode = "ground"; me.vx = me.vy = 0; }
    me.y = me.floor();
    const dir = b.x + b.w / 2 > me.cx() ? 1 : -1;
    me.face = dir;
    setPower(true);
    me.setFrame("charge");
    me.say(bubble(t("fun.shout"), "fire"), 1500);
    await sleep(reduced ? 200 : 600);
    me.setFrame("release");
    if (!reduced) await shoot(dir, b.x + b.w / 2, b.y + b.h / 2);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    bugSay(bubble(t("fun.bug.hit"), "skull"), 700);
    flash(cx, cy);
    burst(cx, cy, ["#7c3aed", "#a78bfa", "#e11d48", "#18181b"], 28);
    const beaten = b.v.achv;
    removeBug();
    unlock("bug"); unlock(beaten);
    regrow(false);
    await sleep(350);
    me.locked = false; me.setFrame("idle");
    me.emoteFor("held", 1200);
    me.say(bubble(t("fun.bug.meWin"), "star"), 2400);
    cats().forEach((c) => c.pop("heart"));
    setPower(true, 8000);
    fighting = false;
  }

  // ================================================================ a tiny bug crawls along the top of a card now and then;
  // the dev points at it ("don't click it!") and clicking it wakes a villain up
  let tiny = null, tinyCool = now() + rand(25000, 45000);
  function spawnTiny() {
    const hosts = [...document.querySelectorAll(".impact-card, .tech, .job, .project, .contact-card, .chips li")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top > 110 && r.bottom < innerHeight - 120 && r.width > 60;
    });
    const host = pick(hosts);
    if (!host) return;
    const el = document.createElement("div");
    el.className = "px-tiny";
    el.innerHTML = P.toSvg(P.PROPS.tiny);
    el.title = "?";
    layer.append(el);
    tiny = { el, host, k: Math.random(), dir: Math.random() < 0.5 ? -1 : 1, until: now() + 18000 };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      removeTiny();
      summonBug(pick(["bug", "bug", "conflict", "friday"]), { x: r.left + r.width / 2, y: r.top + r.height / 2 }, true);
    });
  }
  function removeTiny() { if (tiny) { tiny.el.remove(); tiny = null; } }
  function tickTiny(dt, ts) {
    if (!tiny) {
      if (!ko && !bug && !layer.hidden && !S.reduced() && now() > tinyCool) { tinyCool = now() + rand(60000, 110000); spawnTiny(); }
      return;
    }
    const r = tiny.host.getBoundingClientRect();
    if (now() > tiny.until || bug || ko || r.bottom < 0 || r.top > innerHeight) { removeTiny(); return; }
    tiny.k += tiny.dir * dt * (40 / Math.max(60, r.width));
    if (tiny.k < 0 || tiny.k > 1) { tiny.dir *= -1; tiny.k = clamp(tiny.k, 0, 1); }
    const step = Math.floor(ts / 120) % 2;
    tiny.el.style.transform = `translate(${Math.round(r.left + tiny.k * (r.width - 12))}px, ${Math.round(r.top - 9 - step)}px) scaleX(${tiny.dir})`;
  }
  function issue() { summonBug(pick(["bug", "conflict", "friday"]), null, true); }

  // ================================================================ photo mode: a PNG of the floor scene
  function svgImage(svgEl, w, h) {
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", SVGNS);
    clone.setAttribute("width", String(w)); clone.setAttribute("height", String(h));
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(clone.outerHTML);
    return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url; });
  }
  async function photo() {
    if (ko) return;
    if (layer.hidden) togglePets();
    const H = Math.min(280, innerHeight), W = innerWidth, top = innerHeight - H, k = 2;
    const cv = document.createElement("canvas");
    cv.width = W * k; cv.height = H * k;
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.scale(k, k);
    g.fillStyle = getComputedStyle(document.body).backgroundColor || "#09090b";
    g.fillRect(0, 0, W, H);
    g.drawImage(sky, 0, top, W, H, 0, 0, W, H);
    if (rope.length > 1) {
      g.strokeStyle = "#fb7185"; g.lineWidth = 2; g.beginPath();
      rope.forEach((q, i) => (i ? g.lineTo(q.x, q.y - top) : g.moveTo(q.x, q.y - top)));
      g.lineTo(yarn.cx(), yarn.y + yarn.h / 2 - top); g.stroke();
    }
    const parts = [...layer.querySelectorAll(".px-prop svg, .px-actor .px-sprite svg, .px-hat svg, .px-bug .px-sprite svg")];
    for (const el of parts) {
      const r = el.getBoundingClientRect();
      if (r.bottom < top || r.width < 1) continue;
      const holder = el.closest(".px-sprite, .px-hat");
      const flip = holder && /scaleX\(-1\)/.test(holder.style.transform || "");
      try {
        const img = await svgImage(el, r.width, r.height);
        g.save();
        if (flip) { g.translate(r.left + r.width, r.top - top); g.scale(-1, 1); g.drawImage(img, 0, 0, r.width, r.height); }
        else g.drawImage(img, r.left, r.top - top, r.width, r.height);
        g.restore();
      } catch (e) { /* skip a sprite that fails to render */ }
    }
    g.fillStyle = "rgba(255,255,255,.75)";
    g.font = "500 12px 'Pixelify Sans', monospace";
    g.fillText("streeg.github.io", 10, 18);
    const a = document.createElement("a");
    a.download = "pixel-friends.png";
    a.href = cv.toDataURL("image/png");
    document.body.append(a); a.click(); a.remove();
    const fl = document.createElement("div");
    fl.className = "px-shutter";
    document.body.append(fl);
    setTimeout(() => fl.remove(), 400);
    unlock("photo");
    S.toast(t("fun.photoSaved"));
  }

  // ================================================================ confetti (pixel bits)
  function burst(x, y, colors, n = 30, spread = 1) {
    if (S.reduced()) return;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "px-bit";
      const size = pick([4, 5, 6]);
      el.style.width = el.style.height = size + "px";
      el.style.background = pick(colors);
      layer.append(el);
      const ang = rand(0, Math.PI * 2), sp = rand(80, 260) * spread;
      const dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp - 80;
      const anim = el.animate([
        { transform: `translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) rotate(${rand(-200, 200)}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x + dx * 1.3}px, ${y + dy + 260}px) rotate(${rand(-400, 400)}deg)`, opacity: 0 },
      ], { duration: rand(900, 1400), easing: "cubic-bezier(.2,.6,.4,1)" });
      anim.onfinish = () => el.remove();
    }
  }

  // ================================================================ capture the flag: the answer is only stored as a SHA-256 hash
  const FLAG_SHA256 = "b1cfa7e5013a58f3e7268ec0f035a62e838ab8fa41f10cd7d80f31a5e8d5fc4d";
  async function checkFlag(raw) {
    const v = String(raw || "").trim().toLowerCase();
    let hex = "";
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
      hex = [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
    } catch (e) { /* no WebCrypto (insecure context) */ }
    if (hex !== FLAG_SHA256) { S.toast(t("fun.flag.wrong")); return; }
    if (layer.hidden) togglePets();
    unlock("flag");
    S.toast(t("fun.flag.ok"));
    burst(innerWidth / 2, innerHeight * 0.35, ["#e11d48", "#a78bfa", "#facc15", "#38bdf8", "#4ade80"], 70, 1.6);
    if (!me.locked) { me.emoteFor("held", 1800); me.say(bubble(t("fun.flag.ok"), "trophy"), 3000); setPower(true, 6000); }
    cats().forEach((c) => c.pop("heart"));
  }

  // ================================================================ the yarn's thread: a rope that unspools from the ball,
  // hangs under gravity, drapes over the page's cards and buttons, snags on their edges and rides along when the page scrolls.
  const SVGNS = "http://www.w3.org/2000/svg";
  const thread = document.createElementNS(SVGNS, "svg");
  thread.setAttribute("class", "px-thread");
  const threadPath = document.createElementNS(SVGNS, "path");
  thread.append(threadPath);
  layer.insertBefore(thread, layer.firstChild);
  const SEG = 9, MAX_NODES = 240;
  const SNAG = ".btn, .tech, .impact-card, .job, .chips li, .project, .contact-card, .filter, .section-head h2, .nav";
  let rope = [], anchorX = null, rewinding = false, colliders = [], collidersAt = 0;
  window.addEventListener("scroll", () => { collidersAt = 0; }, { passive: true });
  function refreshColliders() {
    colliders = [...document.querySelectorAll(SNAG)].map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 8 && r.height > 8 && r.bottom > -80 && r.top < innerHeight + 80);
    collidersAt = now() + 160;
  }
  const ropeFloor = () => innerHeight - 3;
  function ropeReset() { rope = []; anchorX = null; }
  function collide(q) {
    if (q.y > ropeFloor()) { q.y = ropeFloor(); q.px = q.x - (q.x - q.px) * 0.5; }   // floor, with friction
    for (const r of colliders) {
      if (q.x <= r.left || q.x >= r.right || q.y <= r.top || q.y >= r.bottom) continue;
      const up = q.y - r.top, down = r.bottom - q.y, left = q.x - r.left, right = r.right - q.x, m = Math.min(up, down, left, right);
      if (m === up) { q.y = r.top - 0.5; q.px = q.x - (q.x - q.px) * 0.15; }   // resting on top: it snags
      else if (m === down) q.y = r.bottom + 0.5;
      else if (m === left) q.x = r.left - 0.5;
      else q.x = r.right + 0.5;
    }
  }
  function tickRope(dt) {
    if (!yarn || ko || layer.hidden) return;
    if (now() > collidersAt) refreshColliders();
    const bx = yarn.cx(), by = yarn.y + yarn.h / 2;
    if (anchorX == null) { anchorX = bx; rope = [{ x: bx, y: ropeFloor(), px: bx, py: ropeFloor() }]; }
    const a0 = rope[0];
    a0.x = a0.px = anchorX; a0.y = a0.py = ropeFloor();
    // unspool: there is always a bit more thread out than the straight distance back to where it started (never less than before);
    // the slack hangs or piles up on the floor like real thread
    const want = Math.min(MAX_NODES, Math.ceil((Math.hypot(bx - anchorX, by - ropeFloor()) * 1.25) / SEG) + 1);
    while (rope.length < want && !rewinding) rope.push({ x: bx, y: by, px: bx, py: by });
    // verlet: gravity and a little air drag
    const f = Math.min(2, dt * 60), g = 0.42 * f * f;
    for (let i = 1; i < rope.length; i++) {
      const q = rope[i], vx = (q.x - q.px) * 0.985, vy = (q.y - q.py) * 0.985;
      q.px = q.x; q.py = q.y; q.x += vx; q.y += vy + g;
    }
    // keep the segments from stretching (the anchor and the ball are fixed ends)
    for (let it = 0; it < 12; it++) {
      for (let i = 0; i < rope.length; i++) {
        const a = rope[i], endIsBall = i === rope.length - 1, b = endIsBall ? { x: bx, y: by } : rope[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 0.001;
        if (dist <= SEG) continue;
        const diff = (dist - SEG) / dist;
        if (i === 0 && endIsBall) continue;
        if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; }
        else if (endIsBall) { a.x += dx * diff; a.y += dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    }
    for (let i = 1; i < rope.length; i++) collide(rope[i]);
    // all the thread is out: the rope holds the ball back
    if (rope.length >= MAX_NODES && yarn.mode !== "held") {
      const q = rope[rope.length - 1], dx = bx - q.x, dy = by - q.y, dist = Math.hypot(dx, dy);
      if (dist > SEG * 1.6) { const k = 1 - (SEG * 1.6) / dist; yarn.x -= dx * k; yarn.y -= dy * k; yarn.vx *= 0.4; }
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
  function rewindYarn() {
    if (!yarn || ko || rewinding) return;
    if (layer.hidden) togglePets();
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
      if (yarn && yarn.mode === "held" && !rewinding) { yarn.x = a.cx() - a.face * a.w * 0.6 - yarn.w / 2; yarn.y = yarn.floor(); yarn.spin = (yarn.spin || 0) + a.face * 22; }
      return false;
    },
  });
  function tangle(c) {
    if (!yarn || rewinding || c.tangledUntil) return;
    c.tangledUntil = now() + rand(2800, 3800);
    c.el.classList.add("px-tangled");
    c.say(bubble(t("fun.tangled"), "skull"), 1500);
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

  // ================================================================ the main loop  // ================================================================ the main loop
  let raf = 0, last = 0, meYarnCool = 0;
  function loop(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    const reduced = S.reduced();
    for (const a of actors.slice()) {
      if (a.runOff) {
        a.x += a.runOff * 340 * dt; a.face = a.runOff;
        a.setFrame(a.gait[Math.floor(ts / 70) % a.gait.length]);
        a.y = a.floor();
        if (a.x < -a.w - 20 || a.x > innerWidth + 20) { a.remove(); continue; }
        a.draw(); continue;
      }
      if (a.leaving && a.mode === "ground" && !a.task && !a.queue.length) { a.runOff = leaveDir(a); continue; }
      if (a.visitor && now() > a.leaveAt && a.mode === "ground" && a.soft) {
        a.visitor = false; a.leaving = true; a.brain = () => {}; a.queue = []; a.task = null;
        a.say(bubble(pick(t("fun.meow")), "heart"), 1200);
      }
      if (laser && isCat(a) && !a.tangledUntil && !ko && !reduced) { chaseLaser(a, dt); step(a, dt, reduced); a.draw(); continue; }
      if (yarn && isCat(a) && !ko && !reduced && a.mode === "ground" && a.soft && a.base !== "sleep" && now() > (a.yarnCool || 0)
        && (Math.abs(yarn.vx) > 80 || yarn.mode === "air")) {
        a.yarnCool = now() + 2500;
        a.interrupt([chaseYarn(), wait(900, "sit")]);
      }
      if (!reduced && !ko) think(a, dt);
      step(a, dt, reduced);
      a.draw();
    }
    placeHat();
    if (!marker.hidden && (me.base !== "point" || ko)) marker.hidden = true;
    tickProps(ts);
    tickBug(dt, ts);
    tickRewind(dt);
    tickRope(dt);
    tickPets(dt);
    tickSky(dt, ts);
    tickTiny(dt, ts);
    // the dev and the yarn: he hops over it or stops it, or at least warns you
    if (yarn && !ko && !reduced && !me.locked && me.mode === "ground" && now() > meYarnCool && yarn.mode !== "held" && (Math.abs(yarn.vx) > 140 || yarn.mode === "air")) {
      const d = yarn.cx() - me.cx();
      if (Math.abs(d) < me.w * 0.9 && Math.sign(yarn.vx || 1) === -Math.sign(d || 1)) {
        meYarnCool = now() + 4000;
        const casual = ["idle", "walk1", "walk2", "walk3", "walk4", "wave", "point"].includes(me.base);
        if (!casual) me.say(bubble(t("fun.careful"), "skull"), 1600);
        else if (Math.random() < 0.5) { launch(me, me.x, me.floor(), 0.42); me.setFrame("held"); me.say(bubble(t("fun.hop"), "star"), 1300); }
        else { yarn.vx = -yarn.vx * 0.5; yarn.mode = "air"; yarn.vy = -220; me.emoteFor("point", 700); me.say(bubble(t("fun.careful"), "skull"), 1600); }
      }
    }
    actors.forEach((a) => { if (a.tangledUntil && now() > a.tangledUntil) untangle(a); });
    if (me.power && me.flowFromCode && !me.base.startsWith("code")) { me.flowFromCode = false; setPower(false); }
    if (laser) dot.style.transform = `translate(${mouse.x - 5}px, ${mouse.y - 5}px)`;
    if (!reduced) maybeVisit();
    // the cat chases the cursor when it comes down near the floor
    if (cat && !ko && !reduced && !laser && finePointer.matches && cat.mode === "ground" && cat.soft && cat.base !== "sleep" && ts > huntCool && now() - mouse.t < 1200) {
      const d = mouse.x - cat.cx();
      if (mouse.y > innerHeight - 110 && Math.abs(d) < 280 && Math.abs(d) > 30) {
        huntCool = ts + 4500;
        cat.interrupt([
          act(() => { cat.face = d > 0 ? 1 : -1; }),
          wait(450, "sit"),
          act(() => launch(cat, clamp(mouse.x - cat.w / 2, 4, cat.maxX()), cat.floor(), 0.42)),
          landed(),
          wait(900, "sit"),
        ]);
      }
    }
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !layer.hidden && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  window.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now(); } }, { passive: true });
  const activity = () => {
    const quiet = now() - lastInput;
    lastInput = now();
    if (quiet > 20000 && !ko && resting(me) && me.mode === "ground") {
      wake(me);
    }
  };
  ["pointermove", "keydown", "scroll", "touchstart"].forEach((ev) => window.addEventListener(ev, activity, { passive: true }));
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  window.addEventListener("resize", () => {
    actors.forEach((a) => { a.size(); if (a.mode === "ground") a.y = a.floor(); a.x = clamp(a.x, 4, a.maxX()); a.cache = {}; a.frame = ""; });
    props.forEach((pr) => dropProp(pr, true));
  });

  // ================================================================ special attack: the page falls, then rebuilds
  let ko = null;
  const SEQ = ["ArrowDown", "ArrowRight", "p"];
  let keys = [], lastKey = 0, typed = "";
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (document.activeElement || {}).tagName;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || S.paletteOpen() || document.querySelector(".ko-card")) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (/^[a-z]$/.test(k)) {
      typed = (typed + k).slice(-6);
      const word = ["bug", "merge", "sexta", "friday"].find((w) => typed.endsWith(w));
      if (word) { typed = ""; summonBug(word === "bug" ? "bug" : word === "merge" ? "conflict" : "friday"); }
    }
    if (now() - lastKey > 800) keys = [];
    lastKey = now();
    keys.push(k);
    if (keys.length > SEQ.length) keys.shift();
    if (keys.join() === SEQ.join()) { keys = []; e.preventDefault(); special(); }
  });

  function collectPieces() {
    const vw = innerWidth, vh = innerHeight, out = [];
    const visit = (el) => {
      if (out.length > 240) return;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === "contents" || r.width < 1 || r.height < 1) { [...el.children].forEach(visit); return; }   // zero-size wrappers (orbit nodes)
      if (r.bottom < -40 || r.top > vh + 40 || r.right < 0 || r.left > vw) return;
      if (cs.display === "inline") return;
      const kids = [...el.children].filter((k) => !/^(SCRIPT|STYLE|TEMPLATE)$/.test(k.tagName));
      const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const inlineKid = kids.some((k) => getComputedStyle(k).display === "inline");
      const animated = cs.animationName !== "none";   // spinning rings fall whole, still spinning
      const big = r.height > vh * 0.5 || r.width * r.height > vw * vh * 0.4;
      if (big && kids.length && !text && !inlineKid && !animated) kids.forEach(visit);
      else out.push(el);
    };
    ["#nav", "#main", ".footer"].forEach((s) => { const el = $(s); if (el) visit(el); });
    return out;
  }
  function makePiece(el) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const tr = cs.translate === "none" ? ["0px", "0px"] : cs.translate.split(" ");
    const p = {
      el, r, x: 0, y: 0, rot: 0,
      bx: tr[0] || "0px", by: tr[1] || "0px", br: cs.rotate === "none" ? 0 : parseFloat(cs.rotate) || 0,
      saved: { translate: el.style.translate, rotate: el.style.rotate, transition: el.style.transition, visibility: el.style.visibility, willChange: el.style.willChange },
      apply() {
        el.style.translate = `calc(${p.bx} + ${p.x.toFixed(1)}px) calc(${p.by} + ${p.y.toFixed(1)}px)`;
        el.style.rotate = `${(p.br + p.rot).toFixed(2)}deg`;
      },
    };
    el.style.transition = "none";
    el.style.willChange = "translate, rotate";
    return p;
  }
  function fall(pieces, ix, iy) {
    return new Promise((resolve) => {
      const t0 = now();
      let prev = t0;
      pieces.forEach((p) => {
        const cx = p.r.left + p.r.width / 2, cy = p.r.top + p.r.height / 2;
        const dx = cx - ix, dy = cy - iy, d = Math.hypot(dx, dy) || 1;
        const push = Math.max(0, 1 - d / 900) * 1000;
        p.vx = (dx / d) * push + rand(-70, 70);
        p.vy = (dy / d) * push * 0.6 - rand(120, 320);
        p.vr = rand(-120, 120) * (1 + push / 700);
        p.delay = d * 0.42 + rand(0, 160);
        p.limit = innerHeight - p.r.top + p.r.height * 0.7 + 60;
      });
      const tick = () => {
        const tn = now(), dt = Math.min(0.05, (tn - prev) / 1000);
        prev = tn;
        let alive = 0;
        for (const p of pieces) {
          if (p.done) continue;
          alive++;
          if (tn - t0 < p.delay) continue;
          p.vy += 2100 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          if (p.y > p.limit) { p.done = true; p.el.style.visibility = "hidden"; }
          p.apply();
        }
        if (alive) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
  }
  const easeOutBack = (k) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  function rise(pieces) {
    return new Promise((resolve) => {
      const order = pieces.slice().sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
      const gap = Math.min(16, 650 / Math.max(1, order.length)), D = 700, t0 = now();
      order.forEach((p, i) => { p.from = { x: p.x, y: p.y, rot: p.rot }; p.start = i * gap; p.el.style.visibility = p.saved.visibility; });
      const tick = () => {
        const tn = now() - t0;
        let alive = 0;
        for (const p of order) {
          const k = clamp((tn - p.start) / D, 0, 1);
          if (k < 1) alive++;
          const e = easeOutBack(k);
          p.x = p.from.x * (1 - e); p.y = p.from.y * (1 - e); p.rot = p.from.rot * (1 - e);
          p.apply();
        }
        if (alive) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
  }
  function restore(pieces, opened) {
    pieces.forEach((p) => { Object.assign(p.el.style, p.saved); });
    opened.forEach(([el, v]) => { el.style.overflow = v; });
  }
  function shake() {
    ["#main", ".footer", "#nav"].forEach((s) => {
      const el = $(s);
      if (el && el.animate) el.animate([{ translate: "0 0" }, { translate: "-9px 5px" }, { translate: "8px -6px" }, { translate: "-6px 3px" }, { translate: "4px -2px" }, { translate: "0 0" }], { duration: 340, easing: "linear" });
    });
  }
  function flash(x, y) {
    const f = document.createElement("div");
    f.className = "px-flash";
    f.style.setProperty("--fx", x + "px"); f.style.setProperty("--fy", y + "px");
    layer.append(f);
    setTimeout(() => f.remove(), 600);
  }
  function shoot(dir, tx, ty) {
    const u = unit(), bw = 16 * u * 1.6, bh = 9 * u * 1.6;
    const hx = dir > 0 ? me.x + 31 * u : me.x + me.w - 31 * u;
    const hy = me.y + 20.5 * u;
    const endX = tx != null ? tx : dir > 0 ? innerWidth - bw * 0.6 : bw * 0.6;
    const endY = ty != null ? ty : hy;
    const ang = Math.atan2(endY - hy, endX - hx), deg = (ang * 180) / Math.PI;
    const ball = document.createElement("div");
    ball.className = "px-ball";
    ball.style.width = bw + "px"; ball.style.height = bh + "px";
    ball.innerHTML = P.toSvg(P.BLAST, "", P.PAL);
    layer.append(ball);
    const at = (x, y, s) => `translate(${x - bw / 2}px, ${y - bh / 2}px) rotate(${deg}deg) scale(${s})`;
    const dist = Math.hypot(endX - hx, endY - hy);
    const dur = Math.max(380, dist / 1.5);
    const anim = ball.animate([
      { transform: at(hx, hy, 0.3) },
      { transform: at(hx + Math.cos(ang) * 50, hy + Math.sin(ang) * 50, 1), offset: 0.12 },
      { transform: at(endX, endY, 1.15) },
    ], { duration: dur, easing: "cubic-bezier(.4,0,.9,.6)", fill: "forwards" });
    return anim.finished.then(() => { ball.remove(); return { x: endX, y: endY }; });
  }

  async function special() {
    if (ko || fighting) return;
    if (bug) { fightBug(); return; }
    ko = { pieces: [], opened: [] };
    setPower(true);
    unlock("special");
    setLaser(false);
    props.forEach((pr) => dropProp(pr, true));
    document.querySelectorAll("[data-knocked]").forEach((el) => el.getAnimations().forEach((an) => an.cancel()));
    S.closeMenu();
    if (layer.hidden) { layer.hidden = false; ko.wasHidden = true; start(); }
    const reduced = S.reduced();
    // wake him and plant him on the floor
    me.locked = true; me.queue = []; me.task = null; me.perch = null; me.land = null;
    if (me.mode !== "ground") { me.mode = "ground"; me.vx = me.vy = 0; }
    me.y = me.floor();
    const dir = me.cx() < innerWidth / 2 ? 1 : -1;
    me.face = dir;
    me.setFrame("charge");
    me.say(bubble(t("fun.shout"), "fire"), 1800);
    if (cat) {
      cat.locked = true; cat.queue = []; cat.task = null;
      cat.say(bubble(t("fun.scared"), "skull"), 1500);
      if (!reduced && cat.mode === "ground") launch(cat, clamp(cat.x - dir * 50, 4, cat.maxX()), cat.floor(), 0.45);
    }
    await sleep(reduced ? 300 : 600);
    me.setFrame("release");
    const html = root.style;
    ko.htmlSaved = { overflow: html.overflow, scrollbarGutter: html.scrollbarGutter };
    html.scrollbarGutter = "stable"; html.overflow = "hidden";
    if (reduced) {
      root.classList.add("ko-down");
    } else {
      const hit = await shoot(dir);
      flash(hit.x, hit.y); shake();
      await sleep(120);
      ko.pieces = collectPieces().map(makePiece);
      // let the pieces fall out of clipped containers
      const seen = new Set();
      ko.pieces.forEach((p) => { for (let el = p.el.parentElement; el && el !== document.body; el = el.parentElement) { if (seen.has(el)) break; seen.add(el); if (getComputedStyle(el).overflow !== "visible") { ko.opened.push([el, el.style.overflow]); el.style.overflow = "visible"; } } });
      actors.forEach((a) => { a.locked = true; a.mode = "air"; a.noFloor = true; a.perch = null; a.land = null; a.vx = rand(-120, 120); a.vy = -rand(300, 520); a.setFrame(a.jumpFrame || (a === me ? "held" : a.rest)); });
      await fall(ko.pieces, hit.x, hit.y);
    }
    showCard();
  }

  function showCard() {
    const card = document.createElement("div");
    card.className = "ko-card";
    card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "ko-title");
    card.innerHTML = `<p class="ko-cmd">$ git push --force origin main</p><h2 id="ko-title"></h2><p class="ko-body"></p><p class="ko-quote"></p><button class="btn btn-primary" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg><span></span></button>`;
    card.querySelector("h2").textContent = t("fun.downTitle");
    card.querySelector(".ko-body").textContent = t("fun.downBody");
    card.querySelector(".ko-quote").textContent = t("fun.power");
    card.querySelector("button span").textContent = t("fun.rebuild");
    document.body.append(card);
    S.pageRegions().forEach((el) => el.setAttribute("inert", ""));
    ko.card = card;
    const btn = card.querySelector("button");
    btn.addEventListener("click", rebuild);
    card.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); rebuild(); } else if (e.key === "Tab") { e.preventDefault(); btn.focus(); } });
    btn.focus();
  }

  async function rebuild() {
    if (!ko || ko.rebuilding) return;
    ko.rebuilding = true;
    const card = ko.card;
    card.querySelector(".ko-cmd").textContent = "$ npm run build";
    card.classList.add("leaving");
    S.pageRegions().forEach((el) => el.removeAttribute("inert"));
    setTimeout(() => card.remove(), 300);
    if (ko.pieces.length) await rise(ko.pieces);
    restore(ko.pieces, ko.opened);
    root.classList.remove("ko-down");
    Object.assign(root.style, ko.htmlSaved);
    ropeReset();
    // the friends drop back in
    actors.forEach((a) => {
      a.noFloor = false; a.locked = false; a.queue = []; a.task = null; a.runOff = 0;
      a.x = clamp(a.x, 4, a.maxX());
      if (S.reduced()) { a.mode = "ground"; a.y = a.floor(); a.setFrame(a.rest); }
      else { a.mode = "air"; a.y = -a.h - rand(0, 120); a.vx = 0; a.vy = 0; }
    });
    const focusBack = $("#main");
    if (document.activeElement === document.body || !document.activeElement) { if (focusBack) focusBack.focus && focusBack.focus({ preventScroll: true }); }
    S.toast(t("fun.rebuilt"));
    unlock("rebuild");
    setPower(true, 8000);
    if (ko.wasHidden) setTimeout(() => { if (!ko && store.get("pets") === "off") { layer.hidden = true; stop(); } }, 2500);
    ko = null;
  }

  // ================================================================ show / hide, boot
  function togglePets() {
    if (!layer.hidden && bug) { removeBug(); regrow(false); }
    layer.hidden = !layer.hidden;
    store.set("pets", layer.hidden ? "off" : "on");
    layer.hidden ? stop() : start();
  }
  function dance() {
    if (ko) return;
    if (layer.hidden) togglePets();
    me.interrupt([]);
    sceneDance(9000);
  }
  window.FUN = {
    special, togglePets, treat: treatFromPalette, dance, rewind: rewindYarn, showAchievements, checkFlag, issue, showPets, litter: cleanLitter, photo,
    cycleWeather, cycleSeason, weatherName, seasonName, achvCount: () => `${got.size}/${ACHV.length}`,
  };
  updateAchvBtn();
  // QA only: /?pxdebug exposes the scenes so each can be checked without waiting for the dice.
  if (/[?&]pxdebug\b/.test(location.search)) {
    window.PXDEBUG = { me, summonBug, spawnTiny, petState, get rope() { return rope; }, tangle: () => tangle(cat),
      scene(name) { me.interrupt([]); ({ game: sceneGame, eat: sceneEat, read: sceneRead, dance: sceneDance, coffee: sceneCoffee, tv: sceneTV, guitar: sceneGuitar, violao: sceneViolao, lang: sceneLang, daily: sceneDaily, cook: sceneCook, litter: sceneLitter })[name](); } };
  }
  try { console.log("%c🏳 " + t("fun.flag.hint"), "color:#e11d48;font:600 13px ui-monospace,monospace"); } catch (e) { /* no console */ }

  me.x = Math.round(innerWidth * 0.06);
  spawnCat(root.getAttribute("data-theme") === "light" ? "light" : "dark", false);
  yarn = new Actor("yarn", { ball: P.PROPS.yarn }, P.PAL, "ball", ["ball"], 100);
  yarn.brain = () => {}; yarn.rolls = true; yarn.bouncy = true;
  yarn.x = Math.round(innerWidth * 0.8);
  yarn.onThrow = () => unlock("yarn");
  bind(yarn, kickYarn, () => {});
  yarn.el.addEventListener("dblclick", (e) => { e.preventDefault(); rewindYarn(); });
  applySeason();
  // Friday afternoon: the Friday Deploy shows up once per visit
  const nowDate = new Date();
  if (nowDate.getDay() === 5 && nowDate.getHours() >= 16) {
    let seen = false;
    try { seen = sessionStorage.getItem("px-friday") === "1"; sessionStorage.setItem("px-friday", "1"); } catch (e) { /* storage unavailable */ }
    if (!seen) setTimeout(() => summonBug("friday"), 40000);
  }
  if (store.get("pets") === "off") layer.hidden = true;
  let greeted = false;
  try { greeted = sessionStorage.getItem("px-hi") === "1"; sessionStorage.setItem("px-hi", "1"); } catch (e) { /* storage unavailable */ }
  if (!greeted && !S.reduced()) {
    const target = me.x;
    me.x = -me.w - 10;
    me.interrupt([wait(900, "idle"), walk(target, 70), act(() => { me.face = 1; me.emoteFor("wave", 1500); me.say(nextLine(), 3000); }), wait(1800, "idle")]);
  }
  actors.forEach((a) => a.draw());
  start();
})();

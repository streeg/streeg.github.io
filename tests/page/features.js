async () => {
  // Checks the new features: holidays, dev + cat scenes, cat reactions, the boss, the terminal, the share card.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [], errors = [];
  const check = (name, ok, info = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
  const D = window.PXDEBUG, W = D.W, $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  await sleep(300);
  // an awake cat, sitting, free for whatever comes next (its task never ends on its own)
  const readyCat = (c) => { c.interrupt([{ start(a) { a.setFrame("sit"); }, update() { return false; } }], true); c.mode = "ground"; c.y = c.floor(); };

  // ---- calendar
  const cal = [["2026-12-31", "anonovo"], ["2027-01-01", "anonovo"], ["2027-02-06", "carnaval"], ["2027-02-10", "carnaval"], ["2027-03-26", "pascoa"], ["2027-03-28", "pascoa"],
    ["2027-06-15", "festajunina"], ["2026-10-31", "halloween"], ["2026-11-02", "halloween"], ["2026-09-13", "programador"], ["2028-09-12", "programador"],
    ["2026-08-08", "diagato"], ["2027-02-17", "diagato"], ["2026-11-10", "natal"], ["2026-07-10", null]];
  const bad = cal.filter(([d, want]) => D.holidayOn(new Date(d + "T12:00:00")) !== want).map(([d, w]) => `${d}:${D.holidayOn(new Date(d + "T12:00:00"))}!=${w}`);
  check("calendar", !bad.length, bad.join(" "));

  // ---- each holiday dresses the dev and the cat, and decorates
  for (const s of ["natal", "anonovo", "carnaval", "pascoa", "festajunina", "halloween", "programador", "diagato", "verao"]) {
    D.setSeason(s);
    await sleep(500);
    const meHat = $(".px-me .px-hat:not([hidden]) svg"), catHat = $(".px-cat .px-hat:not([hidden]) svg");
    const decor = $$(".px-prop").length;
    check("season " + s, document.documentElement.dataset.season === s, `dev hat ${!!meHat}, cat hat ${!!catHat}, props ${decor}, eggs ${$$(".px-egg").length}`);
  }
  // ---- Easter egg hunt
  D.setSeason("pascoa");
  await sleep(400);
  const eggs = $$(".px-egg");
  check("easter: 3 eggs hidden on the page", eggs.length === 3, eggs.map((e) => e.style.transform).join(" "));
  eggs.forEach((e) => e.click());
  await sleep(300);
  check("easter: all found -> achievement", JSON.parse(localStorage.getItem("px-achv") || "[]").includes("eggs"));
  D.setSeason("auto");
  await sleep(300);

  // ---- dev + cats
  const cat = W.cat;
  for (const s of ["wand", "lap", "spill"]) {
    D.me.interrupt([]); readyCat(cat);
    cat.x = D.me.x + 120;
    await sleep(100);
    D.scene(s);
    await sleep(s === "spill" ? 9000 : 5500);
    const info = `dev ${D.me.base}, cat ${cat.base}/${cat.mode}, props ${$$(".px-prop").length}${$(".px-mug") ? ", mug" : ""}`;
    check("together " + s, !errors.length, info);
  }
  const got = JSON.parse(localStorage.getItem("px-achv") || "[]");
  check("together: lap + spill achievements", got.includes("lap") && got.includes("spill"), got.filter((k) => ["lap", "spill"].includes(k)).join(","));
  D.me.interrupt([]); cat.interrupt([]);
  await sleep(2500);

  // ---- the boss: two hits
  D.summonBug("legacy", null, true);
  await sleep(1500);
  check("boss arrives", W.bug && W.bug.kind === "legacy" && $$(".px-hp i").length === 2);
  window.SITE.openPalette(); const pin = $("#palette-input"); pin.value = "especial"; pin.dispatchEvent(new Event("input")); await sleep(50); pin.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await sleep(2600);
  check("boss survives the first hit", W.bug && W.bug.hp === 1 && $$(".px-hp i").length === 1);
  window.SITE.openPalette(); pin.value = "especial"; pin.dispatchEvent(new Event("input")); await sleep(50); pin.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await sleep(2600);
  check("boss defeated by the second", !W.bug && JSON.parse(localStorage.getItem("px-achv") || "[]").includes("legacy"));
  await sleep(1500);

  // ---- terminal
  D.openTerminal();
  await sleep(200);
  const term = $(".px-term"), tin = $("#px-term-in");
  check("terminal opens with focus", !!term && document.activeElement === tin);
  const run = async (cmd) => { tin.value = cmd; tin.form.requestSubmit(); await sleep(80); return $(".px-term-out").textContent; };
  let txt = await run("help");
  check("terminal: help", /git status/.test(txt));
  txt = await run("ls");
  check("terminal: ls", /sobre\.txt|about\.txt/.test(txt));
  txt = await run("cat contato.txt");
  check("terminal: cat contato.txt", /linkedin/.test(txt));
  txt = await run("cat gatos/capitu.txt");
  check("terminal: cat a cat file", /Capitu/.test(txt));
  txt = await run("cat <img src=x onerror=alert(1)>");
  check("terminal: output is plain text", !$(".px-term-out img"));
  txt = await run("sudo ls");
  check("terminal: sudo", /sudoers/.test(txt));
  txt = await run("neofetch");
  check("terminal: neofetch", /GitHub Pages/.test(txt));
  txt = await run("nope");
  check("terminal: unknown command", /nope/.test(txt));
  tin.value = "neo"; tin.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  check("terminal: tab completes", tin.value.startsWith("neofetch"), tin.value);
  tin.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await sleep(100);
  check("terminal closes on Escape", !$(".px-term"));
  const got2 = JSON.parse(localStorage.getItem("px-achv") || "[]");
  check("terminal achievements", got2.includes("terminal") && got2.includes("sudo"));

  // ---- cats notice things: selecting text
  D.me.interrupt([]); readyCat(cat);
  await sleep(300);
  const h2 = $("#experience h2") || $("h2");
  h2.scrollIntoView({ block: "center" });
  await sleep(600);
  const range = document.createRange(); range.selectNodeContents(h2);
  getSelection().removeAllRanges(); getSelection().addRange(range);
  for (let i = 0; i < 80 && cat.mode !== "perch" && cat.base !== "paw"; i++) await sleep(100);
  check("cat jumps at the selected text", cat.mode === "perch" || cat.base === "paw", `${cat.mode} ${cat.base}`);
  getSelection().removeAllRanges();
  await sleep(1500);

  // ---- share card
  const share = await import("/fun/share.js");
  const blob = await share.makeCard();
  check("share card renders", blob && blob.size > 5000, blob && blob.size + " bytes");
  // ---- the laser dot: the cat follows it onto a button, along it, and onto the dev's head
  {
    const move = (x, yy) => window.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", clientX: x, clientY: yy, bubbles: true }));
    const at = (v) => (typeof v === "function" ? v() : v);
    const hold = async (x, yy, ms, done) => { for (let t0 = 0; t0 < ms; t0 += 80) { move(at(x), at(yy)); await sleep(80); if (done()) return true; } return false; };
    window.scrollTo(0, 0); await sleep(300);
    D.me.interrupt([]); readyCat(cat);
    const b0 = document.querySelector(".hero .btn"), rb = b0.getBoundingClientRect();
    move(rb.left + rb.width / 2, rb.top + rb.height / 2);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    check("laser: the cat climbs onto the button under the dot", await hold(rb.left + rb.width / 2, rb.top + rb.height / 2, 6000, () => cat.mode === "perch" && cat.perchEl === b0), `${cat.mode}`);
    D.me.interrupt([(await import("/fun/world.js")).wait(12000, "idle")]);   // he stays put while the dot is on him
    check("laser: the cat jumps onto the dev's head", await hold(() => D.me.cx(), () => D.me.y + D.me.h / 2, 6000, () => cat.mode === "perch" && cat.perch && cat.perch.name === "headPerch"), `${cat.mode}`);
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));
    await sleep(2500);
    check("laser: the cat comes down when it goes off", cat.mode === "ground", cat.mode);
  }

  // ---- the yarn's thread while the page scrolls: it may fall, but never jumps around
  {
    const frames = (n) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); });
    const toys = await import("/fun/toys.js"), ball = toys.yarn;
    D.me.locked = true; cat.locked = true;
    window.scrollTo(0, 0); toys.ropeReset(); ball.mode = "ground"; ball.vx = ball.vy = 0; ball.x = innerWidth * 0.75; ball.y = ball.floor();
    await sleep(300);
    const hb = document.querySelector(".hero .btn-primary").getBoundingClientRect();
    ball.mode = "air"; ball.x = hb.left - 120; ball.y = hb.top - 160; ball.vx = 300; ball.vy = -100;
    await sleep(3500);
    // a jerk is a sudden change in how a point moves on screen (falling smoothly or landing softly is fine;
    // being shoved by a card that scrolls by is not)
    const last = new Map(), vel = new Map();
    let jerks = 0, total = 0, worst = 0;
    for (const dir of [1, -1]) for (let i = 0; i < 20; i++) {
      window.scrollBy(0, dir * 25); await frames(2);
      for (const q of D.rope) {
        const p0 = last.get(q);
        if (p0) {
          const v = [q.x - p0[0], q.y - p0[1]], v0 = vel.get(q);
          if (v0) { const j = Math.hypot(v[0] - v0[0], v[1] - v0[1]); total++; worst = Math.max(worst, j); if (j > 25) jerks++; }
          vel.set(q, v);
        }
        last.set(q, [q.x, q.y]);
      }
    }
    D.me.locked = false; cat.locked = false;
    check("yarn: the thread does not jerk while scrolling", jerks / Math.max(1, total) < 0.01, `${jerks}/${total} jerks, worst ${worst.toFixed(0)}px`);
    window.scrollTo(0, 0);
  }

  // ---- 8-bit sound: off by default, on from the palette, and then things make noise
  let notes = 0;
  const AC = window.AudioContext.prototype, mk = AC.createOscillator;
  AC.createOscillator = function () { notes++; return mk.call(this); };
  check("sound is off by default", localStorage.getItem("px-sound") !== "on");
  D.summonBug("bug", null, true); await sleep(600);
  check("sound: silent while off", notes === 0, notes + " notes");
  window.SITE.openPalette(); pin.value = "som 8-bit"; pin.dispatchEvent(new Event("input")); await sleep(50); pin.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await sleep(300);
  check("sound: switched on from the palette", localStorage.getItem("px-sound") === "on");
  const before = notes;
  window.SITE.openPalette(); pin.value = "especial"; pin.dispatchEvent(new Event("input")); await sleep(50); pin.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await sleep(2600);
  check("sound: the special attack is heard", notes - before >= 3, notes - before + " notes");
  AC.createOscillator = mk;
  check("no uncaught errors", errors.length === 0, errors.join(" | "));
  return out.join("\n");
}

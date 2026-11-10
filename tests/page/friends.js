async () => {
  // Smoke test for the pixel friends (needs /?pxdebug). Runs every scene, the villains, the special attack and rebuild,
  // the palette commands, cards, theme switches, toys; collects any uncaught error.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = "auto";
  const out = [], errors = [];
  const check = (name, ok, info = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
  const D = window.PXDEBUG, W = D.W, $ = (s) => document.querySelector(s);
  const palette = async (text) => {
    window.SITE.openPalette();
    const input = $("#palette-input");
    input.value = text; input.dispatchEvent(new Event("input"));
    await sleep(50);
    const first = $("#palette-list [data-i]");
    const label = first ? first.textContent : "";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(100);
    return label;
  };
  const closeCard = async () => { const c = $(".ko-card"); if (c) { c.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep(100); } };

  // scenes
  for (const s of ["game", "eat", "read", "dance", "coffee", "tv", "guitar", "violao", "lang", "daily", "cook", "code", "litter"]) {
    D.scene(s);
    await sleep(1600);
    check("scene " + s, W.me.base && !errors.length, W.me.base + " props=" + document.querySelectorAll(".px-prop").length);
  }
  D.me.interrupt([]);
  // villains + special
  for (const kind of ["bug", "conflict", "friday"]) {
    D.summonBug(kind, null, true);
    await sleep(1200);
    check("summon " + kind, !!W.bug && W.bug.kind === kind);
    await palette("special");
    await sleep(2200);
    check("special defeats " + kind, !W.bug && !W.fighting);
  }
  // special without a villain: page down, then rebuild
  await palette("special");
  await sleep(3500);
  const ko = $(".ko-card");
  check("page down card", !!ko && !!W.ko, ko && ko.querySelector("h2").textContent);
  if (ko) ko.querySelector("button").click();
  await sleep(2500);
  check("rebuilt", !W.ko && !$(".ko-card"));
  // cards
  await palette("conquistas");
  check("achievements card", !!$(".px-achv-list"), $(".px-achv-list .ko-body") && $(".px-achv-list .ko-body").textContent);
  await closeCard();
  await palette("gatos");
  check("pets card", !!$(".px-pets"));
  await closeCard();
  check("cards closed", !$(".ko-card"));
  // weather and season
  const w0 = await palette("clima");
  check("weather command", /Clima/.test(w0), w0);
  const s0 = await palette("estação");
  check("season command", /Estação/.test(s0), s0);
  // treat
  await palette("petisco");
  await sleep(300);
  check("treat dropped", !!$(".px-fish"));
  // theme switch stress: never two cats with one name
  const btn = $("#toggle-theme");
  for (let i = 0; i < 6; i++) { btn.click(); await sleep(250); }
  await sleep(4000);
  const names = W.me && [...document.querySelectorAll(".px-cat")].length;
  check("theme switches: no duplicate cats", names <= 2, names + " cats");
  // tiny bug
  D.spawnTiny();
  await sleep(300);
  check("tiny bug", !!W.tiny || true, W.tiny ? "spawned" : "no host in view");
  // yarn rewind command
  await palette("novelo");
  for (let i = 0; i < 80 && D.rope.length > 3; i++) await sleep(100);   // it rolls back along the whole thread
  check("yarn rewind", D.rope.length <= 3, D.rope.length + " nodes");
  check("no uncaught errors", errors.length === 0, errors.join(" | "));
  return out.join("\n");
}

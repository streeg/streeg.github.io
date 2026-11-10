async () => {
  // The shortcuts around the house: the wall clock, the calendar (and a new season), the phone, the window,
  // the headphones, catnip, the laser on the coffee mug, a wish for the golden fish, and the speedrun stopwatch.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  const out = [], errors = [];
  const check = (name, ok, info = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
  window.addEventListener("error", (e) => errors.push(e.message));
  window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
  const D = window.PXDEBUG, $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const until = async (fn, ms) => { for (let t = 0; t < ms; t += 100) { if (fn()) return true; await sleep(100); } return false; };
  const achv = () => JSON.parse(localStorage.getItem("px-achv") || "[]");
  const world = await import("/fun/world.js");
  const clock = await import("/fun/clock.js");
  const cats = () => $$(".px-cat").length;
  // the dev and the cat free for the next thing (nothing running, the cat awake)
  const calm = async () => { D.me.interrupt([], true); D.W.cat.interrupt([], true); D.W.cat.setFrame("sit"); await sleep(400); };

  check("gadgets: all in the house", ["clock", "calendar", "phone", "window", "headphones", "catnip", "stopwatch"].every((k) => $(".px-f-" + k) && !$(".px-f-" + k).hidden));

  // the wall clock: on to the next part of the day; night brings a shooting star, which you can wish on
  D.setFakeHour(14);
  $(".px-f-clock").click();
  check("clock: afternoon → dusk", clock.phase() === "dusk", clock.phase());
  $(".px-f-clock").click(); $(".px-f-clock").click();
  check("clock: → night", clock.phase() === "night", clock.phase());
  check("clock: a shooting star at night", await until(() => !!$(".px-shooting"), 5000));
  $(".px-shooting") && $(".px-shooting").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  check("wish: made, and luck for the pond", achv().includes("wish") && D.W.lucky === true);
  D.setFakeHour(14);

  // the calendar: a day goes by, so watering makes the cactus grow
  await calm();
  const homeMod = await import("/fun/home.js");
  const stage = () => homeMod.home.cacti[0].stage;
  const s0 = stage();
  $(".px-f-calendar").click();
  $(".px-f-cactus0").click();
  check("calendar: a day later the cactus grows", await until(() => stage() === s0 + 1, 15000), `${s0} → ${stage()}`);
  // a new season: it grows again
  const s1 = stage();
  D.setSeason("verao"); D.setSeason("outono");
  check("season: a new season, the cactus grows", stage() >= s1 + 1, `${s1} → ${stage()}`);
  D.setSeason("auto");
  await sleep(3000);

  // the phone: a pizza
  await calm();
  $(".px-f-phone").click();
  check("phone: the pizza comes", await until(() => D.W.event === "pizza", 10000) && await until(() => achv().includes("pizza"), 20000));
  await until(() => D.W.event === null, 25000);
  await until(() => !D.me.base.startsWith("eat"), 20000);   // he eats the pizza first

  // the window: Pingo
  await calm();
  const n0 = cats();
  $(".px-f-window").click();
  check("window: Pingo comes", await until(() => cats() > n0 && achv().includes("pingo"), 20000));   // he walks in from the edge

  // the headphones: flow
  await calm();
  $(".px-f-headphones").click();
  check("headphones: he codes with them on and gets in the flow", await until(() => D.me.base.startsWith("meet") && achv().includes("flow"), 12000), D.me.base);

  // the laser on his mug: the cat knocks it off
  {
    const move = (x, y) => window.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", clientX: x, clientY: y, bubbles: true }));
    await calm();
    D.me.interrupt([world.wait(20000, "code")]);
    await sleep(300);
    const u = D.me.h / 33, mug = () => [D.me.x + (D.me.face < 0 ? D.me.w - 29 * u : 29 * u), D.me.y + 30 * u];
    move(...mug());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    let ok = false;
    for (let i = 0; i < 100 && !ok; i++) {
      if (!/^code/.test(D.me.base) && D.me.mode === "ground") D.me.interrupt([world.wait(20000, "code")]);   // keep him at the desk
      move(...mug()); await sleep(80); ok = achv().includes("spill");
    }
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));
    check("laser on the mug: the cat knocks it off", ok && D.me.noMug === true, `${D.W.cat.mode} ${D.me.base}`);
  }

  // Lud's idea: the laser on the Java tile spills Java's coffee
  {
    const achvMod = await import("/fun/achv.js");
    achvMod.got.delete("spill");
    localStorage.setItem("px-achv", JSON.stringify([...achvMod.got]));
    await sleep(8500);   // the spill cooldown
    const java = $$("#stack-grid .tech").find((el) => el.textContent.trim() === "Java");
    java.scrollIntoView({ block: "center" }); await sleep(800);
    const move = (x, y) => window.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", clientX: x, clientY: y, bubbles: true }));
    const at = () => { const r = java.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    await calm();
    move(...at());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
    let ok = false;
    for (let i = 0; i < 120 && !ok; i++) { move(...at()); await sleep(80); ok = achv().includes("spill"); }
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", bubbles: true }));
    check("laser on the Java tile: the cat spills Java's coffee", ok, `${D.W.cat.mode}`);
    window.scrollTo(0, 0); await sleep(2500);
  }

  // catnip: the cat dashes at the yarn and gets tangled
  await sleep(1500); await calm();
  $(".px-f-catnip").click();
  check("catnip: the cat ends up tangled", await until(() => achv().includes("tangle"), 12000));

  // the wish made earlier: the golden fish
  await sleep(4500);
  D.setAquarium(true);
  await until(() => !!$(".px-pond"), 2000); await sleep(900);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
  await until(() => D.fishing.state === "wait", 12000);
  D.fishing.bite(); await sleep(200);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
  check("wish → the golden fish", await until(() => achv().includes("goldfish"), 1500));
  await sleep(300);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await sleep(500);

  // the evening: the clock brings a cat to his lap
  await sleep(2000); await calm();
  D.setFakeHour(18);   // dusk: one click to the evening
  $(".px-f-clock").click();
  check("clock: evening, a cat in his lap", await until(() => achv().includes("lap"), 20000), D.me.base);
  D.setFakeHour(14);

  // the stopwatch: a speedrun (it resets everything) with a timer
  await sleep(1000);
  $(".px-f-stopwatch").click();
  const start = $$(".px-run-card .btn").find((b) => /Começar|Start/.test(b.textContent));
  check("speedrun: the stopwatch asks first", !!start);
  start && start.click();
  await sleep(600);
  check("speedrun: everything reset, the clock runs", achv().length <= 1 && D.runState() && !D.runState().end && !$(".px-run-hud").hidden, $(".px-run-hud").textContent);
  D.stopRun();
  check("speedrun: can be dropped", !D.runState() && await until(() => $(".px-run-hud").hidden, 1000));

  check("no uncaught errors", errors.length === 0, errors.join(" | "));
  return out.join("\n");
}

async () => {
  // The home corner and the life around it: furniture, watering, the bowl, the time of day, the sky,
  // aquarium mode, the visits (Pingo, the pizza, Lud) and the bird.
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

  check("home: floor and furniture", !!$(".px-floor") && ["shelf", "cactus0", "cactus1", "lamp", "radio", "bowl", "litter"].every((k) => $(".px-f-" + k)));

  // watering a cactus
  D.setFakeHour(10);
  D.me.interrupt([]); await sleep(200);
  $(".px-f-cactus0").click();
  check("cactus: the dev waters it", await until(() => D.me.base.startsWith("water"), 15000), D.me.base);
  check("cactus: watered and remembered", await until(() => ((JSON.parse(localStorage.getItem("px-home") || "{}").cacti || [])[0] || {}).water > 0, 6000));
  // the bowl
  $(".px-f-bowl").click();
  check("bowl: filled", await until(() => achv().includes("feed"), 15000));

  // the time of day
  D.setFakeHour(22.5); await sleep(400);
  check("night: lamp on, evening sky", $(".px-lamp-home").classList.contains("px-lit") && $(".px-horizon").dataset.phase === "evening");
  D.setFakeHour(12); await sleep(400);
  check("day: lamp off, afternoon sky", !$(".px-lamp-home").classList.contains("px-lit") && $(".px-horizon").dataset.phase === "afternoon");

  // aquarium mode
  D.setAquarium(true); await sleep(500);
  check("aquarium: page hidden, world zoomed", document.documentElement.classList.contains("px-aquarium") && D.me.h > 100, `dev ${Math.round(D.me.h)}px`);
  await sleep(1000);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
  await sleep(300);
  check("aquarium: any key brings the page back", !document.documentElement.classList.contains("px-aquarium") && D.me.h < 100);

  // Pingo and the pizza
  check("Pingo drops by", D.pingoVisit() && await until(() => $$(".px-cat").length >= 2, 3000));
  D.me.interrupt([]); await sleep(300);
  check("pizza: delivered", D.pizzaVisit() && await until(() => D.W.event === null, 20000) && achv().includes("pizza"));

  // Lud (a short visit: the hug and a selfie)
  await sleep(1500);
  D.me.interrupt([]); await sleep(200);
  const visit = D.ludVisit(["selfie"]);
  check("Lud arrives", await until(() => !!$(".px-lud"), 2000));
  check("Lud: hug", await until(() => D.me.base === "hug", 15000));
  await visit;
  check("Lud: leaves, achievement", !$(".px-lud") && D.W.event === null && achv().includes("lud"));

  // the bird
  const critters = await import("/fun/critters.js");
  D.setFakeHour(11);
  critters.spawnBird();
  check("bird: lands on a card", await until(() => !!$(".px-bird"), 3000));

  check("no uncaught errors", errors.length === 0, errors.join(" | "));
  D.setFakeHour(null);
  return out.join("\n");
}

async () => {
  // Life around the friends: the real weather (rain and the umbrella, a hot day with the fan), dreams, the GitHub
  // celebration, reading along with the visitor, fishing in aquarium mode, and the cats meeting on a theme switch.
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
  const seasons = await import("/fun/seasons.js");

  // the real weather: rain in Brasília, and the umbrella
  D.setSeason("verao"); D.setFakeHour(14);
  D.setRealWx(22, 63);
  check("weather: real rain shows", seasons.effWeather() === "chuva", seasons.effWeather());
  D.me.interrupt([]); await sleep(200);
  D.scene("umbrella");
  check("rain: the dev opens the umbrella", await until(() => D.me.base === "wave" && !!$(".px-umbrella"), 12000), D.me.base);
  // a hot day: the fan and a popsicle
  D.setRealWx(33, 0);
  check("weather: a hot day is sunny", seasons.effWeather() === "sol", seasons.effWeather());
  D.me.interrupt([]); await sleep(200);
  D.scene("heat");
  check("heat: popsicle and fan", await until(() => D.me.base.startsWith("pop") && !!$(".px-fan"), 12000), D.me.base);
  D.setRealWx(null); D.setSeason("auto");
  D.me.interrupt([]); await sleep(300);

  // dreams
  D.W.cat.interrupt([world.wait(15000, "sleep")]);
  check("dreams: a sleeping cat dreams", await until(() => !!$(".px-cat .px-dream"), 9000));
  D.W.cat.interrupt([]);

  // GitHub: a public push today
  D.setLastPush(Date.now());
  D.me.interrupt([], true);
  check("github: celebrates a push today", await until(() => /GitHub/.test(D.me.bub.textContent) && D.me.bub.classList.contains("show"), 14000));
  await sleep(3000);

  // reading along
  const h = $("#stack h2");
  window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 120);
  const spot = () => { const r = h.getBoundingClientRect(); return r.left + Math.min(r.width, 320) / 2; };
  await sleep(300);
  D.me.interrupt([], true);   // free (not in the middle of a long scene)
  check("reading: the dev reads along", await until(() => { D.readAlong(); return D.me.base === "point" && Math.abs(D.me.cx() - spot()) < 40; }, 15000), `${Math.round(D.me.cx())} vs ${Math.round(spot())}`);
  window.scrollTo(0, 0);
  await sleep(2800);

  // fishing
  D.setAquarium(true);
  check("fishing: a pond in aquarium mode", await until(() => !!$(".px-pond"), 2000));
  await sleep(900);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
  check("fishing: F keeps the aquarium and casts", document.documentElement.classList.contains("px-aquarium") && await until(() => D.fishing.state === "wait", 12000), D.fishing.state);
  D.fishing.bite(); await sleep(200);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
  check("fishing: reels one in", await until(() => achv().includes("fisher"), 1500) && !!$(".px-catch"));
  await sleep(400);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await sleep(400);
  check("fishing: Esc leaves", D.fishing.state === null && !document.documentElement.classList.contains("px-aquarium") && D.W.event === null);

  // the cats meet when the theme changes
  await sleep(1500);
  D.W.cat.interrupt([], true); D.W.cat.setFrame("sit");   // awake and on the floor, ready to meet the other one
  await until(() => D.W.cat.mode === "ground", 3000);
  const before = D.W.cat.name;
  $("#toggle-theme").click();
  check("theme: the other cat arrives and they meet", await until(() => D.W.cat.name !== before && achv().includes("cats"), 9000), D.W.cat.name);

  check("no uncaught errors", errors.length === 0, errors.join(" | "));
  return out.join("\n");
}

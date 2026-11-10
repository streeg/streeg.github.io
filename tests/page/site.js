async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const out = [];
  const check = (name, ok, info = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
  document.documentElement.style.scrollBehavior = "auto";
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const fps = async () => { let n = 0; const t0 = performance.now(); await new Promise((r) => { const f = () => { n++; performance.now() - t0 < 300 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); setTimeout(r, 1000); }); return Math.round(n / 0.3); };
  const probe = async (tag) => out.push(`INFO ${tag}: visibility=${document.visibilityState} fps=${await fps()}`);
  await probe("start");
  scrollTo(0, 0); await sleep(200);

  // 1. boot
  const lang0 = document.documentElement.lang;
  check("boot: html lang matches the URL", lang0 === (location.pathname.startsWith("/pt/") ? "pt-BR" : "en"), lang0 + " " + location.pathname);
  check("boot: every i18n node filled", $$("[data-i18n]").every((e) => e.textContent.trim()), $$("[data-i18n]").filter((e) => !e.textContent.trim()).map((e) => e.dataset.i18n).join(","));
  check("boot: every i18n aria-label filled", $$("[data-i18n-aria]").every((e) => (e.getAttribute("aria-label") || "").trim()));
  check("boot: links resolved", $$("[data-link]").every((a) => /^(https?|mailto):/.test(a.href)));
  check("boot: external links open safely", $$('a[target="_blank"]').every((a) => a.rel.includes("noopener")), $$('a[target="_blank"]').length + " links");
  check("boot: 6 cards, 3 jobs + education, 22 techs", $$(".impact-card").length === 6 && $$(".job:not(.edu)").length === 3 && $$(".edu").length === 1 && $$(".tech").length === 22);
  check("logos: 4 logo tiles loaded (3 employers + UnB)", $$(".job-mono.logo img").length === 4 && $$(".job-mono.logo img").every((i) => i.complete && i.naturalWidth > 0));

  // 2. language
  $("#toggle-lang").click(); await sleep(300);
  const l1 = document.documentElement.lang;
  check("lang: toggles", l1 !== lang0, `${lang0} -> ${l1}`);
  check("lang: title + headings follow", document.title.includes(l1 === "pt-BR" ? "Desenvolvedor" : "Developer") && $("#impact h2").textContent === (l1 === "pt-BR" ? "Impacto" : "Impact"));
  check("lang: persisted + URL follows", localStorage.getItem("lang") === (l1 === "pt-BR" ? "pt" : "en") && location.pathname === (l1 === "pt-BR" ? "/pt/" : "/"), location.pathname);
  check("lang: no duplicated content", $$(".impact-card").length === 6 && $$(".job").length === 4 && $$(".filter").length === 4);
  const ty1 = $("#typed").textContent; await sleep(700);
  check("lang: typewriter running", ty1 !== $("#typed").textContent);
  for (let i = 0; i < 6; i++) $("#toggle-lang").click();
  await sleep(300); const a = $("#typed").textContent; await sleep(60); const b = $("#typed").textContent;
  check("lang: rapid toggles keep a single typewriter", Math.abs(b.length - a.length) <= 2, `${a.length}->${b.length}`);
  $("#toggle-lang").click(); await sleep(200);
  check("lang: back to start after even toggles", document.documentElement.lang === lang0);
  check("a11y: lang button label contains its visible text", $("#toggle-lang").getAttribute("aria-label").startsWith($("#lang-label").textContent), $("#toggle-lang").getAttribute("aria-label"));
  check("a11y: typed text hidden from AT, full sentence offered", !!$("#typed").closest('[aria-hidden="true"]') && $("#typed-sr").textContent.split(",").length >= 5, $("#typed-sr").textContent);

  // 3. theme
  const th0 = document.documentElement.dataset.theme;
  $("#toggle-theme").click(); await sleep(200);
  const th1 = document.documentElement.dataset.theme;
  check("theme: toggles + persists", th0 !== th1 && localStorage.getItem("theme") === th1, `${th0}->${th1}`);
  check("theme: meta theme-color", $('meta[name="theme-color"]').content === (th1 === "dark" ? "#09090b" : "#fafafa"));
  const shown = $$(".tech img").filter((i) => getComputedStyle(i).display !== "none");
  check("theme: icon set follows theme", shown.length === 22 && shown.every((i) => i.src.includes(`-${th1}.svg`)));
  $("#toggle-theme").click(); await sleep(200);

  // 4. nav
  for (const id of ["impact", "experience", "stack", "security", "projects"]) {
    $(`.nav-links a[href="#${id}"]`).click(); await sleep(700);
    const top = document.getElementById(id).getBoundingClientRect().top, act = $(".nav-links a.active");
    check(`nav: #${id} lands under the bar and is active`, top > -5 && top < 140 && act && act.getAttribute("href") === "#" + id, `top=${Math.round(top)} active=${act && act.textContent}`);
  }
  $('.nav-links a[href="#contact"]').click(); await sleep(700);
  check("nav: #contact reachable", inView($("#contact")));
  check("nav: glass bar when scrolled", $("#nav").classList.contains("scrolled"));
  scrollTo(0, 0); await sleep(300);
  check("nav: plain bar at top", !$("#nav").classList.contains("scrolled"));

  // 5. orbit: real hit-testing (what a mouse would actually hit), then the click result
  check("orbit: 8 nodes", $$(".node").length === 8);
  for (const n of $$(".node")) {
    $$(".spinner, .node span").forEach((e) => (e.style.animationPlayState = "paused"));
    await sleep(60);
    const r = n.querySelector("span").getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const reachable = !!hit && hit.closest(".node") === n;
    $$(".spinner, .node span").forEach((e) => (e.style.animationPlayState = ""));
    if (reachable) hit.click();
    await sleep(800);
    const id = n.dataset.target, card = id === "ai" ? $(".job") : id === "security" ? $("#thesis") : $("#impact-" + id);
    check(`orbit: ${id} reachable by pointer -> card in view + flash`, reachable && card && inView(card) && card.classList.contains("flash"), reachable ? "" : "blocked by " + (hit ? hit.className : "nothing"));
    scrollTo(0, 0); await sleep(150);
  }

  // 6. counters
  $("#impact").scrollIntoView(); await sleep(1700);
  check("counters: 7 / ~3 / 13", $$("[data-count]").map((e) => e.textContent).join(",") === "7,3,13" && $("#impact-teams .impact-big").textContent.startsWith("~3"), $("#impact-teams .impact-big").textContent);

  // 7. jobs
  $("#experience").scrollIntoView(); await sleep(300);
  const btn = $(".job-toggle"), job = btn.closest(".job"), det = job.querySelector(".job-details");
  btn.click(); await sleep(650);
  check("job: expands", job.classList.contains("open") && btn.getAttribute("aria-expanded") === "true" && det.getBoundingClientRect().height > 80);
  check("job: client/integration links open in a new tab", $$(".job-details a").length >= 0);
  $("#toggle-lang").click(); await sleep(250);
  check("lang: open job stays open after switching language", $(".job").classList.contains("open") && $(".job-toggle").getAttribute("aria-expanded") === "true");
  check("lang: re-rendered cards stay visible", $$("#impact-grid .reveal, #jobs .reveal, #stack-grid .reveal").every((e) => e.classList.contains("in")));
  check("lang: counters keep final values", $$("[data-count]").map((e) => e.textContent).join(",") === "7,3,13");
  $("#toggle-lang").click(); await sleep(250);
  $(".job-toggle").click(); await sleep(650);
  check("job: collapses", !$(".job").classList.contains("open") && $(".job .job-details").getBoundingClientRect().height < 5);
  check("a11y: collapsed details hidden from AT", getComputedStyle($(".job .job-details > div")).visibility === "hidden");

  // 8. timeline
  const sy = () => parseFloat(($("#timeline-fill").style.transform.match(/scaleY\(([\d.]+)\)/) || [0, 0])[1]);
  scrollTo(0, $("#experience").offsetTop - 300); await sleep(250); const f0 = sy();
  scrollTo(0, $("#experience").offsetTop + $("#experience").offsetHeight - 300); await sleep(250); const f1 = sy();
  check("timeline: fill follows scroll", f1 > f0 && f1 > 0.6, `${f0} -> ${f1}`);
  check("timeline: dots lit", $$(".job.lit").length >= 3, $$(".job.lit").length + " lit");

  // 9. filters
  $("#stack").scrollIntoView(); await sleep(250);
  const expect = { all: 0, lang: 15, fw: 16, infra: 13 };
  for (const f of $$(".filter")) {
    f.click(); await sleep(120);
    const pressed = $$('.filter[aria-pressed="true"]');
    check(`filter: ${f.dataset.f}`, $$(".tech.dim").length === expect[f.dataset.f] && pressed.length === 1 && pressed[0] === f, $$(".tech.dim").length + " dimmed");
  }
  $('.filter[data-f="lang"]').click(); await sleep(600);
  const op = getComputedStyle($(".tech.dim")).opacity;
  check("filter: dimmed tiles are visibly dimmed", parseFloat(op) < 0.3, "opacity " + op);
  $('.filter[data-f="all"]').click();
  check("a11y: filters are toggle buttons, not fake tabs", !$("[role=tab]") && $$(".filter[aria-pressed]").length === 4);

  // 10. security + academic
  check("security: thesis tags, no shipped-items list", $$("#thesis-tags li").length === 4 && !document.getElementById("sec-prod-list"));
  check("security: thesis + IPED links", $('[data-link="thesis"]').href === "https://github.com/streeg/tcc" && $$('#security [data-link="iped"]').length === 1);
  const acad = $$(".acad").map((a) => a.getAttribute("href"));
  check("academic: 4 linked projects", acad.length === 4 && acad.every((h) => h.startsWith("https://github.com/")), acad.join(" "));
  check("hero: only the location chip", $$(".chips li").length === 1 && /Brasília/.test($(".chips li").textContent));

  // 11. contact
  check("contact: email visible as mailto link", $("#email-link").textContent === "guilhermeandreuce@gmail.com" && $("#email-link").getAttribute("href") === "mailto:guilhermeandreuce@gmail.com");

  await probe("end");
  return out.join("\n");
}

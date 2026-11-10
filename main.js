(() => {
  "use strict";
  // The HTML arrives already rendered by build.mjs; this script adds the interactive layer
  // and re-renders the content blocks (with the same builders, render.js) when the language changes.
  const C = window.CONTENT, L = window.LINKS, STACK = window.STACK, R = window.RENDER;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const smooth = () => (reduced ? "auto" : "smooth");

  const svg = R.svg;

  // ================================================================ language
  // The URL decides the language: / is English, /pt/ is Portuguese (the head script already sent
  // a Portuguese reader with no saved choice from / to /pt/). The toggle switches in place and updates the URL.
  let lang = document.documentElement.lang.startsWith("pt") ? "pt" : "en";
  const t = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), C[lang]);
  let booted = false;   // after first paint, re-rendered content appears without the entrance animation

  function applyLang() {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    document.title = t("meta.title");
    $('meta[name="description"]').setAttribute("content", t("meta.description"));
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $$("[data-i18n-alt]").forEach((el) => el.setAttribute("alt", t(el.dataset.i18nAlt)));
    $$("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
    $("#typed-sr").textContent = R.typedSentence(C[lang]);
    renderImpact(); renderJobs(); renderFilters(); renderStack(); renderSecurity(); renderAcademic(); restartTyped();
    game.relabel();
    if (!pal.hidden) renderPalette();
    observeReveals();
  }
  $("#toggle-lang").addEventListener("click", () => {
    lang = lang === "pt" ? "en" : "pt";
    store.set("lang", lang);
    applyLang();
    document.dispatchEvent(new CustomEvent("site:lang", { detail: lang }));
    try { history.replaceState(null, "", (lang === "pt" ? "/pt/" : "/") + location.search + location.hash); } catch (e) { /* file:// or sandboxed */ }
  });

  // ================================================================ theme
  function setTheme(next) {
    document.documentElement.setAttribute("data-theme", next);
    $('meta[name="theme-color"]').setAttribute("content", next === "dark" ? "#09090b" : "#fafafa");
    store.set("theme", next);
    game.redraw();
    if (reduced || !starsRunning) drawStarsOnce();
    document.dispatchEvent(new CustomEvent("site:theme", { detail: next }));
  }
  const toggleTheme = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  $("#toggle-theme").addEventListener("click", toggleTheme);

  // ================================================================ email, toast
  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }
  async function copyEmail() {
    try { await navigator.clipboard.writeText(L.email); toast(`${t("contact.copied")} ${L.email}`); }
    catch (e) { toast(`${t("contact.copyFailed")} ${L.email}`); }   // never navigate away; always show the address
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-copy-email]")) copyEmail(); });

  // ================================================================ typed headline
  let typedTimer;
  function restartTyped() {
    clearTimeout(typedTimer);
    const el = $("#typed"), words = t("hero.words");
    if (reduced) { el.textContent = words[0]; return; }
    let w = 0, i = 0, deleting = false;
    const tick = () => {
      const word = words[w];
      i += deleting ? -1 : 1;
      el.textContent = word.slice(0, i);
      let delay = deleting ? 28 : 55;
      if (!deleting && i === word.length) { deleting = true; delay = 1900; }
      else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 350; }
      typedTimer = setTimeout(tick, delay);
    };
    el.textContent = ""; tick();
  }

  // ================================================================ impact
  function renderImpact() {
    $("#impact-grid").innerHTML = R.impact(C[lang], { revealed: booted, counting: !booted && !reduced });
    if (booted) $$("[data-count]").forEach((n) => (n.dataset.done = "1"));
    bindCards();
  }
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = "1";
    const target = +el.dataset.count;
    if (reduced) { el.textContent = target; return; }
    const start = performance.now(), dur = 1200;
    const step = (now) => { const p = Math.min(1, (now - start) / dur); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ================================================================ experience
  const openJobs = new Set();
  function renderJobs() {
    const ex = C[lang].experience;
    $("#jobs").innerHTML = R.jobs(C[lang], { revealed: booted, open: openJobs });
    $$(".job-toggle").forEach((btn) => btn.addEventListener("click", () => {
      const job = btn.closest(".job"), i = +job.dataset.i, open = !job.classList.contains("open");
      job.classList.toggle("open", open); btn.setAttribute("aria-expanded", open);
      btn.querySelector("span").textContent = open ? ex.less : ex.more;
      open ? openJobs.add(i) : openJobs.delete(i);
      requestScrollUpdate();
    }));
    bindCards();
  }

  // ================================================================ stack
  let filter = "all";
  function renderFilters() {
    $("#filters").innerHTML = R.filters(C[lang], filter);
    $$(".filter").forEach((b) => b.addEventListener("click", () => {
      filter = b.dataset.f;
      $$(".filter").forEach((x) => x.setAttribute("aria-pressed", x === b));
      applyFilter();
    }));
  }
  function renderStack() {
    $("#stack-grid").innerHTML = R.stack(STACK, { revealed: booted });
    applyFilter();
  }
  function applyFilter() { $$(".tech").forEach((el) => el.classList.toggle("dim", filter !== "all" && el.dataset.cat !== filter)); }

  // ================================================================ security + academic projects
  function renderSecurity() { $("#thesis-tags").innerHTML = R.thesisTags(C[lang]); }
  function renderAcademic() {
    $("#academic").innerHTML = R.academic(C[lang], L, { revealed: booted });
    bindCards();
  }

  // ================================================================ spotlight + tilt
  function bindCards() {
    $$(".spot").forEach((el) => {
      if (el.dataset.bound) return; el.dataset.bound = "1";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty("--mx", x + "px"); el.style.setProperty("--my", y + "px");
        if (el.hasAttribute("data-tilt") && !reduced && e.pointerType === "mouse") {
          el.style.setProperty("--ry", ((x / r.width - 0.5) * 8).toFixed(2) + "deg");
          el.style.setProperty("--rx", (-(y / r.height - 0.5) * 8).toFixed(2) + "deg");
        }
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
  }

  // ================================================================ reveal on scroll
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      $$("[data-count]", en.target).forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }) : null;
  function observeReveals() {
    $$(".reveal:not(.in)").forEach((el) => {
      if (io && !reduced) io.observe(el);
      else { el.classList.add("in"); $$("[data-count]", el).forEach(countUp); }
    });
  }

  // ================================================================ orbit
  $$(".node").forEach((n) => n.addEventListener("click", () => {
    const id = n.dataset.target;
    const card = id === "ai" ? $(".job") : id === "security" ? $("#thesis") : $("#impact-" + id);
    if (!card) return;
    card.scrollIntoView({ behavior: smooth(), block: "center" });
    card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
  }));

  // the coin at the centre: tap/click/Enter flips it (hover also flips it with a mouse, via CSS)
  $("#core").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    btn.setAttribute("aria-pressed", String(btn.getAttribute("aria-pressed") !== "true"));
  });

  // pointer: one style write per frame, scoped to the elements that use it
  const glow = $(".cursor-glow"), orbit = $("#orbit");
  const mouse = { x: -9999, y: -9999 };
  let pointerFrame = 0, lastPointer = null;
  window.addEventListener("pointermove", (e) => {
    lastPointer = e;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const p = lastPointer;
      glow.style.setProperty("--cx", p.clientX + "px");
      glow.style.setProperty("--cy", p.clientY + "px");
      if (reduced || p.pointerType !== "mouse") return;
      orbit.style.setProperty("--px", ((p.clientX / innerWidth - 0.5) * 22).toFixed(1) + "px");
      orbit.style.setProperty("--py", ((p.clientY / innerHeight - 0.5) * 22).toFixed(1) + "px");
      mouse.x = p.clientX; mouse.y = p.clientY;
    });
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

  // ================================================================ constellation
  const canvas = $("#stars"), ctx = canvas.getContext("2d");
  let pts = [], cw = 0, ch = 0, starRaf = 0, starsRunning = false, heroVisible = true;
  function sizeStars(force) {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const widthChanged = Math.abs(r.width - cw) > 40;
    cw = r.width; ch = r.height;
    canvas.width = cw * dpr; canvas.height = ch * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (force || widthChanged || !pts.length) {
      const n = Math.round(Math.min(90, (cw * ch) / 16000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * cw, y: Math.random() * ch, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.4 + 0.5 }));
    } else {
      for (const p of pts) { p.x = Math.min(p.x, cw); p.y = Math.min(p.y, ch); }
    }
  }
  function paintStars(move) {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const rgb = dark ? "253,164,175" : "109,40,217";
    ctx.clearRect(0, 0, cw, ch);
    const top = canvas.getBoundingClientRect().top;
    for (const p of pts) {
      if (move) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); } else if (p.x > cw) { p.x = cw; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); } else if (p.y > ch) { p.y = ch; p.vy = -Math.abs(p.vy); }
        const mdx = p.x - mouse.x, mdy = p.y - (mouse.y - top), md = Math.hypot(mdx, mdy);
        if (md > 0.5 && md < 140) { p.x += (mdx / md) * 0.6; p.y += (mdy / md) * 0.6; }
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(${rgb},${dark ? 0.7 : 0.4})`; ctx.fill();
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 < 14400) { const d = Math.sqrt(d2); ctx.strokeStyle = `rgba(${rgb},${(1 - d / 120) * (dark ? 0.22 : 0.12)})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
  }
  const drawStarsOnce = () => paintStars(false);
  function starLoop() { paintStars(true); starRaf = requestAnimationFrame(starLoop); }
  function syncStars() {
    const shouldRun = heroVisible && !reduced && document.visibilityState === "visible";
    if (shouldRun && !starsRunning) { starsRunning = true; starRaf = requestAnimationFrame(starLoop); }
    else if (!shouldRun && starsRunning) { starsRunning = false; cancelAnimationFrame(starRaf); drawStarsOnce(); }
  }
  sizeStars(true); drawStarsOnce();
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; syncStars(); }).observe(canvas);
  document.addEventListener("visibilitychange", syncStars);
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { sizeStars(false); drawStarsOnce(); requestScrollUpdate(); }, 150);
  });

  // ================================================================ scroll: nav state, active link, timeline (one frame, reads then writes)
  const sections = ["impact", "experience", "stack", "security", "projects", "contact"].map((id) => document.getElementById(id));
  let scrollFrame = 0;
  function scrollUpdate() {
    scrollFrame = 0;
    const vh = innerHeight, y = scrollY;
    const tops = sections.map((s) => s.getBoundingClientRect().top);
    const tl = $("#timeline").getBoundingClientRect();
    const jobTops = $$(".job").map((j) => j.getBoundingClientRect().top);
    let current = null;
    tops.forEach((top, i) => { if (top < vh * 0.4) current = sections[i].id; });
    const progress = Math.max(0, Math.min(1, (vh * 0.6 - tl.top) / tl.height));
    // writes
    $("#nav").classList.toggle("scrolled", y > 20);
    $$(".nav-links a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + current));
    $("#timeline-fill").style.transform = `scaleY(${progress.toFixed(3)})`;
    $$(".job").forEach((j, i) => j.classList.toggle("lit", jobTops[i] < vh * 0.6));
  }
  function requestScrollUpdate() { if (!scrollFrame) scrollFrame = requestAnimationFrame(scrollUpdate); }
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });

  // ================================================================ Riposte mini-game
  const game = (() => {
    const cv = $("#game-canvas"), g = cv.getContext("2d"), stage = $("#game-stage"), res = $("#game-result"), live = $("#game-live");
    const S = 320, CX = S / 2, CY = S / 2, HIT = 46;          // the ring "lands" when its radius reaches HIT
    const WIN = { perfect: 4, dodge: 9, grace: 17 };         // tolerance bands around HIT, in px
    let running = false, paused = false, ring = 0, speed = 0, wait = 0, judged = false, last = 0, raf = 0;
    let streak = 0, lastKind = null, visibleRatio = 0;
    let best = parseInt(store.get("riposte-best") || "0", 10) || 0;
    $("#best").textContent = best;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = S * dpr; cv.height = S * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = () => ({ perfect: css("--ok"), dodge: css("--dodge"), grace: css("--grace"), miss: css("--bad") });

    function band(r0, r1, color) { g.beginPath(); g.arc(CX, CY, r1, 0, Math.PI * 2); g.arc(CX, CY, r0, 0, Math.PI * 2, true); g.fillStyle = color; g.fill(); }
    function draw() {
      g.clearRect(0, 0, S, S);
      band(HIT - WIN.grace, HIT + WIN.grace, "rgba(234,179,8,.18)");
      band(HIT - WIN.dodge, HIT + WIN.dodge, "rgba(14,165,233,.24)");
      band(HIT - WIN.perfect, HIT + WIN.perfect, "rgba(34,197,94,.42)");
      g.beginPath(); g.arc(CX, CY, HIT, 0, Math.PI * 2); g.strokeStyle = css("--line-2"); g.lineWidth = 1; g.stroke();
      g.beginPath(); g.arc(CX, CY, 7, 0, Math.PI * 2); g.fillStyle = css("--accent"); g.shadowColor = css("--accent"); g.shadowBlur = 16; g.fill(); g.shadowBlur = 0;
      if (running && wait <= 0 && ring > 0) {
        g.beginPath(); g.arc(CX, CY, ring, 0, Math.PI * 2);
        const grad = g.createLinearGradient(CX - ring, CY - ring, CX + ring, CY + ring); const dk = document.documentElement.getAttribute("data-theme") === "dark"; grad.addColorStop(0, dk ? "#f43f5e" : "#8b5cf6"); grad.addColorStop(1, dk ? "#8b5cf6" : "#e11d48");
        g.strokeStyle = grad; g.lineWidth = 3.5; g.shadowColor = "#e11d48"; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0;
      }
      if (!running) {
        g.fillStyle = css("--muted"); g.font = "600 15px Inter, system-ui, sans-serif"; g.textAlign = "center";
        g.fillText(t(paused ? "projects.riposte.over" : "projects.riposte.start"), CX, CY - 72);
      }
    }
    function nextAttack() { ring = 150; speed = 1.6 + Math.random() * 1.4 + Math.min(streak, 10) * 0.12; wait = 400 + Math.random() * 900; judged = false; }
    function show(kind, announce) {
      lastKind = kind;
      res.textContent = t("projects.riposte.results." + kind);
      res.style.color = colors()[kind];
      res.classList.remove("show"); void res.offsetWidth; res.classList.add("show");
      if (announce) live.textContent = res.textContent;   // results and the game over; not every attack that starts
      const reached = streak;
      streak = kind === "miss" ? 0 : streak + 1;
      if (streak > best) { best = streak; store.set("riposte-best", String(best)); }
      $("#streak").textContent = streak; $("#best").textContent = best;
      document.dispatchEvent(new CustomEvent("site:game", { detail: { kind, streak: kind === "miss" ? reached : streak } }));
      if (kind === "miss") stop(true);   // game over: the next click starts a new round
    }
    function start() { running = true; paused = false; nextAttack(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    function stop(asPause) { running = false; paused = asPause; cancelAnimationFrame(raf); draw(); }
    function press() {
      if (!running) { start(); return; }
      if (judged || wait > 0) return;
      const d = Math.abs(ring - HIT);
      judged = true;
      show(d <= WIN.perfect ? "perfect" : d <= WIN.dodge ? "dodge" : d <= WIN.grace ? "grace" : "miss", true);
      if (running) setTimeout(() => running && nextAttack(), 450);
    }
    function loop(now) {
      const dt = Math.min(48, now - last); last = now;
      if (wait > 0) wait -= dt;
      else if (!judged) {
        ring -= speed * (dt / 16.7);
        if (ring < HIT - WIN.grace - 4) {
          judged = true;
          show("miss", true);
          return;
        }
      }
      draw();
      if (running && visibleRatio > 0) raf = requestAnimationFrame(loop);
    }
    new IntersectionObserver(([en]) => {
      visibleRatio = en.intersectionRatio;
      if (running && visibleRatio > 0) { last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    }, { threshold: [0, 0.5, 1] }).observe(stage);
    stage.addEventListener("pointerdown", (e) => { if (e.button > 0) return; e.preventDefault(); press(); });
    stage.addEventListener("keydown", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) press();
    });
    window.addEventListener("keydown", (e) => {
      // Space plays only while a started game is mostly on screen; otherwise it keeps scrolling the page.
      if (e.key !== " " || e.repeat || !running || visibleRatio < 0.5 || !pal.hidden) return;
      const el = document.activeElement, tag = el ? el.tagName : "";
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag) && el !== stage) return;
      e.preventDefault(); press();
    });
    draw();
    return {
      redraw: draw,
      relabel() { if (lastKind) res.textContent = t("projects.riposte.results." + lastKind); draw(); },
      focus() { $("#riposte").scrollIntoView({ behavior: smooth(), block: "center" }); setTimeout(() => stage.focus({ preventScroll: true }), reduced ? 0 : 500); },
    };
  })();

  // ================================================================ command palette
  const pal = $("#palette"), input = $("#palette-input"), list = $("#palette-list");
  const pageRegions = () => [$("#nav"), $("#main"), $(".footer")];
  let items = [], sel = 0, lastFocus = null;
  const go = (id) => () => document.getElementById(id).scrollIntoView({ behavior: smooth() });
  // Other scripts add their own commands (the pixel friends do): fn(typed text) → [{ k, label, icon, run, first }].
  const providers = [];
  function commands() {
    const c = t("palette.cmds");
    const raw = input.value.trim();
    const more = providers.flatMap((fn) => { try { return fn(raw) || []; } catch (e) { return []; } });
    return [
      ...more.filter((m) => m.first),
      { k: "impact", label: c.impact, icon: "arrow", run: go("impact") },
      { k: "experience", label: c.experience, icon: "arrow", run: go("experience") },
      { k: "stack", label: c.stack, icon: "arrow", run: go("stack") },
      { k: "security", label: c.security, icon: "arrow", run: go("security") },
      { k: "projects", label: c.projects, icon: "arrow", run: go("projects") },
      { k: "contact", label: c.contact, icon: "arrow", run: go("contact") },
      { k: "play", label: c.play, icon: "game", run: () => game.focus() },
      ...more.filter((m) => !m.first),
      { k: "theme", label: c.theme, icon: "sun", run: toggleTheme },
      { k: "lang", label: c.lang, icon: "globe", run: () => $("#toggle-lang").click() },
      { k: "email", label: c.email, icon: "copy", run: copyEmail },
      { k: "linkedin", label: c.linkedin, icon: "out", run: () => window.open(L.linkedin, "_blank", "noopener") },
      { k: "github", label: c.github, icon: "out", run: () => window.open(L.github, "_blank", "noopener") },
    ];
  }
  function renderPalette() {
    const q = input.value.trim().toLowerCase();
    items = commands().filter((c) => !q || c.label.toLowerCase().includes(q) || c.k.includes(q));
    sel = items.length ? Math.min(Math.max(sel, 0), items.length - 1) : 0;
    list.innerHTML = items.length
      ? items.map((c, i) => `<li role="option" id="opt-${i}" aria-selected="${i === sel}" data-i="${i}">${svg(c.icon)}<span>${R.esc(c.label)}</span></li>`).join("")
      : `<li class="empty" role="option" aria-disabled="true" aria-selected="false">${t("palette.empty")}</li>`;
    if (items.length) {
      input.setAttribute("aria-activedescendant", "opt-" + sel);
      const cur = document.getElementById("opt-" + sel); if (cur) cur.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }
  function openPalette() {
    if (!pal.hidden) return;
    lastFocus = document.activeElement;
    pageRegions().forEach((el) => el.setAttribute("inert", ""));
    pal.hidden = false; input.value = ""; sel = 0; renderPalette(); input.focus();
  }
  function closePalette() {
    if (pal.hidden) return;
    pal.hidden = true;
    pageRegions().forEach((el) => el.removeAttribute("inert"));
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function runSel() { const c = items[sel]; if (!c) return; closePalette(); c.run(); }
  function move(delta) { if (!items.length) return; sel = (sel + delta + items.length) % items.length; renderPalette(); }
  $("#open-palette").addEventListener("click", openPalette);
  input.addEventListener("input", () => { sel = 0; renderPalette(); });
  pal.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); runSel(); }
    else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
    else if (e.key === "Tab") { e.preventDefault(); input.focus(); }   // keep focus inside the dialog
  });
  list.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) { sel = +li.dataset.i; runSel(); } });
  pal.addEventListener("mousedown", (e) => { if (e.target !== input && e.target !== pal) e.preventDefault(); });   // clicks inside keep focus on the input
  pal.addEventListener("click", (e) => { if (e.target === pal) closePalette(); });
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); }
    else if (e.key === "/" && pal.hidden && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName)) { e.preventDefault(); openPalette(); }
  });
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.userAgent;
  if (!/Mac|iPhone|iPad|iOS/i.test(platform)) $$("kbd").forEach((k) => { if (k.textContent === "⌘K") k.textContent = "Ctrl K"; });

  // ================================================================ mobile menu: a plain list of the sections
  const menu = $("#mobile-menu"), menuBtn = $("#open-menu");
  function setMenu(open, refocus) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("a").focus();
    else if (refocus) menuBtn.focus();
  }
  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setMenu(false, true); });
  document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest("#mobile-menu, #open-menu")) setMenu(false); });
  menu.addEventListener("focusout", (e) => { if (!menu.hidden && e.relatedTarget && !e.relatedTarget.closest("#mobile-menu, #open-menu")) setMenu(false); });

  // ================================================================ reduced-motion changes at runtime
  motionQuery.addEventListener("change", (e) => { reduced = e.matches; restartTyped(); syncStars(); if (reduced) $$(".reveal").forEach((el) => el.classList.add("in")); });

  // ================================================================ hooks for the pixel friends (fun/)
  window.SITE = {
    t, toast, $, $$, store,
    lang: () => lang,
    reduced: () => reduced,
    paletteOpen: () => !pal.hidden,
    pageRegions,
    closeMenu: () => { if (!menu.hidden) setMenu(false); },
    addCommands: (fn) => { providers.push(fn); if (!pal.hidden) renderPalette(); },
    openPalette, closePalette,
  };

  // ================================================================ boot
  $("#year").textContent = new Date().getFullYear();
  applyLang();
  booted = true;
  syncStars();
  scrollUpdate();
})();

async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const out = [];
  const check = (name, ok, info = "") => out.push(`${ok ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
  const key = (k, opts = {}, target = window) => target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }));
  document.documentElement.style.scrollBehavior = "auto";
  out.push(`INFO visibility=${document.visibilityState}`);
  const res = $("#game-result"), live = $("#game-live"), streak = $("#streak"), stage = $("#game-stage");
  $("#riposte").scrollIntoView({ block: "center" }); await sleep(500);

  check("game: stage has an accessible name", (stage.getAttribute("aria-label") || "").length > 5, stage.getAttribute("aria-label"));
  key(" "); await sleep(2600);
  check("game: Space does not start it before a tap (page scroll kept)", res.textContent === "");

  // a mouse click starts it; an unanswered attack is a miss, and a miss ends the round
  stage.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
  let seen = false;
  for (let i = 0; i < 40 && !seen; i++) { await sleep(100); seen = res.textContent.length > 0; }
  check("game: click starts it; an unanswered attack is a hit", seen && streak.textContent === "0", res.textContent);
  check("game: game over is announced", live.textContent.length > 0, `live="${live.textContent}"`);
  let changed = false;
  const mo0 = new MutationObserver(() => { changed = true; });
  mo0.observe(res, { childList: true, characterData: true, subtree: true });
  await sleep(3500); mo0.disconnect();
  check("game: stops after the first miss", !changed);
  const hint = $("#game-hint");
  check("game: hint only for screen readers (not shown)", hint && hint.classList.contains("sr-only") && stage.getAttribute("aria-describedby") === "game-hint", hint && hint.textContent);

  // click again for a new round; rapid presses judge one attack at most once
  stage.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
  let n = 0; const mo = new MutationObserver(() => n++); mo.observe(live, { childList: true, characterData: true, subtree: true });
  for (let i = 0; i < 40 && n === 0; i++) { for (let j = 0; j < 4; j++) { key(" "); await sleep(15); } await sleep(60); }
  await sleep(80); mo.disconnect();
  check("game: rapid presses -> one judgement", n === 1, n + " announcements");

  // focused stage: Space handled once (no window double-handling)
  stage.focus(); await sleep(900);
  let m = 0; const mo2 = new MutationObserver(() => m++); mo2.observe(live, { childList: true, characterData: true, subtree: true });
  stage.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true })); await sleep(40); mo2.disconnect();
  check("game: Space on focused stage judged once", m <= 1, m + " announcements");
  stage.blur();

  // language switch relabels the last result
  const prev = res.textContent;
  $("#toggle-lang").click(); await sleep(200);
  check("game: result text follows language", res.textContent !== prev && res.textContent.length > 0, `${prev} -> ${res.textContent}`);
  $("#toggle-lang").click(); await sleep(200);
  check("game: best score stored as a number", /^\d+$/.test(localStorage.getItem("riposte-best") || "0"));
  return out.join("\n");
}

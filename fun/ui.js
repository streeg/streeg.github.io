// Screen effects and dialogs shared by the features: pixel cards, confetti, flashes, a screen shake.
import { S, $, rand, pick, reduced } from "./util.js";
import { W, layer } from "./world.js";

// A small pixel card (dialog): title, a line under it, any HTML, and buttons. Focus stays inside; Escape closes it.
// buttons: [{ text, primary, run(close) }]; the last one closes the card unless it has run().
export function openCard(cls, title, sub, html, closeText, buttons = []) {
  if (W.ko || cardOpen()) return null;
  const back = document.activeElement;
  const box = document.createElement("div");
  box.className = "ko-card " + cls;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", cls + "-title");
  box.innerHTML = `<h2 id="${cls}-title"></h2><p class="ko-body"></p>${html}<div class="ko-actions"></div>`;
  box.querySelector("h2").textContent = title;
  box.querySelector(".ko-body").textContent = sub;
  if (!sub) box.querySelector(".ko-body").remove();
  const close = () => {
    box.remove();
    S.pageRegions().forEach((el) => el.removeAttribute("inert"));
    if (back && document.contains(back)) back.focus({ preventScroll: true });
  };
  const row = box.querySelector(".ko-actions");
  const all = buttons.concat([{ text: closeText }]).map((b) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn " + (b.primary ? "btn-primary" : "btn-ghost");
    btn.textContent = b.text;
    btn.addEventListener("click", () => (b.run ? b.run(close) : close()));
    row.append(btn);
    return btn;
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") {   // keep focus on the card's buttons
      e.preventDefault();
      const i = all.indexOf(document.activeElement);
      all[(i + (e.shiftKey ? -1 : 1) + all.length) % all.length].focus();
    }
  });
  document.body.append(box);
  S.pageRegions().forEach((el) => el.setAttribute("inert", ""));
  (all.find((b) => b.classList.contains("btn-primary")) || all[all.length - 1]).focus();
  box.close = close;
  return box;
}
// a card or the terminal is open: keys belong to it
export const cardOpen = () => !!document.querySelector(".ko-card, .px-term");

// Confetti (pixel bits) bursting out of (x, y).
export function burst(x, y, colors, n = 30, spread = 1) {
  if (reduced()) return;
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
export function flash(x, y) {
  const f = document.createElement("div");
  f.className = "px-flash";
  f.style.setProperty("--fx", x + "px"); f.style.setProperty("--fy", y + "px");
  layer.append(f);
  setTimeout(() => f.remove(), 600);
}
export function shake() {
  ["#main", ".footer", "#nav"].forEach((s) => {
    const el = $(s);
    if (el && el.animate) el.animate([{ translate: "0 0" }, { translate: "-9px 5px" }, { translate: "8px -6px" }, { translate: "-6px 3px" }, { translate: "4px -2px" }, { translate: "0 0" }], { duration: 340, easing: "linear" });
  });
}

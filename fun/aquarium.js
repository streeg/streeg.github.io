// Aquarium mode, like a screensaver: the page fades away and the little world fills the window, bigger, under a
// sky with the colours of the hour. From the palette, or by itself after a few minutes with nobody around.
// Move the mouse, scroll, tap or press any key and the page comes back.
import { root, t, now, view, reduced } from "./util.js";
import { W, layer, mouse, input, rescale, addSystem, showFriends } from "./world.js";
import { cardOpen } from "./ui.js";
import { unlock } from "./achv.js";
import { S } from "./util.js";

const hint = document.createElement("div");
hint.className = "px-aqua-hint";
layer.append(hint);
let since = 0, at = { x: 0, y: 0 };
export const aquariumOn = () => !!W.aquarium;
export function setAquarium(on) {
  if (!!W.aquarium === on || (on && (W.ko || cardOpen() || S.paletteOpen()))) return;
  W.aquarium = on;
  root.classList.toggle("px-aquarium", on);
  view.zoom = on ? (innerWidth < 640 ? 1.4 : 1.8) : 1;
  rescale();
  if (on) {
    showFriends();
    since = now(); at = { x: mouse.x, y: mouse.y };
    hint.textContent = t("aquarium.hint");
    unlock("aquarium");
  }
}
const leave = () => { if (W.aquarium && now() - since > 800) setAquarium(false); };
["keydown", "pointerdown", "wheel", "touchstart"].forEach((ev) => window.addEventListener(ev, leave, { passive: true }));
window.addEventListener("pointermove", (e) => {
  if (!W.aquarium || now() - since < 1200) return;
  if (Math.hypot(e.clientX - at.x, e.clientY - at.y) > 40) setAquarium(false);
}, { passive: true });
// nobody around for a while: the world takes over
addSystem(() => {
  if (!W.aquarium && !W.calm && !reduced() && !layer.hidden && !document.hidden && now() - input.last > 180000) setAquarium(true);
}, 95);

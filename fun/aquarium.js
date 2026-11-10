// Aquarium mode, like a screensaver: the page fades away and the little world fills the window, bigger, under a
// sky with the colours of the hour. From the palette, or by itself after a few minutes with nobody around.
// Move the mouse, scroll, tap or press any key and the page comes back (unless a game there holds it: fishing.js).
import { root, t, now, view, reduced, finePointer } from "./util.js";
import { W, layer, mouse, input, rescale, addSystem, showFriends } from "./world.js";
import { cardOpen } from "./ui.js";
import { unlock } from "./achv.js";
import { S } from "./util.js";

const hint = document.createElement("div");
hint.className = "px-aqua-hint";
layer.append(hint);
let since = 0, at = { x: 0, y: 0 };
// other features can keep the aquarium open for some input (a key, a click on the pond): fn(event) → true
const holders = [];
export const holdAquarium = (fn) => holders.push(fn);
const held = (e) => holders.some((fn) => fn(e));
const baseHint = () => t("aquarium.hint") + " · " + t(finePointer.matches ? "fish.hint" : "fish.hintTouch");
// a hint of its own while a game runs (null: back to the usual one)
export const aquaHint = (text) => { hint.textContent = text || baseHint(); hint.classList.toggle("px-play", !!text); };
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
    aquaHint(null);
    unlock("aquarium");
  }
}
const leave = (e) => { if (W.aquarium && now() - since > 800 && !held(e)) setAquarium(false); };
["keydown", "pointerdown", "wheel", "touchstart"].forEach((ev) => window.addEventListener(ev, leave, { passive: true }));
window.addEventListener("pointermove", (e) => {
  if (!W.aquarium || now() - since < 1200 || held(e)) return;
  if (Math.hypot(e.clientX - at.x, e.clientY - at.y) > 40) setAquarium(false);
}, { passive: true });
// nobody around for a while: the world takes over
addSystem(() => {
  if (!W.aquarium && !W.calm && !reduced() && !layer.hidden && !document.hidden && now() - input.last > 180000) setAquarium(true);
}, 95);

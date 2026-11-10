// The friends react to what the visitor does on the page: copying the email, switching the language,
// the mini-game, reaching the bottom of the page.
import { $, t, now } from "./util.js";
import { W } from "./world.js";
import { me, react } from "./me.js";
import { unlock } from "./achv.js";

document.addEventListener("click", (e) => {
  const el = e.target instanceof Element ? e.target : null;
  if (!e.isTrusted || !el) return;
  if (el.closest("[data-copy-email]")) react(t("thanks"), "heart", "held");
  if (el.closest("#core")) unlock("coin");
});
document.addEventListener("site:lang", () => react(t("hello"), "heart", "wave"));
document.addEventListener("site:game", (e) => {
  const k = e.detail && e.detail.kind;
  if (k === "perfect") { unlock("perfect"); if (now() - (me.saidAt || 0) > 1500) react(t("cheer"), "star", "held"); }
  else if (k === "miss") react(t("almost"), "skull");
});
const footerEl = $(".footer");
if (footerEl && "IntersectionObserver" in window) {
  let waved = false;
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting || waved || W.ko) return;
    waved = true;
    unlock("bottom");
    react(t("bye"), "heart", "wave");
  }, { threshold: 0.6 }).observe(footerEl);
}

// Sweet dreams: a sleeping cat (or the dev, asleep at night) now and then shows what it is dreaming about in a
// little thought bubble. Cats dream of fish, the yarn, the red dot, the bird, the other cat, and Lud once they
// have met her; the dev of coffee, the cats, pizza, a merged PR… and sometimes the bug.
import { now, rand, pick } from "./util.js";
import { actors, emit, addSystem } from "./world.js";
import { toSvg, PAL } from "./art/core.js";
import { PROPS } from "./art/props.js";
import { CRITTERS } from "./art/home.js";
import { CAT, CAT_PAL } from "./art/cats.js";
import { LUD, LUD_PAL } from "./art/lud.js";
import { EMOJI } from "./art/icons.js";
import { BADGES } from "./art/badges.js";
import { DOT } from "./art/life.js";
import { got } from "./achv.js";

const ludFace = () => LUD.idle.slice(0, 19);
function catDreams(a) {
  const other = a.catId === "capitu" ? "sancho" : "capitu";
  const list = [["fish", PROPS.fish, PAL], ["fish", PROPS.fish, PAL], ["yarn", PROPS.yarn, PAL], ["dot", DOT, PAL],
    ["bird", CRITTERS.bird1, PAL], ["butterfly", CRITTERS.butterfly1, PAL]];
  if (CAT_PAL[other]) list.push(["cat", CAT.sit, CAT_PAL[other]]);
  if (got.has("lud")) list.push(["lud", ludFace(), LUD_PAL]);
  return list;
}
function devDreams() {
  const list = [["coffee", EMOJI.coffee, PAL], ["cat", CAT.sit, CAT_PAL.capitu], ["cat", CAT.sit, CAT_PAL.sancho],
    ["pizza", CRITTERS.pizza, PAL], ["merge", BADGES.merge, PAL], ["bug", BADGES.bug, PAL]];
  if (got.has("lud")) list.push(["lud", ludFace(), LUD_PAL], ["lud", ludFace(), LUD_PAL]);
  return list;
}
const asleep = (a) => (a.kind === "cat" && a.base === "sleep") || (a.kind === "me" && a.base === "lie");

addSystem(() => {
  for (const a of actors) {
    if (!asleep(a) || a.runOff) { a.dreamAt = 0; continue; }
    if (!a.dreamAt) { a.dreamAt = now() + rand(2500, 5000); continue; }
    if (now() < a.dreamAt || a.bub.classList.contains("show")) continue;
    a.dreamAt = now() + rand(9000, 15000);
    const [k, art, pal] = pick(a.kind === "me" ? devDreams() : catDreams(a));
    a.say(`<span class="px-dream${k === "bug" ? " px-nightmare" : ""}">${toSvg(art, "", pal)}</span>`, 3200);
    a.nextZ = now() + 3600;   // no snoring over the dream
    emit("dream", a, k);
  }
}, 75);

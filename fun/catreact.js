// The cats notice what you do on the page: a cat comes to lie on the card you are reading, tries to catch
// the text you select, startles when you scroll very fast, and recognises itself on the coin.
import { $, t, now, rand, pick, clamp, unit, finePointer, reduced, bubble } from "./util.js";
import { W, cats, wait, walk, act, launch, landed, jumpTo, hopDown, addSystem } from "./world.js";
import { me } from "./me.js";
import { petFeed } from "./pets.js";

// a cat that can drop what it is doing (not held, not asleep, not busy with a scene)
const idleCat = () => { const c = W.cat; return c && c.mode === "ground" && c.soft && !c.leaving && !c.tangledUntil && c.base !== "sleep" && !W.ko && !W.laser ? c : null; };
// where a cat sits on top of an element (null when the element is out of reach: scrolled away, under the bar)
const onTopOf = (getRect, k = 0.5) => (a) => {
  const r = getRect();
  if (!r || r.width < 30 || r.top < 96 || r.top > innerHeight - a.h - 40) return null;
  return { x: clamp(r.left + r.width * k - a.w / 2, 4, a.maxX()), y: r.top - a.h + unit() * 2 };
};

// ---------------------------------------------------------------- reading: the mouse rests on a card for a while
const CARDS = ".impact-card, .job, .project, .contact-card";
let reading = null, readingSince = 0, readCool = now() + 15000;
document.addEventListener("pointerover", (e) => {
  if (e.pointerType !== "mouse") return;
  const el = e.target instanceof Element ? e.target.closest(CARDS) : null;
  if (el !== reading) { reading = el; readingSince = now(); }
});
function lieOnCard(c, card) {
  const perch = onTopOf(() => (document.contains(card) ? card.getBoundingClientRect() : null), rand(0.55, 0.8));
  if (!perch(c)) { readCool = now() + 3000; return; }   // its top is out of reach: maybe after some scrolling
  readCool = now() + rand(60000, 90000);
  c.interrupt([
    walk(() => { const p = perch(c); return p ? p.x + (c.cx() < p.x ? -60 : 60) : null; }, 90),
    wait(300, "sit"),
    jumpTo(perch, 0.6),
    act(() => { if (c.mode !== "perch") return "stop"; c.say(bubble(t("catReact.reading"), "cat"), 1600); }),
    wait(rand(1500, 2500), "sit"),
    wait(rand(6000, 9000), "sleep"),   // scroll and it falls off
    act(() => { if (c.mode === "perch") petFeed(c, "energy", 10); }),
    hopDown(rand(-80, 80)), landed(),
  ]);
  setTimeout(() => { if (!me.locked && c.mode === "perch") me.say(bubble(t("catReact.readingDev").replace("{name}", c.name), "heart"), 2200); }, 2600);
}

// ---------------------------------------------------------------- selecting text: the cat jumps up and paws at it
let selCool = now() + 8000, selTimer = 0;
const selRect = () => {
  const s = getSelection();
  if (!s || s.isCollapsed || s.rangeCount === 0 || String(s).trim().length < 3) return null;
  const r = s.getRangeAt(0).getBoundingClientRect();
  return r.width ? r : null;
};
document.addEventListener("selectionchange", () => {
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    const c = idleCat();
    if (!c || now() < selCool || reduced() || !selRect()) return;
    const perch = onTopOf(selRect, 0.5);
    if (!perch(c)) return;
    selCool = now() + rand(20000, 30000);
    c.interrupt([
      walk(() => { const p = perch(c); return p ? p.x + (c.cx() < p.x ? -50 : 50) : null; }, 150),
      act(() => c.say(bubble("!", "cat"), 900)),
      jumpTo(perch, 0.5),
      act(() => (c.mode === "perch" ? undefined : "stop")),
      wait(220, "paw"), wait(200, "sit"), wait(220, "paw"), wait(200, "sit"), wait(220, "paw"),
      act(() => { petFeed(c, "fun", 8); c.say(bubble(t("catReact.select"), "cat"), 1500); }),
      wait(rand(2000, 3500), "sit"),   // clear the selection and it falls
      hopDown(rand(-70, 70)), landed(),
    ]);
  }, 700);
});

// ---------------------------------------------------------------- scrolling very fast startles them
let lastY = scrollY, lastT = now(), scrollCool = 0;
window.addEventListener("scroll", () => {
  const tn = now(), v = Math.abs(scrollY - lastY) / Math.max(16, tn - lastT) * 1000;
  lastY = scrollY; lastT = tn;
  if (v < 4500 || tn < scrollCool || W.ko || reduced()) return;
  scrollCool = tn + 6000;
  cats().forEach((c) => {
    if (c.mode !== "ground" || c.tangledUntil) return;
    c.say(bubble(t("scared"), "cat"), 1000);
    launch(c, c.x, c.floor(), 0.38);
  });
}, { passive: true });

// ---------------------------------------------------------------- the coin: its back shows the cat of the theme
const coin = $("#core");
let coinSeenCool = 0;
function recognise() {
  const c = idleCat();
  if (!c || now() < coinSeenCool) return;
  coinSeenCool = now() + 25000;
  const r = coin.getBoundingClientRect();
  c.face = r.left + r.width / 2 > c.cx() ? 1 : -1;
  c.interrupt([wait(300, "sit"), act(() => { c.pop("heart"); c.say(bubble(t("catReact.itsMe"), "heart"), 1800); }), wait(2200, "sit")]);
}
if (coin) {
  coin.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && finePointer.matches) setTimeout(recognise, 400); });   // hovering flips it
  coin.addEventListener("click", () => setTimeout(() => { if (coin.getAttribute("aria-pressed") === "true") recognise(); }, 400));
}

addSystem(() => {
  if (!reading || now() - readingSince < 4500 || now() < readCool) return;
  const c = idleCat();
  if (c && pick([true, true, false])) lieOnCard(c, reading);
  else readCool = now() + 20000;
}, 75);

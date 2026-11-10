// A card to share your achievements: a 1200×630 PNG with the trophies you found, the dev and the cats.
// On phones it opens the share sheet; elsewhere it downloads the image and copies a line of text.
import { S, root, t } from "./util.js";
import { svgImage } from "./photo.js";
import { toSvg, PAL } from "./art/core.js";
import { FRAMES } from "./art/dev.js";
import { CAT, CAT_PAL } from "./art/cats.js";
import { EMOJI } from "./art/icons.js";
import { ACHV, got, listButtons } from "./achv.js";

const LOCK = ["..cccc..", ".c....c.", ".c....c.", "cccccccc", "ccc..ccc", "ccc..ccc", "cccccccc", "........"];
const toEl = (svg) => { const d = document.createElement("div"); d.innerHTML = svg; return d.firstChild; };
const art = (rows, w, h, pal) => svgImage(toEl(toSvg(rows, "", pal)), w, h);

export async function makeCard() {
  const W = 1200, H = 630, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  const dark = root.getAttribute("data-theme") !== "light";
  g.fillStyle = dark ? "#09090b" : "#fafafa";
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, H * 0.2, 20, W * 0.8, H * 0.2, 620);
  glow.addColorStop(0, dark ? "rgba(225,29,72,.28)" : "rgba(124,58,237,.18)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  try { await document.fonts.load("48px 'Pixelify Sans'"); } catch (e) { /* falls back to monospace */ }
  const ink = dark ? "#fafafa" : "#18181b", soft = dark ? "#a1a1aa" : "#52525b";
  g.fillStyle = ink; g.font = "500 92px 'Pixelify Sans', monospace";
  g.fillText(`${got.size}/${ACHV.length}`, 64, 150);
  g.font = "500 36px 'Pixelify Sans', monospace";
  g.fillText(t("share.title"), 64, 205);
  g.fillStyle = soft; g.font = "500 26px 'Pixelify Sans', monospace";
  g.fillText("streeg.github.io", 64, H - 50);
  // the trophies: gold for the ones found, a padlock for the rest
  const cols = 9, size = 48, gap = 14, x0 = 64, y0 = 260;
  const trophy = await art(EMOJI.trophy, size, size), lock = await art(LOCK, size, size);
  ACHV.forEach((k, i) => {
    const x = x0 + (i % cols) * (size + gap), y = y0 + Math.floor(i / cols) * (size + gap);
    g.globalAlpha = got.has(k) ? 1 : 0.35;
    g.drawImage(got.has(k) ? trophy : lock, x, y, size, size);
  });
  g.globalAlpha = 1;
  // the dev and both cats on the right
  const k = 7;
  const dev = await art(FRAMES.wave, 32 * k, 33 * k, PAL);
  const capitu = await art(CAT.sit, 22 * k * 0.8, 11 * k * 0.8, Object.assign({}, PAL, CAT_PAL.capitu));
  const sancho = await art(CAT.sit, 22 * k * 0.8, 11 * k * 0.8, Object.assign({}, PAL, CAT_PAL.sancho));
  const floor = H - 70;
  g.drawImage(dev, W - 32 * k - 120, floor - 33 * k);
  g.drawImage(capitu, W - 32 * k - 120 - 22 * k * 0.8 + 20, floor - 11 * k * 0.8);
  g.save(); g.translate(W - 70, floor - 11 * k * 0.8); g.scale(-1, 1); g.drawImage(sancho, 0, 0); g.restore();
  return new Promise((res) => cv.toBlob(res, "image/png"));
}

export async function shareCard() {
  const blob = await makeCard();
  if (!blob) return;
  const text = `${t("share.text").replace("{n}", got.size).replace("{t}", ACHV.length)} ${location.origin}/`;
  const file = new File([blob], "conquistas.png", { type: "image/png" });
  const phone = window.matchMedia("(pointer: coarse)").matches;
  if (phone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.download = "conquistas.png";
  a.href = URL.createObjectURL(blob);
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try { await navigator.clipboard.writeText(text); } catch (e) { /* no clipboard: the image is enough */ }
  S.toast(t("share.saved"));
}

listButtons.push(() => ({ text: t("share.button"), primary: true, run: (close) => { close(); shareCard(); } }));

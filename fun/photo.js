// Photo mode: a PNG of the floor scene (the friends, the props, the thread and the snow), downloaded.
import { S, t, SVGNS } from "./util.js";
import { W, emit, layer, showFriends } from "./world.js";
import { ropePoints } from "./toys.js";
import { sky } from "./seasons.js";
import { unlock } from "./achv.js";

export function svgImage(svgEl, w, h) {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", SVGNS);
  clone.setAttribute("width", String(w)); clone.setAttribute("height", String(h));
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(clone.outerHTML);
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url; });
}
export async function photo() {
  if (W.ko) return;
  showFriends();
  const H = Math.min(280, innerHeight), VW = innerWidth, top = innerHeight - H, k = 2;
  const cv = document.createElement("canvas");
  cv.width = VW * k; cv.height = H * k;
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.scale(k, k);
  g.fillStyle = getComputedStyle(document.body).backgroundColor || "#09090b";
  g.fillRect(0, 0, VW, H);
  g.drawImage(sky, 0, top, VW, H, 0, 0, VW, H);
  const rope = ropePoints(), yarn = W.yarn;
  if (rope.length > 1) {
    g.strokeStyle = "#fb7185"; g.lineWidth = 2; g.beginPath();
    rope.forEach((q, i) => (i ? g.lineTo(q.x, q.y - top) : g.moveTo(q.x, q.y - top)));
    g.lineTo(yarn.cx(), yarn.y + yarn.h / 2 - top); g.stroke();
  }
  const parts = [...layer.querySelectorAll(".px-prop svg, .px-actor .px-sprite svg, .px-hat svg, .px-bug .px-sprite svg")];
  for (const el of parts) {
    const r = el.getBoundingClientRect();
    if (r.bottom < top || r.width < 1) continue;
    const holder = el.closest(".px-sprite, .px-hat");
    const flip = holder && /scaleX\(-1\)/.test(holder.style.transform || "");
    try {
      const img = await svgImage(el, r.width, r.height);
      g.save();
      if (flip) { g.translate(r.left + r.width, r.top - top); g.scale(-1, 1); g.drawImage(img, 0, 0, r.width, r.height); }
      else g.drawImage(img, r.left, r.top - top, r.width, r.height);
      g.restore();
    } catch (e) { /* skip a sprite that fails to render */ }
  }
  g.fillStyle = "rgba(255,255,255,.75)";
  g.font = "500 12px 'Pixelify Sans', monospace";
  g.fillText("streeg.github.io", 10, 18);
  const a = document.createElement("a");
  a.download = "pixel-friends.png";
  a.href = cv.toDataURL("image/png");
  document.body.append(a); a.click(); a.remove();
  const fl = document.createElement("div");
  fl.className = "px-shutter";
  document.body.append(fl);
  setTimeout(() => fl.remove(), 400);
  emit("sfx", "shutter");
  unlock("photo");
  S.toast(t("photoSaved"));
}

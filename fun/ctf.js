// Capture the flag: the answer is only stored as a SHA-256 hash. Clues: robots.txt, then a comment in the page source.
import { S, t, bubble } from "./util.js";
import { cats, showFriends } from "./world.js";
import { me, setPower } from "./me.js";
import { burst } from "./ui.js";
import { unlock } from "./achv.js";

const FLAG_SHA256 = "b1cfa7e5013a58f3e7268ec0f035a62e838ab8fa41f10cd7d80f31a5e8d5fc4d";
export async function checkFlag(raw) {
  const v = String(raw || "").trim().toLowerCase();
  let hex = "";
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
    hex = [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch (e) { /* no WebCrypto (insecure context) */ }
  if (hex !== FLAG_SHA256) { S.toast(t("flag.wrong")); return; }
  showFriends();
  unlock("flag");
  S.toast(t("flag.ok"));
  burst(innerWidth / 2, innerHeight * 0.35, ["#e11d48", "#a78bfa", "#facc15", "#38bdf8", "#4ade80"], 70, 1.6);
  if (!me.locked) { me.emoteFor("held", 1800); me.say(bubble(t("flag.ok"), "trophy"), 3000); setPower(true, 6000); }
  cats().forEach((c) => c.pop("heart"));
}
try { console.log("%c🏳 " + t("flag.hint"), "color:#e11d48;font:600 13px ui-monospace,monospace"); } catch (e) { /* no console */ }

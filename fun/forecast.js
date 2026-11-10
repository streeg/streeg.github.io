// The real weather in Brasília (the city on the page), from Open-Meteo: free, no key, and nothing about the
// visitor is sent. Cached for 30 minutes; if it fails, the little world keeps the season's weather.
import { store } from "./util.js";

const URL = "https://api.open-meteo.com/v1/forecast?latitude=-15.78&longitude=-47.93&current=temperature_2m,weather_code&timezone=America%2FSao_Paulo";
const FRESH = 30 * 60000, STALE = 3 * 3600000;
let wx = null;   // { temp (°C), code (WMO weather code), at }
try {
  const c = JSON.parse(store.get("px-wx") || "null");
  if (c && typeof c.temp === "number" && Date.now() - c.at < STALE) wx = c;
} catch (e) { /* start over */ }

export const realWx = () => wx;
// rain, storm, hot, clear, cloudy or fog (null when we don't know)
export function realKind() {
  if (!wx) return null;
  const c = wx.code;
  if (c >= 95) return "storm";
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
  if (wx.temp >= 30) return "hot";
  if (c <= 1) return "clear";
  if (c === 45 || c === 48) return "fog";
  return "cloudy";
}

let fetching = false;
export async function refreshWx() {
  if (fetching || (wx && Date.now() - wx.at < FRESH)) return;
  fetching = true;
  try {
    const r = await fetch(URL);
    const cur = r.ok ? (await r.json()).current : null;
    if (cur && typeof cur.temperature_2m === "number" && typeof cur.weather_code === "number") {
      wx = { temp: cur.temperature_2m, code: cur.weather_code, at: Date.now() };
      store.set("px-wx", JSON.stringify(wx));
    }
  } catch (e) { /* offline or blocked: keep what we had */ }
  fetching = false;
}
// QA: pretend it is this weather (null: forget it)
export const setRealWx = (temp, code) => { wx = temp == null ? null : { temp, code, at: Date.now() }; };

refreshWx();
setInterval(() => { if (!document.hidden) refreshWx(); }, FRESH);

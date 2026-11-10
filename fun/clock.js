// The time of day in the little world (the visitor's own clock): the routine, the sky and the visits follow it.
import { hourNow } from "./util.js";

// dawn 5–7, morning 7–12, afternoon 12–17, dusk 17–19, evening 19–23, night 23–5
export function phase() {
  const h = hourNow();
  return h < 5 ? "night" : h < 7 ? "dawn" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 19 ? "dusk" : h < 23 ? "evening" : "night";
}
// how much daylight there is, 0 (night) to 1 (full day)
export function daylight() {
  const h = hourNow();
  if (h < 5 || h >= 20) return 0;
  if (h < 7) return (h - 5) / 2;
  if (h < 18) return 1;
  return (20 - h) / 2;
}
export const isWeekend = () => [0, 6].includes(new Date().getDay());
export const isDay = () => daylight() > 0.5;

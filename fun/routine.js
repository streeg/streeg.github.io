// A day in the dev's life, by the visitor's clock: coffee and a stretch in the morning, work and the daily in
// the afternoon (on weekdays), music, cooking and TV in the evening, a cat in his lap late at night.
// It only tilts the dice: any scene can still happen at any time.
import { setRoutine } from "./me.js";
import { phase, isWeekend } from "./clock.js";

const DAY = {
  dawn: { stretch: 6, coffee: 4, read: 2, lang: 2, water: 2 },
  morning: { stretch: 2, coffee: 3, code: 3, daily: 3, lang: 2, water: 3, read: 1.5 },
  afternoon: { code: 3, daily: 1, game: 1.5, read: 1, water: 1 },
  dusk: { guitar: 2.5, violao: 2.5, cook: 3, dance: 1.5, tv: 1.5 },
  evening: { tv: 3, violao: 2, lap: 3, eat: 2.5, cook: 1.5, game: 2, dance: 1.5 },
  night: { lap: 2, read: 2, tv: 1.5, code: 0.5 },
};
setRoutine((name) => {
  let k = (DAY[phase()] || {})[name] || 1;
  if (isWeekend()) { if (name === "daily") k = 0; if (name === "code") k *= 0.4; if (name === "game" || name === "tv") k *= 1.8; }
  return k;
});

// Optional 8-bit sounds, off by default (palette: "8-bit sound", or `sound` in the terminal).
// Everything is synthesised with the Web Audio API (square, triangle and noise channels, like an old console):
// no audio files. Features ask for a sound with emit("sfx", name); pops, unlocks and defeats are heard too.
import { S, t, store, rand, pick } from "./util.js";
import { W, on, addSystem } from "./world.js";
import { me } from "./me.js";

let enabled = store.get("px-sound") === "on";
let ctx = null, master = null, noiseBuf = null;
export const soundOn = () => enabled;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
// browsers only start audio after a gesture: the first click or key brings it up when sound was left on
["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, () => { if (enabled) audio(); }, { once: true, passive: true }));

// one note: a waveform gliding from f0 to f1, with a quick attack and a decay
function tone(type, f0, f1, dur, vol = 1, at = 0) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
// a burst of noise through a filter (hits, crashes, the shutter, footsteps on snow)
function noise(dur, vol = 1, freq = 2000, at = 0, sweep) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + at, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noiseBuf;
  f.type = "bandpass"; f.frequency.setValueAtTime(freq, t0); f.Q.value = 0.8;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.02);
}
const N = (semi) => 440 * Math.pow(2, (semi - 9) / 12);   // semitones from middle C
const arp = (notes, step, type = "square", vol = 0.6, len = 0.12) => notes.forEach((n, i) => tone(type, N(n), N(n), len, vol, i * step));
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19];

const SFX = {
  meow: () => { tone("triangle", 650, 1050, 0.11, 0.7); tone("triangle", 1050, 560, 0.2, 0.6, 0.1); },
  yowl: () => { tone("sawtooth", 500, 1300, 0.25, 0.35); tone("sawtooth", 1300, 420, 0.4, 0.3, 0.24); },
  purr: () => { for (let i = 0; i < 6; i++) noise(0.07, 0.25, 180, i * 0.09); },
  kick: () => { tone("square", 220, 520, 0.08, 0.45); },
  bounce: () => { tone("triangle", 260, 160, 0.07, 0.35); },
  jump: () => { tone("square", 300, 700, 0.12, 0.35); },
  thud: () => { noise(0.12, 0.6, 300); tone("triangle", 140, 60, 0.12, 0.5); },
  coin: () => { tone("square", N(19), N(19), 0.07, 0.4); tone("square", N(24), N(24), 0.22, 0.4, 0.07); },
  drop: () => { tone("triangle", 900, 300, 0.18, 0.4); },
  nom: () => { noise(0.05, 0.4, 900); noise(0.05, 0.4, 700, 0.09); },
  charge: () => { tone("sawtooth", 110, 880, 0.55, 0.35); noise(0.55, 0.15, 400, 0, 3000); },
  blast: () => { noise(0.45, 0.9, 1200, 0, 120); tone("square", 880, 55, 0.45, 0.4); },
  crash: () => { for (let i = 0; i < 5; i++) noise(0.3, 0.6 - i * 0.1, 900 - i * 150, i * 0.12, 80); },
  rebuild: () => arp([0, 4, 7, 12, 16, 19, 24], 0.06, "square", 0.45),
  villain: () => { tone("square", N(-5), N(-6), 0.18, 0.4); tone("square", N(-8), N(-9), 0.18, 0.4, 0.2); tone("square", N(-12), N(-13), 0.35, 0.4, 0.4); },
  boss: () => { for (let i = 0; i < 4; i++) tone("sawtooth", N(-12 - i), N(-13 - i), 0.3, 0.4, i * 0.28); noise(1.2, 0.3, 200, 0, 60); },
  hit: () => { noise(0.2, 0.8, 2500, 0, 300); tone("square", 600, 90, 0.2, 0.4); },
  win: () => arp([7, 12, 16, 19, 24], 0.08, "square", 0.45, 0.16),
  unlock: () => { arp([12, 16, 19], 0.07, "square", 0.4, 0.1); tone("square", N(24), N(24), 0.3, 0.4, 0.21); },
  collect: () => { tone("square", N(16), N(16), 0.06, 0.4); tone("square", N(23), N(23), 0.16, 0.4, 0.06); },
  firework: () => { noise(0.35, 0.35, 1400, 0, 200); },
  shutter: () => { noise(0.04, 0.7, 3000); noise(0.06, 0.5, 1800, 0.07); },
  beep: () => tone("square", 880, 880, 0.08, 0.3),
  wound: () => arp([0, 4, 7, 12], 0.05, "triangle", 0.6, 0.1),
  on: () => arp([0, 7, 12], 0.07, "square", 0.45),
};
export function sfx(name) { if (enabled && !document.hidden && SFX[name]) SFX[name](); }
on("sfx", sfx);

// what the friends do already makes sounds: notes, hearts, stars, unlocks, a defeated villain
on("pop", (a, icon) => {
  if (!enabled) return;
  if (icon === "note") {
    const n = N(pick(PENTA) + (me.base.startsWith("gtr") ? -12 : 0));
    if (me.base.startsWith("gtr")) { tone("sawtooth", n, n, 0.18, 0.3); tone("square", n * 1.5, n * 1.5, 0.18, 0.15); }
    else if (me.base.startsWith("vio")) tone("triangle", n, n, 0.35, 0.6);
  } else if (icon === "heart" && a.kind === "cat") sfx("purr");
  else if (icon === "star") tone("square", N(24 + pick([0, 4, 7])), null, 0.08, 0.25);
});
on("unlock", () => sfx("unlock"));
on("defeated", (kind) => sfx(kind === "legacy" ? "rebuild" : "win"));

// while he dances, a little chiptune loop plays (an original tune: bass on the beat, a lead on top)
const BASS = [0, 0, 7, 7, 5, 5, 7, 7], LEAD = [12, 16, 19, 16, 17, 21, 19, 14];
let beat = 0, nextBeat = 0;
addSystem(() => {
  if (!enabled || !ctx || W.ko || !me.base.startsWith("dance")) { beat = 0; return; }
  const now = ctx.currentTime;
  if (now < nextBeat) return;
  nextBeat = now + 0.28;
  const i = beat++ % 8;
  tone("triangle", N(BASS[i] - 12), null, 0.24, 0.7);
  if (i % 2 === 0 || rand(0, 1) < 0.5) tone("square", N(LEAD[i]), null, 0.12, 0.3);
}, 90);

export function toggleSound(force) {
  enabled = typeof force === "boolean" ? force : !enabled;
  store.set("px-sound", enabled ? "on" : "off");
  if (enabled) { audio(); sfx("on"); }
  S.toast(soundName());
  return enabled;
}
export const soundName = () => t("cmds.sound").split("{v}").join(t(enabled ? "sound.on" : "sound.off")).replace(/\s*\(.*\)\s*$/, "");

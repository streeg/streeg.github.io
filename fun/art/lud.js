// Lud (my girlfriend), who drops by now and then. Chibi style with a dark outline: a big head, big blue eyes
// with a sparkle, rosy cheeks, long wavy brown hair down past the waist, a lilac sweater, dark trousers and
// white sneakers. One pose has her hugging the cat (Sancho, or Capitu), both with happy closed eyes.
// Built from halves (mirrored, so the face is symmetric), then the details and the outline are added.

export const LUD_PAL = {
  x: "#1f1418",                                  // outline
  H: "#6b3d27", h: "#4f2b1a", j: "#8c5536",      // hair, strands, shine
  S: "#f6d3bf", s: "#e9b49b", n: "#f4a0a8",      // skin, shade, blush
  E: "#2f5fb3", e: "#2a1a14", w: "#ffffff", m: "#c2566b",   // eyes, lashes, sparkle, smile
  T: "#d9b8ee", t: "#bf96dc",                    // lilac sweater
  P: "#2c2a3a", p: "#1d1b27",                    // trousers
  K: "#fafafa", k: "#c9c9d1",                    // sneakers
  c: "#8a8f9c", C: "#4f5460", r: "#e11d48",      // Sancho (grey), his face, the collar
  g: "#2a2220", G: "#c9a27a",                    // Capitu (black), her face
  Y: "#facc15", O: "#3b82f6", L: "#a78bfa", D: "#71717a", A: "#a1a1aa", W: "#ffffff", N: "#16a34a", Z: "#c2410c", z: "#7c2d12",
};

const W = 32, H = 33, EMPTY = ".".repeat(W);
const mirror = (half) => half + [...half].reverse().join("");
// left halves (16 wide), mirrored into 32. Rows: 0 margin, 1-17 head, 18-24 body, 25-31 legs, 32 margin.
const HEAD = [
  "...........HHHHH", ".........HHHHHHH", "........HHHHHHHH", ".......HHHHHHHHH", "......HHHHHHHHHH",
  "......HHHHHHHSSS", ".....HHHHHHSSSSS", ".....HHHHHSSSSSS", ".....HHHHSShhSSS", ".....HHHHSeeeSSS",
  ".....HHHHSwEESSS", ".....HHHHSEEESSS", ".....HHHHnnSSSSS", ".....HHHHSSSSSmS", "....HHHHHHSSSSSm",
  "....HHHHHHHSSSSS", "....HHHHHHHHHHSS",
];
const BODY = [
  "...HHHHHHHHTTTTT", "...HHHHHHHTTTTTT", "...HHHHHHTTTTTTT", "..HHHHHHHTTtTTTT", "..HHHHHHHTTtTTTT",
  "..HHHHHHHTTTTTTT", "..HHHHHHHSSTTTTT",
];
const LEGS = ["...HHHHHH.PPPPPP", "...HHHHH...PPPPP", "....HHH....PPPP.", ".....H.....PPPP.", "...........PPPp.", "..........KKKKK.", "..........KKKKk."];

const set = (rows, y, x, s) => { if (rows[y] != null) rows[y] = rows[y].slice(0, x) + s + rows[y].slice(x + s.length); };
// paint a patch: "." in the patch keeps what is underneath
const paint = (rows, x, y, patch) => patch.forEach((p, i) => [...p].forEach((ch, j) => { if (ch !== ".") set(rows, y + i, x + j, ch); }));

function base(eyes = "open") {
  const r = [EMPTY].concat(HEAD.map(mirror), BODY.map(mirror), LEGS.map(mirror), [EMPTY]);
  // the right eye gets its sparkle on the same side as the left one
  set(r, 11, 19, "wEE"); set(r, 12, 19, "EEE");
  // the hair: a side part, shine on top, strands down the sides, wavy ends
  paint(r, 12, 6, ["HH"]);
  paint(r, 9, 2, ["jjj"]); paint(r, 8, 3, ["jj"]); paint(r, 7, 4, ["j"]); paint(r, 19, 2, ["jj"]); paint(r, 21, 3, ["j"]);
  for (let y = 14; y <= 25; y++) for (const x of [5, 26]) if (r[y][x] === "H") set(r, y, x, "h");
  paint(r, 2, 25, ["h"]); paint(r, 28, 25, ["h"]); paint(r, 3, 27, ["h"]); paint(r, 28, 27, ["H"]); paint(r, 29, 24, ["h"]);
  if (eyes === "closed") {   // happy closed eyes: little arcs
    for (const x of [10, 19]) { set(r, 10, x, "SSS"); set(r, 11, x, "SeS"); set(r, 12, x, "eSe"); }
  }
  return r;
}
// the arms (in front of the hair)
const noArms = (r) => { for (let y = 20; y <= 24; y++) { set(r, y, 9, "HH"); set(r, y, 21, "HH"); } return r; };
const armUp = (r, side) => {   // right (side 1) or left (side -1) arm raised
  if (side > 0) { for (let y = 20; y <= 24; y++) set(r, y, 21, "HH"); paint(r, 21, 14, ["...SS", "...SS", "..TT.", "..TT.", ".TT..", "TT...", "TT..."]); }
  else { for (let y = 20; y <= 24; y++) set(r, y, 9, "HH"); paint(r, 6, 14, ["SS...", "SS...", ".TT..", ".TT..", "..TT.", "...TT", "...TT"]); }
  return r;
};
const legs = (r, kind) => {   // one foot lifted (walking, dancing)
  const x = kind === "liftL" ? 10 : 17;
  set(r, 29, x, "KKKKK"); set(r, 30, x, "KKKKk"); set(r, 31, x, ".....");
  return r;
};
// sitting: everything down to the hands moves down, the knees come forward
function sit(r) {
  const out = Array(H).fill(EMPTY);
  r.slice(0, 25).forEach((row, i) => { if (i + 3 < H) out[i + 3] = row; });
  paint(out, 9, 28, ["PPPPPPPPPPPPPP", "PPPPPPPPPPPPPP", ".KKKKK..KKKKK.", ".KKKKk..KKKKk."]);
  paint(out, 3, 28, ["HHHHHH", ".HHHH."]); paint(out, 23, 28, ["HHHHHH", ".HHHH."]);
  return out;
}
// hugging the cat: its round head with pointy ears, happy closed eyes and a pink nose, her hands under it
function catHug(r, a, f) {
  noArms(r);
  const R = (s) => s.replace(/a/g, a).replace(/f/g, f);
  paint(r, 10, 18, [
    R(".a........a."),
    R(".aa......aa."),
    R("aaaaaaaaaaaa"),
    R("affaaaaaaffa"),
    R("aaaaannaaaaa"),
    "TSS" + R("aaaaaa") + "SST",
    "TTTT" + R("aaaa") + "TTTT",
    R("...aaaaa...."),
  ]);
  return r;
}
// hugging someone: both arms out to the side she is facing
const hug = (r) => { noArms(r); paint(r, 20, 20, ["TTTTTTSS", "TTTTTTSS"]); paint(r, 11, 22, ["TTTTTTTTTTTTTTSS"]); return r; };
const selfie = (r) => { armUp(r, 1); paint(r, 24, 11, ["xxx", "xLx", "xxx"]); return r; };
const popcorn = (r, up) => { paint(r, 12, up ? 25 : 26, ["YWYWYW", "WrWrWr", ".rWrW."]); return r; };

// a dark outline around the whole figure
function outline(rows) {
  const out = rows.map((r) => r.split(""));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (rows[y][x] !== ".") continue;
    if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dy, dx]) => rows[y + dy] && rows[y + dy][x + dx] && rows[y + dy][x + dx] !== ".")) out[y][x] = "x";
  }
  return out.map((r) => r.join(""));
}
const make = (fn) => outline(fn());
export const LUD = {
  idle: make(() => base()),
  blink: make(() => base("closed")),
  walk1: make(() => legs(base(), "liftL")),
  walk2: make(() => base()),
  walk3: make(() => legs(base(), "liftR")),
  walk4: make(() => base()),
  wave: make(() => armUp(base(), 1)),
  held: make(() => armUp(armUp(base(), 1), -1)),
  point: make(() => armUp(base(), 1)),
  hug: make(() => hug(base("closed"))),
  selfie: make(() => selfie(base())),
  dance1: make(() => legs(armUp(armUp(base(), 1), -1), "liftL")),
  dance2: make(() => legs(armUp(base(), 1), "liftR")),
  dance3: make(() => legs(armUp(armUp(base("closed"), 1), -1), "liftR")),
  dance4: make(() => legs(armUp(base(), -1), "liftL")),
  holdSancho: make(() => catHug(base("closed"), "c", "C")),
  holdCapitu: make(() => catHug(base("closed"), "g", "G")),
  watch1: make(() => popcorn(sit(base()), false)),
  watch2: make(() => popcorn(sit(base()), true)),
  lap1: make(() => sit(base())),
  lap2: make(() => sit(base("closed"))),
};

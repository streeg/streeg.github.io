// The home corner along the floor: a bookshelf, two cacti that grow (5 stages, the last one in bloom),
// the cats' bowl (full, half, empty), a floor lamp (off and on) and a little radio.
// Plus the critters (a bird, a butterfly, a moth), the neighbour's cat and the delivery person's colours.
import { PAL, framed, framedAll } from "./core.js";

const POT = ["ZZZZZZZZZZ", ".ZzZZZZzZ.", ".ZZZZZZZZ.", "..ZZZZZZ.."];
const tall = (body) => body.map((r) => r.padEnd(10, ".")).concat(POT);
// the column cactus (N green, W spines, n/Y the flower)
const COLUMN = [
  tall(["....NN....", "....NN...."]),
  tall(["....NN....", "...NNNN...", "...NWNN...", "...NNNN..."]),
  tall(["....NN....", "...NNNN...", "...NNWN...", ".N.NNNN...", ".NNNWNN...", "...NNNN...", "...NNNN..."]),
  tall(["....NN....", "...NNNN...", "...NWNN.N.", ".N.NNNN.N.", ".NNNNWNNN.", "...NNNN...", "...NWNN...", "...NNNN...", "...NNNN..."]),
  tall(["...nYn....", "....n.....", "...NNNN...", "...NWNN.N.", ".N.NNNN.N.", ".NNNNWNNN.", "...NNNN...", "...NWNN...", "...NNNN...", "...NNNN..."]),
];
// the round cactus
const BALL = [
  tall(["...NNN...."]),
  tall(["...NNNN...", "..NNWNNN..", "..NNNNNN.."]),
  tall(["...NNNN...", "..NWNNWN..", ".NNNNNNNN.", ".NNWNNNNN.", "..NNNNNN.."]),
  tall(["...NNNN...", "..NWNNWN..", ".NNNNNNNN.", "NNNWNNWNNN", "NNNNNNNNNN", ".NNNWNNNN.", "..NNNNNN.."]),
  tall(["..nY.Yn...", "...NNNN...", "..NWNNWN..", ".NNNNNNNN.", "NNNWNNWNNN", "NNNNNNNNNN", ".NNNWNNNN.", "..NNNNNN.."]),
];
const BOWL_BASE = ["rrrrrrrrrr", ".rrrrrrrr.", "..rrrrrr.."];
const LAMP = (shade) => [
  "..YYYYY..", ".YYYYYYY.", "YYYYYYYYY", "....c....", "....c....", "....c....", "....c....", "....c....", "....c....", "....c....",
  "....c....", "....c....", "....c....", "....c....", "....c....", "...ccc...", "..DDDDD..",
].map((r, i) => (i < 3 ? r.replace(/Y/g, shade) : r));
const RAW_HOME = {
  column: COLUMN,
  ball: BALL,
  bowlFull: [".zZzZzZz..", "zZzZzZzZz."].map((r) => r.padEnd(10, ".")).concat(BOWL_BASE),
  bowlHalf: ["..........", "..zZzZzZ.."].concat(BOWL_BASE),
  bowlEmpty: ["..........", ".........."].concat(BOWL_BASE),
  lampOff: LAMP("c"),
  lampOn: LAMP("Y"),
  radio1: ["....A.......", "...A........", "AAAAAAAAAAAA", "AxxxxAAccAcA", "AxOxxAAccAcA", "AxxxxAAAAAAA", "AAAAAAAAAAAA", ".D........D."],
  radio2: ["...A........", "...A........", "AAAAAAAAAAAA", "AxxxxAAccAcA", "AxxOxAAccAcA", "AxxxxAAAAAAA", "AAAAAAAAAAAA", ".D........D."],
  // the side table in the work corner (the radio and the phone stand on it)
  table: [
    "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ", "zzzzzzzzzzzzzzzzzzzzzzzzzzzz", ".zZ......................Zz.", ".zZ......................Zz.",
    ".zZ......................Zz.", ".zZ......................Zz.", ".zZ......................Zz.", ".zz......................zz.",
  ],
  shelf: [
    "zzzzzzzzzzzzzz", "zZZZZZZZZZZZZz", "zZrrOYNZvvKZZz", "zZrrOYNZvvKZZz", "zZrrOYNZvvKZZz", "zzzzzzzzzzzzzz",
    "zZZZZZZZZZZZZz", "zZNNZOOYrZZZZz", "zZNNZOOYrZcZZz", "zZNNZOOYrZcZZz", "zzzzzzzzzzzzzz", "zZZZZZZZZZZZZz",
    "zZvYYrrZZZZZZz", "zZvYYrrZZZcZZz", "zZvYYrrZZccZZz", "zzzzzzzzzzzzzz", "z............z",
  ],
};

// the gadgets on the walls and the floor: a clock, a calendar, a phone, a window, headphones, catnip, a stopwatch
const CLOCK_FACE = ["..ccccc..", ".cWWWWWc.", "cWWWrWWWc", "cWWWrWWWc", "cWWWxWWWc", "cWWWWWWWc", "cWWWWWWWc", ".cWWWWWc.", "..ccccc.."];
const HOUR_HAND = [[[4, 2], [4, 3]], [[5, 4], [6, 4]], [[4, 5], [4, 6]], [[2, 4], [3, 4]]];   // 12, 3, 6, 9 o'clock
const setPx = (rows, pts, ch) => rows.map((r, y) => [...r].map((c, x) => (pts.some(([px, py]) => px === x && py === y) ? ch : c)).join(""));
const CAL = (k) => setPx(["rrrrrrrrr", "rWrrrrrWr", "WWWWWWWWW", "WcWcWcWcW", "WWWWWWWWW", "WcWcWcWcW", "WWWWWWWWW", "WcWcWcWcW", "WWWWWWWWW"],
  [[[1, 3], [3, 3], [5, 3], [7, 3], [1, 5], [3, 5], [5, 5], [7, 5], [1, 7], [3, 7], [5, 7], [7, 7]][k % 12]], "r");
const PANE_DAY = ["QQQQQ", "QWWQQ", "QQQQQ", "QQQQO"], PANE_NIGHT = ["xxxxx", "xxYxx", "xxxxx", "xxxxY"];
const WINDOW = (pane, pane2) => ["ZZZZZZZZZZZZZ"].concat(pane.map((r, i) => "Z" + r + "Z" + pane2[i] + "Z"), ["ZZZZZZZZZZZZZ"],
  pane2.map((r, i) => "Z" + r + "Z" + pane[i] + "Z"), ["ZZZZZZZZZZZZZ", "zzzzzzzzzzzzz"]);
const RAW_GADGETS = {
  clock: HOUR_HAND.map((h) => setPx(CLOCK_FACE, h, "x")),
  calendar: Array.from({ length: 12 }, (_, k) => CAL(k)),
  phone: [".KKKKKKKK.", "KK......KK", "...KKKK...", "..KKKKKK..", ".KKxKKxKK.", ".KKKxxKKK.", ".KKKKKKKK."],
  windowDay: WINDOW(PANE_DAY, PANE_DAY.slice().reverse()),
  windowNight: WINDOW(PANE_NIGHT, PANE_NIGHT.slice().reverse()),
  headphones: ["..ccccc..", ".c.....c.", "c.......c", "KK.....KK", "KK.....KK"],
  catnip: [".N.N.N.", "NNNNNNN", ".NNNNN.", "..NNN..", "ZZZZZZZ", ".ZzZzZ.", ".ZZZZZ."],
  stopwatch: ["...DD...", "..cccc..", ".cWWWWc.", "cWWWrWWc", "cWWWrWWc", "cWWWxWWc", "cWWWWWWc", ".cWWWWc.", "..cccc.."],
  stopwatchOn: ["...DD...", "..cccc..", ".cWWWWc.", "cWWWWWWc", "cWWWWWWc", "cWWWxrrc", "cWWWWWWc", ".cWWWWc.", "..cccc.."],
  leaf: [".N", "NN", "N."],
};

// critters
const RAW_CRITTERS = {
  bird1: ["...OO...", "..OOOOY.", "OOOQQO..", ".OOOO...", "..x.x..."],
  bird2: ["...OO...", "..OOOOY.", ".OOQQO..", "OOOOO...", "..x.x..."],
  birdPeck: ["........", "...OO...", "..OOOO..", "OOOQQOY.", "..x.x..."],
  flyA: ["O.....O.", "OO.OO.O.", ".OOOOOY.", "..QQQ...", "........"],
  flyB: ["........", "...OO...", "OOOOOOY.", "O.QQQ.O.", "........"],
  butterfly1: ["nn.nn", "nYxYn", ".nxn.", "nn.nn"],
  butterfly2: [".n.n.", "nYxYn", ".nxn.", ".n.n."],
  moth: ["c.c", "WxW", "c.c"],
  pizza: ["oooooooooo", "oWWWWWWWWo", "oWrrrrrrWo", "oWWWWWWWWo", "oooooooooo"],
};
// Pingo, the neighbour's orange tabby
export const PINGO_PAL = { b: "#f59e0b", d: "#c2410c", l: "#fde68a", e: "#16a34a", n: "#e58a9a", k: "#92400e", x: "#3b1d0a" };
// the delivery person: red cap and shirt, no beard
export const DELIVERY_PAL = Object.assign({}, PAL, {
  H: "#dc2626", h: "#b91c1c", f: "#7f1d1d", S: "#c58c6b", s: "#a8714f", B: "#c58c6b", m: "#8a4b3b", R: "#c58c6b",
  T: "#dc2626", t: "#b91c1c", V: "#111827", P: "#1f2937", p: "#111827", K: "#111827", k: "#e5e7eb",
});

// with the dark outline
export const HOME = Object.fromEntries(Object.entries(RAW_HOME).map(([k, v]) => [k, Array.isArray(v[0]) ? v.map((g) => framed(g)) : framed(v)]));
export const CRITTERS = framedAll(RAW_CRITTERS);
export const GADGETS = Object.fromEntries(Object.entries(RAW_GADGETS).map(([k, v]) => [k, Array.isArray(v[0]) ? v.map((g) => framed(g)) : framed(v)]));

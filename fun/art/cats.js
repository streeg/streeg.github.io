// The cats, chibi style with a dark outline: a big round head (looking at you) on a side-view body facing right.
// b body, d stripes, l belly, e eyes, n nose, k closed eyes, x outline.
// Capitu (black, lightly striped) lives in the dark theme, Sancho (grey) in the light one.
import { outline } from "./core.js";

export const CAT_PAL = {
  capitu: { b: "#231b19", d: "#5a3d28", l: "#3a2c27", e: "#f5b324", n: "#e58a9a", k: "#8a6a55", x: "#0e0a09" },
  sancho: { b: "#808794", d: "#626875", l: "#b3b9c4", e: "#e9c531", n: "#e58a9a", k: "#3a3d44", x: "#2a2c33" },
};
const SIT_HEAD = [
  "..............b....b....",
  ".............bbb..bbb...",
  ".............bbbbbbbb...",
  ".............bebbbbeb...",
  ".............bebbbbeb...",
];
// 24×12: the figure stands on the bottom (10 rows of art), with a free pixel all round for the outline
const frame = (rows) => outline([""].concat(Array(Math.max(0, 10 - rows.length)).fill(""), rows, [""]).map((r) => r.padEnd(24, ".")));
export const CAT = {
  sit: frame(SIT_HEAD.concat([
    "..........bbbbbbnnbbb...",
    ".........bbdbbbbbbbb....",
    "........bbbbbbbllllbb...",
    "...dd..bbbbbbbbllllbb...",
    "....dbbbbbbbbbbbbbbbb...",
  ])),
  paw: frame(SIT_HEAD.concat([
    "..........bbbbbbnnbbbbb.",
    ".........bbdbbbbbbbbbb..",
    "........bbbbbbbllllbb...",
    "...dd..bbbbbbbbllllbb...",
    "....dbbbbbbbbbbbbbb.....",
  ])),
  walk1: frame([
    "..............b....b....",
    ".............bbb..bbb...",
    ".d...........bbbbbbbb...",
    ".b...........bebbbbeb...",
    "..b..........bebbbbeb...",
    "..bbbbbbbbbbbbbbnnbbb...",
    "...bbdbbdbbdbbbbbbbb....",
    "...bblllllllllbbbb......",
    "....bb.bb...bb.bb.......",
  ]),
  walk2: frame([
    "..............b....b....",
    ".............bbb..bbb...",
    "..d..........bbbbbbbb...",
    ".b...........bebbbbeb...",
    "..b..........bebbbbeb...",
    "..bbbbbbbbbbbbbbnnbbb...",
    "...bbdbbdbbdbbbbbbbb....",
    "...bblllllllllbbbb......",
    "...bb..bbb..bb..bb......",
  ]),
  sleep: frame([
    "",
    "",
    "",
    "",
    ".............b...b......",
    "........bbbbbbbbbbbb....",
    "......bbbbbbbbbbkbbkb...",
    ".....bbdbbdbbbbbbbnbb...",
    "....dbbbbbbbbbbbbbbbb...",
  ]),
  jump: frame([
    "",
    "...............b....b...",
    "..............bbb..bbb..",
    ".dd...........bbbbbbbb..",
    "...dbbbbbbbbbbbebbbbeb..",
    "....bbdbbdbbdbbebbbbeb..",
    "...bbllllllllllbbnnbbb..",
    ".bb...............bbb...",
    "b..................bb...",
  ]),
};

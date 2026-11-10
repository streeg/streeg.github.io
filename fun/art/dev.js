// The dev (a small version of me): head, body parts and every pose, 32×33 pixels.
import { paint, stamp, dot, box, EMPTY } from "./core.js";

const pad = (row) => "........" + row + "........";
const HEAD = [
  "......H.HHHH.H..",
  "....HHHHHHHHHHH.",
  "..HHHhhHHHhhHHHH",
  ".fHhhHHHhhHHHhH.",
  ".ffHHHhHHHHHHff.",
  ".fffHHHHHHHHfff.",
  ".SSSSSSSSSSSSSS.",
  ".SHHHSSSSSSHHHS.",
  "SSSwESSSSSSwESSS",
  "RSSSSSSsSSSSSSSS",
  ".SSSSSSssSSSSSS.",
  ".SSSSBBBBBBSSSS.",
  ".sSSSSSmmSSSSSs.",
  "..sSSSSBBSSSSs..",
  "...sSSBBBBSSs...",
  ".....BBBBBB.....",
].map(pad);

const NECK = [
  "..............SSSS..............",
  "..........TTTTTSSTTTTT..........",
  ".........TTTTTTTTTTTTTT.........",
];
const LEGS_STAND = [
  "...........PPPPPPPPPP...........",
  "...........PPPP..PPPP...........",
  "...........PPPP..PPPP...........",
  "...........PPPp..PPPp...........",
  "...........PPPp..PPPp...........",
  "..........KKKKK..KKKKK..........",
  "..........kkkkk..kkkkk..........",
];
const LEGS_STANCE = [
  "..........PPPPPPPPPPPP..........",
  ".........PPPPP....PPPPP.........",
  "........PPPP........PPPP........",
  ".......PPPp..........PPPp.......",
  "......PPPp............PPPp......",
  ".....KKKKK............KKKKK.....",
  ".....kkkkk............kkkkk.....",
];

const LEGS_SIT = [
  "......PPPPPPPPPPPPPPPPPPPP......",
  ".....kKKPPPPPPPPPPPPPPPPKKk.....",
];
const TORSO = [
  "........TTTTTTTTTTTTTTTT........",
  "........TTtTTTTTTTTTTtTT........",
  "........TTtTTTTTTTTTTtTT........",
  "........SSTTTTTTTTTTTTSS........",
  "........SSTTTTTTTTTTTTSS........",
  "........SSTTTTTTTTTTTTSS........",
  "........SS.VVVVVVVVVV.SS........",
];
const HEAD_CLOSED = HEAD.slice();
HEAD_CLOSED[8] = pad("SSSssSSSSSSssSSS");
const idle = HEAD.concat(NECK, TORSO, LEGS_STAND);
const noRightArm = paint(idle, 22, 20, ["..", "..", "..", "..", "..", ".."]);
const wave = paint(noRightArm, 22, 11, ["    SS", "    SS", "   SS ", "   SS ", "  SS  ", " TT   ", "TTT   "]);
const held = paint(paint(wave, 8, 20, ["..", "..", "..", "..", "..", ".."]), 4, 11, ["SS    ", "SS    ", " SS   ", " SS   ", "  SS  ", "   TT ", "   TTT"]);
const sitBase = (head) => [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY].concat(head, NECK, TORSO, LEGS_SIT);
const mug = (rows) => stamp(rows, 27, 28, [".c.c.", "c.c..", "vvvv.", "vdvvv", "vvvv."]);
const laptop = (rows) => paint(paint(rows, 10, 24, ["AAAAAAAAAAAA", "AAAAAAAAAAAA", "AAAAALLAAAAA", "AAAAALLAAAAA", "AAAAAAAAAAAA", "AAAAAAAAAAAA"]), 9, 30, ["DDDDDDDDDDDDDD"]);

// Walking: the feet take turns lifting (no scissor legs) and the opposite arm swings across the body.
const LIFT_L = [
  "...........PPPPPPPPPP...........",
  "...........PPPP..PPPP...........",
  "...........PPPp..PPPP...........",
  "..........KKKKK..PPPp...........",
  "..........kkkkk..PPPp...........",
  ".................KKKKK..........",
  ".................kkkkk..........",
];
const LIFT_R = [
  "...........PPPPPPPPPP...........",
  "...........PPPP..PPPP...........",
  "...........PPPP..PPPp...........",
  "...........PPPp..KKKKK..........",
  "...........PPPp..kkkkk..........",
  "..........KKKKK.................",
  "..........kkkkk.................",
];
const TORSO_RF = paint(TORSO, 20, 4, ["TSS.", "SS..", "  .."]);   // right hand swings in front of the body
const TORSO_LF = paint(TORSO, 8, 4, [".SST", "..SS", ".. "]);     // left hand swings in front of the body
const withLegs = (frame, legs) => frame.slice(0, 26).concat(legs);
const point = paint(noRightArm, 22, 10, ["        S", "      SSS", "      SS ", "     SS  ", "    SS   ", "   SS    ", "  TT     ", " TTT     ", "TT       "]);
// Sitting with both hands in the lap, holding something.
const handsIn = (rows) => paint(paint(rows, 8, 28, ["..", "..", ".."]), 22, 28, ["..", "..", ".."]);
const sitHold = (patchX, patchY, patch, head) => stamp(handsIn(sitBase(head || HEAD)), patchX, patchY, patch);
const controller = (btn) => ["SSDDDDDDDDDDSS", ".SDLDDDDDD" + btn + "DS.", "..DDDD..DDDD.."];
const BOOK1 = ["SVkkkkkkkkkkVS", "SVkccckkccckVS", ".VkkkkkkkkkkV.", ".VkcckkkcckkV.", ".VVVVVVVVVVVV."];
const BOOK2 = ["SVkkkkkkWkkkVS", "SVkcckkkWcckVS", ".VkkkkkkWkkkV.", ".VkccckkkcckV.", ".VVVVVVVVVVVV."];   // turning a page
const BOWL = ["..YYcYYYcYY..", "SWWWWWWWWWWWS", "..WWWWWWWWW..", "...WWWWWWW..."];
// Headset for the daily: grey band over the hair, red ear cups, a little mic.
const headset = (head) => {
  let h = dot(head, [[8, 6], [8, 5], [9, 4], [9, 3], [10, 2], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1], [20, 1], [21, 2], [22, 3], [22, 4], [23, 5], [23, 6]], "A");
  h = box(h, 7, 7, 8, 10, "K");
  h = box(h, 23, 7, 24, 10, "K");
  return dot(dot(h, [[9, 11], [10, 12], [11, 12], [12, 12]], "A"), [[13, 12]], "D");
};
const HEAD_SET = headset(HEAD);
const HEAD_TALK = dot(HEAD_SET, [[15, 12], [16, 12]], "E");
// Red electric guitar, standing: double-cutaway body, white pickguard, two pickups, bridge, fretted neck, headstock.
const electric = (handY) => {
  let f = idle;
  // neck: two pixels thick, running from the headstock (top left) down to the body
  const neck = [];
  for (let x = 3; x <= 14; x++) { const y = 16 + Math.round((x - 3) * 0.55); neck.push([x, y], [x, y + 1]); }
  f = dot(f, neck, "z");
  f = dot(f, [[5, 17], [8, 19], [11, 20]], "W");                       // fret dots
  f = dot(f, [[0, 14], [1, 14], [1, 15], [2, 15], [2, 16], [0, 15]], "x");  // headstock
  f = dot(f, [[0, 13], [2, 14], [1, 16]], "A");                        // tuners
  // body
  f = box(f, 14, 21, 15, 21, "K"); f = box(f, 20, 21, 21, 21, "K");      // the two horns
  f = box(f, 13, 22, 16, 22, "K"); f = box(f, 19, 22, 22, 22, "K");
  f = box(f, 13, 23, 22, 23, "K");
  f = box(f, 12, 24, 23, 26, "K");
  f = box(f, 13, 27, 22, 27, "K");
  f = box(f, 14, 28, 21, 28, "K");
  f = box(f, 16, 29, 19, 29, "K");
  f = dot(f, [[20, 22], [21, 23], [22, 24]], "g");                      // shine
  f = box(f, 13, 25, 16, 26, "W"); f = box(f, 14, 24, 16, 24, "W"); f = box(f, 14, 27, 17, 27, "W");   // pickguard
  f = dot(f, [[17, 24], [18, 24], [18, 26], [19, 26]], "x");            // pickups
  f = dot(f, [[20, 25], [21, 25]], "A");                                // bridge
  f = dot(f, [[20, 27], [22, 26]], "A");                                // knobs
  f = dot(f, [[8, 20], [9, 20], [8, 21]], "S");                         // fretting hand
  return dot(f, [[18, handY], [19, handY], [18, handY + 1]], "S");     // strumming hand
};
// Acoustic guitar across the lap, sitting.
const acoustic = (handY) => {
  let f = handsIn(sitBase(HEAD));
  f = box(f, 16, 26, 20, 26, "Z"); f = box(f, 15, 27, 22, 27, "Z"); f = box(f, 14, 28, 23, 29, "Z"); f = box(f, 15, 30, 22, 30, "Z"); f = box(f, 16, 31, 20, 31, "z");
  f = dot(f, [[18, 28], [19, 28], [18, 29], [19, 29]], "x");
  f = box(f, 5, 28, 13, 28, "z");
  f = dot(f, [[3, 27], [4, 27], [4, 28]], "D");
  f = dot(f, [[7, 27], [8, 27]], "S");
  return dot(f, [[20, handY], [21, handY]], "S");
};
// Cooking: right arm out, holding the pan handle; the second frame lifts it (flipping).
const cookArm = (y) => stamp(noRightArm, 22, y, ["TT......", "TSSSSSSS", ".SSSSSSS"]);
// Cleaning the litter box: crouched, a little scoop in the right hand.
const scoop = (y) => stamp(handsIn(sitBase(HEAD)), 21, y, ["SS.....", "SSAAAA.", "....AAA", ".....A."]);
// Popcorn bucket for watching TV.
const POPCORN = ["YWYWY.", "WrWrWr", "WrWrWr", ".rWrW."];


export const FRAMES = {
  idle,
  walk1: HEAD.concat(NECK, TORSO_RF, LIFT_L),
  walk2: idle,
  walk3: HEAD.concat(NECK, TORSO_LF, LIFT_R),
  walk4: idle,
  wave,
  held,
  point,
  dance1: withLegs(held, LEGS_STAND),
  dance2: withLegs(point, LIFT_L),
  dance3: withLegs(held, LIFT_R),
  dance4: HEAD.concat(NECK, TORSO_LF, LIFT_L),
  game1: sitHold(9, 28, controller("K")),
  game2: sitHold(9, 28, controller("g")),
  eat1: stamp(sitHold(9, 27, BOWL), 12, 25, ["c...c", ".c...c"]),
  eat2: sitHold(9, 19, BOWL),
  read1: sitHold(9, 27, BOOK1),
  sip: stamp(wave, 23, 9, [".c.c.", "c.c..", "vvvv.", "vdvvv", "vvvv."]),
  meet1: mug(laptop(sitBase(HEAD_SET))),
  meet2: mug(laptop(sitBase(HEAD_TALK))),
  cook1: cookArm(20),
  cook2: cookArm(18),
  scoop1: scoop(27),
  scoop2: scoop(25),
  gtr1: electric(24),
  gtr2: electric(27),
  vio1: acoustic(26),
  vio2: acoustic(30),
  watch1: sitHold(12, 27, POPCORN),
  watch2: dot(sitHold(12, 27, POPCORN), [[17, 23], [18, 23], [17, 24], [18, 24]], "S"),
  read2: sitHold(9, 27, BOOK2),
  code: mug(laptop(sitBase(HEAD))),
  code2: mug(stamp(laptop(sitBase(HEAD)), 8, 26, ["SS", "SS", "..", ".."])),
  doze: mug(laptop(sitBase(HEAD_CLOSED))),
  // coding after the cat knocked the mug over
  codeN: laptop(sitBase(HEAD)),
  code2N: stamp(laptop(sitBase(HEAD)), 8, 26, ["SS", "SS", "..", ".."]),
  // sitting with a cat in his lap: eyes open, then closed (content)
  lap1: handsIn(sitBase(HEAD)),
  lap2: handsIn(sitBase(HEAD_CLOSED)),
  lie: stamp(stamp(stamp(Array(33).fill(EMPTY), 13, 23, [
    "....VVVVVVVVVVVVV..",
    "..VVVVVVVVVVVVVVVV.",
    ".VVVVVVVVVVVVVVVVVV",
    "VVVVVVVVVVVVVVVVVVV",
    "VVLVLVLVLVLVLVLVLVV",
    "VVVVVVVVVVVVVVVVVVV",
    "VVVVVVVVVVVVVVVVVVV",
    "VVVVVVVVVVVVVVVVVVV",
    ".VVVVVVVVVVVVVVVVV.",
    "..VVVVVVVVVVVVVVV..",
  ]), 0, 26, [".kkkkkkkkkkkkkk.", "kkkkkkkkkkkkkkkk", "kkkkkkkkkkkkkkkk", "kkkkkkkkkkkkkkkk", "kkkkkkkkkkkkkkkk", "kkkkkkkkkkkkkkkk", ".kkkkkkkkkkkkkk."]), 0, 17, HEAD_CLOSED.map((r) => r.slice(8, 24))),
  charge: HEAD.concat(NECK, [
    "........TTTTTTTTTTTTTTTT........",
    ".......TTTTTTTTTTTTTTTTT........",
    "......TTTTtTTTTTTTTTTTTT........",
    ".....SSSSTTTTTTTTTTTTTT.........",
    "...gGSSSSSSSSTTTTTTTTTT.........",
    "..gyGSSS...TTTTTTTTTT...........",
    "...gGg.....VVVVVVVVVV...........",
  ], LEGS_STANCE),
  release: HEAD.concat(NECK, [
    "........TTTTTTTTTTTTTTTTTSSSSS..",
    "........TTTTTTTTTTTTTTTTTSSSSSS.",
    "........TTTTTTTTTTTTTTTTTssssss.",
    "........TTTTTTTTTTTTTTTTTSSSSS..",
    ".........TTTTTTTTTTTTTT.........",
    "..........TTTTTTTTTTTT..........",
    "...........VVVVVVVVVV...........",
  ], LEGS_STANCE),
};

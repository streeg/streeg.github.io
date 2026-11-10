// Art for the life outside and around: the umbrella (rain), the fan (heat), the pond and its fish (aquarium mode),
// and the little red dot a cat dreams about. Everything framed with the dark outline, like the other props.
import { framed } from "./core.js";

// held in his raised hand (the "wave" pose): the handle leans a little so the canopy sits over his head
const UMBRELLA_RAW = [
  "........rrrrr........",
  ".....rrrrrlrrrrr.....",
  "...rrrlrrrrrrrlrrr...",
  "..rrlrrrrrrrrrrrlrr..",
  ".rrlrrrrrrrrrrrrrlrr.",
  "rrrrrrrrrrrrrrrrrrrrr",
  "rr.rrr.rrr.rrr.rrr.rr",
  "..........c..........",
  "..........c..........",
  "..........c..........",
  "..........c..........",
  "...........c.........",
  "...........c.........",
  "...........c.........",
  "...........c.........",
  "............c........",
  "............c........",
  "............c........",
  "............c........",
  ".............c.......",
  ".............c.......",
  ".............c.......",
];
export const UMBRELLA = framed(UMBRELLA_RAW);
// where the hand holds it (in the framed grid): the bottom of the handle
export const UMBRELLA_GRIP = { x: 14, y: 22 };

const FAN_HEAD = (a, b) => [
  "...cccccc...",
  "..cAAAAAAc..",
  ".cA" + a + "AAc.",
  ".cA" + b + "AAc.",
  ".cAAADDAAAc.",
  ".cA" + [...b].reverse().join("") + "AAc.",
  ".cA" + [...a].reverse().join("") + "AAc.",
  "..cAAAAAAc..",
  "...cccccc...",
];
const FAN_FOOT = [".....DD.....", ".....DD.....", ".....DD.....", "...DDDDDD...", "..DDDDDDDD.."];
export const FAN = [
  framed(FAN_HEAD("AvAAv", "vvAAv").concat(FAN_FOOT)),
  framed(FAN_HEAD("vAAvA", "vAAvv").concat(FAN_FOOT)),
];

// the pond: stones around the water, a lily pad
export const POND = framed([
  "....DDDDDDDDDDDDDDDDDDDD....",
  "..DDOOOOOOOOOOOOOOOOOOOODD..",
  ".DOOOQQOOOOOOOOONNOOOOOOOOD.",
  "DOOOOOOOOOOQQOOONNOOOOOQQOOD",
  ".DOOOOOOOOOOOOOOOOOOOOOOOOD.",
  "..DDOOOOOOOOOOOOOOOOOOOODD..",
  "....DDDDDDDDDDDDDDDDDDDD....",
]);

// the fish: b body, l belly, f fins and tail, x eye
const FISH_SHAPE = ["...bbbb...", ".bbbbbbbff", "bxbbllbbf.", ".bbllllbff", "...bbbb..."];
const fish = (b, l, f) => framed(FISH_SHAPE.map((r) => r.replace(/b/g, b).replace(/l/g, l).replace(/f/g, f)));
export const FISH = {
  lambari: fish("c", "W", "c"),
  tilapia: fish("D", "A", "D"),
  tucunare: fish("Y", "N", "N"),
  golden: fish("Y", "o", "o"),
};

// what a cat dreams of, besides fish and yarn: the laser dot
export const DOT = framed([".rr.", "rWrr", "rrrr", ".rr."]);

// achievement badges (8×8)
export const LIFE_BADGES = {
  rod: [".......c", "......c.", ".....c.W", "....c..W", "...c...W", "..c...oo", ".Z...ooo", "Z.....o."],
  goldfish: ["........", "..YYY...", ".YYYYYoo", "YxYooYo.", ".YYYYYoo", "..YYY...", "........", "........"],
  book: ["........", "WWWvvWWW", "WccvvccW", "WWWvvWWW", "WccvvccW", "WWWvvWWW", "vvvvvvvv", "........"],
};

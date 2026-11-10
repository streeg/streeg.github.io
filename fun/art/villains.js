// "The Bug" and the red energy blast that defeats it.
const bugBody = [
  "...x........x...",
  "....x......x....",
  ".....xxxxxx.....",
  "....xvVVVVvx....",
  "...xVryVVryVx...",
  "...xVrrVVrrVx...",
  "LEGS_A",
  ".xxVVVVxxVVVVxx.",
  "..xVvVVxxVVvVx..",
  ".xxVVVVxxVVVVxx.",
  "LEGS_B",
  "....xVVxxVVx....",
  ".....xxxxxx.....",
];
const bugFrame = (a, b) => bugBody.map((r) => (r === "LEGS_A" ? a : r === "LEGS_B" ? b : r));
export const BUG = {
  bug1: bugFrame("x..xVVVxxVVVx..x", "x..xVVVxxVVVx..x"),
  bug2: bugFrame(".x.xVVVxxVVVx.x.", ".x.xVVVxxVVVx.x."),
};

// The red energy blast, travelling right.
export const BLAST = [
  "........rrrrr...",
  "....rr.rrllllrr.",
  ".rr..rrrlyyyylrr",
  "...rrrrlyWWWyylr",
  "rr..rrrlyWWWWylr",
  "...rrrrlyWWWyylr",
  ".rr..rrrlyyyylrr",
  "....rr.rrllllrr.",
  "........rrrrr...",
];

// The secret boss: Legacy Code, a dusty old beige computer that has been running since forever.
// Two frames (its cable legs shuffle, the code on its screen scrolls); angry frames have red eyes.
const crt = (eye, code, legs) => [
  "c..JJJJJJJJJJJJJJJJJJ.....",
  ".cJJJJJJJJJJJJJJJJJJJJ....",
  "..JDxxxxxxxxxxxxxxxxDJ....",
  "..JDx" + code + "xDJ....",
  "..JDxxxxxxxxxxxxxxxxDJ....",
  "..JDxx" + eye + eye + "xxxxxxxx" + eye + eye + "xxDJ....",
  "..JDxx" + eye + "xxxxxxxxxx" + eye + "xxDJ....",
  "..JDxxxxxxxxxxxxxxxxDJ....",
  "..JDxxxxNNNNNNNNxxxxDJ....",
  "..JDxxxxNxNxNxNNxxxxDJ....",
  "..JDxxxxxxxxxxxxxxxxDJ....",
  "..JJJJJJJJJJJJJJJJJJJJ....",
  "..JJJJJJJJJJJJJJJJrJJJ....",
  "...JJJJJJJJJJJJJJJJJJ.....",
  ".......JJJJJJJJJJ.........",
  ".....DDDDDDDDDDDDDD.......",
  "....DcDcDcDcDcDcDcDcD.....",
].concat(legs);
const LEGS1 = ["....x..x........x..x......", "...x....x......x....x.....", "..x......x....x......x...."];
const LEGS2 = [".....x..x......x..x.......", ".....x...x....x...x.......", "....x.....x..x.....x......"];
export const BOSS = {
  legacy1: crt("Y", "NNxNxNNNxNxNNx", LEGS1),
  legacy2: crt("Y", "NxNNNxNxNNxNNN", LEGS2),
  angry1: crt("r", "NNxNxNNNxNxNNx", LEGS1),
  angry2: crt("r", "NxNNNxNxNNxNNN", LEGS2),
};

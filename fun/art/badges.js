// An 8×8 badge for each achievement (the list and the toast). Some reuse the bubble emoji or the props.
import { EMOJI } from "./icons.js";
import { PROPS } from "./props.js";

const NEW = {
  coin: ["..oooo..", ".oYYYYo.", "oYWYYYYo", "oYWYYYYo", "oYYYYYYo", "oYYYYYYo", ".oYYYYo.", "..oooo.."],
  target: ["..rrrr..", ".rWWWWr.", "rWrrrrWr", "rWrWWrWr", "rWrWWrWr", "rWrrrrWr", ".rWWWWr.", "..rrrr.."],
  dev: ["...HH...", "..HHHH..", "..SSSS..", "..SBBS..", ".TTTTTT.", "S.TTTT.S", "..P..P..", "..K..K.."],
  knot: ["r......r", ".r....r.", "..rllr..", "..lrrl..", "..lrrl..", "..rllr..", ".r....r.", "r......r"],
  laser: ["........", "...ll...", "..lrrl..", ".lrWrrl.", ".lrrrrl.", "..lrrl..", "...ll...", "........"],
  lap: ["........", "....c.c.", "...ccccc", "..cccxcx", ".ccccccc", "cccccccc", ".cccccc.", "........"],
  litter: ["......Y.", ".....YWY", "......Y.", "UUUUUUUU", "UJJJJJJU", "UJJJJJJU", "UUUUUUUU", "........"],
  sun: ["Y..Y..Y.", ".Y.Y.Y..", "..YYY...", "YYYWYYY.", "..YYY...", ".Y.Y.Y..", "Y..Y..Y.", "........"],
  camera: ["........", "..xx....", "xxxxxxxx", "xDDccDDx", "xDcWWcDx", "xDcWWcDx", "xDDccDDx", "xxxxxxxx"],
  choc: ["...zz...", "..zzzz..", ".zzZzzz.", ".rrYrrr.", "zzzzzzzz", "zzzzzzzz", ".zzzzzz.", "..zzzz.."],
  down: ["...vv...", "...vv...", "...vv...", "...vv...", "vvvvvvvv", ".vvvvvv.", "..vvvv..", "...vv..."],
  term: ["DDDDDDDD", "DxxxxxxD", "DxNxxxxD", "DxxNxxxD", "DxNxNNxD", "DxxxxxxD", "DDDDDDDD", "........"],
  lock: ["..cccc..", ".c....c.", ".c....c.", "YYYYYYYY", "YYYxxYYY", "YYYxxYYY", "YYYYYYYY", "........"],
  blast: ["........", "..rrrr..", ".rlyylr.", "rlyWWylr", "rlyWWylr", ".rlyylr.", "..rrrr..", "........"],
  wrench: ["......cc", ".....c.c", "....ccc.", "...cc...", "..cc....", ".zz.....", "zz......", "z......."],
  bug: ["x......x", ".x....x.", "..xxxx..", ".xVrrVx.", "xxVVVVxx", ".xVVVVx.", "xxVVVVxx", "..xxxx.."],
  merge: ["O......r", "O......r", ".O....r.", "..O..r..", "...vv...", "...vv...", "...vv...", "...vv..."],
  crt: ["JJJJJJJJ", "JxxxxxxJ", "JxNxxNxJ", "JxxxxxxJ", "JxNNNNxJ", "JJJJJJJJ", "..JJJJ..", ".DDDDDD."],
  flag: ["Dr......", "Drrrr...", "Drrrrrr.", "Drrrr...", "Dr......", "D.......", "D.......", "DD......"],
};
export const BADGES = Object.assign({}, EMOJI, NEW, { yarn: PROPS.yarn });

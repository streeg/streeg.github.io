// The 8×8 emoji used in the speech bubbles, the key glyphs of the move hint and the marker he points with.
export const EMOJI = {
  heart: ["........", ".rr..rr.", "rlrrrrrr", "rrrrrrrr", "rrrrrrrr", ".rrrrrr.", "..rrrr..", "...rr..."],
  fire: ["....o...", "...oo...", "..oYo.o.", ".oYYooo.", ".oYWYYo.", "oYWWWYo.", ".oYWYo..", "..ooo..."],
  coffee: [".c..c...", "..c..c..", "vvvvvv..", "vdvvvvvv", "vdvvvv.v", "vdvvvvvv", "vdvvvv..", ".vvvv..."],
  cat: ["c.....c.", "cc...cc.", "ccccccc.", "cxcccxc.", "ccccccc.", "cccnccc.", ".ccccc..", "........"],
  star: ["...Y....", "...Y....", "..YYY...", "YYYYYYY.", ".YYYYY..", "..YYY...", ".YY.YY..", ".Y...Y.."],
  skull: [".xxxxxx.", "xWWWWWWx", "xxxWWxxx", "xxxWWxxx", "xWWWxWWx", ".xWWWWx.", ".xWxWxx.", "..xxxx.."],   // outlined: it sits on white bubbles
  trophy: ["YYYYYYYY", "Y.YYYY.Y", "Y.YYYY.Y", ".YYYYYY.", "..YYYY..", "...YY...", "..DDDD..", ".DDDDDD."],
  blocks: ["...vv...", "...vv...", "........", "rr..OOOO", "rr..YYOO", "rrYYYYOO", "........", "........"],
  fish: ["........", "...OOO.O", ".OOOQOOO", "OxOQQOO.", ".OOOQOOO", "...OOO.O", "........", "........"],
  egg: ["..WWWW..", ".WWWWWW.", "WWWYYWWW", "WWYYYYWW", "WWYYYYWW", "WWWYYWWW", ".WWWWWW.", "..WWWW.."],
  jp: ["xxxxxxxx", "xWWWWWWx", "xWWrrWWx", "xWrrrrWx", "xWrrrrWx", "xWWrrWWx", "xWWWWWWx", "xxxxxxxx"],
  it: ["xxxxxxxx", "xNNWWrrx", "xNNWWrrx", "xNNWWrrx", "xNNWWrrx", "xNNWWrrx", "xNNWWrrx", "xxxxxxxx"],
  note: ["...vvvvv", "...vvvvv", "...v...v", "...v...v", ".vvv.vvv", "vvvvvvvv", ".vv..vv.", "........"],
};

export const KEYS = {
  down: ["..x..", "..x..", "x.x.x", ".xxx.", "..x.."],
  diag: ["xx...", ".xx..", "..x.x", "...xx", "..xxx"],
  right: ["..x..", "...x.", "xxxxx", "...x.", "..x.."],
  p: ["xxxx.", "x...x", "xxxx.", "x....", "x...."],
};
export const MARKER = ["..rrr..", "..rrr..", "..rrr..", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."];

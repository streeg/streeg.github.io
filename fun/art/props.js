import { framed, framedAll } from "./core.js";
// Props for the little scenes on the floor, and the seasonal headwear.
const tv = (screen) => [
  "...c......c.....",
  "....c....c......",
  ".....c..c.......",
  "AAAAAAAAAAAAAAAA",
  "AxxxxxxxxxxxxAAA",
].concat(screen.map((r, i) => "Ax" + r + "xx" + (i === 1 || i === 3 ? "AKA" : "AAA")), [
  "AxxxxxxxxxxxxAAA",
  "AAAAAAAAAAAAAAAA",
  ".DD..........DD.",
]);
const RAW = {
  tv1: tv(["xxLLLLxxx", "xLxxxxLxx", "xLxrxxLxx", "xLxxxxLxx", "xxLLLLxxx"]),
  tv2: tv(["xxxxxxxxx", "xxxLLxxxx", "xxLrxLxxx", "xxxLLxxxx", "xxxxxxxxx"]),
  tvb1: tv(["xxxYYxxxx", "xxxYYxxxx", "xxxxxxxxx", "rrxxxOOxx", "rrrxOOOOx"]),
  tvb2: tv(["xxxxxxxxx", "xxxYYxxxx", "xxxYYxxxx", "rrxxxOOxx", "rrrxOOOOx"]),
  tvr1: tv(["xxxxcxxxx", "xxxcxcxxx", "xxcxWxcxx", "xcxxxxxcx", "cxxxKxxxc"]),
  tvr2: tv(["xxxxcxxxx", "xxxcWcxxx", "xxcxxxcxx", "xcxxKxxcx", "cxxxxxxxc"]),
  tvs1: tv(["LLLLLLLLL", "LLLYYLLLL", "LLYWWYLLL", "NNNNNNNNN", "NNNNNNNNN"]),
  tvs2: tv(["LLLLLLLLL", "LLLLLYYLL", "LLLLYWWYL", "NNNNNNNNN", "NNNNNNNNN"]),
  coffee1: [".AAAAAAAA.", ".AxxxxxxA.", ".AxKxxxxA.", ".AAAAAAAA.", ".AA....AA.", ".AA.xx.AA.", ".AA....AA.", ".AAQQQQAA.", ".AAQQQQAA.", ".AAQBBQAA.", "AAAAAAAAAA"],
  coffee2: [".AAAAAAAA.", ".AxxxxxxA.", ".AxKxxxxA.", ".AAAAAAAA.", ".AA....AA.", ".AA..x.AA.", ".AA..x.AA.", ".AAQQQQAA.", ".AAQBBQAA.", ".AAQBBQAA.", "AAAAAAAAAA"],
  desk: [
    "..AAAAAAAAAAAA....",
    "..AxxxxxxxxxxA....",
    "..AxLLxxxOOxxA....",
    "..AxLLxxxOOxxA....",
    "..AxxxxxxxxxxA....",
    "..AxYYxxxggxxA....",
    "..AxYYxxxggxxA....",
    "..AxxxxxxxxxxA....",
    "..AAAAAAAAAAAA....",
    ".......AA.........",
    ".....AAAAAA.......",
    "DDDDDDDDDDDDDDDDDD",
    ".D..............D.",
    ".D..............D.",
    ".D..............D.",
    ".D..............D.",
  ],
  stove1: ["...xxxxxxxx...", "AAAxWWYYWWx...", "...xxxxxxxx...", ".....r..r.....", "....rorrorr...", "DDDDDDDDDDDDDD", "DAAAAAAAAAAAAD", "DAxxxxxxxxxxAD", "DAxxxxxxxxxxAD", "DAAAAAAAAAAAAD", "DDDDDDDDDDDDDD"],
  stove2: ["...xxxxxxxx...", "AAAxWWYYWWx...", "...xxxxxxxx...", "......r..r....", "....rrorrorr..", "DDDDDDDDDDDDDD", "DAAAAAAAAAAAAD", "DAxxxxxxxxxxAD", "DAxxxxxxxxxxAD", "DAAAAAAAAAAAAD", "DDDDDDDDDDDDDD"],
  litter: ["UUUUUUUUUUUUUU", "UJJJJJJJJJJJJU", "UJJJJJJJJJJJJU", "UUUUUUUUUUUUUU"],
  tree1: ["....Y.....", "...YYY....", "....N.....", "...NNN....", "..NNrNN...", "...NNN....", "..NNNNN...", ".NNONNYNN.", "..NNNNN...", ".NNNNNNN..", "NNrNNNONNN", "....zz....", "....zz....", "..KKKKKK.."],
  tree2: ["....Y.....", "...YYY....", "....N.....", "...NNN....", "..NNYNN...", "...NNN....", "..NNNNN...", ".NNrNNONN.", "..NNNNN...", ".NNNNNNN..", "NNONNNYNNN", "....zz....", "....zz....", "..KKKKKK.."],
  tiny: [".x.x.", "xVrVx", "xVVVx", ".x.x."],
  chair: ["..PPPPPP..", "..PPPPPP..", "..PPPPPP..", "..PPPPPP..", "...PPPP...", "PPPPPPPPPP", "PPPPPPPPPP", "....DD....", "....DD....", "....DD....", "..DDDDDD..", ".D..DD..D.", "D...DD...D", "D........D"],
  boombox: ["...cccccccc...", "...c......c...", "AAAAAAAAAAAAAA", "AxxxAAAAAAxxxA", "AxcxAKKKKAxcxA", "AxxxAAAAAAxxxA", "AAAAAAAAAAAAAA"],
  lamp: ["..YYY..", ".YYYYY.", "YYYYYYY", "YYYYYYY", "...c...", "...c...", "...c...", "...c...", "...c...", "...c...", "...c...", "...c...", "...c...", ".DDDDD.", "DDDDDDD"],
  fish: ["...OOO.O", ".OOOQOOO", "OxOQQOO.", ".OOOQOOO", "...OOO.O"],
  yarn: ["..rrrr..", ".rllrrr.", "rlrrlrrr", "rrlrrlrr", "rrrlrrlr", "rlrrlrrr", ".rrrlrr.", "..rrrr.."],
  twinkle: [".Y.", "YWY", ".Y."],
  // holidays
  pumpkin1: [".....NN.....", "....NN......", "..oooooooo..", ".oooooooooo.", "ooYYooooYYoo", "oooYooooYooo", "oooooooooooo", "ooYoYoYoYYoo", ".ooYYYYYYoo.", "..oooooooo.."],
  pumpkin2: [".....NN.....", "....NN......", "..oooooooo..", ".oooooooooo.", "ooWYooooWYoo", "oooYooooYooo", "oooooooooooo", "ooYoWoYoYYoo", ".ooYYWYYYoo.", "..oooooooo.."],
  fire1: [".....r......", "....rr..r...", "...roor.r...", "...roYor....", "..roYYYor...", "..rYYWYYr...", "..roYYYor...", "...rooor....", ".zZ.....Zz..", "..zZZ.ZZz...", "...zZZZz....", ".zZz...zZz.."],
  fire2: ["......r.....", "..r..rr.....", "..r.roor....", "....roYor...", "...roYYYor..", "...rYYWYYr..", "..roYYYor...", "...rooor....", ".zZ.....Zz..", "..zZZ.ZZz...", "...zZZZz....", ".zZz...zZz.."],
  egg: ["..z..", ".zzz.", "zzZzz", "rrYrr", "zzzzz", ".zzz."],
  mug: [".c.c.", "c.c..", "vvvv.", "vdvvv", "vvvv."],
  puddle: ["...zzzz....", ".zzZZzzzz..", "zzzzzzZzzzz", ".zzzzzzzz.."],
  // a stick with a string and a feather on the end (the cat toy); the dev holds the stick's lower end
  wand1: ["..........zz....", "........zz..c...", "......zz.....c..", "....zz........c.", "..zz..........c.", "zz............c.", "..............rl", ".............rlr", ".............rl.", "..............r."],
  wand2: ["..........zz....", "........zz.c....", "......zz...c....", "....zz.....c....", "..zz.......c....", "zz.........c....", "..........lr....", "..........rlr...", "...........lr...", "...........r...."],
};

// Seasonal headwear, 16 wide, placed over the head (dy = rows above the hair line).
const RAW_HATS = {
  santa: { dy: -3, rows: ["..........KKWW..", ".......KKKKK.WW.", ".....KKKKKKK....", "....KKKKKKKKK...", "...KKKKKKKKKKK..", "..MMMMMMMMMMMMM.", "..MMMMMMMMMMMMM."] },
  beanie: { dy: -2, rows: ["......OOOO......", "....OOOOOOOO....", "...OOOOOOOOOO...", "..OQOQOQOQOQOQ..", "..OOOOOOOOOOOO.."] },
  shades: { dy: 7, rows: [".xxxxxx..xxxxxx.", "..xxxx....xxxx.."] },
  flower: { dy: 0, rows: ["...........r.r..", "..........rYr...", "...........r...."] },
  party: { dy: -6, rows: ["........Y.......", ".......YrY......", ".......VKV......", "......VKKVV.....", "......KKVKK.....", ".....KVVKKVK....", "....KKKKVVKKK..."] },
  witch: { dy: -7, rows: ["..........xx....", ".........xxx....", "........xxxx....", ".......xxxxx....", "......xxxxxxx...", "......vvYvvvv...", "..xxxxxxxxxxxxx."] },
  straw: { dy: -3, rows: [".....YYYYYY.....", "....YoYoYoYY....", "....rrrrrrrr....", ".YYYYYYYYYYYYYY.", "YoYoYoYoYoYoYoYo"] },
  bunny: { dy: -7, rows: ["....WW....WW....", "...WlW...WlW....", "...WlW...WlW....", "...WlW...WlW....", "...WlW...WlW....", "....WW...WW.....", "...cccccccccc..."] },
  mask: { dy: 5, rows: ["............rY..", "...........rY...", "..vvvYvv.vvYvvvr", ".vvxxvvvvvxxvvv.", "..vvvv....vvvv.."] },
  catears: { dy: -2, rows: ["...x........x...", "..xlx......xlx..", ".xxxxxxxxxxxxxx."] },
};

// The cats' headwear, 7 wide, sitting on the ears.
const RAW_CAT_HATS = {
  santa: ["....KW.", "..KKK..", ".KKKKK.", "MMMMMMM"],
  witch: ["...xx..", "..xxx..", "..vvv..", "xxxxxxx"],
  party: ["...Y...", "..KVK..", "..VKV..", ".KKVKK."],
  crown: ["Y.Y.Y.Y", "YYrYYYY", "YYYYYYY"],
  straw: ["..YYY..", ".YoYoY.", "YYYYYYY"],
};

// everything with the dark outline (one pixel bigger on each side)
export const PROPS = framedAll(RAW);
export const HATS = Object.fromEntries(Object.entries(RAW_HATS).map(([k, h]) => [k, { dy: h.dy - 1, rows: framed(h.rows) }]));
export const CAT_HATS = framedAll(RAW_CAT_HATS);

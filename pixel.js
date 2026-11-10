// Pixel art: a small version of me (his poses) and the 8×8 emoji used in his speech bubble.
// Each frame is a grid of characters; "." is transparent and every other character is a colour from PAL.
(function (root) {
  "use strict";
  const PAL = {
    H: "#2b2321", h: "#3a2c28", f: "#4a3a35",              // hair, curl highlight, shaved sides
    S: "#eab894", s: "#d39a76", w: "#ffffff", E: "#2a1b14", // skin, shadow, eye white, eye
    B: "#3d2c26", m: "#b0634f", R: "#d4d4d8",              // beard, lip, earring
    T: "#1c1c20", t: "#3a3a42", V: "#7c3aed",              // black tee, fold, belt
    P: "#52525b", p: "#3f3f46", K: "#e11d48", k: "#f4f4f5", // trousers, sneakers
    G: "#e11d48", g: "#fb7185", y: "#fff1f2",              // energy in the hands
    A: "#a1a1aa", L: "#a78bfa", D: "#71717a",              // laptop lid, logo, base
    O: "#60a5fa", Q: "#bfdbfe",                            // the fish treat
    Z: "#c2410c", z: "#7c2d12", N: "#16a34a",              // acoustic guitar wood, Italian green
    J: "#e5d3a8", U: "#2dd4bf", M: "#f8fafc",              // litter sand, litter box, snow white
    // emoji
    r: "#e11d48", l: "#fda4af", o: "#f97316", Y: "#facc15", W: "#ffffff", v: "#a78bfa", c: "#a1a1aa", n: "#fb7185", x: "#18181b", d: "#c4b5fd",
  };

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
  // Paint a patch over a frame; spaces in the patch keep what is underneath.
  const paint = (rows, x, y, patch) => {
    const out = rows.slice();
    patch.forEach((p, i) => {
      const r = out[y + i].split("");
      [...p].forEach((ch, j) => { if (ch !== " ") r[x + j] = ch; });
      out[y + i] = r.join("");
    });
    return out;
  };
  const EMPTY = "................................";
  // Like paint, but "." is transparent too.
  const stamp = (rows, x, y, patch) => paint(rows, x, y, patch.map((r) => r.replace(/\./g, " ")));
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
  const bowl = [".YYcYYYcYY.", "WWWWWWWWWWW", ".WWWWWWWWW.", "..WWWWWWW.."];
  const BOOK1 = ["SVkkkkkkkkkkVS", "SVkccckkccckVS", ".VkkkkkkkkkkV.", ".VkcckkkcckkV.", ".VVVVVVVVVVVV."];
  const BOOK2 = ["SVkkkkkkWkkkVS", "SVkcckkkWcckVS", ".VkkkkkkWkkkV.", ".VkccckkkcckV.", ".VVVVVVVVVVVV."];   // turning a page
  const BOWL = ["..YYcYYYcYY..", "SWWWWWWWWWWWS", "..WWWWWWWWW..", "...WWWWWWW..."];
  // Pixel helpers for the scene frames: put single pixels, fill boxes.
  const dot = (rows, pts, ch) => {
    const out = rows.slice();
    pts.forEach(([x, y]) => { const r = out[y].split(""); r[x] = ch; out[y] = r.join(""); });
    return out;
  };
  const box = (rows, x0, y0, x1, y1, ch) => {
    const pts = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pts.push([x, y]);
    return dot(rows, pts, ch);
  };
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


  const FRAMES = {
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

  const EMOJI = {
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

  // Tiny key glyphs for the move hint, and the marker he points with.
  const KEYS = {
    down: ["..x..", "..x..", "x.x.x", ".xxx.", "..x.."],
    diag: ["xx...", ".xx..", "..x.x", "...xx", "..xxx"],
    right: ["..x..", "...x.", "xxxxx", "...x.", "..x.."],
    p: ["xxxx.", "x...x", "xxxx.", "x....", "x...."],
  };
  const MARKER = ["..rrr..", "..rrr..", "..rrr..", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."];

  // Props for the little scenes on the floor.
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
  const PROPS = {
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
  };

  // "The Bug": the villain you summon by typing "bug". Two frames: its legs scuttle.
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
  const BUG = {
    bug1: bugFrame("x..xVVVxxVVVx..x", "x..xVVVxxVVVx..x"),
    bug2: bugFrame(".x.xVVVxxVVVx.x.", ".x.xVVVxxVVVx.x."),
  };
  // Flow state: white hair.
  const PAL_POWER = Object.assign({}, PAL, { H: "#f4f4f5", h: "#d4d4d8", f: "#a1a1aa" });

  // Seasonal headwear, 16 wide, placed over the head by fun.js (dy = rows above the hair line).
  const HATS = {
    santa: { dy: -3, rows: ["..........KKWW..", ".......KKKKK.WW.", ".....KKKKKKK....", "....KKKKKKKKK...", "...KKKKKKKKKKK..", "..MMMMMMMMMMMMM.", "..MMMMMMMMMMMMM."] },
    beanie: { dy: -2, rows: ["......OOOO......", "....OOOOOOOO....", "...OOOOOOOOOO...", "..OQOQOQOQOQOQ..", "..OOOOOOOOOOOO.."] },
    shades: { dy: 7, rows: [".xxxxxx..xxxxxx.", "..xxxx....xxxx.."] },
    flower: { dy: 0, rows: ["...........r.r..", "..........rYr...", "...........r...."] },
  };

  // The red energy blast, travelling right.
  const BLAST = [
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

  // The cats, side view facing right: b body, d stripes, l belly, e eyes, n nose, k closed eyes.
  // Capitu (black, lightly striped) lives in the dark theme, Sancho (grey) in the light one.
  const CAT_PAL = {
    capitu: { b: "#1c1615", d: "#5a3d28", l: "#2c221f", e: "#f5a524", n: "#4a3632", k: "#7a5c48" },
    sancho: { b: "#767c88", d: "#5c616c", l: "#a3a9b4", e: "#e6c22e", n: "#5f5458", k: "#3a3d44" },
  };
  const W22 = (rows) => rows.map((r) => r.padEnd(22, "."));
  const CAT_HEAD = [
    "..............b.....b",
    "..............bb...bb",
    ".d............bbbbbbb",
    ".b............bebbbeb",
    "..b...........bbbnbbb",
  ];
  const CAT = {
    walk1: W22(CAT_HEAD.concat([
      "..b.bbbbbbbbbbbbbbbb",
      "...bbdbbdbbdbbbbbbb",
      "....bbbbbbbbbbbbbbb",
      "....bblllllllllbbb",
      "....bb.bb...bb.bb",
      "...bb..bb....bb..bb",
    ])),
    walk2: W22(CAT_HEAD.concat([
      "..b.bbbbbbbbbbbbbbbb",
      "...bbdbbdbbdbbbbbbb",
      "....bbbbbbbbbbbbbbb",
      "....bblllllllllbbb",
      ".....bbb.....bbb",
      "....bb.bb...bb.bb",
    ])),
    sit: W22([
      "..............b.....b",
      "..............bb...bb",
      "..............bbbbbbb",
      "..............bebbbeb",
      "..............bbbnbbb",
      "..........bbbbbbbbbb",
      ".........bbdbbdbbbbb",
      "........bbbbbbllllbb",
      ".......bbbbbbbllllbb",
      "...dbbbbbbbbbbllllbb",
      "....bbbbbbbbbb.bb.bb",
    ]),
    paw: W22([
      "..............b.....b",
      "..............bb...bb",
      "..............bbbbbbb",
      "..............bebbbeb",
      "..............bbbnbbbb",
      "..........bbbbbbbbbbbb",
      ".........bbdbbdbbbbb",
      "........bbbbbbllllbb",
      ".......bbbbbbbllllbb",
      "...dbbbbbbbbbbllllbb",
      "....bbbbbbbbbb.bb...",
    ]),
    sleep: W22([
      "",
      "",
      "",
      "",
      "",
      "...............b...b",
      "..........bbbbbbbbbbb",
      "........bbbbbbbbbkbbkb",
      ".......bbdbbdbbbbbbnbb",
      "......bbbbbbbbbbbbbbbb",
      ".....dbbbbbbbbbbbbbbb",
    ]),
    jump: W22([
      "",
      "",
      "...............b.....b",
      "...............bb...bb",
      ".dd............bbbbbbb",
      "...dbbbbbbbbbbbbebbbeb",
      "....bbdbbdbbdbbbbbnbbb",
      "...bbllllllllllbbbbbb",
      ".bb................bb",
      "b...................bb",
      "",
    ]),
  };

  // Grid → SVG, merging runs of the same colour on a row into one rect.
  function toSvg(rows, cls, pal) {
    pal = pal || PAL;
    const w = rows[0].length, h = rows.length;
    let rects = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const ch = row[x];
        let end = x + 1;
        while (end < row.length && row[end] === ch) end++;
        if (ch !== ".") rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${pal[ch]}"/>`;
        x = end;
      }
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls || ""}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
  }

  root.PIXEL = { PAL, PAL_POWER, FRAMES, EMOJI, BLAST, KEYS, MARKER, PROPS, BUG, HATS, CAT, CAT_PAL, toSvg };
})(typeof window !== "undefined" ? window : globalThis);

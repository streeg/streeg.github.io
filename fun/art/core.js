// Pixel art basics: the palette, grid helpers and the grid → SVG renderer.
// Each picture is a grid of characters; "." is transparent and every other character is a colour from PAL.
export const PAL = {
  H: "#2e1f1a", h: "#4a3329", f: "#6b5248",              // hair, curl highlight, shaved sides
  S: "#efbf98", s: "#d99f7a", w: "#ffffff", E: "#24160f", // skin, shadow, eye sparkle, eye
  B: "#2e1f1a", m: "#b0634f", R: "#d4d4d8",              // beard, lip, earring
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
// Flow state: white hair.
export const PAL_POWER = Object.assign({}, PAL, { H: "#f4f4f5", h: "#d4d4d8", f: "#a1a1aa" });

export const EMPTY = "................................";
// Paint a patch over a frame; spaces in the patch keep what is underneath.
export const paint = (rows, x, y, patch) => {
  const out = rows.slice();
  patch.forEach((p, i) => {
    const r = out[y + i].split("");
    [...p].forEach((ch, j) => { if (ch !== " ") r[x + j] = ch; });
    out[y + i] = r.join("");
  });
  return out;
};
// Like paint, but "." is transparent too.
export const stamp = (rows, x, y, patch) => paint(rows, x, y, patch.map((r) => r.replace(/\./g, " ")));
// Single pixels and filled boxes.
export const dot = (rows, pts, ch) => {
  const out = rows.slice();
  pts.forEach(([x, y]) => { const r = out[y].split(""); r[x] = ch; out[y] = r.join(""); });
  return out;
};
export const box = (rows, x0, y0, x1, y1, ch) => {
  const pts = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pts.push([x, y]);
  return dot(rows, pts, ch);
};

// A dark outline around a figure: every empty pixel next to a filled one (up, down, left, right).
export function outline(rows, ch = "x") {
  return rows.map((row, y) => [...row].map((c, x) => {
    if (c !== ".") return c;
    const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dy, dx]) => rows[y + dy] && rows[y + dy][x + dx] && rows[y + dy][x + dx] !== ".");
    return near ? ch : ".";
  }).join(""));
}

// A prop, a hat, a critter: one free pixel added all round, then the outline (so it is never cut off).
export const framed = (rows, ch = "x") => {
  const w = rows[0].length + 2, blank = ".".repeat(w);
  return outline([blank].concat(rows.map((r) => "." + r + "."), [blank]), ch);
};
export const framedAll = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, framed(v)]));

// Grid → SVG, merging runs of the same colour on a row into one rect.
export function toSvg(rows, cls, pal) {
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

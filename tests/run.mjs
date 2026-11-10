// Runs the browser test suites against the built site: serves the folder like GitHub Pages does,
// opens each suite in a fresh browser context, runs its checks inside the page and fails on any
// FAIL line or uncaught page error. A suite that fails is retried once (they drive real animations).
// Usage: node tests/run.mjs [suite ...]      (CHROME_CHANNEL=chrome uses an installed Chrome)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SUITES = { site: "/pt/?pxdebug", game: "/pt/?pxdebug", friends: "/pt/?pxdebug", features: "/pt/?pxdebug", home: "/pt/?pxdebug", life: "/pt/?pxdebug" };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml" };

// a static server: /pt/ serves pt/index.html, query strings are ignored
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) { res.writeHead(301, { location: path + "/" }).end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(await readFile(file));
  } catch { res.writeHead(404).end("not found"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {});
async function runSuite(name) {
  const code = await readFile(join(ROOT, "tests/page", name + ".js"), "utf8");
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, locale: "pt-BR" });
  // the real weather and GitHub: answered here, empty, so the checks never depend on the network
  await context.route(/api\.open-meteo\.com/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await context.route(/api\.github\.com/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base + SUITES[name], { waitUntil: "load" });
  await page.waitForFunction("window.PXDEBUG && document.querySelector('.px-world .px-me')", null, { timeout: 15000 });   // runs in the page
  await page.waitForTimeout(1500);
  let report;
  try { report = await page.evaluate(`(${code})()`); } catch (e) { report = "FAIL suite threw — " + e.message; }
  await context.close();
  const lines = String(report).split("\n");
  const failed = lines.filter((l) => l.startsWith("FAIL")).concat(errors.map((e) => "FAIL page error — " + e));
  return { lines, failed };
}

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SUITES);
let failures = 0;
for (const name of wanted) {
  let r = await runSuite(name);
  if (r.failed.length) { console.log(`\n${name}: ${r.failed.length} failed, retrying once`); r.failed.forEach((l) => console.log("  " + l)); r = await runSuite(name); }
  console.log(`\n=== ${name} ===`);
  r.lines.forEach((l) => console.log(l));
  r.failed.filter((l) => l.startsWith("FAIL page error")).forEach((l) => console.log(l));
  failures += r.failed.length;
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);

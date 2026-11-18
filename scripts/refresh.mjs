// Fetches cash fares from Duffel for every route in scripts/routes.json and writes src/live-data.json.
// Run from anywhere: node scripts/refresh.mjs
// Meant to run twice a day (Phase 4 schedules it). Built-in Node modules only (works on Node 16+).
//
// Guardrails:
// - Stops before calling Duffel if a run would go over maxSearchesPerRun (keeps Duffel free).
// - Skips dates in the past without calling Duffel.
// - Writes the new file only if at least one search succeeded, so a bad run never wipes good data.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readToken, requestOffers, parseOffers } from "./duffel.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "scripts", "routes.json"), "utf8"));
const outFile = path.join(root, "src", "live-data.json");
const rawDir = path.join(root, "scripts", "raw", "latest-run");

// The 6 airlines the prototype was designed around, by IATA code, for the coverage report.
const OUR_AIRLINES = { UA: "United", DL: "Delta", AA: "American", WN: "Southwest", AS: "Alaska", B6: "JetBlue" };

// Today's date on this computer, as YYYY-MM-DD.
const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");

// Build the search list: every route, both directions, every date.
const searches = [];
for (const date of config.dates) {
  for (const [a, b] of config.routes) {
    searches.push({ from: a, to: b, date }, { from: b, to: a, date });
  }
}
const toRun = searches.filter((s) => s.date >= today);

if (toRun.length > config.maxSearchesPerRun) {
  console.error(
    `Stopped: this run would make ${toRun.length} searches, over the limit of ${config.maxSearchesPerRun}. ` +
      `Remove a route or date in scripts/routes.json. Nothing was sent to Duffel.`
  );
  process.exit(1);
}

const token = readToken(root);
if (!token) {
  console.error("No DUFFEL_TOKEN found. Copy .env.example to .env and paste your token after DUFFEL_TOKEN=");
  process.exit(1);
}

fs.rmSync(rawDir, { recursive: true, force: true });
fs.mkdirSync(rawDir, { recursive: true });

console.log(`Running ${toRun.length} searches (${searches.length - toRun.length} skipped as past dates)...\n`);
const results = [];
const flights = [];
const liveModes = new Set();

for (const s of searches) {
  const label = `${s.from}-${s.to} ${s.date}`;
  if (s.date < today) {
    results.push({ ...s, status: "skipped_past_date" });
    console.log(`  ${label}  skipped (date has passed)`);
    continue;
  }
  try {
    const { status, text } = await requestOffers(token, s.from, s.to, s.date);
    fs.writeFileSync(path.join(rawDir, `${s.from}-${s.to}-${s.date}.json`), text);
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`HTTP ${status}, response wasn't JSON`); }
    if (status >= 400) {
      const msg = (json.errors || []).map((e) => e.message || e.title).join("; ") || "unknown error";
      throw new Error(`HTTP ${status}: ${msg}`);
    }
    const parsed = parseOffers(json, s);
    liveModes.add(parsed.liveMode);
    flights.push(...parsed.flights);
    const status_ = parsed.flights.length ? "ok" : "no_flights";
    results.push({ ...s, status: status_, offerCount: parsed.offerCount, flightCount: parsed.flights.length, skippedOffers: parsed.skipped });
    const skippedNote = Object.keys(parsed.skipped).length ? `, skipped ${JSON.stringify(parsed.skipped)}` : "";
    console.log(`  ${label}  ${parsed.offerCount} offers → ${parsed.flights.length} flights${skippedNote}`);
  } catch (err) {
    results.push({ ...s, status: "error", error: err.message });
    console.log(`  ${label}  ERROR ${err.message}`);
  }
}

const succeeded = results.filter((r) => r.status === "ok" || r.status === "no_flights").length;
const failed = results.filter((r) => r.status === "error").length;
if (succeeded === 0) {
  console.error(`\nEvery search failed, so ${path.relative(root, outFile)} was left unchanged.`);
  process.exit(1);
}

const seenCodes = new Set(flights.map((f) => f.airlineCode));
const data = {
  source: "duffel",
  liveMode: liveModes.size === 1 ? [...liveModes][0] : false,
  fetchedAt: new Date().toISOString(),
  searches: results,
  airlinesSeen: [...new Map(flights.map((f) => [f.airlineCode, f.airline])).values()].sort(),
  ourAirlinesMissing: Object.entries(OUR_AIRLINES).filter(([code]) => !seenCodes.has(code)).map(([, name]) => name),
  flights,
};

// Write to a temp file, then rename, so the app never reads a half-written file.
fs.writeFileSync(`${outFile}.tmp`, JSON.stringify(data, null, 2) + "\n");
fs.renameSync(`${outFile}.tmp`, outFile);

console.log(`\nWrote ${flights.length} flights to ${path.relative(root, outFile)}`);
console.log(`Searches: ${succeeded} succeeded, ${failed} failed`);
console.log(`Data: ${data.liveMode ? "LIVE prices" : "TEST data (Duffel sandbox, not real prices)"}`);
console.log(`Airlines returned: ${data.airlinesSeen.join(", ") || "none"}`);
console.log(`Our 6 airlines not returned: ${data.ourAirlinesMissing.join(", ") || "none"}`);
if (failed) process.exitCode = 2; // partial success: file written, but some routes failed

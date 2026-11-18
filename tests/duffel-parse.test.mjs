// Tests for turning Duffel responses into flight rows. Makes no network calls.
// Run from the project folder with: node tests/duffel-parse.test.mjs
import { readFileSync } from "node:fs";
import { parseOffers, isoDurationToMinutes } from "../scripts/duffel.mjs";

let failed = 0;
const check = (name, pass, detail = "") => {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
};
const query = { from: "JFK", to: "LAX", date: "2026-12-10" };

// 1. The real sandbox response saved in Phase 0 (fake prices, real Duffel format).
const sandbox = JSON.parse(readFileSync(new URL("./fixtures/duffel-sandbox-JFK-LAX.json", import.meta.url)));
const s = parseOffers(sandbox, query);
check("sandbox: 4 offers become 4 flights", s.offerCount === 4 && s.flights.length === 4, `${s.offerCount} → ${s.flights.length}`);
check("sandbox: marked as test data", s.liveMode === false);
const aa = s.flights.find((f) => f.flightNumber === "AA 1274");
check("sandbox: AA 1274 price, taxes, seller", aa && aa.cashPriceUsd === 166.29 && aa.taxesUsd === 25.37 && aa.soldBy.iataCode === "AA");
check("sandbox: AA 1274 times and 352 min", aa && aa.departureTime === "06:58" && aa.arrivalTime === "09:50" && aa.arrivalDayOffset === 0 && aa.durationMinutes === 352);
check("sandbox: leading zero removed (BA 0117 → BA 117)", s.flights.some((f) => f.flightNumber === "BA 117"));

// 2. Hand-made edge cases, in Duffel's format.
const offer = (o) => ({
  total_amount: o.price, total_currency: o.currency || "USD", tax_amount: o.tax === undefined ? "20.00" : o.tax,
  owner: { name: o.sellerName, iata_code: o.seller },
  slices: [{
    duration: o.duration || "PT6H",
    segments: (o.segments || [o]).map((g) => ({
      origin: { iata_code: g.from || "JFK" }, destination: { iata_code: g.to || "LAX" },
      departing_at: g.dep || "2026-12-10T08:00:00", arriving_at: g.arr || "2026-12-10T11:00:00",
      marketing_carrier: { iata_code: g.mkt || o.op }, marketing_carrier_flight_number: g.mktNum || o.opNum,
      operating_carrier: { iata_code: o.op, name: o.opName }, operating_carrier_flight_number: o.opNum,
      passengers: [{ cabin_class: o.cabin || "economy" }], stops: [],
    })),
  }],
});
const edge = parseOffers({ data: { live_mode: true, offers: [
  // Codeshare: same American flight sold by American ($300) and British Airways ($280). Cheapest seller wins.
  offer({ price: "300.00", seller: "AA", sellerName: "American Airlines", op: "AA", opName: "American Airlines", opNum: "1274" }),
  offer({ price: "280.00", seller: "BA", sellerName: "British Airways", op: "AA", opName: "American Airlines", opNum: "1274", mkt: "BA", mktNum: "0117" }),
  // Tie: Delta and Air France both sell DL 417 for $250. The airline flying the plane wins.
  offer({ price: "250.00", seller: "AF", sellerName: "Air France", op: "DL", opName: "Delta Air Lines", opNum: "417", mkt: "AF", mktNum: "3601", dep: "2026-12-10T07:00:00" }),
  offer({ price: "250.00", seller: "DL", sellerName: "Delta Air Lines", op: "DL", opName: "Delta Air Lines", opNum: "417", dep: "2026-12-10T07:00:00" }),
  offer({ price: "260.00", seller: "DL", sellerName: "Delta Air Lines", op: "DL", opName: "Delta Air Lines", opNum: "417", dep: "2026-12-10T07:00:00" }),
  // Overnight arrival, missing taxes.
  offer({ price: "199.00", tax: null, seller: "B6", sellerName: "JetBlue", op: "B6", opName: "JetBlue", opNum: "1023", dep: "2026-12-10T23:59:00", arr: "2026-12-11T03:10:00", duration: "PT6H11M" }),
  // These must all be skipped.
  offer({ price: "150.00", seller: "UA", sellerName: "United", op: "UA", opName: "United Airlines", opNum: "1", segments: [{ to: "ORD" }, { from: "ORD" }] }),
  offer({ price: "140.00", currency: "EUR", seller: "IB", sellerName: "Iberia", op: "IB", opName: "Iberia", opNum: "2" }),
  offer({ price: "900.00", cabin: "business", seller: "AS", sellerName: "Alaska", op: "AS", opName: "Alaska Airlines", opNum: "3" }),
  offer({ price: "0", seller: "WN", sellerName: "Southwest", op: "WN", opName: "Southwest Airlines", opNum: "4" }),
] } }, query);

const byNum = (n) => edge.flights.find((f) => f.flightNumber === n);
check("edge: 10 offers → 3 flights", edge.offerCount === 10 && edge.flights.length === 3, `${edge.flights.map((f) => f.flightNumber).join(", ")}`);
const codeshare = byNum("AA 1274");
check("codeshare: one row, cheapest seller wins ($280 via British Airways)",
  codeshare && codeshare.cashPriceUsd === 280 && codeshare.soldBy.iataCode === "BA" && codeshare.sellerFlightNumber === "BA 117" && codeshare.sellerCount === 2);
const tie = byNum("DL 417");
check("tie: airline flying the plane wins (Delta over Air France)", tie && tie.soldBy.iataCode === "DL" && tie.cashPriceUsd === 250 && tie.sellerCount === 2);
const overnight = byNum("B6 1023");
check("overnight: lands +1 day, 371 min", overnight && overnight.arrivalDayOffset === 1 && overnight.durationMinutes === 371);
check("missing taxes stay missing (null), not 0", overnight && overnight.taxesUsd === null);
check("skipped: connection, EUR, business, $0", JSON.stringify(edge.skipped) === JSON.stringify({
  "not nonstop": 1, "priced in EUR, not USD": 1, "not Economy": 1, "missing price": 1 }), JSON.stringify(edge.skipped));
check("empty response → no flights, no crash", parseOffers({ data: { offers: [] } }, query).flights.length === 0);
check("rows sorted by departure time", edge.flights.map((f) => f.departureTime).join() === "07:00,08:00,23:59");

// 3. Duration parsing.
check("duration PT5H52M = 352", isoDurationToMinutes("PT5H52M") === 352);
check("duration P1DT2H5M = 1565", isoDurationToMinutes("P1DT2H5M") === 1565);
check("duration PT45M = 45", isoDurationToMinutes("PT45M") === 45);
check("duration garbage = null", isoDurationToMinutes("5h") === null && isoDurationToMinutes(undefined) === null);

// 4. The default routes.json stays within the free Duffel budget.
const routes = JSON.parse(readFileSync(new URL("../scripts/routes.json", import.meta.url)));
const perRun = routes.routes.length * 2 * routes.dates.length;
check("routes.json: searches per run ≤ limit", perRun <= routes.maxSearchesPerRun, `${perRun} of ${routes.maxSearchesPerRun}`);
check("routes.json: 2 runs a day × 30 days ≤ 1,500", perRun * 60 <= 1500, `${perRun * 60} a month`);

console.log(`\n${failed} checks failed`);
process.exit(failed ? 1 : 0);

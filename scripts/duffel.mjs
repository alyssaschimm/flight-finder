// Shared Duffel helpers for the refresh script. Built-in Node modules only (works on Node 16+).
// parseOffers() is pure, so tests can run it against saved responses without calling Duffel.

import https from "node:https";
import fs from "node:fs";
import path from "node:path";

// Read DUFFEL_TOKEN from <root>/.env (KEY=value lines). Returns null if it's missing.
export function readToken(root) {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*DUFFEL_TOKEN\s*=\s*(.*?)\s*$/);
    if (match && match[1]) return match[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

// One Duffel search: one-way, nonstop, Economy, 1 adult. Resolves to { status, text }.
export function requestOffers(token, from, to, date) {
  const payload = JSON.stringify({
    data: {
      slices: [{ origin: from, destination: to, departure_date: date }],
      passengers: [{ type: "adult" }],
      cabin_class: "economy",
      max_connections: 0,
    },
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: "api.duffel.com",
        path: "/air/offer_requests?return_offers=true&supplier_timeout=20000",
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Duffel-Version": "v2",
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 60000,
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => resolve({ status: res.statusCode, text }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timed out after 60 seconds")));
    req.on("error", reject);
    req.end(payload);
  });
}

// "PT5H52M" or "P1DT2H5M" → minutes. Returns null if the format is unexpected.
export function isoDurationToMinutes(value) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(value || "");
  if (!m || value === "P" || value === "PT") return null;
  return Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

// "0117" → "117". Airlines show flight numbers without leading zeros.
const flightNum = (n) => String(n).replace(/^0+(?=\d)/, "");

// Whole calendar days between two local "YYYY-MM-DDTHH:MM:SS" times (dates only).
const dayOffset = (dep, arr) =>
  Math.round((Date.UTC(...ymd(arr)) - Date.UTC(...ymd(dep))) / 86400000);
const ymd = (iso) => {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, mo - 1, d];
};

// Turn a Duffel offer-request response into our flight rows.
// - One row per physical flight (operating carrier + operating flight number + departure time),
//   so codeshares sold by several airlines appear once.
// - Each row keeps the cheapest offer. Ties go to the airline that flies the plane, then seller name A–Z.
// - Offers that aren't nonstop, Economy, or priced in USD are skipped and counted, never converted or guessed.
export function parseOffers(json, { from, to, date }) {
  const offers = (json && json.data && json.data.offers) || [];
  const skipped = {};
  const skip = (reason) => (skipped[reason] = (skipped[reason] || 0) + 1);
  const byFlight = new Map();

  for (const offer of offers) {
    const slice = offer.slices && offer.slices[0];
    const segs = (slice && slice.segments) || [];
    if (!slice || offer.slices.length !== 1) { skip("not one-way"); continue; }
    if (segs.length !== 1 || (segs[0].stops || []).length > 0) { skip("not nonstop"); continue; }
    const seg = segs[0];
    const cabins = (seg.passengers || []).map((p) => p.cabin_class);
    if (cabins.length === 0 || cabins.some((c) => c !== "economy")) { skip("not Economy"); continue; }
    if (offer.total_currency !== "USD") { skip(`priced in ${offer.total_currency}, not USD`); continue; }
    const price = Number(offer.total_amount);
    if (!Number.isFinite(price) || price <= 0) { skip("missing price"); continue; }
    if (seg.origin.iata_code !== from || seg.destination.iata_code !== to) { skip("different airports"); continue; }
    if (seg.departing_at.slice(0, 10) !== date) { skip("different date"); continue; }

    const op = seg.operating_carrier;
    const opNumber = flightNum(seg.operating_carrier_flight_number || seg.marketing_carrier_flight_number);
    const key = `${op.iata_code}${opNumber}-${seg.departing_at}`;
    const tax = offer.tax_amount == null ? null : Number(offer.tax_amount);

    const row = {
      id: `${op.iata_code}${opNumber}-${date}`,
      airline: op.name,
      airlineCode: op.iata_code,
      flightNumber: `${op.iata_code} ${opNumber}`,
      origin: from,
      destination: to,
      date,
      departureTime: seg.departing_at.slice(11, 16),
      arrivalTime: seg.arriving_at.slice(11, 16),
      arrivalDayOffset: dayOffset(seg.departing_at, seg.arriving_at),
      durationMinutes: isoDurationToMinutes(slice.duration || seg.duration),
      fareClass: "Economy",
      cashPriceUsd: price,
      taxesUsd: Number.isFinite(tax) ? tax : null,
      soldBy: { name: offer.owner.name, iataCode: offer.owner.iata_code },
      sellerFlightNumber: `${seg.marketing_carrier.iata_code} ${flightNum(seg.marketing_carrier_flight_number)}`,
      sellerCount: 1,
    };

    const entry = byFlight.get(key);
    if (!entry) { byFlight.set(key, { row, sellers: new Set([row.soldBy.iataCode]) }); continue; }
    entry.sellers.add(row.soldBy.iataCode);
    const kept = entry.row;
    const better =
      row.cashPriceUsd - kept.cashPriceUsd ||
      (kept.soldBy.iataCode === kept.airlineCode) - (row.soldBy.iataCode === row.airlineCode) ||
      row.soldBy.name.localeCompare(kept.soldBy.name);
    if (better < 0) entry.row = row;
  }

  const flights = [...byFlight.values()]
    .map(({ row, sellers }) => ({ ...row, sellerCount: sellers.size }))
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime) || a.flightNumber.localeCompare(b.flightNumber));
  return { flights, offerCount: offers.length, skipped, liveMode: json && json.data ? json.data.live_mode : null };
}

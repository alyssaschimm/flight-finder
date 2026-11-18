# Flight Finder: MVP Spec

**Build time:** 60 minutes
**Format:** Clickable web prototype using mock data, with no backend
**Look and feel:** Deep blue, simple and a little playful, with a familiar flight booking layout

## Users
US travelers who have airline miles or credit card points and want to know the cheapest way to book a flight.

## Goal
Users can scan every flight in one ranked list, see the cheapest way to pay for each, see what their points are worth in dollars, and go to the airline or card issuer's site to book.

## Must-haves

### 1. Search page
- Users type a city or airport code to choose an origin and destination, then choose a date. Preferred time and passengers aren't built yet. All fares are Economy.
- Results appear only after the user clicks **Search**.
- Searches outside the mock data show a clear error. The app never estimates missing data.

### 2. Ranked results page
- A summary at the top shows the cheapest overall, cheapest with cash, and cheapest with points.
- Each flight appears once, showing its cheapest option. Flights rank from lowest to highest effective cost.
- **Effective cost** = (points x value per point) + taxes and fees.
- Each points option shows its dollar value and whether it beats the cash fare on the same flight.
- Example: "30,000 United miles ≈ $390 + $5.60 taxes".
- All options show by default. A "My cards and programs" filter lets users choose which cards and airline programs count. Cash is always included.
- Point values come from `data.js`. On-page editing isn't built yet.

### 3. Flight details panel and booking
Clicking a flight expands a details panel in its row:
- **Basic flight info:** airline, flight number, route, times, and duration.
- **Fare class:** Economy.
- **All ways to pay:** every selected cash and points option for the flight, in dollars, with a **Book** button on each.

Each flight's row has a **Book** button for its cheapest option. **Book** opens the airline's homepage for cash and airline miles, and the card issuer's homepage for card points.

## Mock data scope
- **Routes (6, both directions):** JFK-LAX, ORD-LAX, SEA-SFO, ATL-MCO, BOS-MIA, DEN-LAS
- **Airlines (6):** United, Delta, American, Southwest, Alaska, JetBlue, with 4 on each route
- **Flights:** 6 per direction, 72 in total, on one date (December 10, 2026), plus 1 JFK-LAX test flight with a missing cash price
- **Fare class:** Economy only
- **Credit card programs (3, on every flight):** Chase Ultimate Rewards, American Express Membership Rewards, Capital One Miles
- **Airline miles:** the operating airline's own program, on every flight
- **Images:** placeholders for now, to be replaced with static airline and card logo files

## Cuts
- Live APIs and a backend
- Accounts, saved searches, and price alerts
- Loyalty account linking and live points balances
- Third-party booking sites, and booking or payment inside the app
- Transfers from card points to airline programs
- Multi-city trips, plus round trips unless time remains
- Premium Economy, Business, and First fares
- Seat maps, aircraft details, and baggage or fare rules
- Mobile polish beyond a basic responsive layout
- Stock photos, unless time remains (Unsplash API)

---

# v2: Live data plan (approved direction, not built)
Status: revised 2026-11-16 with your decisions. Nothing in this section is implemented yet. It replaces the "Live APIs and a backend" cut above. The build checklist is in `PLAN.md`.

**Decisions:** only free services · runs on your computer, and the code goes to GitHub · data updates twice a day, not on every search · whatever Duffel returns is what we show, and missing airlines are listed in the README.

## Where each piece of data comes from
| PRD need | v2 source | Notes |
| --- | --- | --- |
| Flights, schedules, cash fares | **Duffel Flights API** (`POST /air/offer_requests`), free within its search limit | Whatever Duffel returns. Airlines it doesn't return are listed in the README. |
| Card points price | **Calculated** as cash fare ÷ the card's travel-site rate (`CARD_RATES` in `data.js`) | Labeled as calculated. |
| Value per point | `POINT_VALUES` in `data.js`, with a source and date on each value | No licensed API exists. Editing on the page comes later. |
| Airline miles price | **Not in v2.** No free source exists. | We hide airline-miles options and show one plain note. We don't show 72 "No Data" cells. |
| Airport search | The airports in the latest data file | We only have data for the fixed routes. |
| Book links | No change (homepages) | |

**Rejected:** Seats.aero (paid Pro subscription), Amadeus Self-Service (shut down in July 2026), scraping Google Flights or airline sites (against our rules and their terms), and paid award scrapers.

## Architecture: no server
```
launchd (macOS), 7:00 AM and 7:00 PM
   └─ node scripts/refresh.mjs
        ├─ reads scripts/routes.json  (routes × dates to fetch)
        ├─ calls Duffel once per route-direction-date, nonstop, Economy, 1 adult
        └─ writes src/live-data.json  (only if the run succeeds, so a bad run never wipes good data)

Browser: python3 -m http.server --directory src
   └─ index.html loads live-data.json, then ranks and displays as today
```
- **Why no server:** prices are fetched on a schedule, not when someone searches. That means the browser never needs the API key, and the app stays a static page. That's fewer moving parts than the earlier plan.
- **Secrets:** `DUFFEL_TOKEN` lives in `.env`, which is git-ignored. `.env.example` is committed. The scripts read `.env` themselves.
- **Node.js:** the scripts use only Node 16's built-in modules (`https`, `fs`), with no `fetch` and no `--env-file`. Your machine runs Node 16.20, so no upgrade is needed.
- **Kept out of GitHub:** `.env`, `src/live-data.json` (Duffel's prices, which change twice a day), and `scripts/raw/` (raw API responses).
- **Mock mode:** `index.html?data=mock` loads `data.js` and shows a visible "Mock data" banner. The smoke test keeps using mock data.
- **No live file yet:** the page says "No live prices yet. Run the refresh script." It never falls back to mock data on its own.
- **Missed runs:** if the Mac is asleep at 7:00, launchd runs the job when it wakes up. A manual run is just `node scripts/refresh.mjs`.

## Request budget (keeps Duffel free)
- **Free limit:** Duffel allows 1,500 searches per order. With zero bookings, that's 1,500 searches a month.
- **Our use:** 2 runs a day × 30 days = 60 runs, so each run can make **up to 25 searches**.
- **Default `routes.json`:** our 6 routes in both directions (12) × 2 dates = **24 searches per run, about 1,440 a month**.
- **Guardrail:** `refresh.mjs` stops if a run would go over 25 searches. Adding a route or date means removing one.

## `src/live-data.json` shape (built in Phase 1 by `scripts/refresh.mjs`)
The file holds only what Duffel returned. Card points are calculated in the app from `data.js` rates, so changing a rate doesn't need a new fetch.
```json
{
  "source": "duffel",
  "liveMode": false,
  "fetchedAt": "2026-11-18T20:57:59.811Z",
  "searches": [{"from": "JFK", "to": "LAX", "date": "2026-12-10", "status": "ok",
                "offerCount": 4, "flightCount": 4, "skippedOffers": {}}],
  "airlinesSeen": ["Alaska Airlines", "American Airlines"],
  "ourAirlinesMissing": ["United", "Delta", "Southwest", "JetBlue"],
  "flights": [{
    "id": "AA107-2026-12-10", "airline": "American Airlines", "airlineCode": "AA", "flightNumber": "AA 107",
    "origin": "JFK", "destination": "LAX", "date": "2026-12-10",
    "departureTime": "06:58", "arrivalTime": "09:50", "arrivalDayOffset": 0, "durationMinutes": 352,
    "fareClass": "Economy", "cashPriceUsd": 170.62, "taxesUsd": 26.03,
    "soldBy": {"name": "American Airlines", "iataCode": "AA"}, "sellerFlightNumber": "AA 107", "sellerCount": 1
  }]
}
```
- **`liveMode`:** `false` means Duffel sandbox data. The app must show "Test data from Duffel's sandbox. Not real prices or schedules."
- **`status`:** `"ok"`, `"no_flights"`, `"error"` (with `error` text) or `"skipped_past_date"`. A search that failed shows "Prices for this route couldn't be loaded", not "No flights".
- **`taxesUsd`:** `null` when Duffel didn't send it, never 0.
- **`airlineAward` and `cardAwards`:** left out. The app adds card options and treats missing airline miles as "not in this version", not as "No Data".

## Rules
1. **One row per flight:** flights are grouped by operating airline + operating flight number + departure time, so a codeshare sold by several airlines appears once. Each row keeps the cheapest offer (USD, taxes included). On a tie, the airline flying the plane wins, then seller name A–Z.
2. **Book goes to the seller (decided 2026-11-18):** `soldBy` is the airline whose price we show. `sellerFlightNumber` is the number to look for on that airline's site. If we don't have a homepage for the seller, Book is disabled with "Booking link not available". We never send people to an airline where our price doesn't apply.
3. **Skipped, never converted or guessed:** offers that aren't nonstop, aren't Economy, aren't priced in USD, have no price, or use a different airport than the one searched. Duffel adds nearby airports, such as SNA for LAX and PAE for SEA. **Decided 2026-11-18:** leave them out, because users get exactly the airports they searched. Each search records its skip counts.
4. **Card points (in the app, Phase 2):** `points = ceil(cashPriceUsd ÷ (rateCentsPerPoint ÷ 100))`. Default rates: Chase 1.0¢, Amex 1.0¢, Capital One 1.0¢ (standard travel-site rates).
   - Worked example: a $289.00 fare at 1.0¢ = 28,900 points. At 1.25¢ it's 23,120 points.
5. **Ranking:** no change (`assumptions.md`).
6. **Freshness:** the page always shows "Prices checked Mon 7:02 AM". If the file is more than 13 hours old, it adds "These prices may be out of date."
7. **Price disclaimer:** "Fares change often. The price on the airline's site may differ." Nothing is booked in the app.
8. **Budget guardrails:** `refresh.mjs` stops before calling Duffel if a run would go over `maxSearchesPerRun` (25). It skips past dates. It writes the file only if at least one search succeeds, using a temporary file and then a rename.

## Verification
- **Unit (Phase 1, built):** `node tests/duffel-parse.test.mjs` checks parsing against the saved sandbox response and hand-made edge cases (codeshare, tie, overnight, missing taxes, connections, EUR, business, $0), duration parsing, and the budget. The card-math worked example gets a check in Phase 2.
- **Smoke:** the existing mock smoke test passes unchanged.
- **Live check:** for 3 flights, compare our cash fare with the airline's own site and record the difference and the time of the check.
- **Done when:** a scheduled run fills `live-data.json`; a JFK-LAX search shows real Duffel flights ranked by effective cost, with a "checked at" time; the README lists airlines that are missing; and a clean clone from GitHub contains no secrets or price data.

## Open questions
1. **Duffel approval (biggest risk):** live prices only work after Duffel reviews and approves the account. If an individual's prototype isn't approved, there's no free source of real cash fares. Fallback: stay on mock data.
2. **What points are worth:** not every point is worth 1¢. Coming back to this later (see `PLAN.md` → Later).
3. **Airline logos:** Duffel's responses include airline logo links (`owner.logo_symbol_url`). Trademark use needs the same review as in `assumptions.md`.

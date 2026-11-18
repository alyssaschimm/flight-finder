# Flight Finder v2: Plan

Goal: replace the mock data with live Duffel cash fares, updated twice a day, running on your computer, with the code on GitHub. Details are in `context/SPEC.md` under "v2: Live data plan".

## Done
- [x] Mock prototype: search, ranked results, details panel, booking links, smoke test (commit d7fe7b9)
- [x] Live data plan written in SPEC.md (2026-11-16)

## Phase 0: Prove access (decision gate)
- [x] **You:** sign up at duffel.com and request live access (2026-11-16, waiting on approval)
- [x] **Me:** add `.env.example` and git-ignore `.env`, `src/live-data.json` and `scripts/raw/`
- [x] **Me:** one-search probe script (tested, then deleted on 2026-11-18 because `refresh.mjs` replaces it)
- [x] **You:** test-token run on 2026-11-16 worked. It returned 4 sandbox offers (fake prices and schedules, all fields we need are present)
- [ ] **You:** after Duffel approves live access, put the live token in `.env` and run `node scripts/refresh.mjs`
- [ ] **Together:** check the response. Which of our 6 airlines appear? Are the prices real?
- [ ] **Stop:** if live access is denied, decide between staying on mock data and choosing another source

## Phase 1: Refresh script
- [x] `scripts/routes.json`: 6 routes × 2 directions × 2 dates (Dec 10 and 17) = 24 searches
- [x] `scripts/duffel.mjs`: token, request, and parsing (one row per flight, cheapest seller, codeshares merged)
- [x] `scripts/refresh.mjs`: runs every search and writes `src/live-data.json`, plus raw responses in `scripts/raw/latest-run/`
- [x] Guardrails tested: over-limit stop (nothing sent), no token, all searches failing (old file kept)
- [x] `tests/duffel-parse.test.mjs`: 19 checks pass. Card math moved to Phase 2, because rates live in the app.
- [x] **Test:** test-token run on 2026-11-18. 24/24 searches, 125 flights, 27 seconds, sandbox data
- [x] Decision: Book goes to the airline selling the fare (`soldBy`)
- [x] Decision: leave out nearby-airport flights (2026-11-18)
- [x] You confirmed `refresh.mjs` and the parse test both work on your machine (2026-11-18)

## Phase 2: App reads live data
- [ ] `index.html` loads `live-data.json`, and `?data=mock` loads mock data with a banner
- [ ] "Test data" banner when `liveMode` is false
- [ ] Card points calculated from the cash fare, with the label "Calculated at 1.0¢"
- [ ] Book goes to the seller's homepage, and is disabled when we don't have one
- [ ] Card-math worked example added to a test
- [ ] Hide airline-miles options, and show one note saying they're not included yet
- [ ] Airport search uses only the airports in the data file
- [ ] **Test:** JFK-LAX search in the browser, plus a screenshot

## Phase 3: Honesty states
- [ ] "Prices checked [time]" and a warning when the data is more than 13 hours old
- [ ] Per-route errors ("couldn't be loaded" vs "no flights")
- [ ] "No live prices yet" when the file is missing
- [ ] Price disclaimer near the Book buttons
- [ ] **Test:** go through each state in the browser

## Phase 4: Schedule
- [ ] launchd job at 7:00 AM and 7:00 PM, plus install and uninstall steps in the README
- [ ] **Test:** trigger the job once by hand and confirm the file timestamp updates

## Phase 5: README and GitHub
- [ ] README: setup, refresh, schedule, and a **"Data gaps"** section listing airlines Duffel didn't return, plus "Airline miles not included"
- [ ] Update `assumptions.md` (live data, 1.0¢ card rates, freshness)
- [ ] Check that a clean clone has no secrets or price data
- [ ] **You:** create the GitHub repo (private recommended) and push

## Later (not in the MVP)
- What points are really worth: airline and card points aren't all 1¢. See the NerdWallet cash-vs-miles calculator: https://www.nerdwallet.com/travel/learn/calculator-should-you-book-a-flight-with-cash-or-miles
- Airline miles prices (needs a paid source or a free one we haven't found)
- Stops and connections
- Nearby airports as an opt-in, with each flight labeled by its real airport (the refresh script already counts skipped ones)
- On-page editing of point values

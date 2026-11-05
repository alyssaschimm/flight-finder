# Flight Finder

> [!WARNING]
> **This is a prototype that uses mock data. Do not use it in production.**
>
> All flights, schedules, fares, points prices, and point values are made up. They don't reflect real prices or availability, so don't use them to make travel or financial decisions. Nothing can be booked in the app.

Flight Finder compares the cost of a flight across cash, airline miles, and credit card points. It converts points to dollars and ranks each flight by its cheapest way to pay, so travelers don't have to check several sites or work out what their points are worth.

## Features
- **Search:** Type a city or airport code, then choose a date.
- **Ranked results:** See one row per flight, showing its cheapest option, ranked from lowest to highest cost.
- **Summary:** See the cheapest option overall, with cash, and with points.
- **My cards and programs filter:** Choose which cards and airline programs count. Cash is always included.
- **Flight details:** Click a flight to see its details and every way to pay.
- **Booking links:** **Book** opens the airline or card issuer's real homepage in a new tab. It doesn't carry over the selected flight or price.
- **Missing data:** Missing, zero, or negative values show "No Data" instead of an estimate.

## Getting started

### Requirements
- A current web browser
- Python 3, or any other local web server
- Node.js, only for running the smoke test

There's nothing to install and no API keys to set up.

### Run the app
The app must run from a local server, because browsers block its JavaScript modules when `src/index.html` is opened directly from disk. From the project folder, run:

```sh
python3 -m http.server 8000 --directory src
```

Then open http://localhost:8000 and try this search:

- **From:** New York (JFK)
- **To:** Los Angeles (LAX)
- **Date:** Thu, Dec 10, 2026

### Run the smoke test
```sh
node tests/smoke-test.mjs
```

The test checks the dataset and uses its own copy of the ranking rules. It doesn't test `src/index.html`, so changes to the page's logic need to be checked in the browser too.

## How costs are calculated
```text
Points option cost = taxes + (points x value per point)
```

For example, 26,000 Delta SkyMiles at 1.2¢ per point with $5.60 in taxes costs $317.60.

Costs round to two decimals. Ties go to the shorter flight, then to cash, then alphabetically by program name.

## Mock data
All data is in [`src/data.js`](src/data.js). The only real values are the booking site homepages in `BOOKING_SITES`.

| Data | Coverage |
| --- | --- |
| Routes | JFK-LAX, ORD-LAX, SEA-SFO, ATL-MCO, BOS-MIA, and DEN-LAS, in both directions |
| Date | December 10, 2026 only |
| Flights | 72, plus 1 test flight |
| Airlines | United, Delta, American, Southwest, Alaska, and JetBlue, with 4 on each route |
| Card programs | Chase Ultimate Rewards, American Express Membership Rewards, and Capital One Miles |
| Fares | Economy only |

- **Airline and route pairings:** Some may not exist in real life, and flight numbers may not match real flights.
- **Point values:** These are placeholder estimates that haven't been checked against a published source. To change one, edit `centsPerPoint` in `POINT_VALUES`.
- **Test flight:** B6 999 (JFK to LAX) has a missing cash price so the "No Data" state can be tested. Remove it before using real data.

## Project structure
| Path | Purpose |
| --- | --- |
| `src/index.html` | The app, including its styles and JavaScript |
| `src/data.js` | Mock flight data, point values, and booking links |
| `tests/smoke-test.mjs` | Dataset smoke test |
| `context/SPEC.md` | MVP scope and cuts |
| `context/assumptions.md` | Assumptions, known edge cases, and risks |
| `context/prd_brief.md` | Original product brief |

## Known limitations
- There's no backend, live data, account linking, or points balance check.
- Searches are one-way and Economy only, and prices assume one adult.
- Preferred time, passenger count, and on-page point value editing aren't built.
- Airline and card logos, and the hero image, are placeholders.
- Mobile layouts are basic.

## Before any public release
This project isn't ready for public release. The layout is based on Google Flights, it uses real airline and card issuer names alongside made-up prices, and the product name hasn't been checked for trademark conflicts. It isn't affiliated with or endorsed by Google or any airline or card issuer named here. See the risk checklist in [`context/assumptions.md`](context/assumptions.md).

## Moving to real data
No live APIs are connected or have been evaluated. A real version would need licensed sources for:

- Cash fares and schedules
- Award availability and points prices
- Point valuations
- Booking links that carry over the selected flight

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

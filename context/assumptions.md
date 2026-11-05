# Assumptions

## Point values
- Point values are estimates stored in `data.js`. Users can't edit them on the page yet.
- Each program has one fixed value per point. Values don't change by route or date.
- The defaults below are starting placeholders. They haven't been checked against a published source.

| Program | Default value per point |
| --- | --- |
| United MileagePlus | 1.3¢ |
| Delta SkyMiles | 1.2¢ |
| American AAdvantage | 1.3¢ |
| Southwest Rapid Rewards | 1.3¢ |
| Alaska Atmos Rewards | 1.3¢ |
| JetBlue TrueBlue | 1.3¢ |
| Chase Ultimate Rewards | 1.0¢ |
| American Express Membership Rewards | 1.0¢ |
| Capital One Miles | 1.0¢ |

- Card defaults reflect booking through the issuer's travel site, because that's where **Book** sends users. Transfers to airline programs are out of scope, so those potentially higher values aren't counted.

## Flights and fares
- All flights, fares, points prices, taxes, and seat availability are mock data.
- Airlines and airports are real. Flight numbers and schedules are realistic but may not match actual flights.
- Each route has 4 airlines to keep the data consistent, so some airline and route pairings may not exist in real life.
- All fares are Economy.
- The mock data covers one date, December 10, 2026.
- Every flight has the same payment options: cash, the operating airline's miles, and all 3 card programs. Real availability would vary.
- Card points bookings have no separate taxes because the points cover the full price.
- Points prices are set independently of cash fares, so points can come out cheaper, equal to, or more expensive than cash.

## Ranking
- Options rank by effective cost: (points x value per point) + taxes and fees.
- Costs round to two decimals before ranking or comparing.
- Ties go to the shorter flight first, then to cash because it keeps the user's points, then alphabetically by program name.
- Each flight appears once and ranks by its cheapest selected option.
- Cash is always included, because every user can pay with it.
- The filter records which cards and programs a user has. It doesn't check whether they have enough points, since users don't link their accounts.
- Filter choices last until the page is refreshed.

## Errors and missing data
- The app never estimates or fills in missing data.
- A route or date outside the mock data shows an error instead of results.
- An option with a missing, zero, or negative price or point value shows "No Data". It ranks after every priced option and can't be booked.
- A flight with no priced options ranks last, with a dash instead of a rank number.

## Booking
- Nothing is booked or paid for in the app.
- **Book** opens the real homepage of the airline or card issuer in a new tab. It doesn't carry over the selected flight.
- Third-party booking sites aren't used.

## Cards and branding
- Each card program is represented by one card: Chase Sapphire Reserve, American Express Platinum, or Capital One Venture X.
- Real airline and card logos are static files used for this private prototype only. Trademark use needs review before any public release.

## Build
- The app runs entirely in the browser, with no backend, accounts, or live APIs.
- Claude writes the copy as static text, and you'll review it. No text generation API is used.
- Stock photos come from the Unsplash API only if time remains.

## Risks to address before any public release
This is a product checklist rather than legal advice. Have a lawyer review these items before launch.

- **Resemblance to Google Flights:** The layout and search card closely follow Google Flights, although the colors are now our own blue palette. Create a distinct visual identity before release, because a close copy of a well-known interface can raise trade dress and copyright concerns.
- **Airline and card logos:** Real logos need permission or use within each brand's guidelines. Avoid suggesting that any airline or issuer endorses the product.
- **Mock prices under real brand names:** The prototype shows made-up fares and points prices next to real companies and links to their real sites. Keep the mock data label visible, and don't host it publicly in a way that could look like real pricing.
- **Product name:** "Flight Finder" hasn't been checked for trademark conflicts.
- **Real data sources:** Use licensed APIs for fares and award pricing. Don't scrape Google Flights, airline sites, or card issuer sites without checking their terms.
- **Point valuations:** Published valuations may have licensing limits, and showing savings may need disclaimers.

## Known edge cases
These come from the dataset smoke test (`node tests/smoke-test.mjs`) and a review of the data. Items marked "Handled" or "Decided" are settled. Items marked "Proposed" still need approval.

### Search
- **Airport input:** Handled: type-to-search accepts a city or code in any case. Airports outside the data, such as EWR or LGA, show "No matching airports", and search asks the user to choose from the list.
- **Same origin and destination:** The data returns nothing. Proposed: show a form error before searching.
- **Dates:** Only December 10, 2026 has flights. After that date, the demo needs new data if the form blocks past dates.
- **Preferred time:** All departures are between 7:00 AM and 8:05 PM, local to the origin airport. Proposed: an earlier or later request shows a "no flights at this time" message.
- **Multiple passengers:** Prices and points are per person, and the data has no seat counts. Proposed: multiply costs by passengers, with no check that enough seats exist.

### Ranking and filters
- **Tied card options:** Handled: after flight length and cash, tied options sort alphabetically by program name.
- **Near ties:** JetBlue miles on B6 123 cost $259.10 against $259 cash. Decided: show the exact difference, "$0.10 more than cash", so users see accurate results. Point values will no longer be estimates once the app has real data.
- **Long lists:** Handled: a search returns one row per flight, with its other ways to pay in the expanded panel.
- **Points the user doesn't have:** Handled: the default view ranks all programs, and "My cards and programs" lets users remove what they don't hold.
- **Filters with no matches:** Handled: clearing every card and program leaves the cash options, and the points summary asks the user to select one.

### Point values
- **Invalid values:** Handled: a zero, negative, or missing value makes that program's options show "No Data".
- **Decimal values:** Handled: costs round to two decimals, so 28,900 points at 1.1¢ is $317.90.
- **Very high values:** A mistyped value such as 100¢ would push that program to the bottom of the list. Proposed: set an upper limit.

### Gaps in the data
- **Missing data:** Handled: test flight B6 999 (JFK to LAX) has a missing cash price so users and tests can see the "No Data" state. Remove it before using real data.
- **Seat counts:** The data has none, so the app can't confirm that seats are available. Decided: this isn't tested for now.
- **Logos:** The data has no logo files yet, so airline and card logos can't appear until they're added.
- **Mock flights on real sites:** **Book** opens a real website where the mock flight and price won't appear.
- **Nonstop only:** The data has no stops or connections, so the app can't show or filter them.
- **Overnight flights:** 4 flights land the next day, so the app must show "+1 day" using `arrivalDayOffset`.
- **Time zones:** Times are local, so subtracting departure from arrival gives the wrong duration. The app must use `durationMinutes`.

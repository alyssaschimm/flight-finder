// Smoke test for the mock dataset. Run from the project folder with: node tests/smoke-test.mjs
// The search and ranking helpers below exist only for this test. They are not app code.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// data.js uses ES module exports and the project has no package.json, so load a temporary .mjs copy.
const copy = join(mkdtempSync(join(tmpdir(), 'flight-data-')), 'data.mjs');
writeFileSync(copy, readFileSync(new URL('../src/data.js', import.meta.url)));
const { BOOKING_SITES, FLIGHTS, POINT_VALUES, DATA_DATE } = await import(copy);

const search = (origin, destination, date = DATA_DATE) =>
  FLIGHTS.filter(f => f.origin === origin && f.destination === destination && f.date === date);

const isPositive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const roundToCents = amount => Math.round((amount + Number.EPSILON) * 100) / 100;

// A missing, zero, or negative price or point value has no cost, so the option shows No Data.
const awardCost = (a, values) => (isPositive(a.points) && isPositive(values[a.programId].centsPerPoint)
  ? roundToCents(a.points * values[a.programId].centsPerPoint / 100 + a.taxesUsd)
  : null);

// One row per way to pay. No Data goes last. Ties go to the shorter flight, then cash, then alphabetically.
const rank = (flights, values = POINT_VALUES) => flights.flatMap(f => [
  { f, label: 'Cash', isCash: true, cost: isPositive(f.cashPriceUsd) ? roundToCents(f.cashPriceUsd) : null },
  ...[f.airlineAward, ...f.cardAwards].map(a => ({
    f, label: values[a.programId].program, isCash: false, cost: awardCost(a, values),
  })),
]).sort((a, b) =>
  (a.cost === null) - (b.cost === null) ||
  a.cost - b.cost ||
  a.f.durationMinutes - b.f.durationMinutes ||
  b.isCash - a.isCash ||
  a.label.localeCompare(b.label));

const withValue = (id, centsPerPoint) =>
  ({ ...POINT_VALUES, [id]: { ...POINT_VALUES[id], centsPerPoint } });

let failed = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
};
const show = row => `${row.f.flightNumber} ${row.label} ${row.cost === null ? 'No Data' : `$${row.cost.toFixed(2)}`}`;

// Searches
const outbound = search('JFK', 'LAX');
check('JFK to LAX returns 7 flights, including the test flight', outbound.length === 7);
check('Reverse direction LAX to JFK returns 6 flights', search('LAX', 'JFK').length === 6);
check('Route not in the data returns nothing', search('JFK', 'MIA').length === 0);
check('Date not in the data returns nothing', search('JFK', 'LAX', '2026-12-11').length === 0);

// Ranking
const ranked = rank(outbound);
console.log('\nTop 5 for JFK to LAX:');
ranked.slice(0, 5).forEach((row, i) => console.log(`  ${i + 1}. ${show(row)}`));
console.log('');
check('JFK to LAX produces 5 options per flight', ranked.length === 35, `${ranked.length} rows`);
const priced = ranked.filter(r => r.cost !== null);
check('Ranking runs lowest to highest', priced.every((r, i) => !i || priced[i - 1].cost <= r.cost));
check('Lowest option is DL 417 with Chase at $230', ranked[0].f.id === 'DL417' && ranked[0].cost === 230, show(ranked[0]));

const b6 = ranked.filter(r => r.f.id === 'B6123' && r.cost === 259);
check('On a tie, cash ranks ahead of points', b6[0].isCash === true, b6.map(r => r.label).join(' > '));
const as1Cards = ranked.filter(r => r.f.id === 'AS1' && r.cost === 299 && !r.isCash).map(r => r.label);
const alphabetical = [...as1Cards].sort((a, b) => a.localeCompare(b));
check('Tied card options sort alphabetically', as1Cards.length === 3 && as1Cards.join() === alphabetical.join(), as1Cards.join(' > '));

// Filters
const chaseOnly = ranked.filter(r => r.label === POINT_VALUES.chase.program);
check('Chase filter returns one option per flight', chaseOnly.length === 7);
const morning = outbound.filter(f => f.departureTime < '12:00');
check('Morning filter returns 3 flights', morning.length === 3);

// Point values
const chaseHigh = rank(outbound, withValue('chase', 1.5));
check('Raising Chase to 1.5 cents changes the top option', chaseHigh[0].f.id !== 'DL417' || chaseHigh[0].label !== POINT_VALUES.chase.program, show(chaseHigh[0]));
const decimal = rank(outbound.filter(f => f.id === 'DL417'), withValue('amex', 1.1)).find(r => r.label === POINT_VALUES.amex.program);
check('Decimal point values round to two decimals', decimal.cost === 317.9, `28,900 points at 1.1 cents = ${decimal.cost}`);

const chaseRows = rows => rows.filter(r => r.label === POINT_VALUES.chase.program);
const zero = rank(outbound, withValue('chase', 0));
check('A value of 0 returns No Data', chaseRows(zero).every(r => r.cost === null) && zero[0].cost > 0, `top option becomes ${show(zero[0])}, Chase shows ${show(chaseRows(zero)[0])}`);
const negative = rank(outbound, withValue('chase', -1));
check('A negative value returns No Data', chaseRows(negative).every(r => r.cost === null) && negative[0].cost > 0, `top option becomes ${show(negative[0])}, Chase shows ${show(chaseRows(negative)[0])}`);

// Missing price
const missing = FLIGHTS.filter(f => f.cashPriceUsd == null || [f.airlineAward, ...f.cardAwards].some(a => a.points == null));
check('Data includes a missing price to test the unavailable state', missing.length === 1 && missing[0].id === 'B6999', missing.map(f => f.flightNumber).join(', '));
const missingCash = ranked.find(r => r.f.id === 'B6999' && r.isCash);
check('A missing price returns No Data', missingCash.cost === null, show(missingCash));
check('A missing price ranks after every priced option', ranked.findIndex(r => r.cost === null) === priced.length, `No Data is row ${priced.length + 1} of ${ranked.length}`);
const missingPoints = ranked.filter(r => r.f.id === 'B6999' && !r.isCash);
check('The flight\'s other options keep their prices', missingPoints.every(r => r.cost > 0), missingPoints.map(show).join(', '));

// Data integrity
const every = (name, fn) => check(name, FLIGHTS.every(fn));
every('Every flight is labeled as mock', f => f.isMock === true);
every('Every flight is Economy', f => f.fareClass === 'Economy');
every('Every flight has airline miles from its own airline', f => POINT_VALUES[f.airlineAward.programId].program.includes(f.airline));
every('Every flight has the same 3 card programs', f => f.cardAwards.map(a => a.programId).join() === 'chase,amex,capitalOne');
every('All prices and points are positive or missing', f => (f.cashPriceUsd == null || f.cashPriceUsd > 0) && [f.airlineAward, ...f.cardAwards].every(a => a.points == null || a.points > 0));
check('Flight IDs are unique', new Set(FLIGHTS.map(f => f.id)).size === FLIGHTS.length);
const overnight = FLIGHTS.filter(f => f.arrivalDayOffset > 0);
check('Next-day arrivals are marked', overnight.every(f => f.arrivalTime < f.departureTime), overnight.map(f => f.flightNumber).join(', '));
every('Every payment option has a booking link', f => [f.airlineAward, ...f.cardAwards].every(a => BOOKING_SITES[a.programId]?.url.startsWith('https://')));

console.log(`\n${failed} checks failed`);

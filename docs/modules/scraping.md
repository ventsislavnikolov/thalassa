# Scraping

`src/domains/scraping/` fetches prices from the hotels' booking engines. Every
scrape hits a live site; the unit tests are network-free.

## Strategies

Each hotel names one strategy in its config (`strategyType`):

- `calendar` (`strategies/calendar.ts`): HTML from reserve-online.net's
  `/calendar`, parsed with Cheerio. One request covers many dates.
- `avl` (`strategies/avl.ts`): JSON from reserve-online.net's `/avl`.
- `hvd` (`strategies/hvd.ts`): the server-rendered search page of
  `reservations.hvdhotels.com`, one stay per request.

`engine.ts` maps each `StrategyType` to a strategy instance and
`scrapeHotels()` runs hotels one at a time (to throttle the live sites), with a
per-hotel timeout of 15 s on Vercel and 30 s locally. One failing hotel adds an
entry to `errors` and the rest still return.

## Adding a strategy

1. Create `strategies/<name>.ts` with a class implementing `ScrapingStrategy`
   from `types.ts`: a `type` and a `fetchPrices({ hotel, searchParams, signal })`
   that returns a `ScrapeResponse` (`prices`, `roomOptions`). Wrap failures in
   `ScrapingError` with the `hotelId` and the original error as `cause`.
2. Add the name to the `StrategyType` union in `src/domains/hotels/types.ts`.
3. Register an instance in the `strategies` record in `engine.ts`.
4. Reuse the parsers: `parsers/html-parser.ts` (`loadHtml`,
   `extractRoomOptions`, `unwrapJsonHtml`) and `parsers/price-parser.ts`
   (`parsePrice`, which normalises US and EU number formats).
5. Test the parsing against sample HTML or JSON in `__tests__/`, as
   `hvd-strategy.test.ts` does, and point at least one hotel at the strategy.

# Hotels

`src/domains/hotels/` holds one config file per hotel and the registry that
every page, API route and the cron read from.

## Files

- `types.ts`: `HotelConfig` and `StrategyType` (`calendar`, `avl`, `hvd`).
- `config/<hotel-slug>.ts`: one default-exported `HotelConfig` per hotel.
- `registry.ts`: imports every config by hand into the `hotels` array.
  `getAllHotels()`, `getAllHotelIds()` and `getHotelsByStrategy()` skip hidden
  hotels; `getHotel(idOrSlug)` finds hidden ones too and throws on an unknown id.
- `booking-url.ts`: the public booking link used in alert emails.

## Adding a hotel

1. Find the booking engine. Most hotels are on `<subdomain>.reserve-online.net`:
   if `/calendar` answers with HTML the strategy is `calendar`, if `/avl`
   answers with JSON it is `avl`. HVD hotels use `hvd` (see
   [scraping](scraping.md)).
2. Make sure the hotel's town exists in `src/domains/locations/config/`; add it
   if not (see [locations](locations.md)).
3. Add an image at `public/images/hotels/<hotel-slug>.<jpg|webp|avif|png>`.
4. Create `config/<hotel-slug>.ts`:

   ```ts
   import type { HotelConfig } from "../types";

   const myHotel: HotelConfig = {
     baseUrl: "https://<subdomain>.reserve-online.net",
     description: "One sentence for the hotel card.", // optional
     displayName: "My Hotel & Spa",
     id: "myhotel", // lowercase, no hyphens
     image: "/images/hotels/my-hotel.jpg",
     locationSlug: "<location-slug>",
     name: "My Hotel",
     slug: "my-hotel",
     strategyType: "avl",
   };

   export default myHotel;
   ```

5. Import it in `registry.ts` and add it to the `hotels` array.
6. To pre-select it in the search form, add its `id` to `DEFAULT_HOTEL_IDS` in
   `src/components/search/search-form.tsx`.
7. Update the counts in `__tests__/registry.test.ts` (visible hotels and the
   per-strategy counts), then run `pnpm test` and `pnpm build`.

Everything else follows from the registry: the homepage and `/hotels` list,
the static `/hotels/<slug>` page (`generateStaticParams`), `GET /api/hotels`
for the search form and watchlist, the scraping engine, and the cron's rolling
window, which starts tracking every visible hotel.

## Optional flags

- `hidden: true` removes the hotel from every list, search and static page;
  direct `getHotel()` lookups still work.
- `excludeFromYearSearch` is declared on the type but nothing reads it.

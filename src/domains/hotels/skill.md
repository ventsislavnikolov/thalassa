# Hotel Domain Skills

## Skill: Add a New Hotel

### When to use

Adding a new hotel from reserve-online.net to the application.

### Prerequisites

- Hotel's reserve-online.net subdomain (e.g., `newhotel.reserve-online.net`)

### Steps

1. **Find the hotel image.**
   Search the web for the hotel name + "hotel" to find an official or high-quality image.
   Download it to `public/images/hotels/<hotel-slug>.jpg`.
   If no suitable image is found, ask the user to provide one.

2. **Resolve the hotel location.**
   Search the web for the hotel name + "location" or "address" to determine the town/area, region, and coordinates.
   Check if the location already exists in `src/domains/locations/config/`.
   - If it exists, note the `slug` for use in step 3.
   - If it doesn't, create it — see `src/domains/locations/skill.md`.
   - If the location cannot be determined from search results, ask the user.

3. **Determine the scraping strategy type.**
   If not provided by the user, ask whether the hotel uses `calendar` or `avl`.
   To help them decide: visit `<subdomain>.reserve-online.net/calendar` (HTML) and `/avl` (JSON API) — whichever responds is the correct type.

4. **Create config file** at `src/domains/hotels/config/<hotel-slug>.ts`:

```typescript
import type { HotelConfig } from "../types";

const myNewHotel: HotelConfig = {
  id: "<hotelid>",                // lowercase, no hyphens (e.g., "mynewhotel")
  slug: "<hotel-slug>",           // lowercase with hyphens (e.g., "my-new-hotel")
  name: "<Hotel Name>",           // official name (e.g., "My New Hotel")
  displayName: "<Display Name>",  // marketing name (e.g., "My New Hotel & Spa")
  baseUrl: "https://<subdomain>.reserve-online.net",
  strategyType: "<calendar|avl>",
  locationSlug: "<location-slug>",  // must match a location in locations/config/
  image: "/images/hotels/<hotel-slug>.jpg",
  // Optional fields:
  // description: "A short description of the hotel",
  // excludeFromYearSearch: true,  // skip in year-long searches
  // hidden: true,                 // hide from all listings, search, and static pages
};

export default myNewHotel;
```

5. **Register in `src/domains/hotels/registry.ts`**:

```typescript
// Add import (alphabetical order)
import myNewHotel from "./config/my-new-hotel";

// Add to the hotels array
const hotels: HotelConfig[] = [
  // ... existing hotels
  myNewHotel,
];
```

6. **Add to default search selection** in `src/components/search/search-form.tsx`:
   Add the hotel's `id` to the `DEFAULT_HOTEL_IDS` array so it's pre-selected in the search form.

7. **Update tests** in `src/domains/hotels/__tests__/registry.test.ts`:
   - Update the expected hotel count in the `"returns all visible hotels"` test
   - Update `getHotelsByStrategy` counts if applicable (calendar or avl)

8. **Run verification**:

```bash
pnpm build   # verify no type errors, check static pages generated
pnpm test    # verify all tests pass
```

### What happens automatically

These are driven by the registry and need no manual changes:

- Homepage and `/hotels` listing page show the hotel via `getAllHotels()`
- Static detail page generated at `/hotels/<slug>` via `generateStaticParams()`
- Search form fetches hotels from `GET /api/hotels`
- Weather location dropdown groups the hotel under its location
- Scraping engine resolves hotel config via `getHotel()` to pick the right strategy

### Hidden hotels

Set `hidden: true` in the hotel config to exclude it from all public surfaces. Hidden hotels are filtered out by `getAllHotels()`, `getAllHotelIds()`, and `getHotelsByStrategy()`. Direct lookups via `getHotel(idOrSlug)` still work. To unhide, remove the `hidden` flag.

### Validation

- [ ] Image exists at `public/images/hotels/<hotel-slug>.jpg`
- [ ] Config file exports a valid `HotelConfig` object
- [ ] Hotel is registered in `registry.ts`
- [ ] Hotel `id` added to `DEFAULT_HOTEL_IDS` in `search-form.tsx` (unless hidden)
- [ ] `locationSlug` matches an existing location
- [ ] `strategyType` is correct — tested by visiting the reserve-online.net endpoints
- [ ] Hotel appears on `/hotels` listing page
- [ ] Hotel detail page renders at `/hotels/<slug>`
- [ ] Hotel appears in weather location dropdown under the correct location
- [ ] Search returns prices for the new hotel
- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)

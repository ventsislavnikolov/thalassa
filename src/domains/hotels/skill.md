# Hotel Domain Skills

## Skill: Add a New Hotel

### When to use

Adding a new hotel from reserve-online.net to the application.

### Prerequisites

- Hotel's reserve-online.net subdomain (e.g., `newhotel.reserve-online.net`)
- Endpoint type: visit `<subdomain>.reserve-online.net/calendar` and `/avl` to determine which works
- Hotel's geographic location must match an existing location in `src/domains/locations/config/`
- If the location does not exist, add it first (see `src/domains/locations/skill.md`)

### Steps

1. **Create config file** at `src/domains/hotels/config/<hotel-slug>.ts`:

```typescript
import type { HotelConfig } from "../types";

const myNewHotel: HotelConfig = {
  id: "<hotelid>",             // lowercase, no hyphens (e.g., "mynewhotel")
  slug: "<hotel-slug>",        // lowercase with hyphens (e.g., "my-new-hotel")
  name: "<Hotel Name>",        // official name (e.g., "My New Hotel")
  displayName: "<Display Name>", // marketing name (e.g., "My New Hotel & Spa")
  baseUrl: "https://<subdomain>.reserve-online.net",
  strategyType: "<calendar|avl>",
  locationSlug: "<location-slug>", // must match a location in locations/config/
  description: "<optional description>",
  excludeFromYearSearch: false,    // optional: set true to skip in year-long searches
};

export default myNewHotel;
```

2. **Register in `src/domains/hotels/registry.ts`**:

```typescript
// Add import at the top (alphabetical order)
import myNewHotel from "./config/my-new-hotel";

// Add to the hotels array
const hotels: HotelConfig[] = [
  // ... existing hotels
  myNewHotel,
];
```

3. **Update the hotel registry test** in `src/domains/hotels/__tests__/registry.test.ts`:
   - Update the expected hotel count
   - Add a test case for the new hotel ID

4. **Run verification**:

```bash
pnpm build   # verify no type errors
pnpm test    # verify all tests pass
```

### Validation

- [ ] Config file exports a valid `HotelConfig` object
- [ ] Hotel is registered in `registry.ts`
- [ ] `locationSlug` matches an existing location
- [ ] `strategyType` is "calendar" or "avl" (tested manually)
- [ ] Hotel appears in `GET /api/hotels` response
- [ ] Hotel detail page renders at `/hotels/<slug>`
- [ ] Search returns prices for the new hotel
- [ ] All tests pass (`pnpm test`)

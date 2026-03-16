# Location Domain Skills

## Skill: Add a New Location

### When to use

Adding a new geographic location for hotels. Required when a new hotel is in a town/area not yet in the system.

### Prerequisites

- Town/area name (e.g., "Pefkochori")

### Steps

1. **Research the location.**
   Search the web for the town/area name + "Greece coordinates" to find:
   - Full name and correct spelling
   - Region (e.g., "Halkidiki", "Central Macedonia")
   - Geographic coordinates (latitude/longitude in decimal degrees)
   If any of these cannot be determined, ask the user.

2. **Find a location image.**
   Search the web for the town/area name + "Greece" to find a representative image (beach, town view, landmark).
   Download it to `public/images/locations/<location-slug>.jpg`.
   If no suitable image is found, ask the user to provide one.

3. **Create config file** at `src/domains/locations/config/<location-slug>.ts`:

```typescript
import type { LocationConfig } from "../types";

const myLocation: LocationConfig = {
  slug: "<location-slug>",         // lowercase with hyphens (e.g., "neos-marmaras")
  name: "<Location Name>",        // display name (e.g., "Neos Marmaras")
  region: "<Region>",             // geographic region (e.g., "Halkidiki")
  country: "Greece",
  coordinates: {
    latitude: 40.05,              // decimal degrees
    longitude: 23.35,
  },
  timezone: "Europe/Athens",
  image: "/images/locations/<location-slug>.jpg",
};

export default myLocation;
```

4. **Register in `src/domains/locations/registry.ts`**:

```typescript
// Add import at the top (alphabetical order)
import myLocation from "./config/my-location";

// Add to the locations array
const locations: LocationConfig[] = [
  // ... existing locations
  myLocation,
];
```

5. **Update the location registry test** in `src/domains/locations/__tests__/registry.test.ts`:
   - Update the expected location count in the "returns all locations" test

6. **Run verification**:

```bash
pnpm test    # verify all tests pass
pnpm build   # verify no type errors
```

### Validation

- [ ] Image exists at `public/images/locations/<location-slug>.jpg`
- [ ] Config file exports a valid `LocationConfig` object
- [ ] Location is registered in `registry.ts`
- [ ] Coordinates are accurate (verified via web search)
- [ ] Timezone is correct for the country
- [ ] Registry test updated with new count
- [ ] All tests pass (`pnpm test`)

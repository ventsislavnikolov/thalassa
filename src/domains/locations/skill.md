# Location Domain Skills

## Skill: Add a New Location

### When to use

Adding a new geographic location for hotels. Required when a new hotel is in a town/area not yet in the system.

### Prerequisites

- Town/area name and region (e.g., "Pefkochori" in "Halkidiki")
- Geographic coordinates (latitude/longitude) - use Google Maps or similar
- Timezone identifier (e.g., "Europe/Athens")

### Steps

1. **Create config file** at `src/domains/locations/config/<location-slug>.ts`:

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
};

export default myLocation;
```

2. **Register in `src/domains/locations/registry.ts`**:

```typescript
// Add import at the top (alphabetical order)
import myLocation from "./config/my-location";

// Add to the locations array
const locations: LocationConfig[] = [
  // ... existing locations
  myLocation,
];
```

3. **Update the location registry test** in `src/domains/locations/__tests__/registry.test.ts`:
   - Update the expected location count in the "returns all locations" test
   - Add a test case for the new location slug:

```typescript
it("gets location by slug", () => {
  const location = getLocation("<location-slug>");
  expect(location.name).toBe("<Location Name>");
  expect(location.coordinates.latitude).toBe(<latitude>);
});
```

4. **Run verification**:

```bash
pnpm test    # verify all tests pass
pnpm build   # verify no type errors
```

### Validation

- [ ] Config file exports a valid `LocationConfig` object
- [ ] Location is registered in `registry.ts`
- [ ] Coordinates are accurate (verify on a map)
- [ ] Timezone is correct for the country
- [ ] Registry test updated with new count and lookup test
- [ ] All tests pass (`pnpm test`)

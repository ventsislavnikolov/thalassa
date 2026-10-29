# Locations

`src/domains/locations/` holds the towns and areas hotels belong to. A hotel's
`locationSlug` must match a location `slug`. Weather is fetched for the
location's coordinates and timezone.

## Adding a location

1. Look up the name, region (e.g. `Halkidiki`, `Burgas`), country and decimal
   coordinates.
2. Add an image at `public/images/locations/<slug>.<jpg|webp|png>`.
3. Create `config/<slug>.ts`:

   ```ts
   import type { LocationConfig } from "../types";

   const myTown: LocationConfig = {
     coordinates: { latitude: 40.05, longitude: 23.35 },
     country: "Greece", // or "Bulgaria"
     image: "/images/locations/my-town.jpg",
     name: "My Town",
     region: "Halkidiki",
     slug: "my-town",
     timezone: "Europe/Athens", // "Europe/Sofia" for Bulgaria
   };

   export default myTown;
   ```

4. Import it in `registry.ts` and add it to the `locations` array.
5. Update the count in `__tests__/registry.test.ts`, then run `pnpm test`.

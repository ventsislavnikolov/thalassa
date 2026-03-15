# UI Components Skills

## Skill: Add a UI Component

### When to use

Adding new display components for the application (cards, tables, widgets, etc.).

### Prerequisites

- Understanding of the component's purpose and data requirements
- Familiarity with the existing component subdirectories and shadcn/ui primitives

### Component directory structure

```
src/components/
  hotels/       # hotel-card, hotel-grid
  layout/       # header, footer, page-container, standard-layout
  results/      # price-stats, price-table, hotel-comparison, monthly-summary, export-button
  search/       # hotel-selector, date-picker, guest-selector, search-options, search-form
  weather/      # beach-score, weather-card, weather-grid, weather-summary
  ui/           # shadcn/ui primitives (button, card, input, select, etc.)
```

### Steps

1. **Choose the correct subdirectory** based on the component's domain:
   - `hotels/` - hotel display and listing components
   - `results/` - price and search result display
   - `search/` - search form inputs and controls
   - `weather/` - weather data display
   - `layout/` - page structure and navigation
   - Create a new subdirectory if the component represents a new concern

2. **Create the component file** at `src/components/<subdirectory>/<component-name>.tsx`:

```tsx
import { cn } from "@/lib/utils";
// Import domain types as needed
import type { SomeDomainType } from "@/domains/<domain>/types";
// Import shadcn/ui primitives as needed
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MyComponentProps {
  data: SomeDomainType;
  className?: string;
}

export function MyComponent({ data, className }: MyComponentProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="font-display">Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
}
```

3. **Follow these patterns**:
   - Use `font-display` class for headings (DM Sans Mediterranean theme)
   - Use `cn()` from `@/lib/utils` for conditional class merging
   - Accept `className` prop for external style overrides
   - Use shadcn/ui primitives from `src/components/ui/` (Button, Card, Badge, etc.)
   - Define a props interface with explicit types
   - Export as a named function component (not default export)
   - Import domain types from `@/domains/<domain>/types`
   - Use Mediterranean theme color tokens: `primary`, `secondary`, `accent`, `muted`

4. **Use the component** in pages under `src/app/`:
   - `(marketing)/` - homepage and marketing pages
   - `hotels/` - hotel listing and detail pages
   - `search/` - search and results pages

5. **Run verification**:

```bash
pnpm build              # verify no type or JSX errors
npx ultracite check     # verify lint compliance
```

### Available shadcn/ui primitives

Located in `src/components/ui/`: badge, button, calendar, card, checkbox, input, label, popover, select, separator, table, tabs, tooltip.

### Validation

- [ ] Component is in the correct subdirectory
- [ ] Uses named export (not default)
- [ ] Props interface is explicitly typed
- [ ] Uses `cn()` for class merging
- [ ] Uses shadcn/ui primitives where appropriate
- [ ] Follows accessibility practices (semantic HTML, ARIA attributes)
- [ ] Build succeeds (`pnpm build`)
- [ ] Lint passes (`npx ultracite check`)

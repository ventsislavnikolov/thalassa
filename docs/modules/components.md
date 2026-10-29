# UI components

`src/components/` is grouped by concern:

- `hotels/`: hotel card and grid.
- `layout/`: header, footer, page container, standard layout.
- `results/`: price table, stats, hotel comparison, monthly summary, CSV export.
- `search/`: search form and its inputs.
- `watchlist/`: watchlist manager, entries, price history chart, trend stats.
- `weather/`: beach score, weather cards and summary.
- `ui/`: shadcn/ui primitives (`components.json`). Add more with
  `pnpm dlx shadcn@latest add <name>`.

## Conventions

- Named function exports with an explicit props interface; no default exports.
- Accept `className` and merge classes with `cn()` from `@/lib/utils`.
- Build on the primitives in `ui/` and the theme tokens in
  `src/app/globals.css` (`primary`, `secondary`, `accent`, `muted`).
- Headings use the `font-display` utility (DM Serif Display); body text uses
  DM Sans. Both are loaded in `src/app/layout.tsx`.
- Domain types come from `@/domains/<domain>/types`.

# Sale Details

Design Expo prototype covering two Backoffice screens:

- **Sales history** — the sale list, with an expandable row that reveals items, note, money breakdown and the next actions.
- **Order details** — a single sale, with per-group fulfillment cards, services, returns, totals and an activity timeline.

Built with React, Vite, Tailwind CSS and `@lightspeed/unified-components-backoffice-theme`.

Published at
<https://ubiquitous-barnacle-777qk5g.pages.github.io/sale-details/>

## Running it

```bash
npm ci
npm run dev     # local dev server
npm run build   # static build into dist/
```

## How it's put together

```
src/
  data/sales.ts        Shared sale records — the single source both screens read
  lib/tone.ts          Status tone -> Unified Components Badge appearance
  lib/salesHistory.ts  Row model: action ordering, fulfillment state, meta cleanup
  lib/orderDetails.ts  Order model: group staging, step application, money breakdown
  components/          App chrome (topbar / rail / panel), avatar, pill, icon
  pages/               The two screens
  App.tsx              Hash routing, theme, toast and fulfillment-step state
```

Both screens render from the same `SALES_DB`, so a sale looks consistent whichever
screen you reach it from.

### Unified Components

Buttons, icon buttons, inputs, links, menus and badges all come from the library.
What stays bespoke is the navigation shell and the two page grids — the library has
no equivalent primitives for those. Every custom rule reads `--ls-color-*` token
variables, so the light/dark toggle needs no per-theme CSS.

### Navigating

`#/order/88` deep-links to a receipt; anything else lands on the list. Clicking a
receipt or customer name opens that sale, and the up/down controls in the order
header step through the list in its display order.

### Prototype scope

Data is fixture-only and state is in-memory. Recording a fulfillment step ("Mark as
shipped", "Mark as packed", "Record customer pickup") updates the view and raises a
toast, but nothing is persisted. Filter chips and tabs are presentational.

# Notes on tradeoffs and assumptions

This project was completed following the design/plan docs under
`docs/superpowers/`. A few things are worth calling out explicitly.

## A real bug found and fixed during final review

Updating an inventory row's warehouse/item, or an item's category, returned
`200` but silently failed to persist the change. Root cause: `Inventory`'s
`warehouse`/`item` relations are `eager: true`, and `Item`'s `category`
relation is loaded explicitly by `findById`. The original `update()` methods
loaded the entity (hydrating the *old* relation object), set the new foreign
key column (`warehouseId`/`itemId`/`categoryId`), then called `.save()`.
TypeORM prefers the still-loaded relation object over the directly-set FK
column when persisting, so the old value silently won.

This was pre-existing behavior in the items module (unchanged since the
starter code) that this work made reachable in practice — `ItemEditorDialog`
replaced a free-text "Category ID" input with a real category picker, so
re-categorizing an item became a one-click action instead of something no UI
exposed. The same pattern was copied into the new inventory module.

Fixed in `apps/backend/src/inventory/inventory.service.ts` and
`apps/backend/src/items/items.service.ts` by using
`repository.update(id, {...})` (a plain partial, no relation object to win)
instead of load-mutate-save.

## Filter key naming: `sku` vs `itemSku`

The README's §4 filter list for `GET /inventory` names `itemSku`, but the
actual test contract (`test/inventory.spec.ts`) filters via `?sku=ilike:...`.
The implementation follows the test (`sku`), since tests are the executable
spec. `itemSku` remains the name of the *response* field (the item's SKU
shown in each row) — it's a different thing from the filter query-param key,
and the two aren't meant to be the same name.

## Dashboard "low stock" grouping includes out-of-stock rows

`GET /dashboard/low-stock-by-category` and `GET /dashboard/low-stock-items`
treat `low_stock` and `out_of_stock` as one combined bucket (reverse-engineered
from `test/dashboard.spec.ts`'s seed-data-derived expected counts — the
Packaging category assertion only works if the endpoint counts both statuses
together). The plain `GET /inventory?status=eq:low_stock` filter stays
exact-match on the single `low_stock` status; this broader grouping is
specific to the two dashboard endpoints. `low-stock-items` orders rows by
severity (`out_of_stock` before `low_stock`, then ascending `quantityOnHand`)
— the test only pins down the first row for a given `limit`, not the full
ordering contract, so this ordering is an inference, not a hard requirement.

## `PaginatedResponse` is a breaking shape change on `/warehouses` and `/items`

Both endpoints changed from returning a bare array to
`{data, page, limit, total, totalPages}`. No other consumer of this API
exists today, so this is safe here, but it's worth flagging as breaking if
this backend were already integrated elsewhere.

## Sidebar grouping is a UX judgment call

"Master Data" (Items, Item Categories, Warehouses) vs "Operations"
(Inventory, Inventory Policy, Dashboard) isn't tested or specified — easy to
reshuffle without touching behavior.

## Known follow-ups not addressed (time-boxed out)

- `GET /warehouses?bogus=x` (an unsupported filter *key*, as opposed to an
  unsupported *operator* or *sort field*) is silently ignored rather than
  returning 400 in the actual test harness config, though the production
  `main.ts` pipe now sets `forbidNonWhitelisted: true` to reject it at runtime.
- `Inventory`'s wire-response type (`InventoryRow`) lives as an interface
  inside `inventory.service.ts` rather than its own `dto/inventory.response.ts`
  file, unlike every other resource. `dashboard.service.ts` imports the type
  from there. Functionally fine, just inconsistent with the rest of the
  codebase's file organization.
- The frontend's pagination footer derives the current page from the
  server's echoed `page` field rather than the local page atom; under
  `keepPreviousData`, double-clicking "Next" before a response lands can
  compute the same next-page number twice. A single click always works
  correctly.
- Filter inputs fire a request on every keystroke (no debounce).

## Environment limitation: Playwright e2e not run

This environment's sandbox blocks the network download Playwright needs for
its own Chromium binary (repeated attempts stalled at a few hundred KB and
never completed). `bun run test:e2e` could not be executed here as a result.

As a substitute, every scenario in `e2e/*.spec.ts` was walked through by hand
against a real Postgres database via browser automation, which is how the
relation-FK bug above, a sort-button accessible-name mismatch
("Code: ascending" vs the required "Code: sorted ascending"), and a missing
Delete button on the Warehouses and Items tables (present in neither the
original starter code nor added by this plan until this pass) were all
caught and fixed.

Recommended before considering this fully done: run `docker compose up -d`
followed by `bun run test:e2e` in a normal (non-sandboxed) environment to get
the automated Playwright confirmation this environment couldn't produce.

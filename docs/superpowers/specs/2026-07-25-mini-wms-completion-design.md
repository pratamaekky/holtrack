# Mini WMS Completion — Design

Date: 2026-07-25
Status: Approved by user, pending implementation plan

## Context

The repo is a Bun monorepo (NestJS/TypeORM/Postgres backend, React/Vite/TanStack
frontend) for a take-home test. Warehouses and Items already have working CRUD.
Six capabilities are missing, all fully pinned down by the README plus the
existing (currently failing) test suites:

- `apps/backend/test/*.spec.ts` — exact API request/response contracts.
- `apps/frontend/src/tests/*.test.tsx` — exact component/hook behavior.
- `e2e/*.spec.ts` — exact user-facing flows and accessible names.

Because the tests already encode the spec at the contract level, this design
focuses on the *shared architecture* decisions the tests don't fully dictate:
how pagination/sorting is generalized on the backend, how derived inventory
status is filtered/paginated correctly, and how the frontend's stubbed
Jotai+React Query table infra should actually work. Everything else (DTO
field lists, validation rules, accessible names) is taken directly from the
tests and just enumerated here for traceability.

## Backend Architecture

### Generic pagination + sort (extends existing filter infra)

`apps/backend/src/common/filter/base-filter.ts` already applies `eq`/`ilike`
operators via `@Operator` decorators read through reflect-metadata. We extend
this, not replace it:

- New `ListQueryRequest` base class (`apps/backend/src/common/query/list-query.request.ts`):
  ```ts
  class ListQueryRequest {
    @Type(() => Number) @IsInt() @Min(1) page: number = 1;
    @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 10;
    @IsOptional() @IsString() sort?: string;
    @IsOptional() @IsIn(["ASC", "DESC"]) order: "ASC" | "DESC" = "DESC";
  }
  ```
  `BaseFilter extends ListQueryRequest`, so every existing/resource filter DTO
  (`WarehouseFilterRequest`, `ItemFilterRequest`, new ones) inherits pagination
  fields with zero controller changes. Because the global `ValidationPipe` runs
  with `transform: true`, invalid `page=0` etc. fails class-validator and
  NestJS returns 400 automatically — covers `query-validation.spec.ts`.

- `FilterQueryBuilder` (`apps/backend/src/common/query/filter-query-builder.ts`)
  gains:
  - `.paginate(page, limit)` → `.skip((page-1)*limit).take(limit)`.
  - `.sort(sortMap: Record<string,string>, field: string | undefined, order, defaultField)`
    → if `field` given and not a key of `sortMap`, throw `BadRequestException`
    (covers "unsupported sort field" 400); else `.orderBy(sortMap[field ?? defaultField], order)`.
  - `.getPaginated(): Promise<{data: T[]; total: number}>` → calls `.getCount()`
    on a clone of the builder *before* select/order/skip/take are applied
    (COUNT ignores order/skip/take but must keep joins+where), then
    `.getMany()` (or `.getRawMany()` for Inventory, see below).

- Each resource module keeps its own `sortMap` next to its filter DTO, e.g.
  `apps/backend/src/warehouses/dto/warehouse-filter.request.ts` exports
  `export const WAREHOUSE_SORT_FIELDS = { code: "warehouse.code", name: "warehouse.name", city: "warehouse.city", status: "warehouse.status", createdAt: "warehouse.createdAt" }`.
  Keeps "resource-specific allowlists stay close to the resource" (README).

- `PaginatedResponse<T>` (`apps/backend/src/common/query/paginated.response.ts`):
  ```ts
  class PaginatedResponse<T> {
    data: T[]; page: number; limit: number; total: number; totalPages: number;
    static from<T>(data: T[], page: number, limit: number, total: number): PaginatedResponse<T>
  }
  ```
  `totalPages = Math.max(1, Math.ceil(total / limit))` — matches
  `warehouses.spec.ts` (`page:1, limit:2, total:1, totalPages:1`).

- `WarehousesController.findAll` / `ItemsController.findAll` change from
  `array.map(Response.from)` to `PaginatedResponse.from(mapped, filter.page, filter.limit, total)`.
  This is a breaking response-shape change for those two endpoints — the
  frontend retrofit (below) accounts for it; no other consumer exists.

### Inventory status: derived, not stored — filterable and paginatable

`quantityOnHand`/`reorderPoint` are stored; `status` is computed from those
plus the single global `InventoryPolicy` row. `inventory.spec.ts` filters by
`status=eq:low_stock` and asserts a correct `total`, so status must be
filterable/countable **in SQL**, not computed after fetch.

**Decision:** a shared helper builds a raw SQL `CASE` expression from the
current policy, reused for selecting, filtering, and counting:

```ts
// apps/backend/src/inventory/inventory-status.sql.ts
export function buildInventoryStatusSql(policy: InventoryPolicy): string {
  // e.g. "CASE WHEN inventory.quantityOnHand <= 0 THEN 'out_of_stock'
  //       WHEN <mode-specific comparison> THEN 'low_stock'
  //       ELSE 'in_stock' END"
}
```

`InventoryService.findAll`:
1. Load the singleton policy.
2. Build the base query with joins (`warehouse`, `item`, `category`) and
   `.addSelect(buildInventoryStatusSql(policy), "status")`.
3. Apply the existing filter DTO (warehouseCode/warehouseName/itemSku/itemName/category
   via the normal `ilike`/`eq` operator path) **plus** a manual `status` filter:
   if `filter.status` is present, `.andWhere(`${statusSql} = :status`, {status: filter.status.slice("eq:".length)})`
   — status only supports `eq` per README, so this is a small dedicated check
   rather than trying to route it through the generic `@Operator` decorator
   machinery (which assumes a real column path).
4. Count via `.getCount()` on the filtered-but-unselected/unordered clone (see
   above), then apply sort + pagination and `.getRawMany()` (raw, because the
   query mixes real columns and a computed expression — mapping to
   `InventoryResponse` happens from the raw row keys).

This same `buildInventoryStatusSql` is reused unchanged by the Dashboard
module (see below) so the low-stock business rule lives in exactly one place,
per the "keep business rules in services or focused helpers" expectation.

**Rejected alternative:** fetch all rows, compute status in JS, filter/paginate
in memory. Simpler code, but `total`/pagination would be wrong for any dataset
larger than one page, and the rule would need re-deriving wherever status is
needed (inventory list, dashboard summary, dashboard low-stock groupings) —
violates DRY on a business rule the spec calls out explicitly ("Updating the
policy changes derived inventory statuses").

### New modules

**Item Categories** (`apps/backend/src/item-categories/`) — entity exists.
Add `item-category.request.ts` (`name` required, trimmed), `item-category.response.ts`,
`item-category-filter.request.ts` (`name` ilike + sort map `{name, createdAt}`),
service (duplicate name → 409, delete blocked by `Item.countBy({categoryId})` → 409),
controller, module. Same shape as `warehouses`.

**Inventory** (`apps/backend/src/inventory/`) — entity exists. Add:
- `inventory.request.ts`: `warehouseId`, `itemId` (both `@IsString @IsNotEmpty`),
  `quantityOnHand`, `reorderPoint` (`@IsInt @Min(0)`).
- `inventory-filter.request.ts`: `warehouseCode`/`warehouseName`/`itemSku`/`itemName`/`category`
  (ilike, joined paths) + `status` (handled manually, see above) + sort map
  covering at least `sku` (→ `item.sku`), `quantityOnHand`, `reorderPoint`, `updatedAt`.
- `inventory.response.ts`: flattens `id, warehouseId, warehouseCode, warehouseName,
  itemId, itemSku, itemName, category, quantityOnHand, reorderPoint, status, updatedAt`
  — explicitly *not* `sku`/`item` (tests assert their absence).
- Service: create/update verify warehouse exists (404) and item exists (404)
  before insert; unique `(warehouseId, itemId)` violation → 409 (catch DB
  unique-constraint error, or pre-check with `findOneBy`); quantities validated
  at the DTO layer (400).

**Inventory Policy** (`apps/backend/src/inventory-policies/`) — entity exists
(`INVENTORY_POLICY_ID = "default"`). Add `inventory-policy.request.ts`
(`lowStockMode: @IsIn(["reorder_point","low_stock_threshold"])`,
`lowStockThreshold: @IsInt @Min(0)`), service (`get()` does
`findOneBy(id) ?? create-and-save default` so the singleton invariant holds
even against an unseeded DB; `update()` validates then upserts), controller
(`GET`/`PUT /inventory-policy`), module.

**Dashboard** (`apps/backend/src/dashboard/`, new) — no entity. Reuses
`buildInventoryStatusSql` against the `Inventory` repository:
- `GET /dashboard/inventory-status-summary` → `{totalRows, inStockRows, lowStockRows, outOfStockRows}`
  via a single grouped-count query.
- `GET /dashboard/low-stock-by-category` → group by `category.name` where
  status = `low_stock`, `[{category, count}]`.
- `GET /dashboard/low-stock-items?limit=N` → rows ordered by severity
  (`out_of_stock` before `low_stock`) then by `quantityOnHand` ascending,
  reusing `InventoryResponse` shape, capped at `limit`.

### Wiring

`app.module.ts` adds `ItemCategoriesModule`, `InventoryModule`,
`InventoryPoliciesModule`, `DashboardModule`. `database/seed.ts` gains a
default policy row insert (parity with `wms-test-app.ts`'s test seeding) so
`db:seed`/`db:reset` produce a ready-to-use policy without relying solely on
the service's defensive default.

## Frontend Architecture

### Shared paginated-resource atoms/hook

Currently stubbed at `apps/frontend/src/shared/state/createPaginatedResourceAtoms.ts`
and `apps/frontend/src/shared/hooks/pagination/usePaginatedResourceAtoms.ts`.
`WmsArchitecture.test.tsx` fully specifies the target contract, so this is
implementation of an already-agreed API, not new design:

- `createPaginatedResourceAtoms<TEntity, TFilters, TSort>({endpoint, filterDefinitions, initialFilters, initialSort})`
  returns a bag of Jotai atoms — `page`, `limit` (default 5), `sort`, `order`
  (default `"DESC"`), `filters` — scoped to one feature. This is the "shared
  feature/query state" the README asks for (state shared across
  sibling components within a feature, e.g. filter panel + table + pagination
  footer).
- `usePaginatedResourceAtoms(atoms)`:
  - Reads/writes the atoms via `useAtom`.
  - Builds the query string: `page`, `limit`, `sort`, `order` always present,
    plus each active filter encoded per its `filterDefinitions[].operator`
    (`ilike`/`eq`) — extending the existing `buildFilterQuery` helper to take
    an explicit operator-per-key map instead of the current blanket
    `exactKeys` list, so it can be driven by `filterDefinitions`.
  - Fetches via TanStack `useQuery({queryKey: [endpoint, queryString], queryFn: () => apiService.get(...)})`
    with `placeholderData: keepPreviousData` — gives loading/error/retry for
    free and avoids blanking the table on page/sort/filter changes (the
    "avoid layout jumps during loading" requirement).
  - `setPage(page)` → writes `page` atom.
  - `toggleSort(field)` → same field: flip `order`; different field: set
    `sort = field`, `order = "ASC"` (matches `WmsArchitecture.test.tsx`'s
    `toggleSort("name")` expectation from an initial `createdAt`/`DESC` state).
  - `updateFilter({key, value})` → merges into `filters` atom **and resets
    `page` to 1** (explicitly tested in `ItemsTable.test.tsx`/`WarehousesTable.test.tsx`).
  - Returns `{data, error, loading, setPage, toggleSort, updateFilter}` —
    the exact shape the current stub already declares.

- Small shared presentational pieces extracted so all four tables reuse them
  instead of copy-pasting JSX: a sortable column-header button
  (`"<Field>: not sorted" / "asc" / "desc"` accessible name pattern, per
  `ItemsTable.test.tsx`), a pagination footer (`Prev`/`Next` + `"Page X of Y"`),
  and a filter-toggle panel (`Filter` button revealing inputs, per
  `e2e/items.spec.ts` clicking `Filter` before typing). These live in
  `apps/frontend/src/shared/components/table/` since they're genuinely used
  by 4+ resources — per the README's "use shared code only for behavior
  genuinely shared by multiple resources."

- Option-loader hooks (`useItemCategoryOptions`, `useInventoryOptions`) stay
  **separate** from the atoms factory — they're one-shot dropdown-population
  queries (no shared page/sort/filter state needed across components), built
  on a plain `useQuery` with `enabled` passed through, matching the simpler
  shape `WmsArchitecture.test.tsx` calls them with.

### Feature retrofits and additions

- `WarehousesTable` / `ItemsTable`: replace the current manual
  `useState`+`useEffect` fetch with `usePaginatedResourceAtoms`; add the
  filter-toggle button, sortable headers, and prev/next pagination footer
  that don't exist today.
- New **Item Categories** feature: list + create/edit dialog (reusing
  `useSaveResource`/`useDeleteResource`/`DeleteResourceDialog` patterns
  already in `shared/`) + delete-blocked-by-usage error surfaced via the
  existing `ApiError` → toast path.
- New **Inventory** feature: table with warehouse/item comboboxes (via
  `useInventoryOptions`) for create/edit, status badge (`formatStatus`
  already handles the `snake_case` → `Title Case` mapping), delete dialog
  with accessible name `Delete {warehouseCode} / {itemSku}` and edit button
  `Edit {warehouseCode} {itemSku}` (per `e2e/inventory.spec.ts`).
- New **Inventory Policy** feature: single-record form (mode `combobox` +
  conditional threshold `spinbutton`, shown only in `low_stock_threshold`
  mode per `InventoryPolicyPage.test.tsx`) + `Save` button + `"Inventory
  policy saved."` toast. `GET` on mount, `PUT` via a small dedicated mutation
  hook (not the generic `useSaveResource`, since there's no id-based
  create/update branching — it's always a `PUT` to a fixed endpoint).
- **Dashboard**: replace the placeholder with summary count cards (`"Inventory
  rows"` etc.), a low-stock-by-category grouping, and a low-stock items table
  — three parallel `useQuery` calls against the three dashboard endpoints.
- New routes `/item-categories`, `/inventory`, `/inventory-policy` (TanStack
  Router file-based, matching the existing `items.tsx`/`warehouses.tsx`
  pattern) + sidebar entries in `apps/frontend/src/app/routes/__root.tsx`
  (extending `navigationSections`, likely a second "Operations" section
  alongside the existing "Master Data" one for Inventory/Inventory
  Policy/Dashboard).

## Data Flow / Error Handling

No changes needed to `apiService.ts` — its `ApiError` (status + joined
validation message) already covers every error shape the backend will
produce (400 validation, 404 not found, 409 conflict). Loading/error/retry
for lists is now handled uniformly by `usePaginatedResourceAtoms` via
TanStack Query instead of each table hand-rolling its own state.

## Testing / Verification Plan

Implementation proceeds backend-first, then frontend (per user's chosen
ordering), verifying incrementally rather than only at the very end:

1. After each backend module: run its specific spec file, then
   `bun --filter @mini-wms/backend test` for the whole backend suite.
2. After the shared pagination/sort infra: `query-validation.spec.ts` should
   pass along with the retrofitted `warehouses.spec.ts`/`items-and-categories.spec.ts`.
3. After the frontend shared atoms/hook: `WmsArchitecture.test.tsx`.
4. After each frontend feature: its specific `.test.tsx`.
5. `bun run lint` before considering any module done.
6. `bun run test:e2e` last, since it resets the database and runs the full
   Playwright suite sequentially against it.

## Open Assumptions / Tradeoffs (for the deliverable notes)

- Dashboard's "severity order" for `low-stock-items` is inferred as
  `out_of_stock` before `low_stock`, then ascending `quantityOnHand` — the
  test only pins down the first row for `limit=2`, not a full ordering
  contract.
- Sidebar grouping ("Operations" vs "Master Data") is a UX judgment call, not
  tested; easy to reshuffle without touching behavior.
- `WarehousesController`/`ItemsController` response shape changes from a bare
  array to `PaginatedResponse` — no other backend consumer exists today, so
  this is safe, but worth calling out as a breaking change if this API were
  already integrated elsewhere.

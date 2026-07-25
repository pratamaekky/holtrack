# Mini WMS Take-Home Test

## Domain Knowledge
A warehouse management system helps a company track where goods are stored and how much stock is
available in each location.

- Warehouse: a physical storage location, such as a fulfillment center or branch warehouse.
- Item: a product or material that can be stocked. The SKU is the item's unique code.
- Category: master data used to group items, such as packaging, hardware, or apparel.
- Inventory: the physical stock of an item at a specific warehouse. An item defines what the product
  is, while inventory records where that item exists and how many units are currently there.
- `quantityOnHand`: the current physical quantity available in the warehouse.
- `reorderPoint`: the row-level threshold used to decide whether inventory is low stock.
- Inventory policy: one global setting that decides how low stock should be calculated.
- Dashboard: a read-only summary that helps users see inventory health, especially low-stock and
  out-of-stock situations.

## Starting Point
This repository contains a small warehouse management app:

- Backend: NestJS, TypeORM, Postgres.
- Frontend: React, Vite, TanStack Router.
- UI: shadcn/Radix primitives.
- Existing baseline resources: warehouses and items.

Warehouses and items have simple CRUD behavior already. Several important capabilities are
intentionally missing. Some tests fail at the start; they describe the expected finished behavior.

## What To Build
The goal is to complete this mini warehouse management system (WMS).
Check mini-wms-demo.mp4 for behavior and visual reference.

### 1. Item Categories
Add item category CRUD.

Expected behavior:

- Create, list, update, and delete item categories.
- Category names are required.
- Category names cannot be duplicated.
- Categories used by existing items cannot be deleted.
- Items should use category master data, not free-text category names.

### 2. Inventory
Add inventory CRUD.

Expected behavior:

- Create, list, update, and delete inventory rows.
- Each inventory row belongs to one warehouse and one item.
- The same item cannot be duplicated in the same warehouse.
- `quantityOnHand` must be zero or greater.
- `reorderPoint` must be zero or greater.
- Inventory list rows should include useful display fields such as warehouse code/name, item SKU/name,
  and category name.
- Inventory status must be derived by the backend, not stored as an editable column.

### 3. Inventory Policy
Add one global inventory policy.
The policy shape is:

- `lowStockMode`: `reorder_point | low_stock_threshold`
- `lowStockThreshold`: number

Expected behavior:

- The app always works with exactly one policy.
- The policy can be read and updated.
- Updating the policy changes derived inventory statuses.

Inventory status rules:

- `quantityOnHand <= 0` -> `out_of_stock`
- `lowStockMode === "reorder_point"` and `quantityOnHand <= reorderPoint` -> `low_stock`
- `lowStockMode === "low_stock_threshold"` and `quantityOnHand <= lowStockThreshold` -> `low_stock`
- otherwise -> `in_stock`

### 4. Backend Pagination And Sorting

Filtering is already started in the baseline. Add reusable backend pagination and sorting on top of
that list-query behavior.

Expected behavior:

- List endpoints support `page`, `limit`, `sort`, and `order`.
- List endpoints return a consistent paginated response shape.
- Filters support simple operator syntax such as `eq:value` and `ilike:value`.
- Unsupported filters, operators, sort fields, or invalid pagination values should return `400`.
- Resource-specific allowlists should stay close to the resource.

Apply this to:

- `GET /warehouses`
- `GET /items`
- `GET /item-categories`
- `GET /inventory`

Expected filters:

- Warehouses: `code`, `name`, `city`, `status`
- Items: `sku`, `name`, `category`, `status`
- Item categories: `name`
- Inventory: `warehouseCode`, `warehouseName`, `itemSku`, `itemName`, `category`, `status`

Use `ilike` for text search fields and `eq` for enum/exact-match fields such as `status`.

### 5. Frontend Tables And Query State

Add reusable frontend table/query behavior.

Expected behavior:

- Resource pages support pagination, sorting, filtering, loading states, error states, and retry.
- Sorting should be driven by table/page state, not hardcoded per request.
- Filter changes should reset the page.
- The table should avoid layout jumps during loading.
- Shared table/query behavior should be reusable across warehouses, items, categories, and inventory.
- Use Jotai for shared feature/query state where multiple components need the same state.
- Use TanStack React Query for server writes.

### 6. Dashboard

Build the dashboard from the inventory data.

Expected behavior:

- Show inventory summary counts.
- Show low-stock inventory rows.
- Show low-stock grouping by category.

## Expectations

We will evaluate how the code is organized, not just whether the UI works.

Backend expectations:
- Keep request and response DTOs explicit.
- Keep business rules in services or focused helpers.
- Keep reusable pagination and sorting code generic.

Frontend expectations:
- Keep route files thin.
- Keep feature-owned components, hooks, state, types, and utilities inside the feature folder.
- Use shared code only for behavior that is genuinely shared by multiple resources.
- Avoid deeply nested prop drilling. Use atoms for state shared across sibling components. 

Do not delete behavior coverage just to make tests pass. Remember clean code and SOLID principles. 

## Deliverable

Return the completed project as a zip.

Please include:
- Your updated source code.
- Any notes about tradeoffs or assumptions, if any.

## Setup

Prerequisites:
- Bun
- Docker

Install dependencies:

```bash
bun install
```

Start Postgres:

```bash
docker compose up -d
```

The backend is wired to the Docker Postgres published at
`postgres://postgres:postgres@127.0.0.1:5432/mini_wms`.

Seed deterministic local data:

```bash
bun --filter @mini-wms/backend db:seed
```

Run the apps:

```bash
bun --filter @mini-wms/backend dev
bun --filter @mini-wms/frontend dev
```

Backend: `http://localhost:4000`

Frontend: `http://localhost:5173`

## Reset Local Data

```bash
bun --filter @mini-wms/backend db:reset
```

To fully recreate the Docker database volume:

```bash
docker compose down -v
docker compose up -d
bun --filter @mini-wms/backend db:seed
```

## Test

```bash
bun run lint
bun run test:backend
bun run test:frontend
bun run test:e2e
```

### E2E tests

```bash
bun run test:e2e
```

The command resets the database schema to a known seed state before launching the browser suite, so
any local data you have will be wiped. Tests run sequentially against the same database, so running
a single spec file also requires a clean database:

```bash
bun --filter @mini-wms/backend db:reset && playwright test e2e/warehouses.spec.ts
```

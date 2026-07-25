# Mini WMS Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Mini WMS take-home test — item categories, inventory, inventory policy, backend pagination/sorting, frontend reusable tables, and the dashboard — so every existing (currently failing) test in `apps/backend/test/*.spec.ts`, `apps/frontend/src/tests/*.test.tsx`, and `e2e/*.spec.ts` passes.

**Architecture:** Backend-first, frontend-second. Backend: extend the existing `BaseFilter`/`FilterQueryBuilder` infra with generic pagination+sort, add three new modules (item-categories, inventory-policies, inventory) plus a read-only dashboard module, all reusing one shared SQL expression for derived inventory status. Frontend: implement the currently-stubbed Jotai+TanStack-Query paginated-table infra, retrofit the two existing tables onto it, then build the three new features and the dashboard on top of the same shared pieces.

**Tech Stack:** NestJS 11 / TypeORM 0.3 / class-validator / Postgres (sql.js in tests) for backend. React 19 / Vite / TanStack Router+Query / Jotai / shadcn (base-ui) for frontend. Bun workspaces, Biome for lint/format, Jest (backend) + Vitest (frontend) + Playwright (e2e).

## Global Constraints

- Formatting: tabs, double quotes, 100-char lines (`biome.json`) — run `bun run lint` and fix before committing.
- Every list endpoint (`GET /warehouses`, `/items`, `/item-categories`, `/inventory`) must accept `page`, `limit`, `sort`, `order` and return `{data, page, limit, total, totalPages}`.
- Unsupported filters/operators/sort fields/invalid pagination → `400`.
- Inventory `status` is derived (`out_of_stock` if `quantityOnHand <= 0`; else `low_stock` per the active policy mode; else `in_stock`) — never a stored, editable column.
- Backend keeps request/response DTOs explicit; business rules live in services/helpers, not controllers.
- Frontend: route files stay thin; feature-owned code (components/hooks/state/types/utils) stays inside its feature folder; shared code only for behavior genuinely used by 4 resources; use Jotai for shared feature/query state, TanStack Query for reads and writes.
- Do not run `git push`. Commit after each task with `git add <files> && git commit -m "..."`.
- Never introduce SQL injection: only inline the `InventoryPolicy.lowStockThreshold` integer (already validated `@IsInt`) into raw SQL; every other value must go through TypeORM parameter binding (`:name`).

---

## Task 1: Generic pagination/sort infra + retrofit Warehouses

**Files:**
- Create: `apps/backend/src/common/query/list-query.request.ts`
- Create: `apps/backend/src/common/query/paginated.response.ts`
- Modify: `apps/backend/src/common/filter/base-filter.ts`
- Modify: `apps/backend/src/common/query/filter-query-builder.ts`
- Modify: `apps/backend/src/warehouses/dto/warehouse-filter.request.ts`
- Modify: `apps/backend/src/warehouses/warehouses.service.ts`
- Modify: `apps/backend/src/warehouses/warehouses.controller.ts`
- Test: `apps/backend/test/warehouses.spec.ts` (existing, unmodified), `apps/backend/test/query-validation.spec.ts` (existing — only the `page=0` case is reachable this task)

**Interfaces:**
- Produces: `ListQueryRequest` (abstract class: `page: number`, `limit: number`, `sort?: string`, `order: "ASC"|"DESC"`, all defaulted and validated). `PaginatedResponse<T>` (class with static `from(data: T[], page: number, limit: number, total: number): PaginatedResponse<T>`, computing `totalPages = Math.max(1, Math.ceil(total/limit))`). `BaseFilter` now `extends ListQueryRequest`. `FilterQueryBuilder<T>.getPaginated(query: ListQueryRequest, sortMap: Record<string,string>, defaultSortField: string): Promise<{data: T[]; total: number}>` and `.getRawPaginated(...): Promise<{data: Record<string, unknown>[]; total: number}>` (same signature, uses `getRawMany`). Both throw `BadRequestException` if `query.sort` is set but not a key of `sortMap`.
- Consumes: nothing (first task).

- [ ] **Step 1: Run the existing tests to see today's failures**

Run: `bun --filter @mini-wms/backend test -- warehouses.spec.ts query-validation.spec.ts`
Expected: `warehouses.spec.ts`'s "paginates, filters, and sorts warehouses" fails (response body has no `page`/`limit`/`total`/`totalPages`, and no filter results plausible). `query-validation.spec.ts`'s "rejects unsupported sort fields" and "rejects unsupported filter operators" fail (routes don't validate sort/limit at all yet — `page=0` may or may not already 400 depending on current DTO, but there is no `page` field on `WarehouseFilterRequest` today so it's ignored, not validated).

- [ ] **Step 2: Add `ListQueryRequest`**

```ts
// apps/backend/src/common/query/list-query.request.ts
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export type SortOrder = "ASC" | "DESC";

export abstract class ListQueryRequest {
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page: number = 1;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit: number = 10;

	@IsOptional()
	@IsString()
	sort?: string;

	@IsOptional()
	@IsIn(["ASC", "DESC"])
	order: SortOrder = "DESC";
}
```

- [ ] **Step 3: Add `PaginatedResponse`**

```ts
// apps/backend/src/common/query/paginated.response.ts
export class PaginatedResponse<T> {
	data!: T[];
	page!: number;
	limit!: number;
	total!: number;
	totalPages!: number;

	static from<T>(data: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
		const response = new PaginatedResponse<T>();
		response.data = data;
		response.page = page;
		response.limit = limit;
		response.total = total;
		response.totalPages = Math.max(1, Math.ceil(total / limit));
		return response;
	}
}
```

- [ ] **Step 4: Make `BaseFilter` extend `ListQueryRequest`**

In `apps/backend/src/common/filter/base-filter.ts`, add the import and change the class declaration:

```ts
import { BadRequestException } from "@nestjs/common";
import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { ListQueryRequest } from "../query/list-query.request";
import { FilterOperator } from "./filter-operator";
import { getFilterOperators } from "./operator.decorator";

export abstract class BaseFilter extends ListQueryRequest {
	applyTo<T extends ObjectLiteral>(queryBuilder: SelectQueryBuilder<T>): void {
		// ...unchanged body...
	}
}
```

(Leave the rest of the file — `applyTo`, `parseFilterValue`, `applyDefaultFilter` — exactly as-is.)

- [ ] **Step 5: Add pagination/sort to `FilterQueryBuilder`**

Replace the full contents of `apps/backend/src/common/query/filter-query-builder.ts`:

```ts
import { BadRequestException } from "@nestjs/common";
import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import type { BaseFilter } from "../filter";
import type { ListQueryRequest } from "./list-query.request";

export class FilterQueryBuilder<T extends ObjectLiteral> {
	constructor(private readonly queryBuilder: SelectQueryBuilder<T>) {}

	applyFilter(filter: BaseFilter): this {
		filter.applyTo(this.queryBuilder);
		return this;
	}

	async getPaginated(
		query: ListQueryRequest,
		sortMap: Record<string, string>,
		defaultSortField: string,
	): Promise<{ data: T[]; total: number }> {
		const total = await this.queryBuilder.clone().getCount();
		this.applySort(query, sortMap, defaultSortField).applyPagination(query);

		return { data: await this.queryBuilder.getMany(), total };
	}

	async getRawPaginated(
		query: ListQueryRequest,
		sortMap: Record<string, string>,
		defaultSortField: string,
	): Promise<{ data: Record<string, unknown>[]; total: number }> {
		const total = await this.queryBuilder.clone().getCount();
		this.applySort(query, sortMap, defaultSortField).applyPagination(query);

		return { data: await this.queryBuilder.getRawMany(), total };
	}

	private applySort(
		query: ListQueryRequest,
		sortMap: Record<string, string>,
		defaultSortField: string,
	): this {
		const field = query.sort ?? defaultSortField;
		const path = sortMap[field];

		if (!path) {
			throw new BadRequestException(`Unsupported sort field '${field}'`);
		}

		this.queryBuilder.orderBy(path, query.order);
		return this;
	}

	private applyPagination(query: ListQueryRequest): this {
		this.queryBuilder.skip((query.page - 1) * query.limit).take(query.limit);
		return this;
	}
}
```

- [ ] **Step 6: Add the warehouse sort map**

In `apps/backend/src/warehouses/dto/warehouse-filter.request.ts`, add above the class (keep everything else unchanged):

```ts
export const WAREHOUSE_SORT_FIELDS: Record<string, string> = {
	code: "warehouse.code",
	name: "warehouse.name",
	city: "warehouse.city",
	status: "warehouse.status",
	createdAt: "warehouse.createdAt",
};
```

- [ ] **Step 7: Retrofit `WarehousesService.findAll`**

In `apps/backend/src/warehouses/warehouses.service.ts`, add the import `import { WAREHOUSE_SORT_FIELDS } from "./dto/warehouse-filter.request";` and replace `findAll`:

```ts
findAll(filter: WarehouseFilterRequest): Promise<{ data: Warehouse[]; total: number }> {
	const queryBuilder = this.warehouseRepository.createQueryBuilder("warehouse");

	return new FilterQueryBuilder(queryBuilder)
		.applyFilter(filter)
		.getPaginated(filter, WAREHOUSE_SORT_FIELDS, "createdAt");
}
```

- [ ] **Step 8: Retrofit `WarehousesController.findAll`**

In `apps/backend/src/warehouses/warehouses.controller.ts`, add `import { PaginatedResponse } from "../common/query/paginated.response";` and replace:

```ts
@Get()
async findAll(@Query() filter: WarehouseFilterRequest) {
	const { data, total } = await this.warehousesService.findAll(filter);
	return PaginatedResponse.from(data.map(WarehouseResponse.from), filter.page, filter.limit, total);
}
```

- [ ] **Step 9: Run the tests again**

Run: `bun --filter @mini-wms/backend test -- warehouses.spec.ts query-validation.spec.ts`
Expected: `warehouses.spec.ts` PASSES. In `query-validation.spec.ts`, "rejects invalid pagination params" (`GET /warehouses?page=0`) now PASSES (400 from `@Min(1)`); the other two cases in that file still fail (items/inventory not retrofitted yet) — that's expected at this point.

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/common apps/backend/src/warehouses
git commit -m "feat(backend): add generic pagination/sort infra, retrofit warehouses"
```

---

## Task 2: Retrofit Items onto the same infra

**Files:**
- Modify: `apps/backend/src/items/dto/item-filter.request.ts`
- Modify: `apps/backend/src/items/items.service.ts`
- Modify: `apps/backend/src/items/items.controller.ts`
- Test: `apps/backend/test/items-and-categories.spec.ts` (existing — only the "paginates, filters, and sorts items" case is reachable this task), `apps/backend/test/query-validation.spec.ts` (existing)

**Interfaces:**
- Consumes: `FilterQueryBuilder.getPaginated` and `PaginatedResponse.from` from Task 1 (same signatures).
- Produces: `ITEM_SORT_FIELDS` (exported from `item-filter.request.ts`) for reference, though no later task needs it directly.

- [ ] **Step 1: Run the existing tests to see today's failures**

Run: `bun --filter @mini-wms/backend test -- items-and-categories.spec.ts query-validation.spec.ts`
Expected: "paginates, filters, and sorts items" fails (no `total` on response body). "rejects unsupported sort fields" (`GET /items?sort=unsupported`) fails (no validation yet).

- [ ] **Step 2: Add the item sort map**

In `apps/backend/src/items/dto/item-filter.request.ts`, add above the class:

```ts
export const ITEM_SORT_FIELDS: Record<string, string> = {
	sku: "item.sku",
	name: "item.name",
	category: "category.name",
	status: "item.status",
	createdAt: "item.createdAt",
};
```

- [ ] **Step 3: Retrofit `ItemsService.findAll`**

In `apps/backend/src/items/items.service.ts`, add `import { ITEM_SORT_FIELDS } from "./dto/item-filter.request";` and replace `findAll`:

```ts
findAll(filter: ItemFilterRequest): Promise<{ data: Item[]; total: number }> {
	const queryBuilder = this.itemRepository
		.createQueryBuilder("item")
		.leftJoinAndSelect("item.category", "category");

	return new FilterQueryBuilder(queryBuilder)
		.applyFilter(filter)
		.getPaginated(filter, ITEM_SORT_FIELDS, "createdAt");
}
```

- [ ] **Step 4: Retrofit `ItemsController.findAll`**

In `apps/backend/src/items/items.controller.ts`, add `import { PaginatedResponse } from "../common/query/paginated.response";` and replace:

```ts
@Get()
async findAll(@Query() filter: ItemFilterRequest) {
	const { data, total } = await this.itemsService.findAll(filter);
	return PaginatedResponse.from(data.map(ItemResponse.from), filter.page, filter.limit, total);
}
```

- [ ] **Step 5: Run the tests again**

Run: `bun --filter @mini-wms/backend test -- items-and-categories.spec.ts query-validation.spec.ts`
Expected: "paginates, filters, and sorts items" PASSES. "rejects unsupported sort fields" PASSES. (Other cases in `items-and-categories.spec.ts` still fail — item-categories module doesn't exist yet.)

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/items
git commit -m "feat(backend): retrofit items list with pagination/sort"
```

---

## Task 3: Item Categories module

**Files:**
- Create: `apps/backend/src/item-categories/dto/item-category.request.ts`
- Create: `apps/backend/src/item-categories/dto/item-category-filter.request.ts`
- Create: `apps/backend/src/item-categories/dto/item-category.response.ts`
- Create: `apps/backend/src/item-categories/item-categories.service.ts`
- Create: `apps/backend/src/item-categories/item-categories.controller.ts`
- Create: `apps/backend/src/item-categories/item-categories.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Test: `apps/backend/test/items-and-categories.spec.ts` (existing, full file now reachable)

**Interfaces:**
- Consumes: `FilterQueryBuilder`, `PaginatedResponse` (Task 1). `ItemCategory` entity (already exists at `apps/backend/src/item-categories/item-category.entity.ts`, unchanged: `{id, name, createdAt, updatedAt}`).
- Produces: `ItemCategoriesModule` (exports nothing beyond its controller — no other module needs `ItemCategoriesService`).

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/backend test -- items-and-categories.spec.ts`
Expected: every category-related case fails with 404 (route doesn't exist).

- [ ] **Step 2: Add the request/filter/response DTOs**

```ts
// apps/backend/src/item-categories/dto/item-category.request.ts
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ItemCategoryRequest {
	@IsString()
	@IsNotEmpty()
	@MaxLength(80)
	name!: string;
}
```

```ts
// apps/backend/src/item-categories/dto/item-category-filter.request.ts
import { IsOptional, IsString } from "class-validator";
import { BaseFilter, FilterOperator, Operator } from "../../common/filter";

export const ITEM_CATEGORY_SORT_FIELDS: Record<string, string> = {
	name: "itemCategory.name",
	createdAt: "itemCategory.createdAt",
};

export class ItemCategoryFilterRequest extends BaseFilter {
	@Operator(FilterOperator.ILIKE, { path: "itemCategory.name" })
	@IsOptional()
	@IsString()
	name?: string;
}
```

```ts
// apps/backend/src/item-categories/dto/item-category.response.ts
import type { ItemCategory } from "../item-category.entity";

export class ItemCategoryResponse {
	id!: string;
	name!: string;
	createdAt!: Date;

	static from(category: ItemCategory): ItemCategoryResponse {
		const response = new ItemCategoryResponse();
		response.id = category.id;
		response.name = category.name;
		response.createdAt = category.createdAt;
		return response;
	}
}
```

- [ ] **Step 3: Add the service**

```ts
// apps/backend/src/item-categories/item-categories.service.ts
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { FilterQueryBuilder } from "../common/query/filter-query-builder";
import { Item } from "../items/item.entity";
import {
	ITEM_CATEGORY_SORT_FIELDS,
	type ItemCategoryFilterRequest,
} from "./dto/item-category-filter.request";
import type { ItemCategoryRequest } from "./dto/item-category.request";
import { ItemCategory } from "./item-category.entity";

@Injectable()
export class ItemCategoriesService {
	constructor(
		@InjectRepository(ItemCategory) private readonly categoryRepository: Repository<ItemCategory>,
		@InjectRepository(Item) private readonly itemRepository: Repository<Item>,
	) {}

	findAll(filter: ItemCategoryFilterRequest): Promise<{ data: ItemCategory[]; total: number }> {
		const queryBuilder = this.categoryRepository.createQueryBuilder("itemCategory");

		return new FilterQueryBuilder(queryBuilder)
			.applyFilter(filter)
			.getPaginated(filter, ITEM_CATEGORY_SORT_FIELDS, "createdAt");
	}

	async findById(id: string): Promise<ItemCategory> {
		const category = await this.categoryRepository.findOneBy({ id });

		if (!category) {
			throw new NotFoundException(`Item category '${id}' not found`);
		}

		return category;
	}

	async create(request: ItemCategoryRequest): Promise<ItemCategory> {
		const name = request.name.trim();
		await this.assertNameAvailable(name);

		return this.categoryRepository.save(this.categoryRepository.create({ name }));
	}

	async update(id: string, request: ItemCategoryRequest): Promise<ItemCategory> {
		const category = await this.findById(id);
		const name = request.name.trim();
		await this.assertNameAvailable(name, id);

		category.name = name;
		return this.categoryRepository.save(category);
	}

	async remove(id: string): Promise<void> {
		await this.findById(id);

		const itemCount = await this.itemRepository.countBy({ categoryId: id });
		if (itemCount > 0) {
			throw new ConflictException("Item category cannot be deleted while items reference it");
		}

		await this.categoryRepository.delete(id);
	}

	private async assertNameAvailable(name: string, currentId?: string) {
		const where = currentId ? { name, id: Not(currentId) } : { name };
		const existingCategory = await this.categoryRepository.findOneBy(where);

		if (existingCategory) {
			throw new ConflictException(`Item category '${name}' is already in use`);
		}
	}
}
```

- [ ] **Step 4: Add the controller**

```ts
// apps/backend/src/item-categories/item-categories.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PaginatedResponse } from "../common/query/paginated.response";
import { ItemCategoryFilterRequest } from "./dto/item-category-filter.request";
import { ItemCategoryRequest } from "./dto/item-category.request";
import { ItemCategoryResponse } from "./dto/item-category.response";
import { ItemCategoriesService } from "./item-categories.service";

@Controller("item-categories")
export class ItemCategoriesController {
	constructor(private readonly itemCategoriesService: ItemCategoriesService) {}

	@Get()
	async findAll(@Query() filter: ItemCategoryFilterRequest) {
		const { data, total } = await this.itemCategoriesService.findAll(filter);
		return PaginatedResponse.from(
			data.map(ItemCategoryResponse.from),
			filter.page,
			filter.limit,
			total,
		);
	}

	@Get(":id")
	async findById(@Param("id") id: string) {
		return ItemCategoryResponse.from(await this.itemCategoriesService.findById(id));
	}

	@Post()
	async create(@Body() request: ItemCategoryRequest) {
		return ItemCategoryResponse.from(await this.itemCategoriesService.create(request));
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() request: ItemCategoryRequest) {
		return ItemCategoryResponse.from(await this.itemCategoriesService.update(id, request));
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		await this.itemCategoriesService.remove(id);
		return { ok: true };
	}
}
```

- [ ] **Step 5: Add the module and wire it into `app.module.ts`**

```ts
// apps/backend/src/item-categories/item-categories.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Item } from "../items/item.entity";
import { ItemCategory } from "./item-category.entity";
import { ItemCategoriesController } from "./item-categories.controller";
import { ItemCategoriesService } from "./item-categories.service";

@Module({
	imports: [TypeOrmModule.forFeature([ItemCategory, Item])],
	controllers: [ItemCategoriesController],
	providers: [ItemCategoriesService],
})
export class ItemCategoriesModule {}
```

```ts
// apps/backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ItemCategoriesModule } from "./item-categories/item-categories.module";
import { ItemsModule } from "./items/items.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
	imports: [DatabaseModule, WarehousesModule, ItemsModule, ItemCategoriesModule],
})
export class AppModule {}
```

- [ ] **Step 6: Run the test again**

Run: `bun --filter @mini-wms/backend test -- items-and-categories.spec.ts`
Expected: entire file PASSES.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/item-categories apps/backend/src/app.module.ts
git commit -m "feat(backend): add item categories CRUD module"
```

---

## Task 4: Inventory Policy module

**Files:**
- Create: `apps/backend/src/inventory-policies/dto/inventory-policy.request.ts`
- Create: `apps/backend/src/inventory-policies/dto/inventory-policy.response.ts`
- Create: `apps/backend/src/inventory-policies/inventory-policies.service.ts`
- Create: `apps/backend/src/inventory-policies/inventory-policies.controller.ts`
- Create: `apps/backend/src/inventory-policies/inventory-policies.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/database/seed.ts`
- Test: `apps/backend/test/inventory-policy.spec.ts` (existing, full file)

**Interfaces:**
- Consumes: `InventoryPolicy` entity + `INVENTORY_POLICY_ID` constant (already exist at `apps/backend/src/inventory-policies/inventory-policy.entity.ts`).
- Produces: `InventoryPoliciesService.get(): Promise<InventoryPolicy>` (creates a default row — `lowStockMode: "reorder_point"`, `lowStockThreshold: 0` — if none exists) and `.update(request: InventoryPolicyRequest): Promise<InventoryPolicy>`. `InventoryPoliciesModule` **exports** `InventoryPoliciesService` (Task 5's `InventoryModule` and Task 6's `DashboardModule` both need it).

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/backend test -- inventory-policy.spec.ts`
Expected: both cases fail with 404 (route doesn't exist).

- [ ] **Step 2: Add the request/response DTOs**

```ts
// apps/backend/src/inventory-policies/dto/inventory-policy.request.ts
import { IsIn, IsInt, Min } from "class-validator";
import type { LowStockMode } from "../inventory-policy.entity";

export class InventoryPolicyRequest {
	@IsIn(["reorder_point", "low_stock_threshold"])
	lowStockMode!: LowStockMode;

	@IsInt()
	@Min(0)
	lowStockThreshold!: number;
}
```

```ts
// apps/backend/src/inventory-policies/dto/inventory-policy.response.ts
import type { InventoryPolicy } from "../inventory-policy.entity";

export class InventoryPolicyResponse {
	id!: string;
	lowStockMode!: InventoryPolicy["lowStockMode"];
	lowStockThreshold!: number;
	createdAt!: Date;
	updatedAt!: Date;

	static from(policy: InventoryPolicy): InventoryPolicyResponse {
		const response = new InventoryPolicyResponse();
		response.id = policy.id;
		response.lowStockMode = policy.lowStockMode;
		response.lowStockThreshold = policy.lowStockThreshold;
		response.createdAt = policy.createdAt;
		response.updatedAt = policy.updatedAt;
		return response;
	}
}
```

- [ ] **Step 3: Add the service**

```ts
// apps/backend/src/inventory-policies/inventory-policies.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { InventoryPolicyRequest } from "./dto/inventory-policy.request";
import { INVENTORY_POLICY_ID, InventoryPolicy } from "./inventory-policy.entity";

@Injectable()
export class InventoryPoliciesService {
	constructor(
		@InjectRepository(InventoryPolicy)
		private readonly policyRepository: Repository<InventoryPolicy>,
	) {}

	async get(): Promise<InventoryPolicy> {
		const policy = await this.policyRepository.findOneBy({ id: INVENTORY_POLICY_ID });

		if (policy) {
			return policy;
		}

		return this.policyRepository.save(
			this.policyRepository.create({
				id: INVENTORY_POLICY_ID,
				lowStockMode: "reorder_point",
				lowStockThreshold: 0,
			}),
		);
	}

	async update(request: InventoryPolicyRequest): Promise<InventoryPolicy> {
		const policy = await this.get();

		policy.lowStockMode = request.lowStockMode;
		policy.lowStockThreshold = request.lowStockThreshold;

		return this.policyRepository.save(policy);
	}
}
```

- [ ] **Step 4: Add the controller**

```ts
// apps/backend/src/inventory-policies/inventory-policies.controller.ts
import { Body, Controller, Get, Put } from "@nestjs/common";
import { InventoryPolicyRequest } from "./dto/inventory-policy.request";
import { InventoryPolicyResponse } from "./dto/inventory-policy.response";
import { InventoryPoliciesService } from "./inventory-policies.service";

@Controller("inventory-policy")
export class InventoryPoliciesController {
	constructor(private readonly inventoryPoliciesService: InventoryPoliciesService) {}

	@Get()
	async get() {
		return InventoryPolicyResponse.from(await this.inventoryPoliciesService.get());
	}

	@Put()
	async update(@Body() request: InventoryPolicyRequest) {
		return InventoryPolicyResponse.from(await this.inventoryPoliciesService.update(request));
	}
}
```

- [ ] **Step 5: Add the module (exported service) and wire into `app.module.ts`**

```ts
// apps/backend/src/inventory-policies/inventory-policies.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryPolicy } from "./inventory-policy.entity";
import { InventoryPoliciesController } from "./inventory-policies.controller";
import { InventoryPoliciesService } from "./inventory-policies.service";

@Module({
	imports: [TypeOrmModule.forFeature([InventoryPolicy])],
	controllers: [InventoryPoliciesController],
	providers: [InventoryPoliciesService],
	exports: [InventoryPoliciesService],
})
export class InventoryPoliciesModule {}
```

```ts
// apps/backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { InventoryPoliciesModule } from "./inventory-policies/inventory-policies.module";
import { ItemCategoriesModule } from "./item-categories/item-categories.module";
import { ItemsModule } from "./items/items.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
	imports: [
		DatabaseModule,
		WarehousesModule,
		ItemsModule,
		ItemCategoriesModule,
		InventoryPoliciesModule,
	],
})
export class AppModule {}
```

- [ ] **Step 6: Seed a default policy row in `db:seed`/`db:reset`**

In `apps/backend/src/database/seed.ts`, add the import `import { InventoryPolicy } from "../inventory-policies/inventory-policy.entity";`, add `InventoryPolicy` to the `entities` array, add `const policyRepository = dataSource.getRepository(InventoryPolicy);` next to the other repositories, add `await policyRepository.createQueryBuilder().delete().execute();` alongside the other deletes (before warehouses, since it has no FK dependency — order doesn't matter for this table), and insert this right after the inventory rows loop, before `await dataSource.destroy();`:

```ts
	await policyRepository.save({
		id: "default",
		lowStockMode: "low_stock_threshold",
		lowStockThreshold: 25,
	});
```

- [ ] **Step 7: Run the test again**

Run: `bun --filter @mini-wms/backend test -- inventory-policy.spec.ts`
Expected: both cases PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/inventory-policies apps/backend/src/app.module.ts apps/backend/src/database/seed.ts
git commit -m "feat(backend): add inventory policy singleton module"
```

---

## Task 5: Inventory status SQL helper + Inventory module

**Files:**
- Create: `apps/backend/src/inventory/inventory-status.sql.ts`
- Create: `apps/backend/src/inventory/dto/inventory.request.ts`
- Create: `apps/backend/src/inventory/dto/inventory-filter.request.ts`
- Create: `apps/backend/src/inventory/inventory.service.ts`
- Create: `apps/backend/src/inventory/inventory.controller.ts`
- Create: `apps/backend/src/inventory/inventory.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Test: `apps/backend/test/inventory.spec.ts` (existing, full file), `apps/backend/test/query-validation.spec.ts` (existing, full file now reachable)

**Interfaces:**
- Consumes: `InventoryPoliciesService.get()` (Task 4). `Inventory` entity (exists, eager `warehouse`/`item` relations). `FilterQueryBuilder.getRawPaginated` (Task 1).
- Produces: `buildInventoryStatusSql(policy: InventoryPolicy): string` (exported, reused by Task 6's Dashboard module). `InventoryRow` interface: `{id, warehouseId, warehouseCode, warehouseName, itemId, itemSku, itemName, category, quantityOnHand, reorderPoint, status, updatedAt}`. `InventoryService.findAll(filter): Promise<{data: InventoryRow[]; total: number}>` and **`InventoryService.findLowStockRows(limit: number): Promise<InventoryRow[]>`** (Task 6 injects `InventoryService` to call this). `InventoryModule` **exports** `InventoryService`.

- [ ] **Step 1: Run the existing tests to see today's failures**

Run: `bun --filter @mini-wms/backend test -- inventory.spec.ts query-validation.spec.ts`
Expected: every case in `inventory.spec.ts` fails with 404. "rejects unsupported filter operators" (`GET /inventory?status=gt:low_stock`) fails.

- [ ] **Step 2: Add the shared status SQL helper**

```ts
// apps/backend/src/inventory/inventory-status.sql.ts
import type { InventoryPolicy } from "../inventory-policies/inventory-policy.entity";

export function buildInventoryStatusSql(policy: InventoryPolicy): string {
	const lowStockCondition =
		policy.lowStockMode === "reorder_point"
			? "inventory.quantityOnHand <= inventory.reorderPoint"
			: `inventory.quantityOnHand <= ${policy.lowStockThreshold}`;

	return `CASE WHEN inventory.quantityOnHand <= 0 THEN 'out_of_stock' WHEN ${lowStockCondition} THEN 'low_stock' ELSE 'in_stock' END`;
}
```

Note: `policy.lowStockThreshold` is inlined directly (not parameter-bound) because it's already validated as an integer by `InventoryPolicyRequest.@IsInt()` before it's ever persisted — there is no untrusted string in this expression.

- [ ] **Step 3: Add the request/filter DTOs**

```ts
// apps/backend/src/inventory/dto/inventory.request.ts
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class InventoryRequest {
	@IsString()
	@IsNotEmpty()
	warehouseId!: string;

	@IsString()
	@IsNotEmpty()
	itemId!: string;

	@IsInt()
	@Min(0)
	quantityOnHand!: number;

	@IsInt()
	@Min(0)
	reorderPoint!: number;
}
```

```ts
// apps/backend/src/inventory/dto/inventory-filter.request.ts
import { IsOptional, IsString } from "class-validator";
import { BaseFilter, FilterOperator, Operator } from "../../common/filter";

export const INVENTORY_SORT_FIELDS: Record<string, string> = {
	sku: "item.sku",
	itemName: "item.name",
	quantityOnHand: "inventory.quantityOnHand",
	reorderPoint: "inventory.reorderPoint",
	updatedAt: "inventory.updatedAt",
};

export class InventoryFilterRequest extends BaseFilter {
	@Operator(FilterOperator.ILIKE, { path: "warehouse.code" })
	@IsOptional()
	@IsString()
	warehouseCode?: string;

	@Operator(FilterOperator.ILIKE, { path: "warehouse.name" })
	@IsOptional()
	@IsString()
	warehouseName?: string;

	@Operator(FilterOperator.ILIKE, { path: "item.sku" })
	@IsOptional()
	@IsString()
	itemSku?: string;

	@Operator(FilterOperator.ILIKE, { path: "item.name" })
	@IsOptional()
	@IsString()
	itemName?: string;

	@Operator(FilterOperator.ILIKE, { path: "category.name" })
	@IsOptional()
	@IsString()
	category?: string;

	// Handled manually in InventoryService — status is derived, not a real column,
	// so it can't go through the generic path-based @Operator mechanism.
	@IsOptional()
	@IsString()
	status?: string;
}
```

- [ ] **Step 4: Add the service**

```ts
// apps/backend/src/inventory/inventory.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { FilterQueryBuilder } from "../common/query/filter-query-builder";
import { InventoryPoliciesService } from "../inventory-policies/inventory-policies.service";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";
import { INVENTORY_SORT_FIELDS, type InventoryFilterRequest } from "./dto/inventory-filter.request";
import type { InventoryRequest } from "./dto/inventory.request";
import { buildInventoryStatusSql } from "./inventory-status.sql";
import { Inventory } from "./inventory.entity";

export interface InventoryRow {
	id: string;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	itemId: string;
	itemSku: string;
	itemName: string;
	category: string;
	quantityOnHand: number;
	reorderPoint: number;
	status: string;
	updatedAt: Date;
}

const INVENTORY_SELECT = [
	"inventory.id AS id",
	'inventory.warehouseId AS "warehouseId"',
	'warehouse.code AS "warehouseCode"',
	'warehouse.name AS "warehouseName"',
	'inventory.itemId AS "itemId"',
	'item.sku AS "itemSku"',
	'item.name AS "itemName"',
	"category.name AS category",
	'inventory.quantityOnHand AS "quantityOnHand"',
	'inventory.reorderPoint AS "reorderPoint"',
	'inventory.updatedAt AS "updatedAt"',
];

function mapInventoryRow(row: Record<string, unknown>): InventoryRow {
	return {
		...row,
		quantityOnHand: Number(row.quantityOnHand),
		reorderPoint: Number(row.reorderPoint),
	} as InventoryRow;
}

@Injectable()
export class InventoryService {
	constructor(
		@InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
		@InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
		@InjectRepository(Item) private readonly itemRepository: Repository<Item>,
		private readonly inventoryPoliciesService: InventoryPoliciesService,
	) {}

	async findAll(filter: InventoryFilterRequest): Promise<{ data: InventoryRow[]; total: number }> {
		const statusSql = await this.buildStatusSql();

		const queryBuilder = this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.warehouse", "warehouse")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select(INVENTORY_SELECT)
			.addSelect(statusSql, "status");

		new FilterQueryBuilder(queryBuilder).applyFilter(filter);
		this.applyStatusFilter(queryBuilder, filter.status, statusSql);

		const { data, total } = await new FilterQueryBuilder(queryBuilder).getRawPaginated(
			filter,
			INVENTORY_SORT_FIELDS,
			"updatedAt",
		);

		return { data: data.map(mapInventoryRow), total };
	}

	async findLowStockRows(limit: number): Promise<InventoryRow[]> {
		const statusSql = await this.buildStatusSql();
		const severitySql = `CASE (${statusSql}) WHEN 'out_of_stock' THEN 0 WHEN 'low_stock' THEN 1 ELSE 2 END`;

		const rows = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.warehouse", "warehouse")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select(INVENTORY_SELECT)
			.addSelect(statusSql, "status")
			.where(`${statusSql} IN (:...statuses)`, { statuses: ["low_stock", "out_of_stock"] })
			.orderBy(severitySql, "ASC")
			.addOrderBy("inventory.quantityOnHand", "ASC")
			.take(limit)
			.getRawMany();

		return rows.map(mapInventoryRow);
	}

	async create(request: InventoryRequest): Promise<InventoryRow> {
		await this.assertWarehouseExists(request.warehouseId);
		await this.assertItemExists(request.itemId);
		await this.assertNotDuplicate(request.warehouseId, request.itemId);

		const inventory = await this.inventoryRepository.save(
			this.inventoryRepository.create({
				warehouseId: request.warehouseId,
				itemId: request.itemId,
				quantityOnHand: request.quantityOnHand,
				reorderPoint: request.reorderPoint,
			}),
		);

		return this.findRowById(inventory.id);
	}

	async update(id: string, request: InventoryRequest): Promise<InventoryRow> {
		const inventory = await this.findEntityById(id);
		await this.assertWarehouseExists(request.warehouseId);
		await this.assertItemExists(request.itemId);
		await this.assertNotDuplicate(request.warehouseId, request.itemId, id);

		inventory.warehouseId = request.warehouseId;
		inventory.itemId = request.itemId;
		inventory.quantityOnHand = request.quantityOnHand;
		inventory.reorderPoint = request.reorderPoint;

		await this.inventoryRepository.save(inventory);
		return this.findRowById(id);
	}

	async remove(id: string): Promise<void> {
		await this.findEntityById(id);
		await this.inventoryRepository.delete(id);
	}

	private async buildStatusSql(): Promise<string> {
		const policy = await this.inventoryPoliciesService.get();
		return buildInventoryStatusSql(policy);
	}

	private applyStatusFilter(
		queryBuilder: ReturnType<Repository<Inventory>["createQueryBuilder"]>,
		status: string | undefined,
		statusSql: string,
	) {
		if (!status) {
			return;
		}

		const separatorIndex = status.indexOf(":");
		const operator = separatorIndex === -1 ? "eq" : status.slice(0, separatorIndex);
		const value = separatorIndex === -1 ? status : status.slice(separatorIndex + 1);

		if (operator !== "eq") {
			throw new BadRequestException(`Unsupported filter operator '${operator}'`);
		}

		queryBuilder.andWhere(`${statusSql} = :statusValue`, { statusValue: value });
	}

	private async findEntityById(id: string): Promise<Inventory> {
		const inventory = await this.inventoryRepository.findOneBy({ id });

		if (!inventory) {
			throw new NotFoundException(`Inventory row '${id}' not found`);
		}

		return inventory;
	}

	private async findRowById(id: string): Promise<InventoryRow> {
		const statusSql = await this.buildStatusSql();

		const row = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.warehouse", "warehouse")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select(INVENTORY_SELECT)
			.addSelect(statusSql, "status")
			.where("inventory.id = :id", { id })
			.getRawOne();

		return mapInventoryRow(row);
	}

	private async assertWarehouseExists(warehouseId: string) {
		const warehouse = await this.warehouseRepository.findOneBy({ id: warehouseId });

		if (!warehouse) {
			throw new NotFoundException(`Warehouse '${warehouseId}' not found`);
		}
	}

	private async assertItemExists(itemId: string) {
		const item = await this.itemRepository.findOneBy({ id: itemId });

		if (!item) {
			throw new NotFoundException(`Item '${itemId}' not found`);
		}
	}

	private async assertNotDuplicate(warehouseId: string, itemId: string, currentId?: string) {
		const where = currentId
			? { warehouseId, itemId, id: Not(currentId) }
			: { warehouseId, itemId };
		const existing = await this.inventoryRepository.findOneBy(where);

		if (existing) {
			throw new ConflictException("Inventory row already exists for this warehouse and item");
		}
	}
}
```

- [ ] **Step 5: Add the controller**

```ts
// apps/backend/src/inventory/inventory.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { PaginatedResponse } from "../common/query/paginated.response";
import { InventoryFilterRequest } from "./dto/inventory-filter.request";
import { InventoryRequest } from "./dto/inventory.request";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
	constructor(private readonly inventoryService: InventoryService) {}

	@Get()
	async findAll(@Query() filter: InventoryFilterRequest) {
		const { data, total } = await this.inventoryService.findAll(filter);
		return PaginatedResponse.from(data, filter.page, filter.limit, total);
	}

	@Post()
	async create(@Body() request: InventoryRequest) {
		return this.inventoryService.create(request);
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() request: InventoryRequest) {
		return this.inventoryService.update(id, request);
	}

	@Delete(":id")
	async remove(@Param("id") id: string) {
		await this.inventoryService.remove(id);
		return { ok: true };
	}
}
```

- [ ] **Step 6: Add the module (exported service) and wire into `app.module.ts`**

```ts
// apps/backend/src/inventory/inventory.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryPoliciesModule } from "../inventory-policies/inventory-policies.module";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";
import { Inventory } from "./inventory.entity";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
	imports: [TypeOrmModule.forFeature([Inventory, Warehouse, Item]), InventoryPoliciesModule],
	controllers: [InventoryController],
	providers: [InventoryService],
	exports: [InventoryService],
})
export class InventoryModule {}
```

```ts
// apps/backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { InventoryPoliciesModule } from "./inventory-policies/inventory-policies.module";
import { InventoryModule } from "./inventory/inventory.module";
import { ItemCategoriesModule } from "./item-categories/item-categories.module";
import { ItemsModule } from "./items/items.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
	imports: [
		DatabaseModule,
		WarehousesModule,
		ItemsModule,
		ItemCategoriesModule,
		InventoryPoliciesModule,
		InventoryModule,
	],
})
export class AppModule {}
```

- [ ] **Step 7: Run the tests again**

Run: `bun --filter @mini-wms/backend test -- inventory.spec.ts query-validation.spec.ts`
Expected: both files PASS in full.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/inventory apps/backend/src/app.module.ts
git commit -m "feat(backend): add inventory CRUD with derived status filtering"
```

---

## Task 6: Dashboard module

**Files:**
- Create: `apps/backend/src/dashboard/dto/low-stock-items.query.ts`
- Create: `apps/backend/src/dashboard/dashboard.service.ts`
- Create: `apps/backend/src/dashboard/dashboard.controller.ts`
- Create: `apps/backend/src/dashboard/dashboard.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Test: `apps/backend/test/dashboard.spec.ts` (existing, full file)

**Interfaces:**
- Consumes: `buildInventoryStatusSql` and `InventoryService.findLowStockRows(limit)` (Task 5). `InventoryPoliciesService.get()` (Task 4).
- Produces: `GET /dashboard/inventory-status-summary`, `GET /dashboard/low-stock-by-category`, `GET /dashboard/low-stock-items?limit=N`. No later backend task depends on this module.

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/backend test -- dashboard.spec.ts`
Expected: every case fails with 404.

- [ ] **Step 2: Add the query DTO**

```ts
// apps/backend/src/dashboard/dto/low-stock-items.query.ts
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class LowStockItemsQuery {
	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(1)
	limit: number = 10;
}
```

- [ ] **Step 3: Add the service**

Note: "low stock" for the two grouping/ranking endpoints below means "needs attention" — `low_stock` **or** `out_of_stock` — matching the seed data (`dashboard.spec.ts` expects Packaging to have `count: 2`: one seeded row is `out_of_stock`, one is `low_stock`, both in the Packaging category). The plain `GET /inventory?status=eq:low_stock` filter (Task 5) stays exact-match on the single `low_stock` status — this broader grouping is specific to the dashboard.

```ts
// apps/backend/src/dashboard/dashboard.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InventoryPoliciesService } from "../inventory-policies/inventory-policies.service";
import { buildInventoryStatusSql } from "../inventory/inventory-status.sql";
import { Inventory } from "../inventory/inventory.entity";
import type { InventoryRow, InventoryService } from "../inventory/inventory.service";

export interface InventoryStatusSummary {
	totalRows: number;
	inStockRows: number;
	lowStockRows: number;
	outOfStockRows: number;
}

export interface LowStockByCategory {
	category: string;
	count: number;
}

@Injectable()
export class DashboardService {
	constructor(
		@InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
		private readonly inventoryPoliciesService: InventoryPoliciesService,
		private readonly inventoryService: InventoryService,
	) {}

	async getInventoryStatusSummary(): Promise<InventoryStatusSummary> {
		const statusSql = await this.buildStatusSql();

		const rows = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.select(statusSql, "status")
			.addSelect("COUNT(*)", "count")
			.groupBy(statusSql)
			.getRawMany<{ status: string; count: string }>();

		const summary: InventoryStatusSummary = {
			totalRows: 0,
			inStockRows: 0,
			lowStockRows: 0,
			outOfStockRows: 0,
		};

		for (const row of rows) {
			const count = Number(row.count);
			summary.totalRows += count;

			if (row.status === "in_stock") summary.inStockRows = count;
			if (row.status === "low_stock") summary.lowStockRows = count;
			if (row.status === "out_of_stock") summary.outOfStockRows = count;
		}

		return summary;
	}

	async getLowStockByCategory(): Promise<LowStockByCategory[]> {
		const statusSql = await this.buildStatusSql();

		const rows = await this.inventoryRepository
			.createQueryBuilder("inventory")
			.innerJoin("inventory.item", "item")
			.innerJoin("item.category", "category")
			.select("category.name", "category")
			.addSelect("COUNT(*)", "count")
			.where(`${statusSql} IN (:...statuses)`, { statuses: ["low_stock", "out_of_stock"] })
			.groupBy("category.name")
			.getRawMany<{ category: string; count: string }>();

		return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
	}

	getLowStockItems(limit: number): Promise<InventoryRow[]> {
		return this.inventoryService.findLowStockRows(limit);
	}

	private async buildStatusSql(): Promise<string> {
		const policy = await this.inventoryPoliciesService.get();
		return buildInventoryStatusSql(policy);
	}
}
```

- [ ] **Step 4: Add the controller**

```ts
// apps/backend/src/dashboard/dashboard.controller.ts
import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { LowStockItemsQuery } from "./dto/low-stock-items.query";

@Controller("dashboard")
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get("inventory-status-summary")
	getInventoryStatusSummary() {
		return this.dashboardService.getInventoryStatusSummary();
	}

	@Get("low-stock-by-category")
	getLowStockByCategory() {
		return this.dashboardService.getLowStockByCategory();
	}

	@Get("low-stock-items")
	getLowStockItems(@Query() query: LowStockItemsQuery) {
		return this.dashboardService.getLowStockItems(query.limit);
	}
}
```

- [ ] **Step 5: Add the module and wire into `app.module.ts`**

```ts
// apps/backend/src/dashboard/dashboard.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryPoliciesModule } from "../inventory-policies/inventory-policies.module";
import { InventoryModule } from "../inventory/inventory.module";
import { Inventory } from "../inventory/inventory.entity";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
	imports: [TypeOrmModule.forFeature([Inventory]), InventoryPoliciesModule, InventoryModule],
	controllers: [DashboardController],
	providers: [DashboardService],
})
export class DashboardModule {}
```

```ts
// apps/backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DatabaseModule } from "./database/database.module";
import { InventoryPoliciesModule } from "./inventory-policies/inventory-policies.module";
import { InventoryModule } from "./inventory/inventory.module";
import { ItemCategoriesModule } from "./item-categories/item-categories.module";
import { ItemsModule } from "./items/items.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
	imports: [
		DatabaseModule,
		WarehousesModule,
		ItemsModule,
		ItemCategoriesModule,
		InventoryPoliciesModule,
		InventoryModule,
		DashboardModule,
	],
})
export class AppModule {}
```

- [ ] **Step 6: Run the test again**

Run: `bun --filter @mini-wms/backend test -- dashboard.spec.ts`
Expected: all three cases PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/dashboard apps/backend/src/app.module.ts
git commit -m "feat(backend): add dashboard summary/grouping/low-stock endpoints"
```

---

## Task 7: Full backend verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full backend suite**

Run: `bun run test:backend`
Expected: all 6 spec files pass (0 failures).

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: no errors. If Biome flags formatting issues in files touched by Tasks 1–6, run `bun run format` and re-check the diff for anything unexpected before proceeding.

- [ ] **Step 3: Commit (only if `bun run format` changed anything)**

```bash
git add apps/backend
git commit -m "chore(backend): apply formatting"
```

---

## Task 8: Frontend shared pagination/query infra

**Files:**
- Modify: `apps/frontend/src/shared/data/wms/types.ts`
- Modify: `apps/frontend/src/shared/utils/build-filter-query.ts`
- Modify: `apps/frontend/src/shared/state/createPaginatedResourceAtoms.ts`
- Modify: `apps/frontend/src/shared/hooks/pagination/usePaginatedResourceAtoms.ts`
- Modify: `apps/frontend/src/features/items/hooks/useItemCategoryOptions.ts`
- Modify: `apps/frontend/src/features/inventory/index.ts` (replace `useInventoryOptions` stub — the `InventoryTable` stub in this file is replaced in Task 12)
- Modify: `apps/frontend/src/features/inventory/utils/inventory-form.ts`
- Create: `apps/frontend/src/shared/components/table/SortableHeaderButton.tsx`
- Create: `apps/frontend/src/shared/components/table/PaginationFooter.tsx`
- Create: `apps/frontend/src/shared/components/table/ResourceFilterPanel.tsx`
- Test: `apps/frontend/src/tests/WmsArchitecture.test.tsx` (existing, full file)

**Interfaces:**
- Consumes: `apiService` (existing, unchanged), `useSaveResource` (existing, already implemented, unchanged).
- Produces: `PaginatedResponse<T>`, `ItemCategory`, `ItemCategoryPayload`, `InventoryStatus`, `Inventory`, `InventoryPayload`, `LowStockMode`, `InventoryPolicy`, `InventoryPolicyPayload`, `InventoryStatusSummary`, `LowStockByCategory` types (from `@/shared/data/wms`). `ResourceFilterDefinition` type and `buildResourceQuery(params)` (from `@/shared/utils/build-filter-query`). `createPaginatedResourceAtoms<TEntity, TFilters, TSort>(config): PaginatedResourceAtoms<TEntity, TFilters, TSort>` and `usePaginatedResourceAtoms(atoms)` returning `{data, error, loading, filters, sort, order, setPage, toggleSort, updateFilter, retry}` — **this exact return shape is what Tasks 9–12 build tables against**. `SortableHeaderButton`, `PaginationFooter`, `ResourceFilterPanel` components — **these are what Tasks 9–12 import**. `useItemCategoryOptions(enabled?: boolean): {data: ItemCategory[]; error: string|null; loading: boolean}` and `useInventoryOptions(enabled?: boolean): {warehouses: Warehouse[]; items: Item[]; loading: boolean}`. `getInitialInventoryForm(inventory?: Inventory): InventoryFormState` and `getInventoryPayload(form: InventoryFormState): InventoryPayload`.

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/frontend test -- WmsArchitecture.test.tsx`
Expected: every case except "maps edit forms from entities without component logic" (partially — the inventory-form assertions in it will fail) and "saves resources through the shared mutation hook" fails, since the pagination/options stubs return empty placeholders.

- [ ] **Step 2: Add the new shared types**

Append to `apps/frontend/src/shared/data/wms/types.ts` (keep everything already in the file):

```ts
export interface PaginatedResponse<T> {
	data: T[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ItemCategory {
	id: string;
	name: string;
	createdAt: string;
}

export type ItemCategoryPayload = Pick<ItemCategory, "name">;

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Inventory {
	id: string;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	itemId: string;
	itemSku: string;
	itemName: string;
	category: string;
	quantityOnHand: number;
	reorderPoint: number;
	status: InventoryStatus;
	updatedAt: string;
}

export interface InventoryPayload {
	warehouseId: string;
	itemId: string;
	quantityOnHand: number;
	reorderPoint: number;
}

export type LowStockMode = "reorder_point" | "low_stock_threshold";

export interface InventoryPolicy {
	id: string;
	lowStockMode: LowStockMode;
	lowStockThreshold: number;
	createdAt: string;
	updatedAt: string;
}

export type InventoryPolicyPayload = Pick<InventoryPolicy, "lowStockMode" | "lowStockThreshold">;

export interface InventoryStatusSummary {
	totalRows: number;
	inStockRows: number;
	lowStockRows: number;
	outOfStockRows: number;
}

export interface LowStockByCategory {
	category: string;
	count: number;
}
```

- [ ] **Step 3: Replace `build-filter-query.ts` with the resource query builder**

```ts
// apps/frontend/src/shared/utils/build-filter-query.ts
export interface ResourceFilterDefinition<TKey extends string = string> {
	ariaLabel: string;
	key: TKey;
	label: string;
	operator: "eq" | "ilike";
	options?: { label: string; value: string }[];
	type: "input" | "select";
}

interface BuildResourceQueryParams<TFilters extends Record<string, string>> {
	filterDefinitions: ResourceFilterDefinition[];
	filters: TFilters;
	limit: number;
	order: "ASC" | "DESC";
	page: number;
	sort: string;
}

export function buildResourceQuery<TFilters extends Record<string, string>>({
	filterDefinitions,
	filters,
	limit,
	order,
	page,
	sort,
}: BuildResourceQueryParams<TFilters>): string {
	const params = new URLSearchParams();
	params.set("page", String(page));
	params.set("limit", String(limit));
	params.set("sort", sort);
	params.set("order", order);

	for (const definition of filterDefinitions) {
		const value = filters[definition.key]?.trim();

		if (!value) {
			continue;
		}

		params.set(definition.key, `${definition.operator}:${value}`);
	}

	return `?${params.toString()}`;
}
```

- [ ] **Step 4: Implement `createPaginatedResourceAtoms`**

```ts
// apps/frontend/src/shared/state/createPaginatedResourceAtoms.ts
import { atom, type PrimitiveAtom } from "jotai";
import type { ResourceFilterDefinition } from "@/shared/utils/build-filter-query";

export interface PaginatedResourceConfig<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
> {
	endpoint: string;
	filterDefinitions: ResourceFilterDefinition[];
	initialFilters: TFilters;
	initialSort: TSort;
	limit?: number;
	// biome-ignore lint/suspicious/noExplicitAny: TEntity is a phantom type carried for the hook's return typing.
	__entity?: TEntity;
}

export interface PaginatedResourceAtoms<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
> {
	config: PaginatedResourceConfig<TEntity, TFilters, TSort>;
	filtersAtom: PrimitiveAtom<TFilters>;
	limitAtom: PrimitiveAtom<number>;
	orderAtom: PrimitiveAtom<"ASC" | "DESC">;
	pageAtom: PrimitiveAtom<number>;
	sortAtom: PrimitiveAtom<TSort>;
}

export function createPaginatedResourceAtoms<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
>(
	config: PaginatedResourceConfig<TEntity, TFilters, TSort>,
): PaginatedResourceAtoms<TEntity, TFilters, TSort> {
	return {
		config,
		filtersAtom: atom(config.initialFilters),
		limitAtom: atom(config.limit ?? 5),
		orderAtom: atom<"ASC" | "DESC">("DESC"),
		pageAtom: atom(1),
		sortAtom: atom(config.initialSort),
	};
}
```

- [ ] **Step 5: Implement `usePaginatedResourceAtoms`**

```ts
// apps/frontend/src/shared/hooks/pagination/usePaginatedResourceAtoms.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { apiService } from "@/api/apiService";
import type { PaginatedResponse } from "@/shared/data/wms";
import type { PaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";
import { buildResourceQuery } from "@/shared/utils/build-filter-query";

export function usePaginatedResourceAtoms<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
>(atoms: PaginatedResourceAtoms<TEntity, TFilters, TSort>) {
	const [page, setPage] = useAtom(atoms.pageAtom);
	const [limit] = useAtom(atoms.limitAtom);
	const [sort, setSort] = useAtom(atoms.sortAtom);
	const [order, setOrder] = useAtom(atoms.orderAtom);
	const [filters, setFilters] = useAtom(atoms.filtersAtom);

	const queryString = buildResourceQuery({
		filterDefinitions: atoms.config.filterDefinitions,
		filters,
		limit,
		order,
		page,
		sort,
	});

	const query = useQuery({
		queryKey: [atoms.config.endpoint, queryString],
		queryFn: () =>
			apiService.get<PaginatedResponse<TEntity>>(`${atoms.config.endpoint}${queryString}`),
		placeholderData: keepPreviousData,
		retry: false,
	});

	function toggleSort(field: TSort) {
		if (field === sort) {
			setOrder((current) => (current === "ASC" ? "DESC" : "ASC"));
			return;
		}

		setSort(field);
		setOrder("ASC");
	}

	function updateFilter({ key, value }: { key: string; value: string }) {
		setFilters((current) => ({ ...current, [key]: value }));
		setPage(1);
	}

	return {
		data: query.data ?? null,
		error: query.error instanceof Error ? query.error.message : null,
		filters,
		loading: query.isLoading,
		order,
		retry: () => {
			void query.refetch();
		},
		setPage,
		sort,
		toggleSort,
		updateFilter,
	};
}
```

`retry: false` is deliberate: the global `QueryClient` (`apps/frontend/src/app/providers.tsx`) defaults to `retry: 1`, which would silently consume the test's second mocked response as an automatic retry before the "Retry" button is ever clicked. Overriding it here keeps exactly one fetch per user action, matching every table test's fetch-call-count assertions.

- [ ] **Step 6: Add the shared table UI pieces**

```tsx
// apps/frontend/src/shared/components/table/SortableHeaderButton.tsx
import { Button } from "@/components/ui/button";

interface SortableHeaderButtonProps<TSort extends string> {
	activeOrder: "ASC" | "DESC";
	activeSort: TSort;
	field: TSort;
	label: string;
	onToggle: (field: TSort) => void;
}

export default function SortableHeaderButton<TSort extends string>({
	activeOrder,
	activeSort,
	field,
	label,
	onToggle,
}: SortableHeaderButtonProps<TSort>) {
	const isActive = field === activeSort;
	const state = isActive ? (activeOrder === "ASC" ? "ascending" : "descending") : "not sorted";

	return (
		<Button type="button" variant="ghost" size="sm" onClick={() => onToggle(field)}>
			{`${label}: ${state}`}
		</Button>
	);
}
```

```tsx
// apps/frontend/src/shared/components/table/PaginationFooter.tsx
import { Button } from "@/components/ui/button";

interface PaginationFooterProps {
	onNext: () => void;
	onPrev: () => void;
	page: number;
	totalPages: number;
}

export default function PaginationFooter({
	onNext,
	onPrev,
	page,
	totalPages,
}: PaginationFooterProps) {
	return (
		<div className="flex items-center justify-between gap-3 border-t px-4 py-3">
			<span className="text-sm text-muted-foreground">{`Page ${page} of ${totalPages}`}</span>
			<div className="flex gap-2">
				<Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
					Prev
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={page >= totalPages}
					onClick={onNext}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
```

```tsx
// apps/frontend/src/shared/components/table/ResourceFilterPanel.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectCombobox from "@/shared/components/forms/SelectCombobox";
import type { ResourceFilterDefinition } from "@/shared/utils/build-filter-query";

interface ResourceFilterPanelProps<TFilters extends Record<string, string>> {
	filterDefinitions: ResourceFilterDefinition[];
	filters: TFilters;
	onChange: (key: string, value: string) => void;
}

export default function ResourceFilterPanel<TFilters extends Record<string, string>>({
	filterDefinitions,
	filters,
	onChange,
}: ResourceFilterPanelProps<TFilters>) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="space-y-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setIsOpen((current) => !current)}
			>
				Filter
			</Button>
			{isOpen ? (
				<div className="grid gap-2 md:grid-cols-4">
					{filterDefinitions.map((definition) =>
						definition.type === "select" ? (
							<SelectCombobox
								key={definition.key}
								ariaLabel={definition.ariaLabel}
								value={filters[definition.key] ?? ""}
								options={[{ label: "All", value: "" }, ...(definition.options ?? [])]}
								placeholder={definition.label}
								onChange={(value) => onChange(definition.key, value)}
							/>
						) : (
							<Input
								key={definition.key}
								aria-label={definition.ariaLabel}
								placeholder={definition.label}
								value={filters[definition.key] ?? ""}
								onChange={(event) => onChange(definition.key, event.target.value)}
							/>
						),
					)}
				</div>
			) : null}
		</div>
	);
}
```

- [ ] **Step 7: Implement `useItemCategoryOptions`**

```ts
// apps/frontend/src/features/items/hooks/useItemCategoryOptions.ts
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { ItemCategory, PaginatedResponse } from "@/shared/data/wms";

export function useItemCategoryOptions(enabled = true) {
	const query = useQuery({
		queryKey: ["/item-categories", "options"],
		queryFn: () =>
			apiService.get<PaginatedResponse<ItemCategory>>(
				"/item-categories?page=1&limit=50&sort=name&order=ASC",
			),
		enabled,
		retry: false,
	});

	return {
		data: query.data?.data ?? [],
		error: query.error instanceof Error ? query.error.message : null,
		loading: query.isLoading,
	};
}
```

- [ ] **Step 8: Implement `useInventoryOptions`**

Replace the stub in `apps/frontend/src/features/inventory/index.ts` — keep the `InventoryTable` stub for now (Task 12 replaces it), only change `useInventoryOptions`:

```ts
// apps/frontend/src/features/inventory/index.ts
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { Item, PaginatedResponse, Warehouse } from "@/shared/data/wms";

export function InventoryTable() {
	return null;
}

export function useInventoryOptions(enabled = true) {
	const warehousesQuery = useQuery({
		queryKey: ["/warehouses", "options"],
		queryFn: () =>
			apiService.get<PaginatedResponse<Warehouse>>("/warehouses?page=1&limit=50&sort=code&order=ASC"),
		enabled,
		retry: false,
	});
	const itemsQuery = useQuery({
		queryKey: ["/items", "options"],
		queryFn: () => apiService.get<PaginatedResponse<Item>>("/items?page=1&limit=50&sort=sku&order=ASC"),
		enabled,
		retry: false,
	});

	return {
		items: itemsQuery.data?.data ?? [],
		loading: warehousesQuery.isLoading || itemsQuery.isLoading,
		warehouses: warehousesQuery.data?.data ?? [],
	};
}
```

- [ ] **Step 9: Implement `inventory-form.ts`**

```ts
// apps/frontend/src/features/inventory/utils/inventory-form.ts
import type { Inventory, InventoryPayload } from "@/shared/data/wms";

export interface InventoryFormState {
	itemId: string;
	quantityOnHand: string;
	reorderPoint: string;
	warehouseId: string;
}

const emptyInventoryForm: InventoryFormState = {
	warehouseId: "",
	itemId: "",
	quantityOnHand: "0",
	reorderPoint: "0",
};

export function getInitialInventoryForm(inventory?: Inventory): InventoryFormState {
	if (!inventory) {
		return emptyInventoryForm;
	}

	return {
		warehouseId: inventory.warehouseId,
		itemId: inventory.itemId,
		quantityOnHand: String(inventory.quantityOnHand),
		reorderPoint: String(inventory.reorderPoint),
	};
}

export function getInventoryPayload(form: InventoryFormState): InventoryPayload {
	return {
		warehouseId: form.warehouseId,
		itemId: form.itemId,
		quantityOnHand: Number(form.quantityOnHand),
		reorderPoint: Number(form.reorderPoint),
	};
}
```

- [ ] **Step 10: Run the test again**

Run: `bun --filter @mini-wms/frontend test -- WmsArchitecture.test.tsx`
Expected: entire file PASSES.

- [ ] **Step 11: Commit**

```bash
git add apps/frontend/src/shared apps/frontend/src/features/items/hooks/useItemCategoryOptions.ts apps/frontend/src/features/inventory/index.ts apps/frontend/src/features/inventory/utils/inventory-form.ts
git commit -m "feat(frontend): implement shared paginated-resource atoms/hook and table UI"
```

---

## Task 9: Retrofit WarehousesTable

**Files:**
- Create: `apps/frontend/src/features/warehouses/state/warehousesResourceAtoms.ts`
- Modify: `apps/frontend/src/features/warehouses/components/WarehousesTable.tsx`
- Test: `apps/frontend/src/tests/WarehousesTable.test.tsx` (existing, full file)

**Interfaces:**
- Consumes: `createPaginatedResourceAtoms`, `usePaginatedResourceAtoms`, `SortableHeaderButton`, `PaginationFooter`, `ResourceFilterPanel` (Task 8).
- Produces: nothing consumed by later tasks (Items/Inventory each define their own atoms file, following the same pattern).

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/frontend test -- WarehousesTable.test.tsx`
Expected: all three cases fail — the current implementation has no pagination footer, no "Filter" toggle button, and uses `aria-label="Filter warehouse city"` instead of `"Filter warehouses by city"`.

- [ ] **Step 2: Define the warehouses resource atoms**

```ts
// apps/frontend/src/features/warehouses/state/warehousesResourceAtoms.ts
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";
import type { Warehouse } from "@/shared/data/wms";

export interface WarehouseFilters extends Record<string, string> {
	city: string;
	code: string;
	name: string;
	status: string;
}

export type WarehouseSort = "code" | "name" | "city" | "status" | "createdAt";

export const warehousesResourceAtoms = createPaginatedResourceAtoms<
	Warehouse,
	WarehouseFilters,
	WarehouseSort
>({
	endpoint: "/warehouses",
	filterDefinitions: [
		{
			ariaLabel: "Filter warehouses by code",
			key: "code",
			label: "Code",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter warehouses by name",
			key: "name",
			label: "Name",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter warehouses by city",
			key: "city",
			label: "City",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter warehouses by status",
			key: "status",
			label: "Status",
			operator: "eq",
			type: "select",
			options: [
				{ label: "Active", value: "active" },
				{ label: "Inactive", value: "inactive" },
			],
		},
	],
	initialFilters: { city: "", code: "", name: "", status: "" },
	initialSort: "createdAt",
});
```

- [ ] **Step 3: Rewrite `WarehousesTable.tsx`**

```tsx
// apps/frontend/src/features/warehouses/components/WarehousesTable.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import ResourceFilterPanel from "@/shared/components/table/ResourceFilterPanel";
import SortableHeaderButton from "@/shared/components/table/SortableHeaderButton";
import { formatStatus } from "@/shared/data/wms";
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import { warehousesResourceAtoms } from "../state/warehousesResourceAtoms";
import WarehouseEditorDialog from "./WarehouseEditorDialog";

export default function WarehousesTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(warehousesResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((warehouse) => (
			<TableRow key={warehouse.id}>
				<TableCell>{warehouse.code}</TableCell>
				<TableCell>{warehouse.name}</TableCell>
				<TableCell>{warehouse.city}</TableCell>
				<TableCell>
					<Badge variant={warehouse.status === "active" ? "secondary" : "outline"}>
						{formatStatus(warehouse.status)}
					</Badge>
				</TableCell>
				<TableCell className="text-right">
					<WarehouseEditorDialog warehouse={warehouse} onSaved={retry} />
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
				No warehouses.
			</TableCell>
		</TableRow>
	);

	const content = error ? (
		<div role="alert" className="grid justify-items-center gap-3 p-8 text-center text-destructive">
			<p>{error}</p>
			<Button variant="outline" onClick={retry}>
				Retry
			</Button>
		</div>
	) : (
		<div className="overflow-hidden rounded-lg border">
			{loading ? <p className="p-4 text-sm text-muted-foreground">Loading warehouses...</p> : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="code"
								label="Code"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="name"
								label="Name"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="city"
								label="City"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>Status</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>{tableBody}</TableBody>
			</Table>
			<PaginationFooter
				page={page}
				totalPages={totalPages}
				onPrev={() => setPage(page - 1)}
				onNext={() => setPage(page + 1)}
			/>
		</div>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>Warehouses</CardTitle>
				<WarehouseEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={warehousesResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 4: Run the test again**

Run: `bun --filter @mini-wms/frontend test -- WarehousesTable.test.tsx`
Expected: all three cases PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/warehouses
git commit -m "feat(frontend): retrofit warehouses table onto shared pagination infra"
```

---

## Task 10: Retrofit ItemsTable + item-category combobox

**Files:**
- Create: `apps/frontend/src/features/items/state/itemsResourceAtoms.ts`
- Modify: `apps/frontend/src/features/items/components/ItemsTable.tsx`
- Modify: `apps/frontend/src/features/items/components/ItemEditorDialog.tsx`
- Test: `apps/frontend/src/tests/ItemsTable.test.tsx` (existing, full file)

**Interfaces:**
- Consumes: `createPaginatedResourceAtoms`, `usePaginatedResourceAtoms`, `SortableHeaderButton`, `PaginationFooter`, `ResourceFilterPanel` (Task 8), `useItemCategoryOptions` (Task 8).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/frontend test -- ItemsTable.test.tsx`
Expected: all four cases fail (no sorting, no pagination footer, wrong filter aria-label).

- [ ] **Step 2: Define the items resource atoms**

```ts
// apps/frontend/src/features/items/state/itemsResourceAtoms.ts
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";
import type { Item } from "@/shared/data/wms";

export interface ItemFilters extends Record<string, string> {
	category: string;
	name: string;
	sku: string;
	status: string;
}

export type ItemSort = "sku" | "name" | "category" | "status" | "createdAt";

export const itemsResourceAtoms = createPaginatedResourceAtoms<Item, ItemFilters, ItemSort>({
	endpoint: "/items",
	filterDefinitions: [
		{ ariaLabel: "Filter items by SKU", key: "sku", label: "SKU", operator: "ilike", type: "input" },
		{
			ariaLabel: "Filter items by name",
			key: "name",
			label: "Name",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter items by category",
			key: "category",
			label: "Category",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter items by status",
			key: "status",
			label: "Status",
			operator: "eq",
			type: "input",
		},
	],
	initialFilters: { category: "", name: "", sku: "", status: "" },
	initialSort: "createdAt",
});
```

- [ ] **Step 3: Rewrite `ItemsTable.tsx`**

```tsx
// apps/frontend/src/features/items/components/ItemsTable.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import ResourceFilterPanel from "@/shared/components/table/ResourceFilterPanel";
import SortableHeaderButton from "@/shared/components/table/SortableHeaderButton";
import { formatStatus } from "@/shared/data/wms";
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import { itemsResourceAtoms } from "../state/itemsResourceAtoms";
import ItemEditorDialog from "./ItemEditorDialog";

export default function ItemsTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(itemsResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((item) => (
			<TableRow key={item.id}>
				<TableCell>{item.sku}</TableCell>
				<TableCell>{item.name}</TableCell>
				<TableCell>{item.category}</TableCell>
				<TableCell>{item.unit}</TableCell>
				<TableCell>
					<Badge variant={item.status === "active" ? "secondary" : "outline"}>
						{formatStatus(item.status)}
					</Badge>
				</TableCell>
				<TableCell className="text-right">
					<ItemEditorDialog item={item} onSaved={retry} />
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
				No items.
			</TableCell>
		</TableRow>
	);

	const content = error ? (
		<div role="alert" className="grid justify-items-center gap-3 p-8 text-center text-destructive">
			<p>{error}</p>
			<Button variant="outline" onClick={retry}>
				Retry
			</Button>
		</div>
	) : (
		<div className="overflow-hidden rounded-lg border">
			{loading ? <p className="p-4 text-sm text-muted-foreground">Loading items...</p> : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="sku"
								label="SKU"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="name"
								label="Name"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Unit</TableHead>
						<TableHead>Status</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>{tableBody}</TableBody>
			</Table>
			<PaginationFooter
				page={page}
				totalPages={totalPages}
				onPrev={() => setPage(page - 1)}
				onNext={() => setPage(page + 1)}
			/>
		</div>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>Items</CardTitle>
				<ItemEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={itemsResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 4: Replace the "Category ID" text input with a category combobox in `ItemEditorDialog.tsx`**

Add the import `import { useItemCategoryOptions } from "../hooks/useItemCategoryOptions";` and `const { data: categoryOptions } = useItemCategoryOptions(open);` right after the existing `saveMutation`/`isSaving` declarations. Replace this block:

```tsx
						<div className="grid gap-1">
							<Label htmlFor="item-category-id">Category ID</Label>
							<Input
								id="item-category-id"
								value={form.categoryId}
								required
								onChange={(event) => updateField("categoryId", event.target.value)}
							/>
						</div>
```

with:

```tsx
						<div className="grid gap-1">
							<Label>Category</Label>
							<SelectCombobox
								ariaLabel="Item category"
								value={form.categoryId}
								options={categoryOptions.map((category) => ({
									label: category.name,
									value: category.id,
								}))}
								placeholder="Select category"
								onChange={(value) => updateField("categoryId", value)}
							/>
						</div>
```

- [ ] **Step 5: Run the test again**

Run: `bun --filter @mini-wms/frontend test -- ItemsTable.test.tsx`
Expected: all four cases PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/items
git commit -m "feat(frontend): retrofit items table onto shared pagination infra, add category combobox"
```

---

## Task 11: Item Categories frontend feature

**Files:**
- Create: `apps/frontend/src/features/item-categories/state/itemCategoriesResourceAtoms.ts`
- Create: `apps/frontend/src/features/item-categories/utils/item-category-form.ts`
- Create: `apps/frontend/src/features/item-categories/hooks/useSaveItemCategory.ts`
- Create: `apps/frontend/src/features/item-categories/components/ItemCategoryEditorDialog.tsx`
- Create: `apps/frontend/src/features/item-categories/components/ItemCategoriesTable.tsx`
- Create: `apps/frontend/src/features/item-categories/index.ts`
- Create: `apps/frontend/src/app/routes/item-categories.tsx`
- Test: `apps/frontend/src/tests/ItemCategoriesTable.test.tsx` (new — this feature has no pre-existing contract; the plan defines and authors its own test)

**Interfaces:**
- Consumes: `createPaginatedResourceAtoms`, `usePaginatedResourceAtoms`, `SortableHeaderButton`, `PaginationFooter`, `ResourceFilterPanel` (Task 8), `useSaveResource`/`useDeleteResource`/`DeleteResourceDialog` (existing, unchanged).
- Produces: `ItemCategoriesTable`, exported from `@/features/item-categories` — consumed by the route added in Task 15's sidebar/route wiring (the route file itself is created in this task; Task 15 only adds the sidebar link).

- [ ] **Step 1: Write the new test**

```tsx
// apps/frontend/src/tests/ItemCategoriesTable.test.tsx
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemCategoriesTable } from "@/features/item-categories";
import { jsonResponse, mockFetchSequence, paginated, renderWithProviders } from "./resource-test-utils";

function category(name: string) {
	return { id: name, name, createdAt: "2026-01-20T10:00:00.000Z" };
}

describe("ItemCategoriesTable", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("filters item categories and resets pagination", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetchSequence([
			paginated([category("Accessories")], 2),
			{ ...paginated([category("Packaging")], 2), page: 2 },
			paginated([category("Packaging")], 1),
		]);
		renderWithProviders(<ItemCategoriesTable />);

		await screen.findByText("Accessories");
		await user.click(screen.getByRole("button", { name: "Next" }));
		await screen.findByText("Page 2 of 2");
		await user.click(screen.getByRole("button", { name: "Filter" }));
		await user.type(screen.getByLabelText("Filter item categories by name"), "packaging");

		await screen.findByText("Page 1 of 1");
		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/item-categories?page=1&limit=5&sort=createdAt&order=DESC&name=ilike%3Apackaging",
				undefined,
			),
		);
	});

	it("creates an item category and refreshes the table", async () => {
		const user = userEvent.setup();
		const newCategory = category("Consumables");
		const fetchMock = mockFetchSequence([paginated([]), newCategory, paginated([newCategory])]);
		renderWithProviders(<ItemCategoriesTable />);

		await screen.findByText("No item categories.");
		await user.click(screen.getByRole("button", { name: "Add item category" }));
		await user.type(screen.getByLabelText("Name"), "Consumables");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await screen.findByText("Consumables");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/item-categories",
			expect.objectContaining({
				body: JSON.stringify({ name: "Consumables" }),
				method: "POST",
			}),
		);
	});

	it("retries after a load error", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(jsonResponse({ message: "Backend unavailable" }, 500))
			.mockResolvedValueOnce(jsonResponse(paginated([category("Accessories")])));
		renderWithProviders(<ItemCategoriesTable />);

		expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");
		await user.click(screen.getByRole("button", { name: "Retry" }));

		await screen.findByText("Accessories");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun --filter @mini-wms/frontend test -- ItemCategoriesTable.test.tsx`
Expected: FAIL — `@/features/item-categories` has no `ItemCategoriesTable` export yet (module not found).

- [ ] **Step 3: Add the resource atoms**

```ts
// apps/frontend/src/features/item-categories/state/itemCategoriesResourceAtoms.ts
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";
import type { ItemCategory } from "@/shared/data/wms";

export interface ItemCategoryFilters extends Record<string, string> {
	name: string;
}

export type ItemCategorySort = "name" | "createdAt";

export const itemCategoriesResourceAtoms = createPaginatedResourceAtoms<
	ItemCategory,
	ItemCategoryFilters,
	ItemCategorySort
>({
	endpoint: "/item-categories",
	filterDefinitions: [
		{
			ariaLabel: "Filter item categories by name",
			key: "name",
			label: "Name",
			operator: "ilike",
			type: "input",
		},
	],
	initialFilters: { name: "" },
	initialSort: "createdAt",
});
```

- [ ] **Step 4: Add the form util and save hook**

```ts
// apps/frontend/src/features/item-categories/utils/item-category-form.ts
import type { ItemCategory, ItemCategoryPayload } from "@/shared/data/wms";

const emptyItemCategoryForm: ItemCategoryPayload = { name: "" };

export function getInitialItemCategoryForm(category?: ItemCategory): ItemCategoryPayload {
	if (!category) {
		return emptyItemCategoryForm;
	}

	return { name: category.name };
}
```

```ts
// apps/frontend/src/features/item-categories/hooks/useSaveItemCategory.ts
import type { ItemCategory, ItemCategoryPayload } from "@/shared/data/wms";
import { useSaveResource } from "@/shared/hooks/useSaveResource";

interface UseSaveItemCategoryParams {
	category?: ItemCategory;
	onError: (message: string) => void;
	onSaved: () => void;
}

export function useSaveItemCategory({ category, onError, onSaved }: UseSaveItemCategoryParams) {
	return useSaveResource<ItemCategory, ItemCategoryPayload>({
		endpoint: "/item-categories",
		entity: category,
		failureMessage: "Failed to save item category.",
		onError,
		onSaved,
	});
}
```

- [ ] **Step 5: Add the editor dialog**

```tsx
// apps/frontend/src/features/item-categories/components/ItemCategoryEditorDialog.tsx
import { Pencil, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ItemCategory, ItemCategoryPayload } from "@/shared/data/wms";
import { useSaveItemCategory } from "../hooks/useSaveItemCategory";
import { getInitialItemCategoryForm } from "../utils/item-category-form";

interface ItemCategoryEditorDialogProps {
	category?: ItemCategory;
	onSaved: () => void;
}

export default function ItemCategoryEditorDialog({
	category,
	onSaved,
}: ItemCategoryEditorDialogProps) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<ItemCategoryPayload>(() => getInitialItemCategoryForm(category));
	const [error, setError] = useState<string | null>(null);
	const isEditing = Boolean(category);
	const saveMutation = useSaveItemCategory({
		category,
		onError: setError,
		onSaved: () => {
			setOpen(false);
			onSaved();
		},
	});
	const isSaving = saveMutation.isPending;
	const title = isEditing ? "Edit item category" : "Add item category";
	const submitText = isSaving ? "Saving..." : "Save";
	const trigger = isEditing ? (
		<Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${category?.name}`}>
			<Pencil aria-hidden="true" />
		</Button>
	) : (
		<Button type="button">
			<Plus aria-hidden="true" />
			Add item category
		</Button>
	);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		setError(null);
		setForm(getInitialItemCategoryForm(category));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		saveMutation.mutate(form);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>Item category master data.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="grid gap-1">
							<Label htmlFor="item-category-name">Name</Label>
							<Input
								id="item-category-name"
								value={form.name}
								maxLength={80}
								required
								onChange={(event) => setForm({ name: event.target.value })}
							/>
						</div>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{submitText}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 6: Add the table**

```tsx
// apps/frontend/src/features/item-categories/components/ItemCategoriesTable.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import DeleteResourceDialog from "@/shared/components/DeleteResourceDialog";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import ResourceFilterPanel from "@/shared/components/table/ResourceFilterPanel";
import SortableHeaderButton from "@/shared/components/table/SortableHeaderButton";
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import { itemCategoriesResourceAtoms } from "../state/itemCategoriesResourceAtoms";
import ItemCategoryEditorDialog from "./ItemCategoryEditorDialog";

export default function ItemCategoriesTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(itemCategoriesResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((category) => (
			<TableRow key={category.id}>
				<TableCell>{category.name}</TableCell>
				<TableCell className="text-right">
					<div className="flex justify-end gap-1">
						<ItemCategoryEditorDialog category={category} onSaved={retry} />
						<DeleteResourceDialog
							endpoint={`/item-categories/${category.id}`}
							label="item category"
							name={category.name}
							onDeleted={retry}
						/>
					</div>
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={2} className="p-8 text-center text-muted-foreground">
				No item categories.
			</TableCell>
		</TableRow>
	);

	const content = error ? (
		<div role="alert" className="grid justify-items-center gap-3 p-8 text-center text-destructive">
			<p>{error}</p>
			<Button variant="outline" onClick={retry}>
				Retry
			</Button>
		</div>
	) : (
		<div className="overflow-hidden rounded-lg border">
			{loading ? (
				<p className="p-4 text-sm text-muted-foreground">Loading item categories...</p>
			) : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="name"
								label="Name"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>{tableBody}</TableBody>
			</Table>
			<PaginationFooter
				page={page}
				totalPages={totalPages}
				onPrev={() => setPage(page - 1)}
				onNext={() => setPage(page + 1)}
			/>
		</div>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>Item Categories</CardTitle>
				<ItemCategoryEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={itemCategoriesResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 7: Add the feature index and route**

```ts
// apps/frontend/src/features/item-categories/index.ts
export { default as ItemCategoriesTable } from "./components/ItemCategoriesTable";
```

```tsx
// apps/frontend/src/app/routes/item-categories.tsx
import { createFileRoute } from "@tanstack/react-router";
import { ItemCategoriesTable } from "@/features/item-categories";

export const Route = createFileRoute("/item-categories")({
	component: ItemCategoriesTable,
});
```

- [ ] **Step 8: Run the test again**

Run: `bun --filter @mini-wms/frontend test -- ItemCategoriesTable.test.tsx`
Expected: all three cases PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/features/item-categories apps/frontend/src/app/routes/item-categories.tsx apps/frontend/src/tests/ItemCategoriesTable.test.tsx
git commit -m "feat(frontend): add item categories CRUD feature"
```

---

## Task 12: Inventory frontend feature

**Files:**
- Create: `apps/frontend/src/features/inventory/state/inventoryResourceAtoms.ts`
- Create: `apps/frontend/src/features/inventory/hooks/useSaveInventory.ts`
- Create: `apps/frontend/src/features/inventory/components/InventoryEditorDialog.tsx`
- Create: `apps/frontend/src/features/inventory/components/InventoryTable.tsx`
- Modify: `apps/frontend/src/features/inventory/index.ts`
- Create: `apps/frontend/src/app/routes/inventory.tsx`
- Test: `apps/frontend/src/tests/InventoryTable.test.tsx` (existing, full file)

**Interfaces:**
- Consumes: `createPaginatedResourceAtoms`, `usePaginatedResourceAtoms`, `SortableHeaderButton`, `PaginationFooter`, `ResourceFilterPanel`, `useInventoryOptions`, `getInitialInventoryForm`, `getInventoryPayload` (all Task 8).
- Produces: `InventoryTable`, exported from `@/features/inventory` — consumed by Task 15's route/sidebar wiring (route file created here).

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/frontend test -- InventoryTable.test.tsx`
Expected: FAIL — `InventoryTable` stub renders `null`.

- [ ] **Step 2: Add the resource atoms**

```ts
// apps/frontend/src/features/inventory/state/inventoryResourceAtoms.ts
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";
import type { Inventory } from "@/shared/data/wms";

export interface InventoryFilters extends Record<string, string> {
	category: string;
	itemName: string;
	itemSku: string;
	status: string;
	warehouseCode: string;
	warehouseName: string;
}

export type InventorySort = "sku" | "quantityOnHand" | "reorderPoint" | "updatedAt";

export const inventoryResourceAtoms = createPaginatedResourceAtoms<
	Inventory,
	InventoryFilters,
	InventorySort
>({
	endpoint: "/inventory",
	filterDefinitions: [
		{
			ariaLabel: "Filter inventory by warehouse code",
			key: "warehouseCode",
			label: "Warehouse Code",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by warehouse name",
			key: "warehouseName",
			label: "Warehouse Name",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by item SKU",
			key: "itemSku",
			label: "Item SKU",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by item name",
			key: "itemName",
			label: "Item Name",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by category",
			key: "category",
			label: "Category",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by status",
			key: "status",
			label: "Status",
			operator: "eq",
			type: "select",
			options: [
				{ label: "In stock", value: "in_stock" },
				{ label: "Low stock", value: "low_stock" },
				{ label: "Out of stock", value: "out_of_stock" },
			],
		},
	],
	initialFilters: {
		category: "",
		itemName: "",
		itemSku: "",
		status: "",
		warehouseCode: "",
		warehouseName: "",
	},
	initialSort: "updatedAt",
});
```

- [ ] **Step 3: Add the save hook**

```ts
// apps/frontend/src/features/inventory/hooks/useSaveInventory.ts
import type { Inventory, InventoryPayload } from "@/shared/data/wms";
import { useSaveResource } from "@/shared/hooks/useSaveResource";

interface UseSaveInventoryParams {
	inventory?: Inventory;
	onError: (message: string) => void;
	onSaved: () => void;
}

export function useSaveInventory({ inventory, onError, onSaved }: UseSaveInventoryParams) {
	return useSaveResource<Inventory, InventoryPayload>({
		endpoint: "/inventory",
		entity: inventory,
		failureMessage: "Failed to save inventory.",
		onError,
		onSaved,
	});
}
```

- [ ] **Step 4: Add the editor dialog**

```tsx
// apps/frontend/src/features/inventory/components/InventoryEditorDialog.tsx
import { Pencil, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SelectCombobox from "@/shared/components/forms/SelectCombobox";
import type { Inventory } from "@/shared/data/wms";
import { useInventoryOptions } from "..";
import { useSaveInventory } from "../hooks/useSaveInventory";
import { getInitialInventoryForm, getInventoryPayload } from "../utils/inventory-form";

interface InventoryEditorDialogProps {
	inventory?: Inventory;
	onSaved: () => void;
}

export default function InventoryEditorDialog({ inventory, onSaved }: InventoryEditorDialogProps) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(() => getInitialInventoryForm(inventory));
	const [error, setError] = useState<string | null>(null);
	const { items, warehouses } = useInventoryOptions(open);
	const isEditing = Boolean(inventory);
	const saveMutation = useSaveInventory({
		inventory,
		onError: setError,
		onSaved: () => {
			setOpen(false);
			onSaved();
		},
	});
	const isSaving = saveMutation.isPending;
	const submitText = isSaving ? "Saving..." : "Save";
	const trigger = isEditing ? (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label={`Edit ${inventory?.warehouseCode} ${inventory?.itemSku}`}
		>
			<Pencil aria-hidden="true" />
		</Button>
	) : (
		<Button type="button">
			<Plus aria-hidden="true" />
			Add inventory
		</Button>
	);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		setError(null);
		setForm(getInitialInventoryForm(inventory));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		saveMutation.mutate(getInventoryPayload(form));
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{isEditing ? "Edit inventory" : "Add inventory"}</DialogTitle>
						<DialogDescription>Stock for one item at one warehouse.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="grid gap-1">
							<Label>Warehouse</Label>
							<SelectCombobox
								ariaLabel="Inventory warehouse"
								value={form.warehouseId}
								options={warehouses.map((warehouse) => ({
									label: `${warehouse.code} - ${warehouse.name}`,
									value: warehouse.id,
								}))}
								placeholder="Select warehouse"
								onChange={(value) => setForm((current) => ({ ...current, warehouseId: value }))}
							/>
						</div>
						<div className="grid gap-1">
							<Label>Item</Label>
							<SelectCombobox
								ariaLabel="Inventory item"
								value={form.itemId}
								options={items.map((item) => ({
									label: `${item.sku} - ${item.name}`,
									value: item.id,
								}))}
								placeholder="Select item"
								onChange={(value) => setForm((current) => ({ ...current, itemId: value }))}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="inventory-quantity">Quantity on hand</Label>
							<Input
								id="inventory-quantity"
								type="number"
								min={0}
								value={form.quantityOnHand}
								onChange={(event) =>
									setForm((current) => ({ ...current, quantityOnHand: event.target.value }))
								}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="inventory-reorder-point">Reorder point</Label>
							<Input
								id="inventory-reorder-point"
								type="number"
								min={0}
								value={form.reorderPoint}
								onChange={(event) =>
									setForm((current) => ({ ...current, reorderPoint: event.target.value }))
								}
							/>
						</div>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{submitText}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 5: Add the table**

```tsx
// apps/frontend/src/features/inventory/components/InventoryTable.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import DeleteResourceDialog from "@/shared/components/DeleteResourceDialog";
import PaginationFooter from "@/shared/components/table/PaginationFooter";
import ResourceFilterPanel from "@/shared/components/table/ResourceFilterPanel";
import SortableHeaderButton from "@/shared/components/table/SortableHeaderButton";
import { formatStatus } from "@/shared/data/wms";
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import InventoryEditorDialog from "./InventoryEditorDialog";
import { inventoryResourceAtoms } from "../state/inventoryResourceAtoms";

export default function InventoryTable() {
	const { data, error, filters, loading, order, retry, setPage, sort, toggleSort, updateFilter } =
		usePaginatedResourceAtoms(inventoryResourceAtoms);

	const rows = data?.data ?? [];
	const page = data?.page ?? 1;
	const totalPages = data?.totalPages ?? 1;

	const tableBody = rows.length ? (
		rows.map((row) => (
			<TableRow key={row.id}>
				<TableCell>{`${row.warehouseCode} - ${row.warehouseName}`}</TableCell>
				<TableCell>{row.itemSku}</TableCell>
				<TableCell>{row.itemName}</TableCell>
				<TableCell>{row.category}</TableCell>
				<TableCell>{row.quantityOnHand}</TableCell>
				<TableCell>{row.reorderPoint}</TableCell>
				<TableCell>
					<Badge variant={row.status === "in_stock" ? "secondary" : "outline"}>
						{formatStatus(row.status)}
					</Badge>
				</TableCell>
				<TableCell className="text-right">
					<div className="flex justify-end gap-1">
						<InventoryEditorDialog inventory={row} onSaved={retry} />
						<DeleteResourceDialog
							endpoint={`/inventory/${row.id}`}
							label="inventory"
							name={`${row.warehouseCode} / ${row.itemSku}`}
							onDeleted={retry}
						/>
					</div>
				</TableCell>
			</TableRow>
		))
	) : (
		<TableRow>
			<TableCell colSpan={8} className="p-8 text-center text-muted-foreground">
				No inventory.
			</TableCell>
		</TableRow>
	);

	const content = error ? (
		<div role="alert" className="grid justify-items-center gap-3 p-8 text-center text-destructive">
			<p>{error}</p>
			<Button variant="outline" onClick={retry}>
				Retry
			</Button>
		</div>
	) : (
		<div className="overflow-hidden rounded-lg border">
			{loading ? <p className="p-4 text-sm text-muted-foreground">Loading inventory...</p> : null}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Warehouse</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="sku"
								label="SKU"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>Item</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="quantityOnHand"
								label="Qty On Hand"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>
							<SortableHeaderButton
								activeOrder={order}
								activeSort={sort}
								field="reorderPoint"
								label="Reorder Point"
								onToggle={toggleSort}
							/>
						</TableHead>
						<TableHead>Status</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>{tableBody}</TableBody>
			</Table>
			<PaginationFooter
				page={page}
				totalPages={totalPages}
				onPrev={() => setPage(page - 1)}
				onNext={() => setPage(page + 1)}
			/>
		</div>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<CardTitle>Inventory</CardTitle>
				<InventoryEditorDialog onSaved={retry} />
			</CardHeader>
			<CardContent className="space-y-3">
				<ResourceFilterPanel
					filterDefinitions={inventoryResourceAtoms.config.filterDefinitions}
					filters={filters}
					onChange={(key, value) => updateFilter({ key, value })}
				/>
				{content}
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 6: Update the feature index to export the real table**

```ts
// apps/frontend/src/features/inventory/index.ts
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { Item, PaginatedResponse, Warehouse } from "@/shared/data/wms";

export { default as InventoryTable } from "./components/InventoryTable";

export function useInventoryOptions(enabled = true) {
	const warehousesQuery = useQuery({
		queryKey: ["/warehouses", "options"],
		queryFn: () =>
			apiService.get<PaginatedResponse<Warehouse>>("/warehouses?page=1&limit=50&sort=code&order=ASC"),
		enabled,
		retry: false,
	});
	const itemsQuery = useQuery({
		queryKey: ["/items", "options"],
		queryFn: () => apiService.get<PaginatedResponse<Item>>("/items?page=1&limit=50&sort=sku&order=ASC"),
		enabled,
		retry: false,
	});

	return {
		items: itemsQuery.data?.data ?? [],
		loading: warehousesQuery.isLoading || itemsQuery.isLoading,
		warehouses: warehousesQuery.data?.data ?? [],
	};
}
```

- [ ] **Step 7: Add the route**

```tsx
// apps/frontend/src/app/routes/inventory.tsx
import { createFileRoute } from "@tanstack/react-router";
import { InventoryTable } from "@/features/inventory";

export const Route = createFileRoute("/inventory")({
	component: InventoryTable,
});
```

- [ ] **Step 8: Run the test again**

Run: `bun --filter @mini-wms/frontend test -- InventoryTable.test.tsx`
Expected: PASSES.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/features/inventory apps/frontend/src/app/routes/inventory.tsx
git commit -m "feat(frontend): add inventory CRUD feature"
```

---

## Task 13: Inventory Policy frontend feature

**Files:**
- Create: `apps/frontend/src/features/inventory-policy/hooks/useInventoryPolicy.ts`
- Create: `apps/frontend/src/features/inventory-policy/hooks/useSaveInventoryPolicy.ts`
- Create: `apps/frontend/src/features/inventory-policy/components/InventoryPolicyPage.tsx`
- Modify: `apps/frontend/src/features/inventory-policy/index.ts`
- Create: `apps/frontend/src/app/routes/inventory-policy.tsx`
- Test: `apps/frontend/src/tests/InventoryPolicyPage.test.tsx` (existing, full file)

**Interfaces:**
- Consumes: `apiService`, `InventoryPolicy`/`InventoryPolicyPayload`/`LowStockMode` types (Task 8), `sonner`'s `toast` (already a dependency, used via `@/components/ui/sonner`'s `Toaster` which is already mounted by `renderWithProviders({toaster: true})` in tests).
- Produces: `InventoryPolicyPage`, exported from `@/features/inventory-policy` — consumed by Task 15's sidebar wiring (route created here).

- [ ] **Step 1: Run the existing test to see today's failures**

Run: `bun --filter @mini-wms/frontend test -- InventoryPolicyPage.test.tsx`
Expected: FAIL — `InventoryPolicyPage` stub renders `null`.

- [ ] **Step 2: Add the read/write hooks**

```ts
// apps/frontend/src/features/inventory-policy/hooks/useInventoryPolicy.ts
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { InventoryPolicy } from "@/shared/data/wms";

export function useInventoryPolicy() {
	const query = useQuery({
		queryKey: ["/inventory-policy"],
		queryFn: () => apiService.get<InventoryPolicy>("/inventory-policy"),
		retry: false,
	});

	return {
		data: query.data ?? null,
		error: query.error instanceof Error ? query.error.message : null,
		loading: query.isLoading,
	};
}
```

```ts
// apps/frontend/src/features/inventory-policy/hooks/useSaveInventoryPolicy.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { InventoryPolicy, InventoryPolicyPayload } from "@/shared/data/wms";

interface UseSaveInventoryPolicyParams {
	onSaved: () => void;
}

export function useSaveInventoryPolicy({ onSaved }: UseSaveInventoryPolicyParams) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: InventoryPolicyPayload) =>
			apiService.put<InventoryPolicy>("/inventory-policy", payload),
		onSuccess: (data) => {
			queryClient.setQueryData(["/inventory-policy"], data);
			onSaved();
		},
	});
}
```

- [ ] **Step 3: Add the page**

```tsx
// apps/frontend/src/features/inventory-policy/components/InventoryPolicyPage.tsx
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SelectCombobox from "@/shared/components/forms/SelectCombobox";
import type { InventoryPolicyPayload, LowStockMode } from "@/shared/data/wms";
import { useInventoryPolicy } from "../hooks/useInventoryPolicy";
import { useSaveInventoryPolicy } from "../hooks/useSaveInventoryPolicy";

const modeOptions: Array<{ label: string; value: LowStockMode }> = [
	{ label: "Use reorder point", value: "reorder_point" },
	{ label: "Use low stock threshold", value: "low_stock_threshold" },
];

export default function InventoryPolicyPage() {
	const { data: policy, loading } = useInventoryPolicy();
	const [form, setForm] = useState<InventoryPolicyPayload>({
		lowStockMode: "reorder_point",
		lowStockThreshold: 0,
	});
	const saveMutation = useSaveInventoryPolicy({
		onSaved: () => toast.success("Inventory policy saved."),
	});

	useEffect(() => {
		if (policy) {
			setForm({ lowStockMode: policy.lowStockMode, lowStockThreshold: policy.lowStockThreshold });
		}
	}, [policy]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		saveMutation.mutate(form);
	}

	if (loading && !policy) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Inventory Policy</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="grid max-w-sm gap-3">
					<div className="grid gap-1">
						<Label>Low stock mode</Label>
						<SelectCombobox
							ariaLabel="Low stock mode"
							value={form.lowStockMode}
							options={modeOptions}
							placeholder="Select mode"
							onChange={(value) => setForm((current) => ({ ...current, lowStockMode: value }))}
						/>
					</div>
					{form.lowStockMode === "low_stock_threshold" ? (
						<div className="grid gap-1">
							<Label htmlFor="low-stock-threshold">Low stock threshold</Label>
							<Input
								id="low-stock-threshold"
								type="number"
								min={0}
								value={form.lowStockThreshold}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										lowStockThreshold: Number(event.target.value),
									}))
								}
							/>
						</div>
					) : null}
					<Button type="submit" disabled={saveMutation.isPending}>
						{saveMutation.isPending ? "Saving..." : "Save"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 4: Update the feature index and add the route**

```ts
// apps/frontend/src/features/inventory-policy/index.ts
export { default as InventoryPolicyPage } from "./components/InventoryPolicyPage";
```

```tsx
// apps/frontend/src/app/routes/inventory-policy.tsx
import { createFileRoute } from "@tanstack/react-router";
import { InventoryPolicyPage } from "@/features/inventory-policy";

export const Route = createFileRoute("/inventory-policy")({
	component: InventoryPolicyPage,
});
```

- [ ] **Step 5: Run the test again**

Run: `bun --filter @mini-wms/frontend test -- InventoryPolicyPage.test.tsx`
Expected: both cases PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/inventory-policy apps/frontend/src/app/routes/inventory-policy.tsx
git commit -m "feat(frontend): add inventory policy settings page"
```

---

## Task 14: Dashboard frontend feature

**Files:**
- Modify: `apps/frontend/src/features/dashboard/components/DashboardPage.tsx`
- Test: `apps/frontend/src/tests/DashboardPage.test.tsx` (existing, full file)

**Interfaces:**
- Consumes: `apiService`, `formatStatus`, `Inventory`/`InventoryStatusSummary`/`LowStockByCategory` types (Task 8). No later task depends on this file.

- [ ] **Step 1: Run the existing test to see today's failure**

Run: `bun --filter @mini-wms/frontend test -- DashboardPage.test.tsx`
Expected: FAIL — the placeholder page has no data.

- [ ] **Step 2: Replace `DashboardPage.tsx`**

The three `useQuery` calls must stay declared in this exact order (summary, then by-category, then low-stock items) — the test's `mockFetchSequence` supplies responses strictly in call order, not by URL, so declaration order **is** the contract:

```tsx
// apps/frontend/src/features/dashboard/components/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatStatus } from "@/shared/data/wms";
import type { Inventory, InventoryStatusSummary, LowStockByCategory } from "@/shared/data/wms";

export default function DashboardPage() {
	const summaryQuery = useQuery({
		queryKey: ["/dashboard/inventory-status-summary"],
		queryFn: () => apiService.get<InventoryStatusSummary>("/dashboard/inventory-status-summary"),
		retry: false,
	});
	const byCategoryQuery = useQuery({
		queryKey: ["/dashboard/low-stock-by-category"],
		queryFn: () => apiService.get<LowStockByCategory[]>("/dashboard/low-stock-by-category"),
		retry: false,
	});
	const lowStockItemsQuery = useQuery({
		queryKey: ["/dashboard/low-stock-items"],
		queryFn: () => apiService.get<Inventory[]>("/dashboard/low-stock-items?limit=10"),
		retry: false,
	});

	const summary = summaryQuery.data;
	const categories = byCategoryQuery.data ?? [];
	const lowStockItems = lowStockItemsQuery.data ?? [];

	return (
		<div className="grid gap-4">
			<div className="grid gap-4 md:grid-cols-4">
				<SummaryCard label="Inventory rows" value={summary?.totalRows ?? 0} />
				<SummaryCard label="In stock" value={summary?.inStockRows ?? 0} />
				<SummaryCard label="Low stock" value={summary?.lowStockRows ?? 0} />
				<SummaryCard label="Out of stock" value={summary?.outOfStockRows ?? 0} />
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Low Stock By Category</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					{categories.length ? (
						categories.map((entry) => (
							<div
								key={entry.category}
								className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
							>
								<span>{entry.category}</span>
								<Badge variant="outline">{entry.count}</Badge>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">No low-stock categories.</p>
					)}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Low Stock Rows</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Warehouse</TableHead>
								<TableHead>SKU</TableHead>
								<TableHead>Item</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Qty On Hand</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{lowStockItems.length ? (
								lowStockItems.map((row) => (
									<TableRow key={row.id}>
										<TableCell>{row.warehouseCode}</TableCell>
										<TableCell>{row.itemSku}</TableCell>
										<TableCell>{row.itemName}</TableCell>
										<TableCell>{row.category}</TableCell>
										<TableCell>{row.quantityOnHand}</TableCell>
										<TableCell>
											<Badge variant="outline">{formatStatus(row.status)}</Badge>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
										No low-stock rows.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}

function SummaryCard({ label, value }: { label: string; value: number }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
			</CardHeader>
			<CardContent className="text-2xl font-semibold">{value}</CardContent>
		</Card>
	);
}
```

- [ ] **Step 3: Run the test again**

Run: `bun --filter @mini-wms/frontend test -- DashboardPage.test.tsx`
Expected: PASSES.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/dashboard
git commit -m "feat(frontend): build the dashboard from inventory data"
```

---

## Task 15: Routing + sidebar navigation wiring

**Files:**
- Modify: `apps/frontend/src/app/routes/__root.tsx`

**Interfaces:**
- Consumes: routes created in Tasks 11–13 (`/item-categories`, `/inventory`, `/inventory-policy`) plus the existing `/dashboard` route (already present, never added to the nav).

- [ ] **Step 1: Add the new nav entries**

In `apps/frontend/src/app/routes/__root.tsx`, update the imports and `navigationSections`:

```tsx
import { createRootRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Boxes, LayoutDashboard, Package, SlidersHorizontal, Tags, Warehouse } from "lucide-react";
```

```tsx
const navigationSections: NavigationSection[] = [
	{
		label: "Master Data",
		items: [
			{ icon: Package, label: "Items", to: "/items" },
			{ icon: Tags, label: "Item Categories", to: "/item-categories" },
			{ icon: Warehouse, label: "Warehouses", to: "/warehouses" },
		],
	},
	{
		label: "Operations",
		items: [
			{ icon: Boxes, label: "Inventory", to: "/inventory" },
			{ icon: SlidersHorizontal, label: "Inventory Policy", to: "/inventory-policy" },
			{ icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
		],
	},
];
```

Leave the rest of the file (`RootLayout`, `getSidebarSections`, `getSidebarItems`, `isActivePath`) unchanged.

- [ ] **Step 2: Verify by hand with the dev server**

There is no automated test for sidebar navigation (`e2e/*.spec.ts` all use direct `page.goto("/inventory")`-style navigation). Verify manually:

Run: `bun --filter @mini-wms/backend dev` (in one terminal) and `bun --filter @mini-wms/frontend dev` (in another), after `docker compose up -d` and `bun --filter @mini-wms/backend db:seed`.

Open `http://localhost:5173`, confirm the sidebar shows Items, Item Categories, Warehouses under "Master Data" and Inventory, Inventory Policy, Dashboard under "Operations", and that clicking each link navigates correctly with no console errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/routes/__root.tsx
git commit -m "feat(frontend): wire sidebar navigation for new features"
```

---

## Task 16: Full frontend verification + e2e

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full frontend suite**

Run: `bun run test:frontend`
Expected: all test files pass, including the new `ItemCategoriesTable.test.tsx`.

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: no errors. If Biome flags formatting issues, run `bun run format` and review the diff.

- [ ] **Step 3: Run the e2e suite**

Run: `bun run test:e2e`
Expected: this resets the database (`db:reset`) and runs the full Playwright suite (`warehouses`, `items`, `inventory`, `inventory-policy`, `dashboard` specs) headlessly. All specs pass. If a spec fails on an accessible-name mismatch, cross-check the exact string against the spec file (e.g. `e2e/inventory.spec.ts`'s `"Edit MKS-02 STRAP-GREEN"` / `"Delete MKS-02 / STRAP-GREEN"`) against Task 12's `InventoryEditorDialog`/`DeleteResourceDialog` usage — these are the two most detail-sensitive strings in the whole plan.

- [ ] **Step 4: Commit (only if `bun run format` changed anything)**

```bash
git add apps/frontend
git commit -m "chore(frontend): apply formatting"
```

---

## Self-Review Notes

- **Spec coverage:** All 6 README capabilities map to tasks — Item Categories (3, 11), Inventory (5, 12), Inventory Policy (4, 13), Backend pagination/sorting (1, 2, 5), Frontend tables/query state (8, 9, 10), Dashboard (6, 14). Routing/nav (15) and verification (7, 16) round it out.
- **Type consistency checked:** `InventoryRow` (Task 5) is reused verbatim by Task 6 (`DashboardService.getLowStockItems`) and matches the frontend `Inventory` type (Task 8) field-for-field. `usePaginatedResourceAtoms`'s return shape (Task 8) is used identically across Tasks 9, 10, 11, 12. `getInitialInventoryForm`/`getInventoryPayload` (Task 8) signatures match their only call site (Task 12's `InventoryEditorDialog`).
- **Known detail risk:** the dashboard's "low stock" grouping/ranking endpoints intentionally include `out_of_stock` rows (see Task 6, Step 3's note) — this was reverse-engineered from the seed data in `dashboard.spec.ts`, not stated explicitly in the README, and is the single most surprising piece of business logic in the whole plan.

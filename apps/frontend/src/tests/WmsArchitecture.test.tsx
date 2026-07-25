import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/app/providers";
import { useInventoryOptions } from "@/features/inventory";
import {
	getInitialInventoryForm,
	getInventoryPayload,
} from "@/features/inventory/utils/inventory-form";
import { useItemCategoryOptions } from "@/features/items";
import { getInitialItemForm } from "@/features/items/utils/item-form";
import { getInitialWarehouseForm } from "@/features/warehouses/utils/warehouse-form";
import { usePaginatedResourceAtoms } from "@/shared/hooks/pagination/usePaginatedResourceAtoms";
import { useSaveResource } from "@/shared/hooks/useSaveResource";
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";
import { mockFetch, mockFetchSequence, paginated } from "./resource-test-utils";

interface TestEntity {
	id: string;
	name: string;
	status: string;
}

interface TestPayload {
	name: string;
	status: string;
}

interface TestFilters extends Record<string, string> {
	name: string;
	status: string;
}

type TestSort = "createdAt" | "name";

describe("WMS architecture helpers", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("maps edit forms from entities without component logic", () => {
		const warehouseForm = getInitialWarehouseForm({
			id: "warehouse-1",
			code: "JKT-01",
			name: "Jakarta Fulfillment Center",
			city: "Jakarta",
			status: "inactive",
			createdAt: "2026-01-20T10:00:00.000Z",
		});
		const itemForm = getInitialItemForm({
			id: "item-1",
			sku: "BOX-SHIP-M",
			name: "Shipping Box Medium",
			categoryId: "category-packaging",
			category: "Packaging",
			unit: "pcs",
			status: "discontinued",
			createdAt: "2026-01-20T10:00:00.000Z",
		});
		const inventoryPayload = getInventoryPayload({
			warehouseId: "warehouse-1",
			itemId: "item-1",
			quantityOnHand: "24",
			reorderPoint: "30",
		});

		expect(warehouseForm).toEqual({
			code: "JKT-01",
			name: "Jakarta Fulfillment Center",
			city: "Jakarta",
			status: "inactive",
		});
		expect(itemForm).toEqual({
			sku: "BOX-SHIP-M",
			name: "Shipping Box Medium",
			categoryId: "category-packaging",
			unit: "pcs",
			status: "discontinued",
		});
		expect(getInitialInventoryForm()).toEqual({
			warehouseId: "",
			itemId: "",
			quantityOnHand: "0",
			reorderPoint: "0",
		});
		expect(inventoryPayload).toEqual({
			warehouseId: "warehouse-1",
			itemId: "item-1",
			quantityOnHand: 24,
			reorderPoint: 30,
		});
	});

	it("builds paginated query strings from resource atoms", async () => {
		const fetchMock = mockFetch(
			paginated<TestEntity>([{ id: "entity-1", name: "Alpha", status: "active" }]),
		);
		const resourceAtoms = createPaginatedResourceAtoms<TestEntity, TestFilters, TestSort>({
			endpoint: "/test-entities",
			filterDefinitions: [
				{
					ariaLabel: "Filter by name",
					key: "name",
					label: "Name",
					operator: "ilike",
					type: "input",
				},
				{
					ariaLabel: "Filter by status",
					key: "status",
					label: "Status",
					operator: "eq",
					type: "select",
				},
			],
			initialFilters: { name: "", status: "" },
			initialSort: "createdAt",
		});
		const { result } = renderHook(() => usePaginatedResourceAtoms(resourceAtoms), {
			wrapper: ProviderWrapper,
		});

		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/test-entities?page=1&limit=5&sort=createdAt&order=DESC",
				undefined,
			),
		);

		act(() => {
			result.current.setPage(3);
			result.current.updateFilter({ key: "name", value: " alpha " });
		});

		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/test-entities?page=1&limit=5&sort=createdAt&order=DESC&name=ilike%3Aalpha",
				undefined,
			),
		);

		act(() => result.current.toggleSort("name"));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/test-entities?page=1&limit=5&sort=name&order=ASC&name=ilike%3Aalpha",
				undefined,
			),
		);
	});

	it("loads item category options only when enabled", async () => {
		const fetchMock = mockFetch(
			paginated([{ id: "category-packaging", name: "Packaging", createdAt: "2026-01-20" }]),
		);
		const { rerender, result } = renderHook(({ enabled }) => useItemCategoryOptions(enabled), {
			initialProps: { enabled: false },
		});

		expect(fetchMock).not.toHaveBeenCalled();

		rerender({ enabled: true });

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.data).toEqual([
			{ id: "category-packaging", name: "Packaging", createdAt: "2026-01-20" },
		]);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/item-categories?page=1&limit=50&sort=name&order=ASC",
			undefined,
		);
	});

	it("loads inventory editor options from feature hook", async () => {
		const fetchMock = mockFetchSequence([
			paginated([{ id: "warehouse-1", code: "JKT-01", name: "Jakarta", city: "Jakarta" }]),
			paginated([{ id: "item-1", sku: "BOX-SHIP-M", name: "Shipping Box Medium" }]),
		]);
		const { result } = renderHook(() => useInventoryOptions(true));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.warehouses).toHaveLength(1);
		expect(result.current.items).toHaveLength(1);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"/api/warehouses?page=1&limit=50&sort=code&order=ASC",
			undefined,
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"/api/items?page=1&limit=50&sort=sku&order=ASC",
			undefined,
		);
	});

	it("saves resources through the shared mutation hook", async () => {
		const onError = vi.fn();
		const onSaved = vi.fn();
		const responseBody = { id: "entity-1", name: "Updated", status: "active" };
		const fetchMock = mockFetch(responseBody);
		const { result } = renderHook(
			() =>
				useSaveResource<TestEntity, TestPayload>({
					endpoint: "/test-entities",
					entity: { id: "entity-1", name: "Previous", status: "inactive" },
					failureMessage: "Failed to save test entity.",
					onError,
					onSaved,
				}),
			{ wrapper: ProviderWrapper },
		);

		await act(async () => {
			await result.current.mutateAsync({ name: "Updated", status: "active" });
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/test-entities/entity-1",
			expect.objectContaining({
				body: JSON.stringify({ name: "Updated", status: "active" }),
				method: "PATCH",
			}),
		);
		expect(onSaved).toHaveBeenCalled();
		expect(onSaved.mock.calls[0]?.[0]).toEqual(responseBody);
		expect(onError).not.toHaveBeenCalled();
	});
});

function ProviderWrapper({ children }: { children: ReactNode }) {
	return <AppProviders>{children}</AppProviders>;
}

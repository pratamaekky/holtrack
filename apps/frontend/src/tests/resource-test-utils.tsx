import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { AppProviders } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";

interface RenderOptions {
	toaster?: boolean;
}

export function renderWithProviders(component: ReactElement, options: RenderOptions = {}) {
	const toaster = options.toaster ? <Toaster /> : null;

	return render(
		<AppProviders>
			{component}
			{toaster}
		</AppProviders>,
	);
}

export function paginated<T>(data: T[], totalPages = 1) {
	return {
		data,
		page: 1,
		limit: 5,
		total: data.length,
		totalPages,
	};
}

export function warehouse(code: string, name: string) {
	return {
		id: code,
		code,
		name,
		city: code.startsWith("JKT") ? "Jakarta" : "Bandung",
		status: "active",
		createdAt: "2026-01-20T10:00:00.000Z",
	};
}

export function item(sku: string, name: string) {
	return {
		id: sku,
		sku,
		name,
		category: "Accessories",
		categoryId: "category-Accessories",
		unit: "pcs",
		status: "active",
		createdAt: "2026-01-20T10:00:00.000Z",
	};
}

export function inventory() {
	return {
		id: "inventory-1",
		warehouseId: "warehouse-1",
		warehouseCode: "JKT-01",
		warehouseName: "Jakarta Fulfillment Center",
		itemId: "item-1",
		itemSku: "CHG-USBC-20W",
		itemName: "USB-C Charger 20W",
		quantityOnHand: 24,
		reorderPoint: 30,
		status: "low_stock",
		updatedAt: "2026-01-20T10:00:00.000Z",
	};
}

export function inventoryPolicy(lowStockThreshold: number) {
	return {
		id: "default",
		lowStockMode: lowStockThreshold > 0 ? "low_stock_threshold" : "reorder_point",
		lowStockThreshold,
		createdAt: "2026-01-20T10:00:00.000Z",
		updatedAt: "2026-01-20T10:00:00.000Z",
	};
}

export function mockFetch(body: unknown) {
	return vi
		.spyOn(globalThis, "fetch")
		.mockImplementation(() => Promise.resolve(jsonResponse(body)));
}

export function mockFetchSequence(bodies: unknown[]) {
	const fetchMock = vi.spyOn(globalThis, "fetch");

	for (const body of bodies) {
		fetchMock.mockResolvedValueOnce(jsonResponse(body));
	}

	fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(bodies.at(-1))));

	return fetchMock;
}

export function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

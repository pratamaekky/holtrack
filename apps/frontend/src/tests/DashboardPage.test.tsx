import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/features/dashboard";
import { mockFetchSequence, renderWithProviders } from "./resource-test-utils";

describe("DashboardPage", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("loads dashboard status summary and low-stock rows", async () => {
		mockFetchSequence([
			{ totalRows: 5, inStockRows: 1, lowStockRows: 3, outOfStockRows: 1 },
			[{ category: "Packaging", count: 2 }],
			[
				{
					id: "inventory-1",
					warehouseCode: "JKT-01",
					itemSku: "BOX-SHIP-M",
					itemName: "Shipping Box Medium",
					category: "Packaging",
					quantityOnHand: 0,
					reorderPoint: 50,
					status: "out_of_stock",
				},
			],
		]);
		renderWithProviders(<DashboardPage />);

		await screen.findByText("Inventory rows");
		expect(await screen.findAllByText("Packaging")).toHaveLength(2);
		await screen.findByText("BOX-SHIP-M");
		expect(screen.getByText("Out Of Stock")).toBeInTheDocument();
	});
});

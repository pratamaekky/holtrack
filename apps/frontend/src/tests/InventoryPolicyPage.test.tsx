import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InventoryPolicyPage } from "@/features/inventory-policy";
import {
	inventoryPolicy,
	mockFetch,
	mockFetchSequence,
	renderWithProviders,
} from "./resource-test-utils";

describe("InventoryPolicyPage", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("updates the inventory policy", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetchSequence([inventoryPolicy(0), inventoryPolicy(15)]);
		renderWithProviders(<InventoryPolicyPage />, { toaster: true });

		await screen.findByText("Inventory Policy");
		await user.click(screen.getByRole("combobox", { name: "Low stock mode" }));
		await user.click(await screen.findByRole("option", { name: "Use low stock threshold" }));
		await user.clear(screen.getByRole("spinbutton", { name: "Low stock threshold" }));
		await user.type(screen.getByRole("spinbutton", { name: "Low stock threshold" }), "15");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await screen.findByText("Inventory policy saved.");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/inventory-policy",
			expect.objectContaining({
				body: JSON.stringify({
					lowStockMode: "low_stock_threshold",
					lowStockThreshold: 15,
				}),
				method: "PUT",
			}),
		);
	});

	it("hides the inventory policy threshold field in reorder-point mode", async () => {
		mockFetch(inventoryPolicy(0));
		renderWithProviders(<InventoryPolicyPage />, { toaster: true });

		await screen.findByText("Inventory Policy");

		expect(
			screen.queryByRole("spinbutton", { name: "Low stock threshold" }),
		).not.toBeInTheDocument();
	});
});

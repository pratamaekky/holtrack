import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InventoryTable } from "@/features/inventory";
import { inventory, mockFetch, paginated, renderWithProviders } from "./resource-test-utils";

describe("InventoryTable", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("filters inventory by status and displays derived fields", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetch(paginated([inventory()]));
		renderWithProviders(<InventoryTable />);

		await screen.findByText("USB-C Charger 20W");
		await screen.findByText("Low Stock");
		await user.click(screen.getByRole("button", { name: "Filter" }));
		await user.click(screen.getByRole("combobox", { name: "Filter inventory by status" }));
		await user.click(await screen.findByRole("option", { name: "Low stock" }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/inventory?page=1&limit=5&sort=updatedAt&order=DESC&status=eq%3Alow_stock",
				undefined,
			),
		);
	});
});

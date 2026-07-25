import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WarehousesTable } from "@/features/warehouses";
import {
	jsonResponse,
	mockFetchSequence,
	paginated,
	renderWithProviders,
	warehouse,
} from "./resource-test-utils";

describe("WarehousesTable", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("filters warehouses and resets pagination", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetchSequence([
			paginated([warehouse("JKT-01", "Jakarta Fulfillment Center")], 2),
			{ ...paginated([warehouse("BDG-01", "Bandung Reserve Warehouse")], 2), page: 2 },
			paginated([warehouse("BDG-01", "Bandung Reserve Warehouse")], 1),
		]);
		renderWithProviders(<WarehousesTable />);

		await screen.findByText("Jakarta Fulfillment Center");
		await user.click(screen.getByRole("button", { name: "Next" }));
		await screen.findByText("Page 2 of 2");
		await user.click(screen.getByRole("button", { name: "Filter" }));
		await user.type(screen.getByLabelText("Filter warehouses by city"), "bandung");

		await screen.findByText("Page 1 of 1");
		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/warehouses?page=1&limit=5&sort=createdAt&order=DESC&city=ilike%3Abandung",
				undefined,
			),
		);
	});

	it("retries after a warehouse load error", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(jsonResponse({ message: "Backend unavailable" }, 500))
			.mockResolvedValueOnce(
				jsonResponse(paginated([warehouse("JKT-01", "Jakarta Fulfillment Center")])),
			);
		renderWithProviders(<WarehousesTable />);

		expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");
		await user.click(screen.getByRole("button", { name: "Retry" }));

		await screen.findByText("Jakarta Fulfillment Center");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("creates a warehouse and refreshes the table", async () => {
		const user = userEvent.setup();
		const newWarehouse = warehouse("MDN-01", "Medan Forward Stock");
		const fetchMock = mockFetchSequence([paginated([]), newWarehouse, paginated([newWarehouse])]);
		renderWithProviders(<WarehousesTable />);

		await screen.findByText("No warehouses.");
		await user.click(screen.getByRole("button", { name: "Add warehouse" }));
		await user.type(screen.getByLabelText("Code"), "mdn-01");
		await user.type(screen.getByLabelText("Name"), "Medan Forward Stock");
		await user.type(screen.getByLabelText("City"), "Medan");
		await user.click(screen.getByRole("button", { name: "Save" }));

		await screen.findByText("Medan Forward Stock");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/warehouses",
			expect.objectContaining({
				body: JSON.stringify({
					code: "mdn-01",
					name: "Medan Forward Stock",
					city: "Medan",
					status: "active",
				}),
				method: "POST",
			}),
		);
	});
});

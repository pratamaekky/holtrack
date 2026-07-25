import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemsTable } from "@/features/items";
import {
	item,
	jsonResponse,
	mockFetch,
	mockFetchSequence,
	paginated,
	renderWithProviders,
} from "./resource-test-utils";

describe("ItemsTable", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("sorts items by SKU", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetch(paginated([item("CASE-IP15-BLK", "iPhone 15 Case Black")]));
		renderWithProviders(<ItemsTable />);

		await screen.findByText("iPhone 15 Case Black");
		await user.click(screen.getByRole("button", { name: "SKU: not sorted" }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/items?page=1&limit=5&sort=sku&order=ASC",
				undefined,
			),
		);
	});

	it("filters items by category and resets pagination", async () => {
		const user = userEvent.setup();
		const fetchMock = mockFetchSequence([
			paginated([item("CASE-IP15-BLK", "iPhone 15 Case Black")], 2),
			{ ...paginated([item("BOX-SHIP-M", "Shipping Box Medium")], 2), page: 2 },
			paginated([item("BOX-SHIP-M", "Shipping Box Medium")], 1),
		]);
		renderWithProviders(<ItemsTable />);

		await screen.findByText("iPhone 15 Case Black");
		await user.click(screen.getByRole("button", { name: "Next" }));
		await screen.findByText("Page 2 of 2");
		await user.click(screen.getByRole("button", { name: "Filter" }));
		await user.type(screen.getByLabelText("Filter items by category"), "packaging");

		await screen.findByText("Page 1 of 1");
		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/items?page=1&limit=5&sort=createdAt&order=DESC&category=ilike%3Apackaging",
				undefined,
			),
		);
	});

	it("retries after an item load error", async () => {
		const user = userEvent.setup();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(jsonResponse({ message: "Backend unavailable" }, 500))
			.mockResolvedValueOnce(
				jsonResponse(paginated([item("CASE-IP15-BLK", "iPhone 15 Case Black")])),
			);
		renderWithProviders(<ItemsTable />);

		expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");
		await user.click(screen.getByRole("button", { name: "Retry" }));

		await screen.findByText("iPhone 15 Case Black");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

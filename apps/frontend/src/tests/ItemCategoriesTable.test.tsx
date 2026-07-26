import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemCategoriesTable } from "@/features/item-categories";
import {
	jsonResponse,
	mockFetchSequence,
	paginated,
	renderWithProviders,
} from "./resource-test-utils";

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

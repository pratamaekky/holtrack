import { expect, test } from "@playwright/test";
import { E2E_BACKEND_URL } from "./config";

test("filters inventory by derived status", async ({ page }) => {
	await page.goto("/inventory");

	await page.getByRole("button", { name: "Filter" }).click();
	await page.getByRole("combobox", { name: "Filter inventory by status" }).click();
	await page.getByRole("option", { name: "Low stock" }).click();

	await expect(page.getByRole("cell", { name: "Low Stock" }).first()).toBeVisible();
	await expect(page.getByRole("cell", { name: "CHG-USBC-20W", exact: true })).toBeVisible();
});

test("creates, updates, and deletes inventory", async ({ page, request }) => {
	const categoryResponse = await request.post(`${E2E_BACKEND_URL}/item-categories`, {
		data: {
			name: "General",
		},
	});
	const warehouseResponse = await request.post(`${E2E_BACKEND_URL}/warehouses`, {
		data: {
			code: "mks-02",
			name: "Makassar Overflow",
			city: "Makassar",
			status: "active",
		},
	});
	const itemResponse = await request.post(`${E2E_BACKEND_URL}/items`, {
		data: {
			sku: "strap-green",
			name: "Green Strap",
			categoryId: (await categoryResponse.json()).id,
			unit: "pcs",
			status: "active",
		},
	});

	expect(categoryResponse.ok()).toBeTruthy();
	expect(warehouseResponse.ok()).toBeTruthy();
	expect(itemResponse.ok()).toBeTruthy();

	await page.goto("/inventory");
	await page.getByRole("button", { name: "Add inventory" }).click();
	await page.getByRole("combobox", { name: "Inventory warehouse" }).click();
	await page.getByRole("option", { name: "MKS-02 - Makassar Overflow" }).click();
	await page.getByRole("combobox", { name: "Inventory item" }).click();
	await page.getByRole("option", { name: "STRAP-GREEN - Green Strap" }).click();
	await page.getByRole("spinbutton", { name: "Quantity on hand" }).fill("3");
	await page.getByRole("spinbutton", { name: "Reorder point" }).fill("5");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByRole("cell", { name: "MKS-02", exact: true })).toBeVisible();
	await expect(page.getByRole("cell", { name: "Low Stock" }).first()).toBeVisible();

	await page.getByRole("button", { name: "Edit MKS-02 STRAP-GREEN" }).click();
	await page.getByRole("spinbutton", { name: "Quantity on hand" }).fill("30");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(
		page.getByRole("row", { name: /MKS-02.*STRAP-GREEN/ }).getByRole("cell", { name: "In Stock" }),
	).toBeVisible();

	await page.getByRole("button", { name: "Delete MKS-02 / STRAP-GREEN" }).click();
	await page.getByRole("button", { name: "Delete", exact: true }).click();

	await expect(page.getByRole("cell", { name: "MKS-02", exact: true })).toHaveCount(0);
});

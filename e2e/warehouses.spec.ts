import { expect, test } from "@playwright/test";

test("filters and sorts warehouses", async ({ page }) => {
	await page.goto("/warehouses");

	await expect(page.getByRole("cell", { name: "Jakarta Fulfillment Center" })).toBeVisible();

	await page.getByRole("button", { name: "Filter" }).click();
	await page.getByLabel("Filter warehouses by city").fill("bandung");

	await expect(page.getByRole("cell", { name: "Bandung Reserve Warehouse" })).toBeVisible();
	await expect(page.getByRole("cell", { name: "Jakarta Fulfillment Center" })).toHaveCount(0);

	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Code: not sorted" }).click();
	await expect(page.getByRole("button", { name: "Code: sorted ascending" })).toBeVisible();
});

test("creates, updates, and deletes a warehouse", async ({ page }) => {
	await page.goto("/warehouses");

	await page.getByRole("button", { name: "Add warehouse" }).click();
	await page.getByRole("textbox", { name: "Code" }).fill("mks-01");
	await page.getByRole("textbox", { name: "Name" }).fill("Makassar Overflow");
	await page.getByRole("textbox", { name: "City" }).fill("Makassar");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByRole("cell", { name: "MKS-01", exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Edit MKS-01" }).click();
	await page.getByRole("textbox", { name: "City" }).fill("Gowa");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByRole("cell", { name: "Gowa" })).toBeVisible();

	await page.getByRole("button", { name: "Delete MKS-01" }).click();
	await page.getByRole("button", { name: "Delete", exact: true }).click();

	await expect(page.getByRole("cell", { name: "MKS-01", exact: true })).toHaveCount(0);
});

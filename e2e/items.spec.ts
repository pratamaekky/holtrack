import { expect, test } from "@playwright/test";

test("filters items by category", async ({ page }) => {
	await page.goto("/items");

	await page.getByRole("button", { name: "Filter" }).click();
	await page.getByLabel("Filter items by category").fill("packaging");

	await expect(page.getByRole("cell", { name: "Shipping Box Medium" })).toBeVisible();
	await expect(page.getByRole("cell", { name: "iPhone 15 Case Black" })).toHaveCount(0);
});

test("creates, updates, and deletes an item", async ({ page }) => {
	await page.goto("/items");

	await page.getByRole("button", { name: "Add item" }).click();
	await page.getByRole("textbox", { name: "SKU" }).fill("strap-blue");
	await page.getByRole("textbox", { name: "Name" }).fill("Blue Strap");
	await page.getByRole("combobox", { name: "Item category" }).click();
	await page.getByRole("option", { name: "Packaging" }).click();
	await page.getByRole("textbox", { name: "Unit" }).fill("pcs");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByRole("cell", { name: "STRAP-BLUE", exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Edit STRAP-BLUE" }).click();
	await page.getByRole("textbox", { name: "Unit" }).fill("bundle");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByRole("cell", { name: "bundle" })).toBeVisible();

	await page.getByRole("button", { name: "Delete STRAP-BLUE" }).click();
	await page.getByRole("button", { name: "Delete", exact: true }).click();

	await expect(page.getByRole("cell", { name: "STRAP-BLUE", exact: true })).toHaveCount(0);
});

import { expect, test } from "@playwright/test";
import { E2E_BACKEND_URL } from "./config";

test.afterAll(async ({ request }) => {
	await request.put(`${E2E_BACKEND_URL}/inventory-policy`, {
		data: { lowStockMode: "low_stock_threshold", lowStockThreshold: 25 },
	});
});

test("updates inventory policy", async ({ page }) => {
	await page.goto("/inventory-policy");

	await page.getByRole("combobox", { name: "Low stock mode" }).click();
	await page.getByRole("option", { name: "Use low stock threshold" }).click();
	await page.getByRole("spinbutton", { name: "Low stock threshold" }).fill("10");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByText("Inventory policy saved.")).toBeVisible();
	await page.getByRole("spinbutton", { name: "Low stock threshold" }).fill("12");
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByText("Inventory policy saved.")).toBeVisible();
});

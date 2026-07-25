import { expect, test } from "@playwright/test";

test("shows inventory dashboard", async ({ page }) => {
	await page.goto("/dashboard");

	await expect(page.getByRole("cell", { name: "BOX-SHIP-M" })).toBeVisible();
	await expect(page.getByRole("cell", { name: "Packaging" }).first()).toBeVisible();
});

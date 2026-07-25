import request from "supertest";
import type { WmsTestApp } from "./wms-test-app";
import { createWmsTestApp } from "./wms-test-app";

describe("Dashboard API", () => {
	let testApp: WmsTestApp;

	beforeEach(async () => {
		testApp = await createWmsTestApp();
	});

	afterEach(async () => {
		await testApp.close();
	});

	it("returns inventory status summary", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/dashboard/inventory-status-summary",
		);

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			totalRows: 5,
			inStockRows: 1,
			lowStockRows: 3,
			outOfStockRows: 1,
		});
	});

	it("returns low-stock rows grouped by category", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/dashboard/low-stock-by-category",
		);

		expect(response.status).toBe(200);
		expect(response.body).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ category: "Accessories", count: 1 }),
				expect.objectContaining({ category: "Electronics", count: 1 }),
				expect.objectContaining({ category: "Packaging", count: 2 }),
			]),
		);
	});

	it("returns top low-stock items in severity order", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/dashboard/low-stock-items?limit=2",
		);

		expect(response.status).toBe(200);
		expect(response.body).toHaveLength(2);
		expect(response.body[0]).toMatchObject({
			itemSku: "BOX-SHIP-M",
			status: "out_of_stock",
		});
	});
});

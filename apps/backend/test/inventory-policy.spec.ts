import request from "supertest";
import type { WmsTestApp } from "./wms-test-app";
import { createWmsTestApp } from "./wms-test-app";

const INVENTORY_POLICY_ID = "default";

describe("Inventory policy API", () => {
	let testApp: WmsTestApp;

	beforeEach(async () => {
		testApp = await createWmsTestApp();
	});

	afterEach(async () => {
		await testApp.close();
	});

	it("gets and updates the singleton inventory policy", async () => {
		const getResponse = await request(testApp.app.getHttpServer()).get("/inventory-policy");

		expect(getResponse.status).toBe(200);
		expect(getResponse.body).toMatchObject({
			id: INVENTORY_POLICY_ID,
			lowStockMode: "low_stock_threshold",
			lowStockThreshold: 25,
		});

		const updateResponse = await request(testApp.app.getHttpServer())
			.put("/inventory-policy")
			.send({
				lowStockMode: "low_stock_threshold",
				lowStockThreshold: 12,
			});

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body).toMatchObject({
			id: INVENTORY_POLICY_ID,
			lowStockMode: "low_stock_threshold",
			lowStockThreshold: 12,
		});
	});

	it("rejects invalid inventory policy values", async () => {
		const invalidModeResponse = await request(testApp.app.getHttpServer())
			.put("/inventory-policy")
			.send({
				lowStockMode: "always_low",
				lowStockThreshold: 10,
			});
		const invalidThresholdResponse = await request(testApp.app.getHttpServer())
			.put("/inventory-policy")
			.send({
				lowStockMode: "low_stock_threshold",
				lowStockThreshold: -1,
			});

		expect(invalidModeResponse.status).toBe(400);
		expect(invalidThresholdResponse.status).toBe(400);
	});
});

import request from "supertest";
import type { WmsTestApp } from "./wms-test-app";
import { createWmsTestApp } from "./wms-test-app";

describe("List query validation", () => {
	let testApp: WmsTestApp;

	beforeEach(async () => {
		testApp = await createWmsTestApp();
	});

	afterEach(async () => {
		await testApp.close();
	});

	it("rejects invalid pagination params", async () => {
		const response = await request(testApp.app.getHttpServer()).get("/warehouses?page=0");

		expect(response.status).toBe(400);
	});

	it("rejects unsupported sort fields", async () => {
		const response = await request(testApp.app.getHttpServer()).get("/items?sort=unsupported");

		expect(response.status).toBe(400);
	});

	it("rejects unsupported filter operators", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/inventory?status=gt:low_stock",
		);

		expect(response.status).toBe(400);
	});
});

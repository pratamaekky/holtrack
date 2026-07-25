import request from "supertest";
import type { WmsTestApp } from "./wms-test-app";
import { createWmsTestApp } from "./wms-test-app";

describe("Warehouses API", () => {
	let testApp: WmsTestApp;

	beforeEach(async () => {
		testApp = await createWmsTestApp();
	});

	afterEach(async () => {
		await testApp.close();
	});

	it("paginates, filters, and sorts warehouses", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/warehouses?page=1&limit=2&city=ilike:jakarta&sort=code&order=ASC",
		);

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({ page: 1, limit: 2, total: 1, totalPages: 1 });
		expect(response.body.data[0]).toMatchObject({
			code: "JKT-01",
			name: "Jakarta Fulfillment Center",
		});
	});

	it("creates, updates, and deletes warehouses", async () => {
		const createResponse = await request(testApp.app.getHttpServer()).post("/warehouses").send({
			code: "mdn-01",
			name: "Medan Forward Stock",
			city: "Medan",
			status: "active",
		});

		expect(createResponse.status).toBe(201);
		expect(createResponse.body).toMatchObject({ code: "MDN-01", city: "Medan" });

		const updateResponse = await request(testApp.app.getHttpServer())
			.patch(`/warehouses/${createResponse.body.id}`)
			.send({
				code: "MDN-01",
				name: "Medan Forward Stock",
				city: "Deli Serdang",
				status: "inactive",
			});

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body).toMatchObject({ city: "Deli Serdang", status: "inactive" });

		const deleteResponse = await request(testApp.app.getHttpServer()).delete(
			`/warehouses/${createResponse.body.id}`,
		);

		expect(deleteResponse.status).toBe(200);
	});

	it("rejects duplicate warehouse codes", async () => {
		const response = await request(testApp.app.getHttpServer()).post("/warehouses").send({
			code: "jkt-01",
			name: "Duplicate Jakarta Warehouse",
			city: "Jakarta",
			status: "active",
		});

		expect(response.status).toBe(409);
	});

	it("blocks deleting warehouses that have inventory", async () => {
		const warehouse = await testApp.warehouseRepository.findOneByOrFail({ code: "JKT-01" });

		const response = await request(testApp.app.getHttpServer()).delete(
			`/warehouses/${warehouse.id}`,
		);

		expect(response.status).toBe(409);
	});
});

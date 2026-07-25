import request from "supertest";
import type { Item } from "../src/items/item.entity";
import type { WmsTestApp } from "./wms-test-app";
import { createWmsTestApp } from "./wms-test-app";

describe("Items and item categories API", () => {
	let testApp: WmsTestApp;

	beforeEach(async () => {
		testApp = await createWmsTestApp();
	});

	afterEach(async () => {
		await testApp.close();
	});

	it("paginates, filters, and sorts items", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/items?category=ilike:packaging&sort=sku&order=ASC",
		);

		expect(response.status).toBe(200);
		expect(response.body.total).toBe(2);
		expect(response.body.data.map((item: Item) => item.sku)).toEqual(["BOX-SHIP-M", "LBL-THERMAL"]);
	});

	it("creates, updates, and deletes item categories", async () => {
		const createResponse = await request(testApp.app.getHttpServer())
			.post("/item-categories")
			.send({
				name: "Consumables",
			});

		expect(createResponse.status).toBe(201);
		expect(createResponse.body).toMatchObject({ name: "Consumables" });

		const updateResponse = await request(testApp.app.getHttpServer())
			.patch(`/item-categories/${createResponse.body.id}`)
			.send({ name: "Operations Consumables" });

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body).toMatchObject({ name: "Operations Consumables" });

		const listResponse = await request(testApp.app.getHttpServer()).get(
			"/item-categories?name=ilike:operations&sort=name&order=ASC",
		);
		expect(listResponse.status).toBe(200);
		expect(listResponse.body.total).toBe(1);

		const deleteResponse = await request(testApp.app.getHttpServer()).delete(
			`/item-categories/${createResponse.body.id}`,
		);
		expect(deleteResponse.status).toBe(200);
	});

	it("blocks deleting categories that are used by items", async () => {
		const category = await testApp.categoryRepository.findOneByOrFail({ name: "Packaging" });

		const response = await request(testApp.app.getHttpServer()).delete(
			`/item-categories/${category.id}`,
		);

		expect(response.status).toBe(409);
	});

	it("creates, updates, and deletes items", async () => {
		const packaging = await testApp.categoryRepository.findOneByOrFail({ name: "Packaging" });
		const createResponse = await request(testApp.app.getHttpServer()).post("/items").send({
			sku: "bag-mailer-s",
			name: "Small Mailer Bag",
			categoryId: packaging.id,
			unit: "pcs",
			status: "active",
		});

		expect(createResponse.status).toBe(201);
		expect(createResponse.body).toMatchObject({ sku: "BAG-MAILER-S", unit: "pcs" });

		const updateResponse = await request(testApp.app.getHttpServer())
			.patch(`/items/${createResponse.body.id}`)
			.send({
				sku: "BAG-MAILER-S",
				name: "Small Mailer Bag",
				categoryId: packaging.id,
				unit: "pack",
				status: "discontinued",
			});

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body).toMatchObject({ unit: "pack", status: "discontinued" });

		const deleteResponse = await request(testApp.app.getHttpServer()).delete(
			`/items/${createResponse.body.id}`,
		);

		expect(deleteResponse.status).toBe(200);
	});

	it("rejects duplicate category names", async () => {
		const response = await request(testApp.app.getHttpServer())
			.post("/item-categories")
			.send({ name: "Packaging" });

		expect(response.status).toBe(409);
	});

	it("rejects duplicate item SKUs", async () => {
		const packaging = await testApp.categoryRepository.findOneByOrFail({ name: "Packaging" });

		const response = await request(testApp.app.getHttpServer()).post("/items").send({
			sku: "case-ip15-blk",
			name: "Duplicate Case",
			categoryId: packaging.id,
			unit: "pcs",
			status: "active",
		});

		expect(response.status).toBe(409);
	});

	it("rejects items with a missing category", async () => {
		const missingCategoryId = "00000000-0000-4000-8000-000000000000";

		const response = await request(testApp.app.getHttpServer()).post("/items").send({
			sku: "NEW-SKU",
			name: "New Item",
			categoryId: missingCategoryId,
			unit: "pcs",
			status: "active",
		});

		expect(response.status).toBe(404);
	});

	it("blocks deleting items that have inventory", async () => {
		const item = await testApp.itemRepository.findOneByOrFail({ sku: "CHG-USBC-20W" });

		const response = await request(testApp.app.getHttpServer()).delete(`/items/${item.id}`);

		expect(response.status).toBe(409);
	});
});

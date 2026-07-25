import request from "supertest";
import type { WmsTestApp } from "./wms-test-app";
import { createWmsTestApp } from "./wms-test-app";

describe("Inventory API", () => {
	let testApp: WmsTestApp;

	beforeEach(async () => {
		testApp = await createWmsTestApp();
	});

	afterEach(async () => {
		await testApp.close();
	});

	it("paginates, filters, sorts, and derives inventory status", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/inventory?status=eq:low_stock&sort=sku&order=ASC",
		);

		expect(response.status).toBe(200);
		expect(response.body.total).toBe(3);
		expect(response.body.data[0]).toMatchObject({
			itemSku: "CASE-IP15-BLK",
			quantityOnHand: 18,
			reorderPoint: 25,
			status: "low_stock",
		});
		expect(response.body.data[0]).not.toHaveProperty("sku");
		expect(response.body.data[0]).not.toHaveProperty("item");
	});

	it("uses inventory policy when filtering inventory status", async () => {
		await request(testApp.app.getHttpServer()).put("/inventory-policy").send({
			lowStockMode: "low_stock_threshold",
			lowStockThreshold: 10,
		});

		const lowStockResponse = await request(testApp.app.getHttpServer()).get(
			"/inventory?status=eq:low_stock&sort=sku&order=ASC",
		);
		const inventoryResponse = await request(testApp.app.getHttpServer()).get(
			"/inventory?sku=ilike:CHG-USBC-20W",
		);

		expect(lowStockResponse.status).toBe(200);
		expect(lowStockResponse.body.data.map((row: { itemSku: string }) => row.itemSku)).not.toContain(
			"CHG-USBC-20W",
		);
		expect(inventoryResponse.status).toBe(200);
		expect(inventoryResponse.body.data[0]).toMatchObject({
			itemSku: "CHG-USBC-20W",
			status: "in_stock",
		});
	});

	it("filters inventory by joined warehouse and item fields", async () => {
		const response = await request(testApp.app.getHttpServer()).get(
			"/inventory?warehouseCode=ilike:jkt&itemName=ilike:charger",
		);

		expect(response.status).toBe(200);
		expect(response.body.total).toBe(1);
		expect(response.body.data[0]).toMatchObject({
			warehouseCode: "JKT-01",
			itemSku: "CHG-USBC-20W",
			itemName: "USB-C Charger 20W",
			status: "low_stock",
		});
	});

	it("creates, updates, deletes, and de-duplicates inventory rows", async () => {
		const packaging = await testApp.categoryRepository.findOneByOrFail({ name: "Packaging" });
		const warehouse = await testApp.warehouseRepository.save(
			testApp.warehouseRepository.create({
				code: "DPS-01",
				name: "Denpasar Store Room",
				city: "Denpasar",
				status: "active",
			}),
		);
		const item = await testApp.itemRepository.save(
			testApp.itemRepository.create({
				sku: "TAPE-CLEAR",
				name: "Clear Packing Tape",
				categoryId: packaging.id,
				unit: "roll",
				status: "active",
			}),
		);

		const createResponse = await request(testApp.app.getHttpServer()).post("/inventory").send({
			warehouseId: warehouse.id,
			itemId: item.id,
			quantityOnHand: 8,
			reorderPoint: 10,
		});

		expect(createResponse.status).toBe(201);
		expect(createResponse.body).toMatchObject({
			warehouseCode: "DPS-01",
			itemSku: "TAPE-CLEAR",
			status: "low_stock",
		});

		const duplicateResponse = await request(testApp.app.getHttpServer()).post("/inventory").send({
			warehouseId: warehouse.id,
			itemId: item.id,
			quantityOnHand: 1,
			reorderPoint: 1,
		});

		expect(duplicateResponse.status).toBe(409);

		const updateResponse = await request(testApp.app.getHttpServer())
			.patch(`/inventory/${createResponse.body.id}`)
			.send({
				warehouseId: warehouse.id,
				itemId: item.id,
				quantityOnHand: 40,
				reorderPoint: 10,
			});

		expect(updateResponse.status).toBe(200);
		expect(updateResponse.body).toMatchObject({ quantityOnHand: 40, status: "in_stock" });

		const deleteResponse = await request(testApp.app.getHttpServer()).delete(
			`/inventory/${createResponse.body.id}`,
		);

		expect(deleteResponse.status).toBe(200);
	});

	it("rejects inventory rows with missing warehouse or item relations", async () => {
		const item = await testApp.itemRepository.findOneByOrFail({ sku: "CHG-USBC-20W" });
		const warehouse = await testApp.warehouseRepository.findOneByOrFail({ code: "JKT-01" });
		const missingId = "00000000-0000-4000-8000-000000000000";
		const missingWarehouseResponse = await request(testApp.app.getHttpServer())
			.post("/inventory")
			.send({
				warehouseId: missingId,
				itemId: item.id,
				quantityOnHand: 1,
				reorderPoint: 1,
			});
		const missingItemResponse = await request(testApp.app.getHttpServer()).post("/inventory").send({
			warehouseId: warehouse.id,
			itemId: missingId,
			quantityOnHand: 1,
			reorderPoint: 1,
		});
		const invalidQuantityResponse = await request(testApp.app.getHttpServer())
			.post("/inventory")
			.send({
				warehouseId: warehouse.id,
				itemId: item.id,
				quantityOnHand: -1,
				reorderPoint: 1,
			});

		expect(missingWarehouseResponse.status).toBe(404);
		expect(missingItemResponse.status).toBe(404);
		expect(invalidQuantityResponse.status).toBe(400);
	});
});

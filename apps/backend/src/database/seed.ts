import "reflect-metadata";
import { DataSource } from "typeorm";
import { Inventory } from "../inventory/inventory.entity";
import { ItemCategory } from "../item-categories/item-category.entity";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";
import { defaultDatabaseUrl } from "./database-url";

const dataSource = new DataSource({
	type: "postgres",
	url: defaultDatabaseUrl,
	entities: [Warehouse, ItemCategory, Item, Inventory],
	dropSchema: process.env.DB_RESET === "1",
	synchronize: true,
});

async function seed() {
	await dataSource.initialize();
	const warehouseRepository = dataSource.getRepository(Warehouse);
	const categoryRepository = dataSource.getRepository(ItemCategory);
	const itemRepository = dataSource.getRepository(Item);
	const inventoryRepository = dataSource.getRepository(Inventory);

	await inventoryRepository.createQueryBuilder().delete().execute();
	await itemRepository.createQueryBuilder().delete().execute();
	await categoryRepository.createQueryBuilder().delete().execute();
	await warehouseRepository.createQueryBuilder().delete().execute();

	const warehouses = [
		["JKT-01", "Jakarta Fulfillment Center", "Jakarta", "active"],
		["BDG-01", "Bandung Reserve Warehouse", "Bandung", "active"],
		["SBY-01", "Surabaya Cross Dock", "Surabaya", "inactive"],
	] as const;

	const items = [
		["CASE-IP15-BLK", "iPhone 15 Case Black", "Accessories", "pcs", "active"],
		["CHG-USBC-20W", "USB-C Charger 20W", "Electronics", "pcs", "active"],
		["BOX-SHIP-M", "Shipping Box Medium", "Packaging", "pcs", "active"],
		["LBL-THERMAL", "Thermal Shipping Label", "Packaging", "roll", "discontinued"],
	] as const;

	const savedWarehouses = new Map<string, Warehouse>();
	const savedCategories = new Map<string, ItemCategory>();
	const savedItems = new Map<string, Item>();

	for (const [code, name, city, status] of warehouses) {
		const warehouse = await warehouseRepository.save({ code, name, city, status });
		savedWarehouses.set(code, warehouse);
	}

	for (const name of ["Accessories", "Electronics", "Packaging"]) {
		const category = await categoryRepository.save({ name });
		savedCategories.set(name, category);
	}

	for (const [sku, name, category, unit, status] of items) {
		const savedCategory = savedCategories.get(category);
		if (!savedCategory) {
			throw new Error(`Invalid seed category ${category}`);
		}

		const item = await itemRepository.save({
			sku,
			name,
			categoryId: savedCategory.id,
			unit,
			status,
		});
		savedItems.set(sku, item);
	}

	const packaging = savedCategories.get("Packaging");
	if (!packaging) {
		throw new Error("Packaging seed category missing");
	}

	const inventoryRows = [
		["JKT-01", "CASE-IP15-BLK", 128, 40],
		["JKT-01", "CHG-USBC-20W", 24, 30],
		["JKT-01", "BOX-SHIP-M", 0, 50],
		["BDG-01", "CASE-IP15-BLK", 18, 25],
		["BDG-01", "BOX-SHIP-M", 220, 60],
		["SBY-01", "LBL-THERMAL", 12, 20],
	] as const;

	for (const [warehouseCode, sku, quantityOnHand, reorderPoint] of inventoryRows) {
		const warehouse = savedWarehouses.get(warehouseCode);
		const item = savedItems.get(sku);

		if (!warehouse || !item) {
			throw new Error(`Invalid seed inventory row for ${warehouseCode}/${sku}`);
		}

		await inventoryRepository.save({
			warehouseId: warehouse.id,
			itemId: item.id,
			quantityOnHand,
			reorderPoint,
		});
	}

	await dataSource.destroy();
}

void seed();

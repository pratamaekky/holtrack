import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { AppModule } from "../src/app.module";
import { Inventory } from "../src/inventory/inventory.entity";
import {
	INVENTORY_POLICY_ID,
	InventoryPolicy,
} from "../src/inventory-policies/inventory-policy.entity";
import { ItemCategory } from "../src/item-categories/item-category.entity";
import { Item } from "../src/items/item.entity";
import { Warehouse } from "../src/warehouses/warehouse.entity";

export interface WmsTestApp {
	app: INestApplication;
	categoryRepository: Repository<ItemCategory>;
	close: () => Promise<void>;
	inventoryRepository: Repository<Inventory>;
	itemRepository: Repository<Item>;
	warehouseRepository: Repository<Warehouse>;
}

export async function createWmsTestApp(): Promise<WmsTestApp> {
	process.env.DB_TYPE = "sqljs";
	const moduleRef = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	const app = moduleRef.createNestApplication();
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
		}),
	);
	await app.init();

	const warehouseRepository = moduleRef.get<Repository<Warehouse>>(getRepositoryToken(Warehouse));
	const categoryRepository = moduleRef.get<Repository<ItemCategory>>(
		getRepositoryToken(ItemCategory),
	);
	const itemRepository = moduleRef.get<Repository<Item>>(getRepositoryToken(Item));
	const inventoryRepository = moduleRef.get<Repository<Inventory>>(getRepositoryToken(Inventory));
	const policyRepository = moduleRef.get<Repository<InventoryPolicy>>(
		getRepositoryToken(InventoryPolicy),
	);

	await seedWmsData({
		warehouseRepository,
		categoryRepository,
		itemRepository,
		inventoryRepository,
		policyRepository,
	});

	return {
		app,
		categoryRepository,
		inventoryRepository,
		itemRepository,
		warehouseRepository,
		close: async () => {
			await app.close();
			delete process.env.DB_TYPE;
		},
	};
}

interface SeedParams {
	warehouseRepository: Repository<Warehouse>;
	categoryRepository: Repository<ItemCategory>;
	itemRepository: Repository<Item>;
	inventoryRepository: Repository<Inventory>;
	policyRepository: Repository<InventoryPolicy>;
}

async function seedWmsData({
	warehouseRepository,
	categoryRepository,
	itemRepository,
	inventoryRepository,
	policyRepository,
}: SeedParams) {
	await policyRepository.save(
		policyRepository.create({
			id: INVENTORY_POLICY_ID,
			lowStockMode: "low_stock_threshold",
			lowStockThreshold: 25,
		}),
	);

	const jakarta = await warehouseRepository.save(
		warehouseRepository.create({
			code: "JKT-01",
			name: "Jakarta Fulfillment Center",
			city: "Jakarta",
			status: "active",
		}),
	);
	const bandung = await warehouseRepository.save(
		warehouseRepository.create({
			code: "BDG-01",
			name: "Bandung Reserve Warehouse",
			city: "Bandung",
			status: "active",
		}),
	);

	const accessories = await categoryRepository.save({ name: "Accessories" });
	const electronics = await categoryRepository.save({ name: "Electronics" });
	const packaging = await categoryRepository.save({ name: "Packaging" });

	const caseItem = await itemRepository.save(
		itemRepository.create({
			sku: "CASE-IP15-BLK",
			name: "iPhone 15 Case Black",
			categoryId: accessories.id,
			unit: "pcs",
			status: "active",
		}),
	);
	const charger = await itemRepository.save(
		itemRepository.create({
			sku: "CHG-USBC-20W",
			name: "USB-C Charger 20W",
			categoryId: electronics.id,
			unit: "pcs",
			status: "active",
		}),
	);
	const box = await itemRepository.save(
		itemRepository.create({
			sku: "BOX-SHIP-M",
			name: "Shipping Box Medium",
			categoryId: packaging.id,
			unit: "pcs",
			status: "active",
		}),
	);
	const label = await itemRepository.save(
		itemRepository.create({
			sku: "LBL-THERMAL",
			name: "Thermal Shipping Label",
			categoryId: packaging.id,
			unit: "roll",
			status: "discontinued",
		}),
	);

	await inventoryRepository.save([
		inventoryRepository.create({
			warehouseId: jakarta.id,
			itemId: caseItem.id,
			quantityOnHand: 128,
			reorderPoint: 40,
		}),
		inventoryRepository.create({
			warehouseId: jakarta.id,
			itemId: charger.id,
			quantityOnHand: 24,
			reorderPoint: 30,
		}),
		inventoryRepository.create({
			warehouseId: jakarta.id,
			itemId: box.id,
			quantityOnHand: 0,
			reorderPoint: 50,
		}),
		inventoryRepository.create({
			warehouseId: bandung.id,
			itemId: caseItem.id,
			quantityOnHand: 18,
			reorderPoint: 25,
		}),
		inventoryRepository.create({
			warehouseId: bandung.id,
			itemId: label.id,
			quantityOnHand: 12,
			reorderPoint: 20,
		}),
	]);
}

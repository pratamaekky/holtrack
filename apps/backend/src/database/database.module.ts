import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Inventory } from "../inventory/inventory.entity";
import { InventoryPolicy } from "../inventory-policies/inventory-policy.entity";
import { ItemCategory } from "../item-categories/item-category.entity";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";
import { defaultDatabaseUrl } from "./database-url";

const entities = [Warehouse, ItemCategory, Item, Inventory, InventoryPolicy];

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			useFactory: async () => {
				if (process.env.DB_TYPE === "sqljs") {
					const sqlJs = await import("sql.js");
					return {
						type: "sqljs",
						driver: sqlJs.default,
						entities,
						synchronize: true,
						dropSchema: true,
						autoSave: false,
						retryAttempts: 0,
					};
				}

				return {
					type: "postgres",
					url: defaultDatabaseUrl,
					entities,
					synchronize: true,
					retryAttempts: 3,
				};
			},
		}),
	],
})
export class DatabaseModule {}

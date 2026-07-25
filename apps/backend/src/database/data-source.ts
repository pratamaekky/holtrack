import "reflect-metadata";
import { DataSource } from "typeorm";
import { Inventory } from "../inventory/inventory.entity";
import { ItemCategory } from "../item-categories/item-category.entity";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";
import { defaultDatabaseUrl } from "./database-url";

export const AppDataSource = new DataSource({
	type: "postgres",
	url: defaultDatabaseUrl,
	entities: [Warehouse, ItemCategory, Item, Inventory],
	synchronize: true,
});

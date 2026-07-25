import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { InventoryModule } from "./inventory/inventory.module";
import { InventoryPoliciesModule } from "./inventory-policies/inventory-policies.module";
import { ItemCategoriesModule } from "./item-categories/item-categories.module";
import { ItemsModule } from "./items/items.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
	imports: [
		DatabaseModule,
		WarehousesModule,
		ItemsModule,
		ItemCategoriesModule,
		InventoryPoliciesModule,
		InventoryModule,
	],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ItemCategoriesModule } from "./item-categories/item-categories.module";
import { ItemsModule } from "./items/items.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
	imports: [DatabaseModule, WarehousesModule, ItemsModule, ItemCategoriesModule],
})
export class AppModule {}

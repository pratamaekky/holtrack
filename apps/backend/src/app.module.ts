import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ItemsModule } from "./items/items.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
	imports: [DatabaseModule, WarehousesModule, ItemsModule],
})
export class AppModule {}

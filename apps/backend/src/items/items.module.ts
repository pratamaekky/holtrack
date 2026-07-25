import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Inventory } from "../inventory/inventory.entity";
import { ItemCategory } from "../item-categories/item-category.entity";
import { Item } from "./item.entity";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";

@Module({
	imports: [TypeOrmModule.forFeature([Item, Inventory, ItemCategory])],
	controllers: [ItemsController],
	providers: [ItemsService],
})
export class ItemsModule {}

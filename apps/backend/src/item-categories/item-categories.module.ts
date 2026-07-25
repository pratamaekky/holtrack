import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Item } from "../items/item.entity";
import { ItemCategoriesController } from "./item-categories.controller";
import { ItemCategoriesService } from "./item-categories.service";
import { ItemCategory } from "./item-category.entity";

@Module({
	imports: [TypeOrmModule.forFeature([ItemCategory, Item])],
	controllers: [ItemCategoriesController],
	providers: [ItemCategoriesService],
})
export class ItemCategoriesModule {}

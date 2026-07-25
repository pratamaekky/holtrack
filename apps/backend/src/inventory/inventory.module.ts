import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryPoliciesModule } from "../inventory-policies/inventory-policies.module";
import { Item } from "../items/item.entity";
import { Warehouse } from "../warehouses/warehouse.entity";
import { InventoryController } from "./inventory.controller";
import { Inventory } from "./inventory.entity";
import { InventoryService } from "./inventory.service";

@Module({
	imports: [TypeOrmModule.forFeature([Inventory, Warehouse, Item]), InventoryPoliciesModule],
	controllers: [InventoryController],
	providers: [InventoryService],
	exports: [InventoryService],
})
export class InventoryModule {}

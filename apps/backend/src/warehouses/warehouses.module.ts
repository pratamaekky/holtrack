import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Inventory } from "../inventory/inventory.entity";
import { InventoryPolicy } from "../inventory-policies/inventory-policy.entity";
import { Warehouse } from "./warehouse.entity";
import { WarehousesController } from "./warehouses.controller";
import { WarehousesService } from "./warehouses.service";

@Module({
	imports: [TypeOrmModule.forFeature([Warehouse, Inventory, InventoryPolicy])],
	controllers: [WarehousesController],
	providers: [WarehousesService],
})
export class WarehousesModule {}

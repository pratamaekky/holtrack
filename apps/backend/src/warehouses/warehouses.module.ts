import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Inventory } from "../inventory/inventory.entity";
import { Warehouse } from "./warehouse.entity";
import { WarehousesController } from "./warehouses.controller";
import { WarehousesService } from "./warehouses.service";

@Module({
	imports: [TypeOrmModule.forFeature([Warehouse, Inventory])],
	controllers: [WarehousesController],
	providers: [WarehousesService],
})
export class WarehousesModule {}

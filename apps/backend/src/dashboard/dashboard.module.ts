import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Inventory } from "../inventory/inventory.entity";
import { InventoryModule } from "../inventory/inventory.module";
import { InventoryPoliciesModule } from "../inventory-policies/inventory-policies.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
	imports: [TypeOrmModule.forFeature([Inventory]), InventoryPoliciesModule, InventoryModule],
	controllers: [DashboardController],
	providers: [DashboardService],
})
export class DashboardModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryPoliciesController } from "./inventory-policies.controller";
import { InventoryPoliciesService } from "./inventory-policies.service";
import { InventoryPolicy } from "./inventory-policy.entity";

@Module({
	imports: [TypeOrmModule.forFeature([InventoryPolicy])],
	controllers: [InventoryPoliciesController],
	providers: [InventoryPoliciesService],
	exports: [InventoryPoliciesService],
})
export class InventoryPoliciesModule {}

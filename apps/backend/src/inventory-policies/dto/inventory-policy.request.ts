import { IsIn, IsInt, Min } from "class-validator";
import type { LowStockMode } from "../inventory-policy.entity";

export class InventoryPolicyRequest {
	@IsIn(["reorder_point", "low_stock_threshold"])
	lowStockMode!: LowStockMode;

	@IsInt()
	@Min(0)
	lowStockThreshold!: number;
}

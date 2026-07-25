import { IsOptional, IsString } from "class-validator";
import { BaseFilter, FilterOperator, Operator } from "../../common/filter";

export const INVENTORY_SORT_FIELDS: Record<string, string> = {
	sku: "item.sku",
	itemName: "item.name",
	quantityOnHand: "inventory.quantityOnHand",
	reorderPoint: "inventory.reorderPoint",
	updatedAt: "inventory.updatedAt",
};

export class InventoryFilterRequest extends BaseFilter {
	@Operator(FilterOperator.ILIKE, { path: "warehouse.code" })
	@IsOptional()
	@IsString()
	warehouseCode?: string;

	@Operator(FilterOperator.ILIKE, { path: "warehouse.name" })
	@IsOptional()
	@IsString()
	warehouseName?: string;

	@Operator(FilterOperator.ILIKE, { path: "item.sku" })
	@IsOptional()
	@IsString()
	sku?: string;

	@Operator(FilterOperator.ILIKE, { path: "item.name" })
	@IsOptional()
	@IsString()
	itemName?: string;

	@Operator(FilterOperator.ILIKE, { path: "category.name" })
	@IsOptional()
	@IsString()
	category?: string;

	// Handled manually in InventoryService — status is derived, not a real column,
	// so it can't go through the generic path-based @Operator mechanism.
	@IsOptional()
	@IsString()
	status?: string;
}

import type { InventoryPolicy } from "../inventory-policies/inventory-policy.entity";

export function buildInventoryStatusSql(policy: InventoryPolicy): string {
	const lowStockCondition =
		policy.lowStockMode === "reorder_point"
			? "inventory.quantityOnHand <= inventory.reorderPoint"
			: `inventory.quantityOnHand <= ${policy.lowStockThreshold}`;

	return `CASE WHEN inventory.quantityOnHand <= 0 THEN 'out_of_stock' WHEN ${lowStockCondition} THEN 'low_stock' ELSE 'in_stock' END`;
}

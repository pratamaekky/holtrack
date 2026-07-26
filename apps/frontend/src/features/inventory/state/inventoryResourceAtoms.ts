import type { Inventory } from "@/shared/data/wms";
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";

export interface InventoryFilters extends Record<string, string> {
	category: string;
	itemName: string;
	sku: string;
	status: string;
	warehouseCode: string;
	warehouseName: string;
}

export type InventorySort = "sku" | "quantityOnHand" | "reorderPoint" | "updatedAt";

export const inventoryResourceAtoms = createPaginatedResourceAtoms<
	Inventory,
	InventoryFilters,
	InventorySort
>({
	endpoint: "/inventory",
	filterDefinitions: [
		{
			ariaLabel: "Filter inventory by warehouse code",
			key: "warehouseCode",
			label: "Warehouse Code",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by warehouse name",
			key: "warehouseName",
			label: "Warehouse Name",
			operator: "ilike",
			type: "input",
		},
		{
			// key is "sku" (not "itemSku") to match the backend's
			// InventoryFilterRequest.sku query param exactly.
			ariaLabel: "Filter inventory by item SKU",
			key: "sku",
			label: "Item SKU",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by item name",
			key: "itemName",
			label: "Item Name",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by category",
			key: "category",
			label: "Category",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter inventory by status",
			key: "status",
			label: "Status",
			operator: "eq",
			type: "select",
			options: [
				{ label: "In stock", value: "in_stock" },
				{ label: "Low stock", value: "low_stock" },
				{ label: "Out of stock", value: "out_of_stock" },
			],
		},
	],
	initialFilters: {
		category: "",
		itemName: "",
		sku: "",
		status: "",
		warehouseCode: "",
		warehouseName: "",
	},
	initialSort: "updatedAt",
});

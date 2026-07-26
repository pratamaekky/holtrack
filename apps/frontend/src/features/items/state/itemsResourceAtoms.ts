import type { Item } from "@/shared/data/wms";
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";

export interface ItemFilters extends Record<string, string> {
	category: string;
	name: string;
	sku: string;
	status: string;
}

export type ItemSort = "sku" | "name" | "category" | "status" | "createdAt";

export const itemsResourceAtoms = createPaginatedResourceAtoms<Item, ItemFilters, ItemSort>({
	endpoint: "/items",
	filterDefinitions: [
		{
			ariaLabel: "Filter items by SKU",
			key: "sku",
			label: "SKU",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter items by name",
			key: "name",
			label: "Name",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter items by category",
			key: "category",
			label: "Category",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter items by status",
			key: "status",
			label: "Status",
			operator: "eq",
			type: "input",
		},
	],
	initialFilters: { category: "", name: "", sku: "", status: "" },
	initialSort: "createdAt",
});

import type { ItemCategory } from "@/shared/data/wms";
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";

export interface ItemCategoryFilters extends Record<string, string> {
	name: string;
}

export type ItemCategorySort = "name" | "createdAt";

export const itemCategoriesResourceAtoms = createPaginatedResourceAtoms<
	ItemCategory,
	ItemCategoryFilters,
	ItemCategorySort
>({
	endpoint: "/item-categories",
	filterDefinitions: [
		{
			ariaLabel: "Filter item categories by name",
			key: "name",
			label: "Name",
			operator: "ilike",
			type: "input",
		},
	],
	initialFilters: { name: "" },
	initialSort: "createdAt",
});

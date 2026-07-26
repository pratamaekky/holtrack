import type { Warehouse } from "@/shared/data/wms";
import { createPaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";

export interface WarehouseFilters extends Record<string, string> {
	city: string;
	code: string;
	name: string;
	status: string;
}

export type WarehouseSort = "code" | "name" | "city" | "status" | "createdAt";

export const warehousesResourceAtoms = createPaginatedResourceAtoms<
	Warehouse,
	WarehouseFilters,
	WarehouseSort
>({
	endpoint: "/warehouses",
	filterDefinitions: [
		{
			ariaLabel: "Filter warehouses by code",
			key: "code",
			label: "Code",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter warehouses by name",
			key: "name",
			label: "Name",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter warehouses by city",
			key: "city",
			label: "City",
			operator: "ilike",
			type: "input",
		},
		{
			ariaLabel: "Filter warehouses by status",
			key: "status",
			label: "Status",
			operator: "eq",
			type: "select",
			options: [
				{ label: "Active", value: "active" },
				{ label: "Inactive", value: "inactive" },
			],
		},
	],
	initialFilters: { city: "", code: "", name: "", status: "" },
	initialSort: "createdAt",
});

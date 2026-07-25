import type { Warehouse, WarehousePayload } from "@/shared/data/wms";

const emptyWarehouseForm: WarehousePayload = {
	code: "",
	name: "",
	city: "",
	status: "active",
};

export function getInitialWarehouseForm(warehouse?: Warehouse): WarehousePayload {
	if (!warehouse) {
		return emptyWarehouseForm;
	}

	return {
		code: warehouse.code,
		name: warehouse.name,
		city: warehouse.city,
		status: warehouse.status,
	};
}

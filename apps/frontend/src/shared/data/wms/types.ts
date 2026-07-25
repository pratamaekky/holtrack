export interface Warehouse {
	id: string;
	code: string;
	name: string;
	city: string;
	status: "active" | "inactive";
	createdAt: string;
}

export interface Item {
	id: string;
	sku: string;
	name: string;
	categoryId: string;
	category: string;
	unit: string;
	status: "active" | "discontinued";
	createdAt: string;
}

export type WarehousePayload = Pick<Warehouse, "code" | "name" | "city" | "status">;
export type ItemPayload = Pick<Item, "sku" | "name" | "categoryId" | "unit" | "status">;

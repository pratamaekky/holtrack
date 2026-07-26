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

export interface PaginatedResponse<T> {
	data: T[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ItemCategory {
	id: string;
	name: string;
	createdAt: string;
}

export type ItemCategoryPayload = Pick<ItemCategory, "name">;

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Inventory {
	id: string;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	itemId: string;
	itemSku: string;
	itemName: string;
	category: string;
	quantityOnHand: number;
	reorderPoint: number;
	status: InventoryStatus;
	updatedAt: string;
}

export interface InventoryPayload {
	warehouseId: string;
	itemId: string;
	quantityOnHand: number;
	reorderPoint: number;
}

export type LowStockMode = "reorder_point" | "low_stock_threshold";

export interface InventoryPolicy {
	id: string;
	lowStockMode: LowStockMode;
	lowStockThreshold: number;
	createdAt: string;
	updatedAt: string;
}

export type InventoryPolicyPayload = Pick<InventoryPolicy, "lowStockMode" | "lowStockThreshold">;

export interface InventoryStatusSummary {
	totalRows: number;
	inStockRows: number;
	lowStockRows: number;
	outOfStockRows: number;
}

export interface LowStockByCategory {
	category: string;
	count: number;
}

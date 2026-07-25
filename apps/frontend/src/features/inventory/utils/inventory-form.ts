export interface InventoryFormState {
	itemId: string;
	quantityOnHand: string;
	reorderPoint: string;
	warehouseId: string;
}

export function getInitialInventoryForm(_inventory?: unknown): InventoryFormState {
	return { warehouseId: "", itemId: "", quantityOnHand: "0", reorderPoint: "0" };
}

export function getInventoryPayload(_form: InventoryFormState): unknown {
	return {};
}

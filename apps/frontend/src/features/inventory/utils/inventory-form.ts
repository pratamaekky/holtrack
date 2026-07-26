import type { Inventory, InventoryPayload } from "@/shared/data/wms";

export interface InventoryFormState {
	itemId: string;
	quantityOnHand: string;
	reorderPoint: string;
	warehouseId: string;
}

const emptyInventoryForm: InventoryFormState = {
	warehouseId: "",
	itemId: "",
	quantityOnHand: "0",
	reorderPoint: "0",
};

export function getInitialInventoryForm(inventory?: Inventory): InventoryFormState {
	if (!inventory) {
		return emptyInventoryForm;
	}

	return {
		warehouseId: inventory.warehouseId,
		itemId: inventory.itemId,
		quantityOnHand: String(inventory.quantityOnHand),
		reorderPoint: String(inventory.reorderPoint),
	};
}

export function getInventoryPayload(form: InventoryFormState): InventoryPayload {
	return {
		warehouseId: form.warehouseId,
		itemId: form.itemId,
		quantityOnHand: Number(form.quantityOnHand),
		reorderPoint: Number(form.reorderPoint),
	};
}

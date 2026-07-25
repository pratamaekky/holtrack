import type { Item, ItemPayload } from "@/shared/data/wms";

const emptyItemForm: ItemPayload = {
	categoryId: "",
	name: "",
	sku: "",
	status: "active",
	unit: "",
};

export function getInitialItemForm(item?: Item): ItemPayload {
	if (!item) {
		return emptyItemForm;
	}

	return {
		categoryId: item.categoryId,
		name: item.name,
		sku: item.sku,
		status: item.status,
		unit: item.unit,
	};
}

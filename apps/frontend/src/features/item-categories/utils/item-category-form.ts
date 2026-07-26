import type { ItemCategory, ItemCategoryPayload } from "@/shared/data/wms";

const emptyItemCategoryForm: ItemCategoryPayload = { name: "" };

export function getInitialItemCategoryForm(category?: ItemCategory): ItemCategoryPayload {
	if (!category) {
		return emptyItemCategoryForm;
	}

	return { name: category.name };
}

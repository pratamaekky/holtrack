import type { ItemCategory, ItemCategoryPayload } from "@/shared/data/wms";
import { useSaveResource } from "@/shared/hooks/useSaveResource";

interface UseSaveItemCategoryParams {
	category?: ItemCategory;
	onError: (message: string) => void;
	onSaved: () => void;
}

export function useSaveItemCategory({ category, onError, onSaved }: UseSaveItemCategoryParams) {
	return useSaveResource<ItemCategory, ItemCategoryPayload>({
		endpoint: "/item-categories",
		entity: category,
		failureMessage: "Failed to save item category.",
		onError,
		onSaved,
	});
}

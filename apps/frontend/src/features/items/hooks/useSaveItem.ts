import type { Item, ItemPayload } from "@/shared/data/wms";
import { useSaveResource } from "@/shared/hooks/useSaveResource";

interface UseSaveItemParams {
	item?: Item;
	onError: (message: string) => void;
	onSaved: () => void;
}

export function useSaveItem({ item, onError, onSaved }: UseSaveItemParams) {
	return useSaveResource<Item, ItemPayload>({
		endpoint: "/items",
		entity: item,
		failureMessage: "Failed to save item.",
		onError,
		onSaved,
	});
}

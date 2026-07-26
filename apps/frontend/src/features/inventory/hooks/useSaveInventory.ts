import type { Inventory, InventoryPayload } from "@/shared/data/wms";
import { useSaveResource } from "@/shared/hooks/useSaveResource";

interface UseSaveInventoryParams {
	inventory?: Inventory;
	onError: (message: string) => void;
	onSaved: () => void;
}

export function useSaveInventory({ inventory, onError, onSaved }: UseSaveInventoryParams) {
	return useSaveResource<Inventory, InventoryPayload>({
		endpoint: "/inventory",
		entity: inventory,
		failureMessage: "Failed to save inventory.",
		onError,
		onSaved,
	});
}

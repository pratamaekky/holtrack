import type { Warehouse, WarehousePayload } from "@/shared/data/wms";
import { useSaveResource } from "@/shared/hooks/useSaveResource";

interface UseSaveWarehouseParams {
	onError: (message: string) => void;
	onSaved: () => void;
	warehouse?: Warehouse;
}

export function useSaveWarehouse({ onError, onSaved, warehouse }: UseSaveWarehouseParams) {
	return useSaveResource<Warehouse, WarehousePayload>({
		endpoint: "/warehouses",
		entity: warehouse,
		failureMessage: "Failed to save warehouse.",
		onError,
		onSaved,
	});
}

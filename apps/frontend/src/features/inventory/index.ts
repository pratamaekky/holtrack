import { useEffect, useState } from "react";
import { apiService } from "@/api/apiService";
import type { Item, PaginatedResponse, Warehouse } from "@/shared/data/wms";

export { default as InventoryTable } from "./components/InventoryTable";

export function useInventoryOptions(enabled = true) {
	const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
	const [items, setItems] = useState<Item[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		let cancelled = false;
		setLoading(true);

		Promise.all([
			apiService.get<PaginatedResponse<Warehouse>>(
				"/warehouses?page=1&limit=50&sort=code&order=ASC",
			),
			apiService.get<PaginatedResponse<Item>>("/items?page=1&limit=50&sort=sku&order=ASC"),
		])
			.then(([warehousesResponse, itemsResponse]) => {
				if (cancelled) {
					return;
				}

				setWarehouses(warehousesResponse.data);
				setItems(itemsResponse.data);
			})
			.catch(() => {
				// No error slot in this hook's return shape (matching the brief);
				// swallow so a failed fetch doesn't surface as an unhandled rejection.
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [enabled]);

	return { items, loading, warehouses };
}

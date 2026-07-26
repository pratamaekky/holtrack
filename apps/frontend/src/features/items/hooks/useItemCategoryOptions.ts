import { useEffect, useState } from "react";
import { apiService } from "@/api/apiService";
import type { ItemCategory, PaginatedResponse } from "@/shared/data/wms";

export function useItemCategoryOptions(enabled = true) {
	const [data, setData] = useState<ItemCategory[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		let cancelled = false;
		setLoading(true);

		apiService
			.get<PaginatedResponse<ItemCategory>>("/item-categories?page=1&limit=50&sort=name&order=ASC")
			.then((response) => {
				if (cancelled) {
					return;
				}

				setData(response.data);
				setError(null);
			})
			.catch((err: unknown) => {
				if (cancelled) {
					return;
				}

				setError(err instanceof Error ? err.message : "Failed to load item categories.");
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

	return { data, error, loading };
}

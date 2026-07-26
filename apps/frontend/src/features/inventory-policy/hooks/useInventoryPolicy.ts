import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { InventoryPolicy } from "@/shared/data/wms";

export function useInventoryPolicy() {
	const query = useQuery({
		queryKey: ["/inventory-policy"],
		queryFn: () => apiService.get<InventoryPolicy>("/inventory-policy"),
		retry: false,
	});

	return {
		data: query.data ?? null,
		error: query.error instanceof Error ? query.error.message : null,
		loading: query.isLoading,
	};
}

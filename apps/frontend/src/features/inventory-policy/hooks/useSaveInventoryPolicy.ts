import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { InventoryPolicy, InventoryPolicyPayload } from "@/shared/data/wms";

interface UseSaveInventoryPolicyParams {
	onSaved: () => void;
}

export function useSaveInventoryPolicy({ onSaved }: UseSaveInventoryPolicyParams) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: InventoryPolicyPayload) =>
			apiService.put<InventoryPolicy>("/inventory-policy", payload),
		onSuccess: (data) => {
			queryClient.setQueryData(["/inventory-policy"], data);
			onSaved();
		},
	});
}

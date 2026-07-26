import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";
import type { InventoryPolicy, InventoryPolicyPayload } from "@/shared/data/wms";

interface UseSaveInventoryPolicyParams {
	onError: (message: string) => void;
	onSaved: () => void;
}

export function useSaveInventoryPolicy({ onError, onSaved }: UseSaveInventoryPolicyParams) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: InventoryPolicyPayload) =>
			apiService.put<InventoryPolicy>("/inventory-policy", payload),
		onSuccess: (data) => {
			queryClient.setQueryData(["/inventory-policy"], data);
			onSaved();
		},
		onError: (error) => {
			onError(error instanceof Error ? error.message : "Failed to save inventory policy.");
		},
	});
}

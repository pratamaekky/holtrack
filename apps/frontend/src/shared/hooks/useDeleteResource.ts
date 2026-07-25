import { useMutation } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";

interface UseDeleteResourceParams {
	endpoint: string;
	label: string;
	onDeleted: () => void;
	onError: (message: string) => void;
	onSuccess: () => void;
}

export function useDeleteResource({
	endpoint,
	label,
	onDeleted,
	onError,
	onSuccess,
}: UseDeleteResourceParams) {
	return useMutation({
		mutationFn: () => apiService.delete(endpoint),
		onError: (err) => {
			onError(err instanceof Error ? err.message : `Failed to delete ${label}.`);
		},
		onSuccess: () => {
			onSuccess();
			onDeleted();
		},
	});
}

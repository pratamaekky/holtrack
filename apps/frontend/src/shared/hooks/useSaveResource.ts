import { useMutation } from "@tanstack/react-query";
import { apiService } from "@/api/apiService";

interface SaveResource {
	id: string;
}

interface UseSaveResourceParams<TEntity extends SaveResource> {
	endpoint: string;
	entity?: TEntity;
	failureMessage: string;
	onError: (message: string) => void;
	onSaved: (entity: TEntity) => void;
}

export function useSaveResource<TEntity extends SaveResource, TPayload>({
	endpoint,
	entity,
	failureMessage,
	onError,
	onSaved,
}: UseSaveResourceParams<TEntity>) {
	return useMutation({
		mutationFn: (payload: TPayload) => {
			if (entity) {
				return apiService.patch<TEntity>(`${endpoint}/${entity.id}`, payload);
			}

			return apiService.post<TEntity>(endpoint, payload);
		},
		onError: (error) => {
			onError(error instanceof Error ? error.message : failureMessage);
		},
		onSuccess: onSaved,
	});
}

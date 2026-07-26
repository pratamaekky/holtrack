import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { apiService } from "@/api/apiService";
import type { PaginatedResponse } from "@/shared/data/wms";
import type { PaginatedResourceAtoms } from "@/shared/state/createPaginatedResourceAtoms";
import { buildResourceQuery } from "@/shared/utils/build-filter-query";

export function usePaginatedResourceAtoms<
	TEntity,
	TFilters extends Record<string, string>,
	TSort extends string,
>(atoms: PaginatedResourceAtoms<TEntity, TFilters, TSort>) {
	const [page, setPage] = useAtom(atoms.pageAtom);
	const [limit] = useAtom(atoms.limitAtom);
	const [sort, setSort] = useAtom(atoms.sortAtom);
	const [order, setOrder] = useAtom(atoms.orderAtom);
	const [filters, setFilters] = useAtom(atoms.filtersAtom);

	const queryString = buildResourceQuery({
		filterDefinitions: atoms.config.filterDefinitions,
		filters,
		limit,
		order,
		page,
		sort,
	});

	const query = useQuery({
		queryKey: [atoms.config.endpoint, queryString],
		queryFn: () =>
			apiService.get<PaginatedResponse<TEntity>>(`${atoms.config.endpoint}${queryString}`),
		placeholderData: keepPreviousData,
		retry: false,
	});

	function toggleSort(field: TSort) {
		if (field === sort) {
			setOrder((current) => (current === "ASC" ? "DESC" : "ASC"));
			return;
		}

		setSort(field);
		setOrder("ASC");
	}

	function updateFilter({ key, value }: { key: string; value: string }) {
		setFilters((current) => ({ ...current, [key]: value }));
		setPage(1);
	}

	return {
		data: query.data ?? null,
		error: query.error instanceof Error ? query.error.message : null,
		filters,
		loading: query.isLoading,
		order,
		retry: () => {
			void query.refetch();
		},
		setPage,
		sort,
		toggleSort,
		updateFilter,
	};
}

export function usePaginatedResourceAtoms(_atoms: unknown) {
	return {
		data: null,
		error: null,
		loading: false,
		setPage: (_page: number) => {},
		toggleSort: (_field: string) => {},
		updateFilter: (_filter: { key: string; value: string }) => {},
	};
}

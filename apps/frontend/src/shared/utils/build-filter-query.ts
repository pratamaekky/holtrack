interface FilterQueryOptions {
	exactKeys?: string[];
}

export function buildFilterQuery(
	filters: Record<string, string>,
	options: FilterQueryOptions = {},
) {
	const params = new URLSearchParams();
	const exactKeys = new Set(options.exactKeys ?? []);

	for (const [key, value] of Object.entries(filters)) {
		const trimmedValue = value.trim();
		if (!trimmedValue) {
			continue;
		}

		params.set(key, `${exactKeys.has(key) ? "eq" : "ilike"}:${trimmedValue}`);
	}

	const query = params.toString();
	return query ? `?${query}` : "";
}

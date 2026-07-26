export interface ResourceFilterDefinition<TKey extends string = string> {
	ariaLabel: string;
	key: TKey;
	label: string;
	operator: "eq" | "ilike";
	options?: { label: string; value: string }[];
	type: "input" | "select";
}

interface BuildResourceQueryParams<TFilters extends Record<string, string>> {
	filterDefinitions: ResourceFilterDefinition[];
	filters: TFilters;
	limit: number;
	order: "ASC" | "DESC";
	page: number;
	sort: string;
}

export function buildResourceQuery<TFilters extends Record<string, string>>({
	filterDefinitions,
	filters,
	limit,
	order,
	page,
	sort,
}: BuildResourceQueryParams<TFilters>): string {
	const params = new URLSearchParams();
	params.set("page", String(page));
	params.set("limit", String(limit));
	params.set("sort", sort);
	params.set("order", order);

	for (const definition of filterDefinitions) {
		const value = filters[definition.key]?.trim();

		if (!value) {
			continue;
		}

		params.set(definition.key, `${definition.operator}:${value}`);
	}

	return `?${params.toString()}`;
}

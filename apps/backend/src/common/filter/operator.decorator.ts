import type { FilterExecutor, FilterOperatorMeta } from "./filter.types";
import type { FilterOperator } from "./filter-operator";

const FILTER_OPERATORS_KEY = "filter:operators";

export function Operator(
	operator: FilterOperator,
	options?: { executor?: FilterExecutor; path?: string },
) {
	return (target: object, propertyKey: string) => {
		const existing: FilterOperatorMeta[] = Reflect.getMetadata(FILTER_OPERATORS_KEY, target) ?? [];

		existing.push({ field: propertyKey, operator, ...options });
		Reflect.defineMetadata(FILTER_OPERATORS_KEY, existing, target);
	};
}

export function getFilterOperators(target: object): FilterOperatorMeta[] {
	return Reflect.getMetadata(FILTER_OPERATORS_KEY, target) ?? [];
}
